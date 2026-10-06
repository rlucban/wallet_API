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

## 2026-10-06 — Spec 02 FINAL v1.0 + built (D-API02-01..04, deployed-verified)

- `specs/02-session-enforcement-on-change-passcode.md`: FINAL per user call (v1.0; content unchanged from v0.1 except status). Problem: `changePasscode` rotated `currentSessionId` but `protect` enforced JWT + user-exists only — rotation was a record, not a kill switch; "other devices get logged out" unenforceable. User calls locked: changer stays in, eventual 401 logout (offline devices count on first online call), grace over big-bang (zero forced logout on deploy).
- D-API02-01 `src/services/authService.js`: `generateToken(userId, sessionId)` signs `{id, sid}`; login/register mint bound to the stored session; change rotates + returns `{message, token}` (amends SPEC-01 CON-API-05 message-only — the joint WiseWallet SPEC-35 D-03 stores).
- D-API02-02 `src/middlewares/protect.js`: sid-bound mismatch → 401 `'Your session was ended on another device.'` via `AppError` (existing handler, no new shape); sid-less (pre-02) tokens pass until 24h expiry; null session (post-logout) kills outstanding tokens too.
- D-API02-03 `src/controllers/authController.js`: change response `200 {status:'success', message, data:{token}}`. (Interim note, now closed: service-first ordering left the object in `message` for one slice.)
- D-API02-04 Postman + user-run matrix on `https://wallet-atog-api.vercel.app` (throwaway `pinchange-test@` account): register→sid-token; A login, B force-login → A logout 401 / B health 200 (ACC-01, enforcement live on deployed); change→200 message + `data.token`, old B 401, fresh token 200, old PIN 401, new PIN 200 with `sid` in JWT (ACC-02); envelopes intact (ACC-04); grace code-verified (no pre-02 token obtainable — ACC-03); step-5 wrong-current/same-PIN/no-token run next. Per-instance throttle caveat (serverless) did not bite.
- Open: D-05 docs (this entry); SPEC-API-03 fixed-8h JWT window (fixed recommended over sliding — per-request sliding breaks stateless §1.5; draft deferred per user call). No new dep (limiter pre-existed), no table migration, no other route/schema change. Rollback: revert D-03→D-02→D-01; sid-less tokens keep working throughout.
