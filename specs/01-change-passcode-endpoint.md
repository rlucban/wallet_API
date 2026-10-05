# Spec 01: Change Passcode Endpoint

| Field | Value |
|---|---|
| ID | SPEC-API-01 |
| Title | Change Passcode Endpoint (`POST /api/auth/change-passcode`) |
| Status | **FINAL** (2026-10-03 per user call, Option A — implement exactly this, server half first) |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `src/schemas/userSchema.js`, `src/repositories/userRepository.js`, `src/services/authService.js`, `src/controllers/authController.js`, `src/routes/authRoutes.js`, rate limiting on auth routes, `Wallet-API.postman_collection.json` |
| Non-goals | Any change to register/login/logout/deleteAccount behavior or their schemas; JWT/session-enforcement redesign (protect stays JWT + user-exists); global error-handler hardening; `JWT_SECRET` env fix; test harness; any client/app change (WiseWallet SPEC-35 v2.0 carries the app half) |
| Normative source | This file (once marked FINAL). `AGENTS.md §4` is a pointer only. File+symbol cites are normative; `:line` numbers are hints only. |

> History: drafted 2026-10-03 from a full audit of this repo, to unblock WiseWallet
> SPEC-35 v2.0's Cloud-online branch. Verified absences (not assumptions): no
> change-passcode route exists (`src/routes/authRoutes.js:9-12` lists all four auth
> routes); hashing is bcrypt `genSalt(10)` with plaintext-PIN-in
> (`src/services/authService.js:27-28,77`); `protect` checks JWT + user-exists only,
> never the session id (`src/middlewares/protect.js:16-23`). FINAL v1.0 per user call
> (Option A from Discovery review: `DEC-API-01` confirmed at 20/15min/IP,
> `DEC-API-02` copy confirmed, per-instance throttling on serverless accepted pending
> the deployed-URL matrix in `ACC-API-06`).

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"today", "currently") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem

In one sentence: **Cloud-account users cannot change their PIN anywhere — the app
can only gate the dialog (WiseWallet SPEC-35 DEC-02) because this API offers no
credential-update route.**

### 1.2 Why this shape (verified against this codebase, non-normative)

- Clients already send plaintext PINs (`register`, `login` bodies) and the server
  bcrypt-hashes — so the new endpoint takes plaintext `currentPasscode` /
  `newPasscode` and hashes server-side, exactly like `register`. A generic
  "PUT a hash" design is rejected: it would store hash-of-hash and break `login`'s
  `bcrypt.compare`, and no generic `users` write route exists anyway.
- Sibling pattern is controller-thin / service-thick with zod validation
  (`register`: route → `validate(schema)` → controller → service → repository).
  The new endpoint follows that exact layering — no new pattern.
- `userRepository` has per-field updaters (`updateSessionId`); `updatePasscode`
  mirrors it. No table migration — `users.passcode` already exists.

## 2. Constraints (normative)

- **CON-API-01 — Route and layering.** `POST /api/auth/change-passcode` wired as
  `protect` → `validate(changePasscodeSchema)` → `authController.changePasscode`,
  appended in `src/routes/authRoutes.js` without touching the four existing lines.
  Controller mirrors siblings: try/catch → `next(error)`, success envelope
  `{status:'success', …}`.
- **CON-API-02 — Input schema.** New `changePasscodeSchema` in
  `src/schemas/userSchema.js`: `{ currentPasscode: /^\d{4}$/, newPasscode: /^\d{4}$/ }`
  via zod, plus refinement `newPasscode !== currentPasscode` (400 otherwise).
  Deliberately stricter than `registerSchema`'s `min(4)` — the app contract is
  exactly-4-digits, and this endpoint serves only that client.
- **CON-API-03 — Service semantics** (`authService.changePasscode(userId, currentPasscode, newPasscode)`):
  load the user by `req.user.id` ONLY (never a name/id from the body — no IDOR
  surface); `bcrypt.compare(currentPasscode, user.passcode)` else 401
  `'Current PIN is incorrect'`; `genSalt(10)` + `bcrypt.hash(newPasscode)` (same
  calls as `register`); `userRepository.updatePasscode`; rotate
  `currentSessionId` to a fresh UUID; return a message only.
- **CON-API-04 — Repository.** New `updatePasscode(id, hashedPasscode)` mirroring
  `updateSessionId` (single-column update, `.eq('id', id)`). No other user field
  touched.
- **CON-API-05 — Response.** `200 {status:'success', message:'Passcode changed
  successfully'}`. The response MUST NOT contain the user, any hash, or any token —
  the changer's existing JWT keeps working (24h semantics unchanged).
- **CON-API-06 — No new leaks.** Bodies, PINs, hashes, tokens MUST NOT be logged
  anywhere in the new path (the request logger already records method + URL only).
  Failures go through `AppError` only; the pre-existing global-handler
  stack/`errorDetails` leak is out of scope (flagged in `AGENTS.md` §1.7).
- **CON-API-07 — Rate limiting.** Throttle `POST /api/auth/login` AND the new
  route (4-digit PINs are enumerable without it). New dependency (e.g.
  `express-rate-limit`; user runs the install) — proposed budget **DEC-API-01:
  20 attempts / 15 min / IP**, 429 JSON `{status:'fail', message:'Too many
  attempts, try again later'}`. Numbers confirmed at FINAL.
- **CON-API-08 — Session honesty (stated limit, verified).** Rotating
  `currentSessionId` does NOT invalidate outstanding JWTs, because `protect`
  enforces JWT + user-exists only. Other-device session-kill is explicitly OUT of
  scope; it requires protect-session enforcement, which is its own spec. The app
  keeps its existing 401 handling unchanged.
- **CON-API-09 — Contract freeze.** register/login/logout/deleteAccount behavior,
  existing zod schemas, `users` table shape, JWT 24h semantics — all unchanged.
  Rollback = revert the five touched files + remove the rate-limit dependency.

## 3. Goal & Acceptance Criteria

### 3.1 Decisions

- **DEC-API-01 — Throttle budget (CONFIRMED 20/15min/IP at FINAL).** Per-instance effectiveness on serverless accepted pending the deployed-URL matrix (`ACC-API-06`).
- **DEC-API-02 — Message copy (CONFIRMED at FINAL).** `'Passcode changed successfully'` / `'Current PIN is incorrect'`.

### 3.2 Acceptance criteria (all user-run curl/Postman — no harness exists, `AGENTS.md` §1.10)

- **ACC-API-01 (happy path):** authenticated `POST /api/auth/change-passcode`
  `{currentPasscode:<old>, newPasscode:<new>}` → 200 message-only envelope; then
  `POST /api/auth/login` with new PIN succeeds, with old PIN returns 401.
- **ACC-API-02 (wrong current):** correct token + wrong `currentPasscode` → 401
  `'Current PIN is incorrect'`; `users.passcode` byte-identical (login with old
  PIN still succeeds afterwards).
- **ACC-API-03 (same PIN):** `newPasscode === currentPasscode` → 400, zero writes.
- **ACC-API-04 (auth):** no/invalid token → 401 before any validation or DB read.
- **ACC-API-05 (shape):** non-4-digit values → 400 via `validate` middleware, service never runs.
- **ACC-API-06 (throttle):** exceeding DEC-API-01 budget → 429 envelope; register/
  login/deleteAccount behavior otherwise byte-identical (regression via Postman run).
- **ACC-API-07 (contract mirror):** `Wallet-API.postman_collection.json` gains the
  endpoint (happy + 401 cases) so the collection stays the contract.

## 4. Deliverables (one layer at a time; stop after each for review)

- **D-API-01 (`src/schemas/userSchema.js`):** `changePasscodeSchema` per CON-API-02.
- **D-API-02 (`src/repositories/userRepository.js`):** `updatePasscode` per CON-API-04.
- **D-API-03 (`src/services/authService.js`):** `changePasscode` per CON-API-03.
- **D-API-04 (`src/controllers/authController.js` + `src/routes/authRoutes.js`):** wiring per CON-API-01/05.
- **D-API-05 (rate limit + Postman):** dependency install (user-run) + limiter on login/change-passcode per CON-API-07; collection entry per ACC-API-07. User runs the full ACC-API-01..07 curl matrix and pastes output.
- **D-API-06 (docs):** `docs/savepoint.md` entry in this repo; flip Status to FINAL only on explicit user call.

## 5. Glossary

- **bcrypt:** slow password hash used here (`genSalt(10)`); what makes the server side safe for short PINs.
- **protect:** JWT middleware — validity + user-exists, no session-id comparison (the reason for CON-API-08).
- **currentSessionId:** per-user device-session marker; rotated on login/logout and (here) on change — a record, not a kill switch.
- **IDOR:** acting on another user's record via a body-supplied id — closed by using `req.user.id` only.
- **429:** rate-limit response; the throttle that makes a 4-digit server PIN non-enumerable.

## 6. References

- `src/routes/authRoutes.js` — the four existing auth routes (append-only)
- `src/services/authService.js` — `register` (hash pattern) / `login` (compare + session rules)
- `src/repositories/userRepository.js` — `updateSessionId` (pattern for `updatePasscode`)
- `src/schemas/userSchema.js` — `registerSchema` / `loginSchema` (pattern for new schema)
- `src/middlewares/protect.js` + `src/middlewares/validate.js` — wiring pieces
- `src/app.js` — mounts, logger (method + URL only), global handler (known leak, untouched)
- WiseWallet `specs/35-pin-change-persistence-and-promotion-safety.md` v2.0 DRAFT — the app half (D-03b calls this endpoint)
