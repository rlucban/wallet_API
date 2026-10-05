# Spec 02: Public Users-Transactions Endpoint (Safe Allowlist)

| Field | Value |
|---|---|
| ID | SPEC-API-02 |
| Title | Public read-only users-with-transactions for `https://wise-wallet-sage.vercel.app/` (`GET /api/public/users-transactions`) |
| Status | **FINAL** (2026-10-05 per user call, Option A safe version — implement exactly this) |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | New public router + controller + service + repository method(s) (allowlisted columns only), public rate limiter, CORS origin lock for `/api/public/*`, `src/app.js` mount (append-only), `Wallet-API.postman_collection.json` entries |
| Non-goals | Any change to existing protected routes or their envelopes; JWT/`protect` semantics; `users`/`transactions` table migrations; exposing `passcode`, `currentSessionId`, `receiptUrl`, `splitInfo`; test harness; any WiseWallet app change (web app consumes this as-is) |
| Normative source | This file (only when marked FINAL). `AGENTS.md §4`-style pointer does not exist for this spec yet; file+symbol cites are normative; `:line` numbers are hints only. |

> History: requested 2026-10-05 as "public API endpoint for https://wise-wallet-sage.vercel.app/ that does not require authentication and allows users to retrieve a JSON list of all users and their transactions. Do not create new tables." Clarification round: user confirmed scope "all users + all transactions", fields "everything except passcode", shape "nested", guardrails "truly public", purpose "live web app feature". Agent stopped per `AGENTS.md` §1 (leak of `currentSessionId` + financial PII + unbounded Vercel payload). User call: **Option A — draft the safe version**. DRAFT v0.1 written 2026-10-05. **FINAL v1.0 per user call 2026-10-05 ("spec 02 final") — implement exactly this, D-PUB-01 first.** Literal open-dump variant stays rejected (see CON-PUB-02/03).

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"today", "currently") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem

In one sentence: **The public web app at `https://wise-wallet-sage.vercel.app/` needs a no-JWT JSON view of users and their transactions, but the API today offers only JWT-protected per-user reads.**

### 1.2 Why this shape (verified against this codebase, non-normative)

- All existing transaction reads are `protect`-gated (`src/routes/transactionRoutes.js:10` `router.use(protect)`) and per-user (`transactionRepository.findAll(userId, filters)` filters `.eq('userId', userId)`). There is no public list route. The `system` router is the only public precedent (`src/routes/systemRoutes.js:6-7` health/reset with no `protect`).
- Backend Supabase client uses `SERVICE_ROLE` when present and therefore **bypasses RLS** (`src/config/supabaseClient.js:24-26`), while the SQL policies themselves are deny-by-default private (`supabase_schema.sql:162-170`). A public route therefore MUST enforce privacy in code via explicit column allowlists — RLS will not save it.
- `users` carries credential-equivalent secrets (`supabase_schema.sql:17-24`: `passcode` bcrypt hash, `currentSessionId` session-steal token). `transactions` carries financial PII + private storage pointers (`supabase_schema.sql:82-97`: `receiptUrl` into the private `receipts` bucket gated by `auth.uid()` folder, `splitInfo` JSONB, `note`/`establishment`). `SELECT *` on either table from a public route is rejected for this reason.
- Controller-thin / service-thick layering is the sibling pattern (`transactionController.getTransactions` → `transactionService.getAllTransactions` → `transactionRepository.findAll`). The new endpoint follows that exact layering under a new `/api/public` router so existing mounts stay untouched (`src/app.js:26-34`).

## 2. Constraints (normative)

- **CON-PUB-01 — Route and layering.** `GET /api/public/users-transactions` wired as **no `protect`**, optional public rate limiter → controller → service → repository. New `src/routes/publicRoutes.js` (or equivalent single-purpose router) mounted in `src/app.js` via `app.use('/api/public', publicRoutes)` appended without touching the nine existing mounts. Controller mirrors siblings: try/catch → `next(error)`, success envelope `{status:'success', …}`. Query validation for `limit`/`offset` MAY use zod or manual clamp, but MUST NOT use `validate` body-schema on a GET body (there is no body).
- **CON-PUB-02 — User allowlist.** Repository queries on `users` MUST select exactly `id, name` and MUST NOT select `passcode`, `currentSessionId`, `createdAt`, `updatedAt`, or `*`. The response MUST NOT contain `passcode` or `currentSessionId` anywhere (top level, nested, or error paths). `createdAt`/`updatedAt` are excluded to keep the public surface minimal.
- **CON-PUB-03 — Transaction allowlist.** Per-user transaction objects MUST contain only `id, userId, amount, date, note, type, categoryId, paymentMethod, establishment, createdAt`. The response MUST NOT contain `receiptUrl`, `splitInfo`, `dueId`, or `savingsItemId`. Rationale: `receiptUrl` points into the private `receipts` bucket (`supabase_schema.sql:195-199` folder = `auth.uid()`); `splitInfo` is unbounded JSONB; `dueId`/`savingsItemId` are out-of-scope linkages for this view (follow-up spec MAY add them with justification). No `SELECT *` on `transactions` in the new path.
- **CON-PUB-04 — No new tables, existing relationships only.** Reads use only `users` and `transactions` joined on `transactions.userId = users.id` (application-level join or two queries; no schema migration, no view, no new table). No writes from this route.
- **CON-PUB-05 — Response envelope.** `200 {status:'success', results:<userCount>, data:{users:[{id, name, transactionCount, transactions:[…]}]}}`. Transactions per user are latest-first (`date` desc, matching `findAll` ordering). Failures go through `AppError` only; no new failure shapes. The pre-existing global-handler `errorDetails`/`stack` leak (`src/app.js:47-52`) is out of scope and MUST NOT be extended with data payloads.
- **CON-PUB-06 — Bounded payload (Vercel safety).** Query params `?limit` (users per page, default 20, max 50) and `?offset` (default 0) MUST be enforced server-side via range queries. Per-user transactions MUST be capped (latest 100 per user, server-enforced, non-negotiable). Response MUST remain JSON-only, no pagination headers required. This keeps behavior identical under `node index.js` and serverless `api/index.js`.
- **CON-PUB-07 — Guardrails: CORS + throttle.** CORS for `/api/public/*` MUST allow-origin `https://wise-wallet-sage.vercel.app/` (exact origin; no `*`). A public rate limiter (separate from `authRateLimiter` in `src/middlewares/rateLimiter.js`) MUST throttle the new route — budget **DEC-PUB-04: 60 requests / 15 min / IP**, `429 {status:'fail', message:'Too many requests, try again later'}`. Numbers CONFIRMED at FINAL.
- **CON-PUB-08 — No logging of data.** Bodies, hashes, session ids, and result payloads MUST NOT be logged. The request logger (method + URL only, `src/app.js:10-13`) stays as-is; the new path MUST NOT add `console.log` of rows, users, or transactions.
- **CON-PUB-09 — Contract freeze.** All nine existing mounts, their zod schemas, `users`/`transactions` table shapes, and JWT 24h semantics stay unchanged. Rollback = remove the `/api/public` mount + delete the new route/controller/service/repo-method files + remove the public limiter (no dependency removal unless a new dep was added; prefer reusing `express-rate-limit@7` already installed).
- **CON-PUB-10 — No new dependencies unless declared.** Reuse `express-rate-limit@7` and `cors` already in use (`src/app.js:2,7`). Any new dependency MUST be listed in this spec at FINAL with user-run install and rollback noted, per `AGENTS.md` §1.4.

## 3. Goal & Acceptance Criteria

### 3.1 Decisions

- **DEC-PUB-01 — Route (CONFIRMED at FINAL):** `GET /api/public/users-transactions`. Rejected alternatives: `GET /api/transactions/public` (would inherit `router.use(protect)`), `POST` (reads MUST be GET).
- **DEC-PUB-02 — Shape (CONFIRMED at FINAL, per clarification vote):** nested `users[] → transactions[]` with `transactionCount` per user. Flat-list variant rejected for this spec.
- **DEC-PUB-03 — Caps (CONFIRMED at FINAL):** `limit` default 20 / max 50 users; latest 100 transactions per user. Prevents Vercel timeout/OOM on full-table dump.
- **DEC-PUB-04 — Throttle budget (CONFIRMED at FINAL):** 60 / 15 min / IP on the new route only. Distinct from Spec 01 `DEC-API-01` (20/15min/IP on auth).
- **DEC-PUB-05 — CORS origin (CONFIRMED at FINAL):** `https://wise-wallet-sage.vercel.app/` exact. `*` rejected.
- **DEC-PUB-06 — Excluded fields (CONFIRMED at FINAL, Option A):** `users.passcode, users.currentSessionId` plus `transactions.receiptUrl, transactions.splitInfo, transactions.dueId, transactions.savingsItemId` are never returned. Any request to add one back needs its own spec + FINAL.

### 3.2 Acceptance criteria (all user-run curl/Postman — no harness exists, `AGENTS.md` §1.10)

- **ACC-PUB-01 (happy path, no auth):** `GET /api/public/users-transactions?limit=2` with **no** `Authorization` header → `200`, envelope `{status:'success', results, data:{users:[{id, name, transactionCount, transactions:[…]}]}}`. Each transaction object has exactly the CON-PUB-03 allowlist keys.
- **ACC-PUB-02 (field absence):** full response body piped through a key search (e.g. `grep -o`) MUST contain zero occurrences of `passcode`, `currentSessionId`, `receiptUrl`, `splitInfo`, `dueId`, `savingsItemId`. Fails closed if any appear.
- **ACC-PUB-03 (caps):** `?limit=500` returns at most 50 users; a user with >100 transactions returns exactly 100 (latest-first). `?offset=1` shifts the user window.
- **ACC-PUB-04 (throttle):** exceeding DEC-PUB-04 budget → `429 {status:'fail', message:'Too many requests, try again later'}` via `AppError`/limiter handler only.
- **ACC-PUB-05 (CORS):** request with `Origin: https://wise-wallet-sage.vercel.app` returns `Access-Control-Allow-Origin: https://wise-wallet-sage.vercel.app`; request with `Origin: https://evil.example` does not receive a permissive ACAO for the public route.
- **ACC-PUB-06 (regression):** existing `GET /api/transactions` without JWT still → `401`; `GET /api/system/health` unchanged; no other route file diffed.
- **ACC-PUB-07 (contract mirror):** `Wallet-API.postman_collection.json` gains the endpoint (happy no-auth + field-absence test snippet + 429 case) so the collection stays the contract.

User-run commands (fill `BASE` with local or deployed URL; run exactly as given, paste output):

```bash
BASE=http://localhost:3000
# 1. Happy path (no auth)
curl -s "$BASE/api/public/users-transactions?limit=2" | head -c 2000; echo
# 2. Field absence (MUST print nothing)
curl -s "$BASE/api/public/users-transactions?limit=20" | grep -o -E "passcode|currentSessionId|receiptUrl|splitInfo|dueId|savingsItemId" | sort | uniq -c
# 3. Cap enforcement
curl -s "$BASE/api/public/users-transactions?limit=500" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('users:',j.data.users.length);console.log('maxTx:',Math.max(...j.data.users.map(u=>u.transactions.length)))})"
# 4. CORS allow
curl -s -D - -o /dev/null -H "Origin: https://wise-wallet-sage.vercel.app" "$BASE/api/public/users-transactions?limit=1" | grep -i access-control
# 5. CORS deny
curl -s -D - -o /dev/null -H "Origin: https://evil.example" "$BASE/api/public/users-transactions?limit=1" | grep -i access-control
# 6. Regression (MUST be 401)
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/api/transactions"
```

## 4. Deliverables (one layer at a time; stop after each for review)

- **D-PUB-01 (repository):** new method(s) e.g. `listPublicUsers(limit, offset)` selecting `id, name` only + `listPublicTransactionsForUsers(userIds)` selecting CON-PUB-03 columns only, ordered `date` desc, capped 100/user. Never `select('*')`.
- **D-PUB-02 (service):** new `publicService.getUsersWithTransactions(limit, offset)` — clamps `limit`/`offset`, calls D-PUB-01, assembles nested shape + `transactionCount`. No auth, no writes.
- **D-PUB-03 (controller + route):** new controller `getUsersTransactions` (try/catch → `next(error)`, 200 envelope per CON-PUB-05) + `src/routes/publicRoutes.js` (`GET /users-transactions`, no `protect`, public limiter first). Existing routers untouched.
- **D-PUB-04 (wiring + guardrails):** `src/app.js` appends `app.use('/api/public', publicRoutes)`; CORS origin lock for `/api/public/*` (scoped, not global `cors()` change); public limiter per DEC-PUB-04 (reuse `express-rate-limit@7`).
- **D-PUB-05 (contract + verification):** Postman happy/429 entries per ACC-PUB-07; user runs the full ACC-PUB-01..06 curl matrix above and pastes output. No code beyond the new files + mount.
- **D-PUB-06 (docs):** `docs/savepoint.md` entry; Status is FINAL v1.0 per user call 2026-10-05. Rollback = revert D-PUB-01..05.

## 5. Glossary

- **Allowlist:** explicit column selection (`select('id, name')`); the opposite of `select('*')`. What makes a `SERVICE_ROLE` bypass safe for public reads.
- **SERVICE_ROLE:** Supabase admin key that bypasses RLS (`src/config/supabaseClient.js:24-26`). Why CON-PUB-02/03 exist.
- **RLS:** Row Level Security policies (`supabase_schema.sql:144-170`); all private here, so code-level filtering carries the protection for this route.
- **CORS origin lock:** browser-enforced `Access-Control-Allow-Origin` limited to the web app origin; not a substitute for auth, but blocks casual cross-site reads.
- **429:** rate-limit response; the throttle that keeps an open list from being scraped to exhaustion.
- **Nested shape:** `{users:[{…, transactions:[…]}]}` per DEC-PUB-02.
- **Cap:** server-enforced `limit`/`offset`/per-user-100 that keeps serverless responses bounded.

## 6. References

- `src/app.js` — mounts (append-only target), `cors()` usage, global handler (untouched leak)
- `src/routes/transactionRoutes.js` — protected pattern this route deliberately does NOT follow
- `src/routes/systemRoutes.js` — public-route precedent (no `protect`)
- `src/controllers/transactionController.js` + `src/services/transactionService.js` — thin-controller / thick-service pattern to mirror
- `src/repositories/transactionRepository.js` (`findAll` ordering/filtering) + `src/repositories/userRepository.js` (per-field updater pattern)
- `src/middlewares/rateLimiter.js` — `authRateLimiter` pattern for the new public limiter
- `src/config/supabaseClient.js` — SERVICE_ROLE bypass warning
- `supabase_schema.sql` — `users` (17-24), `transactions` (82-97), RLS (144-170), storage `receipts` (182-211)
- `Wallet-API.postman_collection.json` — contract mirror to extend
- `specs/01-change-passcode-endpoint.md` — template example + `DEC-API-01` throttle precedent
