# AGENTS.md — Wallet-API Agent Contract

> This file is the standing contract for any AI agent working in this repo.
> It outranks ad-hoc instructions when they conflict. If a request violates
> Section 1, stop and ask instead of proceeding.
> Change journal: `docs/savepoint.md`. Contract mirror: `Wallet-API.postman_collection.json`.

---

## 1. Working agreements (must-follow, moving forward)

1. **Spec-first, no exceptions.** No code, config, or dependency changes without a
   written spec the user has explicitly marked **final/finalized**. The loop is:
   discuss → write spec → user approves spec as final → implement exactly the spec.
2. **No auto-pilot.** Never chain beyond what was approved. Finish the approved
   step, report, and stop. Ask before starting the next phase, even if it seems
   "obvious."
3. **Agent does not run CLIs — the user does.** The agent must NEVER execute
   terminal commands (`npm`/`node`/`nodemon`/`curl`/supabase/vercel deploys, etc.).
   The agent provides the exact commands; the user runs them and pastes back output.
   Rationale: the user owns the machine, credentials, and cloud projects.
4. **No breaking changes unless the finalized spec requires them.** Existing routes
   and their request/response envelopes (`{status:'success', data}` on success,
   `AppError` `{status, message}` on failure), zod schemas for existing routes,
   the Supabase table shapes, and JWT semantics (24h Bearer, `protect` = JWT +
   user-exists) must stay compatible. Any new dependency or data change must be
   in the spec with rollback noted.
5. **Keep it stateless / Vercel-deployable.** `api/index.js` is the serverless entry
   (`vercel.json` routes everything to it); `index.js` is local-dev only. No
   in-memory sessions — session state lives in `users.currentSessionId`. No local
   filesystem reliance. Behavior must be identical under `node index.js` and Vercel.
6. **Secrets in env only, never in code or logs.** `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
   `JWT_SECRET` come from the environment; `.env` is never committed. Request bodies
   (passcodes especially), hashes, and tokens MUST NOT be logged anywhere.
   > Known gap (flagged, not yet specced): `authService.js` / `protect.js` fall back
   > to a hardcoded `JWT_SECRET`, which is also absent from `.env.example`.
7. **Error-envelope discipline.** All failures go through `AppError` into the global
   handler. New code MUST NOT add failure shapes outside the envelope.
   > Known gap (flagged, not yet specced): the global handler in `src/app.js`
   > returns `errorDetails` + `stack` to clients.
8. **Document after approved changes.** Update `docs/savepoint.md` (change
   journal) and append a `Current status` entry in Section 3 below.
9. **Spec format standard (all future specs).** Every normative spec MUST live
   as its own file under `specs/` and MUST follow this template: metadata table
   (ID/Title/Status/Owner/Version/Scope/Non-goals) + RFC 2119 terminology +
   `Context` + `Constraints` (numbered `CON-*`, MUST/MUST NOT) + `Goal`
   (decisions `DEC-*`, acceptance `ACC-*`) + `Deliverables` (numbered `D-*`) +
   `Glossary` + `References`. No normative change via reformat/polish alone.
   Template example: `specs/01-change-passcode-endpoint.md` (once FINAL).
10. **Verification is user-run (no test harness exists).** `npm test` errors
    (`"Error: no test specified"`), there is no linter. Every spec MUST carry
    user-runnable acceptance: exact `curl` commands and/or Postman collection
    entries with expected status codes and bodies. Adding a test harness is its
    own spec — never smuggled inside a feature spec.

---

## 2. App overview and scaffold

**What it is:** Wallet-API — Express 5 + Supabase (Postgres) REST backend for
WiseWallet. Stateless JSON API; auth is PIN-based (4-digit, client-enforced) with
bcrypt hashes at rest and 24h JWTs. Deployed on Vercel (`wallet-atog-api.vercel.app`).

**Auth model (verified in code):** `register` bcrypt-hashes (`genSalt(10)`) the
plaintext PIN and creates `users` + `profiles` rows; `login` `bcrypt.compare`s,
then enforces single-session-per-device via `users.currentSessionId` + `deviceId`
(`force:true` steals the session, else `sessionConflict:true`); JWT carries only
`{id}`; `protect` middleware enforces JWT-validity + user-still-exists (it does
NOT compare session ids — rotating `currentSessionId` alone does not kill
outstanding JWTs); `logout` nulls the session id; `deleteAccount` cascades.

**Scaffold:**

```
wallet-api/
├── index.js                # Local dev entry (dotenv + listen :3000)
├── api/index.js            # Vercel serverless entry (exports app)
├── vercel.json             # All routes → api/index.js (@vercel/node)
├── src/
│   ├── app.js              # Express wiring, /api/* mounts, global error handler
│   ├── routes/ (9)         # auth, profiles, transactions, categories, dues,
│   │                       # savingsItems, paymentMethods, storage, system
│   ├── controllers/ (8)    # req/res shaping, try/catch → next(error)
│   ├── services/ (6)        # business logic (bcrypt, JWT, session rules)
│   ├── repositories/ (7)   # Supabase queries only (incl. userRepository)
│   ├── schemas/ (5)        # zod input validation (userSchema: register/login)
│   ├── middlewares/        # protect (JWT), validate (zod), authMiddleware (unused spare)
│   ├── config/             # supabaseClient
│   └── utils/              # AppError (operational error envelope)
├── supabase_schema.sql     # Table definitions (users.passcode TEXT NOT NULL, …)
├── Wallet-API.postman_collection.json  # Contract mirror — update with every route change
├── .env.example (PORT, SUPABASE_URL, SUPABASE_ANON_KEY — JWT_SECRET missing, see §1.6 gap)
└── docs/savepoint.md  specs/
```

---

## 3. Current status (historical tracking — append newest at bottom)

- **2026-10-03 — Baseline audit + contract established.** No prior AGENTS.md, specs,
  tests, or linter. Verified in code: auth routes are register/login/logout/deleteAccount
  only (no change-passcode route — `src/routes/authRoutes.js`); bcrypt `genSalt(10)`
  hashing with plaintext-PIN-in / hash-at-rest (`src/services/authService.js`);
  `protect` = JWT + user-exists, no session-id enforcement (`src/middlewares/protect.js`);
  request logger logs method + URL only (no bodies — `src/app.js`); global error handler
  leaks `errorDetails` + `stack` (flagged §1.7 gap); `JWT_SECRET` hardcoded fallback +
  missing from `.env.example` (flagged §1.6 gap); no rate limiting on any route
  (relevant: 4-digit PINs are enumerable without throttling). `docs/savepoint.md`,
  `specs/` created with this file.
- **2026-10-03 — Spec 01 DRAFT (not yet FINAL).** `specs/01-change-passcode-endpoint.md`:
  `POST /api/auth/change-passcode` (protect + zod `^\d{4}$` pair + bcrypt-verify-current
  + bcrypt-hash-new + `updatePasscode` repo method + session-id rotation + rate limiting
  on login/change-passcode). Written to unblock WiseWallet SPEC-35 v2.0 Cloud-online
  branch. No code changed in this step.
- **2026-10-03 — Spec 01 FINAL v1.0 (Option A).** Discovery review of both DRAFTs:
  `DEC-API-01` 20/15min/IP confirmed, `DEC-API-02` copy confirmed, per-instance
  throttling accepted pending the deployed-URL matrix. Implementable now, server
  half first. See `docs/savepoint.md`.
- **2026-10-04 — Verification decision (user call).** No test harness added — out of scope per §1.10 (harness needs its own spec + FINAL). D-API-01..05 built on `36-web-platform-invariants-for-backend` per Spec 01 FINAL as-is (message-only 200, CON-API-05/08 stand). Acceptance = user-run ACC-API-01..07 curl matrix + Postman happy/401 entries. Token-in-200 flagged as a separate future item, not implemented.
- **2026-10-06 — Spec 02 FINAL v1.0 + built (D-API02-01..04, deployed-verified).** `specs/02-session-enforcement-on-change-passcode.md`: rotating `currentSessionId` logged nobody out (`protect` checked JWT + user-exists only). D-01 service (`generateToken` signs `{id, sid}`, login/register mint bound, change returns `{message, token}` amending SPEC-01 CON-API-05); D-02 `protect` grace + mismatch-401 (`'Your session was ended on another device.'`, pre-02 sid-less tokens pass, null session kills); D-03 controller `200 {status, message, data:{token}}`; D-04 Postman stale-token items + user-run matrix on `wallet-atog-api.vercel.app` (ACC-01 A→401/B→200, ACC-02 change→token/old→401/new-login→sid-JWT, ACC-04 envelopes intact; ACC-03 grace code-verified; step-5 wrong-current/same-PIN/no-token run next). Changer stays in; logout nulls kill outstanding tokens. Open: D-05 docs (this entry). SPEC-API-03 fixed-8h JWT window DECLINED per user call 2026-10-06 (not needed).

---

## 4. Spec: Change Passcode Endpoint

**Status: FINAL (2026-10-03 per user call, Option A) — normative text lives in
`specs/01-change-passcode-endpoint.md`; implement exactly that, server half first.**
