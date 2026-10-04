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
- Open (user-run): `npm install express-rate-limit@7`; ACC-API-01..07 curl matrix NOT run (skipped per user call — no spare Supabase target; mock rejected; harness needs own spec). Backend closes unverified-by-curl.
- Unchanged: Spec 01 FINAL as-is (token-in-200 flagged separately); no other routes, schemas, table shapes, or JWT semantics touched.
