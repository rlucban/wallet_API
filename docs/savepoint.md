# docs/savepoint.md — Wallet-API Change Journal

> Not a git history. Context + objectives: what changed, why, and what is next.
> Append newest at bottom. Updated per `AGENTS.md` §1.8 after approved changes.

---

## 2026-10-03 — Baseline audit + agent setup
- Audited the whole repo (routes/controllers/services/repositories/schemas/middlewares/config/utils, `app.js`, both entries, `vercel.json`, `.env.example`).
- Verified auth surface: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout` (protect), `DELETE /api/auth/account` (protect). No change-passcode route exists.
- Verified hashing: bcrypt `genSalt(10)` at register, `bcrypt.compare` at login; clients send plaintext PINs (same contract any change endpoint must follow — clients MUST NOT write hashes).
- Verified session model: `users.currentSessionId` + `deviceId` + `force` (conflict-or-steal); `protect` enforces JWT + user-exists only — no session-id comparison, so rotating the session id alone cannot kill outstanding (24h) JWTs.
- Created agent setup mirroring WiseWallet: `AGENTS.md` (contract §§1–4), `specs/`, this journal. No tests/linter exist (`npm test` errors by design); acceptance is user-run curl/Postman per spec.
- Flagged (not specced, not changed): hardcoded `JWT_SECRET` fallback + missing from `.env.example`; global error handler returns `stack`/`errorDetails`; zero rate limiting on any route.

---

## 2026-10-03 — Spec 01 DRAFT: Change Passcode Endpoint
- `specs/01-change-passcode-endpoint.md` (DRAFT, awaiting user FINAL): `POST /api/auth/change-passcode` — protect → zod `^\d{4}$` pair (must differ) → `bcrypt.compare` current (401 otherwise) → bcrypt-hash new (same `genSalt(10)` as register) → new `userRepository.updatePasscode` → rotate `currentSessionId` → 200 message-only response; rate limiting on login + change-passcode (new dep, numbers as DEC); Postman collection entry; user-run curl matrix as acceptance.
- Stated limit (verified, not assumed): other-device JWTs stay valid until expiry — `protect` cannot enforce the rotation. True session-kill needs protect-session enforcement, explicitly out of scope (follow-up spec).
- Unblocks WiseWallet SPEC-35 v2.0 Cloud-online branch (cross-repo link in both specs). No code changed in this step.

---

## 2026-10-03 — Spec 01 FINAL v1.0 (Option A)
- User call from Discovery review of both DRAFTs: `DEC-API-01` confirmed at 20 attempts / 15 min / IP; `DEC-API-02` copy confirmed; per-instance throttling on serverless accepted pending the deployed-URL matrix (`ACC-API-06` runs against the deployed URL, not localhost).
- Implementable now, server half first (endpoint deployed before the app calls it): D-API-01 schema → D-API-02 repo → D-API-03 service → D-API-04 controller+route → D-API-05 rate limit + Postman + user-run curl matrix → D-API-06 docs. One layer at a time.

---

## 2026-10-04 — Spec 01 built (D-API-01..05, branch `36-web-platform-invariants-for-backend`)

- D-API-01 `src/schemas/userSchema.js`: `changePasscodeSchema` (exact-4-digit pair + must-differ refine, append-only).
- D-API-02 `src/repositories/userRepository.js`: `updatePasscode(id, hashedPasscode)` mirroring `updateSessionId`.
- D-API-03 `src/services/authService.js`: `changePasscode` (id-only load, 401 `'Current PIN is incorrect'`, register-identical hash, persist + fresh-UUID rotation, message-only return).
- D-API-04 `authController.changePasscode` + `POST /api/auth/change-passcode` (`authRateLimiter → protect → validate → controller`, existing routes untouched).
- D-API-05 `src/middlewares/rateLimiter.js` (DEC-API-01 20/15min/IP, exact 429 envelope) on login + change-passcode; Postman happy + wrong-current-401 items.
- Done (user-run 2026-10-04): `npm install express-rate-limit@7` — server boots with limiter. Open: ACC-API-01..07 curl matrix NOT run (skipped per user call — no spare Supabase target; mock rejected; harness needs own spec). Backend closes unverified-by-curl.
- Unchanged: Spec 01 FINAL as-is (token-in-200 flagged separately); no other routes, schemas, table shapes, or JWT semantics touched.

---

## 2026-10-05 — Spec 02 DRAFT (Option A safe): Public Users-Transactions Endpoint

- Request: public no-auth JSON list of all users + transactions for `https://wise-wallet-sage.vercel.app/`, no new tables.
- Clarification round: user confirmed all-users scope, everything-except-passcode fields, nested shape, truly-public, live feature. Agent stopped per AGENTS.md §1 (would leak `users.currentSessionId` + financial PII + unbounded Vercel payload via SERVICE_ROLE bypass of private RLS).
- User call: Option A — `specs/02-public-users-transactions-endpoint.md` v0.1 DRAFT (NOT FINAL, no code): `GET /api/public/users-transactions`, no `protect`, allowlist-only (`users.id,name`; transactions `id,userId,amount,date,note,type,categoryId,paymentMethod,establishment,createdAt` — never `passcode,currentSessionId,receiptUrl,splitInfo,dueId,savingsItemId`, never `select(*)`), `limit` default 20/max 50 + 100-tx/user cap, CORS exact-origin + 60/15min/IP public throttle (DRAFT numbers), `{status:'success',data:{users}}` envelope, user-run ACC-PUB-01..07 curl matrix + Postman entries. No existing routes, schemas, tables, or JWT semantics touched. Awaiting user FINAL before any implementation.

---

## 2026-10-05 — Spec 02 FINAL v1.0 (Option A safe)

- User call ("spec 02 final"): DRAFT v0.1 approved as-is with no tweaks. `specs/02-public-users-transactions-endpoint.md` flipped to FINAL v1.0 — DEC-PUB-01..06 CONFIRMED (route, nested shape, caps 20/50 + 100/user, throttle 60/15min/IP, CORS exact origin, field exclusions). Implementable now, D-PUB-01 first per §1.2 one-layer-at-a-time. No code changed in this step.

---

## 2026-10-05 — Spec 02 D-PUB-01 built (repository layer only)

- New `src/repositories/publicRepository.js`: `listPublicUsers(limit, offset)` (`select('id, name')`, name-asc + `range()`, clamp 1..50) + `listPublicTransactionsForUsers(userIds)` (`select()` CON-PUB-03 10 columns only, `in('userId')` + date-desc + global `limit(ids*100)` then per-user slice to 100). Never `select('*')`, no secrets, no row logging. No existing files touched. Open: D-PUB-02 service next (not started).

---

## 2026-10-05 — Spec 02 D-PUB-02 built (service layer only)

- New `src/services/publicService.js`: `getUsersWithTransactions(limit, offset)` — normative clamp (default 20/max 50/offset ≥0) → D-PUB-01 calls → nested `{id, name, transactionCount, transactions}` with per-user latest-first order preserved; re-picks CON-PUB-03 10 tx columns so repo changes can't leak. No auth, no writes, no logging. No existing files touched. Open: D-PUB-03 controller+route next (not started).

---

## 2026-10-05 — Spec 02 D-PUB-03 built (controller + route, unmounted)

- New `src/controllers/publicController.js` (`getUsersTransactions`: query → service → `200 {status:'success', results, data:{users}}`, try/catch → `next(error)`, no logs) + new `src/routes/publicRoutes.js` (`GET /users-transactions`, deliberately no `protect`; limiter + `app.use('/api/public')` mount deferred to D-PUB-04, so zero runtime change yet). No existing files touched. Open: D-PUB-04 wiring+guardrails next (not started).

---

## 2026-10-05 — Spec 02 D-PUB-04 built (wiring + guardrails)

- New `src/middlewares/publicRateLimiter.js` (DEC-PUB-04 60/15min/IP, exact `429 {status:'fail', message:'Too many requests, try again later'}`, reuses `express-rate-limit@7`; `src/middlewares/rateLimiter.js` untouched so `authRateLimiter` import shape holds). `src/app.js` append-only: requires + `app.use('/api/public', strip-wildcard → scoped `cors({origin:'https://wise-wallet-sage.vercel.app', methods:['GET']})` → `publicRateLimiter` → `publicRoutes`) after `/api/system`, before `/api/health`. Global `cors()` and all nine existing mounts byte-identical in behavior. Open: D-PUB-05 contract+verification next (not started).

---

## 2026-10-05 — Spec 02 D-PUB-05 built (contract mirror; verification user-run)

- `Wallet-API.postman_collection.json`: new `public` folder — `users-transactions (public, no auth)` (200 + field-absence + allowlist-shape test scripts) + `users-transactions - throttle 429 shape` (429 envelope check). No existing collection entries touched. Code complete per D-PUB-01..04; acceptance ACC-PUB-01..06 is user-run (commands below) — paste output back. Open: D-PUB-06 final docs pass.

---

## 2026-10-05 — Spec 02 complete (D-PUB-01..06, FINAL v1.0 implemented)

- Delivered exactly FINAL v1.0, one layer at a time with review stops. New files (5): `src/repositories/publicRepository.js`, `src/services/publicService.js`, `src/controllers/publicController.js`, `src/routes/publicRoutes.js`, `src/middlewares/publicRateLimiter.js`. Modified (2, append-only): `src/app.js` (requires + `/api/public` mount after `/api/system`; global `cors()`, logger, error handler, nine existing mounts untouched), `Wallet-API.postman_collection.json` (new `public` folder; 8 existing folders untouched). No tables, schemas, JWT/`protect` semantics, deps, or `.env` changes.
- Contract: `GET /api/public/users-transactions` (no `protect`), allowlist-only responses, caps 20/50 + 100/user, CORS exact `https://wise-wallet-sage.vercel.app` + 60/15min/IP throttle, `{status:'success',data:{users}}` envelope, `AppError`-only failures. Spec file stays FINAL v1.0 (no text change in this step).
- Rollback: delete the 5 new files + revert the 2 modified files (`git status`/`git diff` to confirm; `git checkout -- src/app.js Wallet-API.postman_collection.json` if committed, or restore from backup). No dep uninstall needed (`express-rate-limit@7` + `cors` reused).
- Verification: ACC-PUB-01..07 is user-run (curl matrix in spec §3.2 + 2 Postman items). No user output pasted yet as of this entry — backend closes unverified-by-curl, same posture as Spec 01. Paste output to close the loop; any failure is a new follow-up, not a silent fix.
