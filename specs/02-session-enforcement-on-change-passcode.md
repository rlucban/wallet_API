# Spec 02: Session Enforcement on Change-Passcode (Other-Device Logout)

| Field | Value |
|---|---|
| ID | SPEC-API-02 |
| Title | Session enforcement for change-passcode — other devices get logged out |
| Status | **FINAL** (marked by user 2026-10-06; implementable per AGENTS §1) |
| Owner | User (final authority) |
| Version | v1.0 (FINAL; content unchanged from v0.1 except status) |
| Scope | `src/services/authService.js` (`generateToken`, `login`, `changePasscode`), `src/middlewares/protect.js`, `src/controllers/authController.js` (`changePasscode` response only), `Wallet-API.postman_collection.json` |
| Non-goals | Push notifications or polling; any WiseWallet app change (SPEC-35 owns the app half); register/login/logout/deleteAccount behavior beyond the token-payload addition; global error-handler hardening; `JWT_SECRET` env fix; test harness (needs its own spec per §1.10); rate-limit retuning (SPEC-01 DEC-API-01 stands) |
| Normative source | This file (once marked FINAL). File+symbol cites are normative; `:line` numbers are hints only. |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"today", "currently") is non-normative unless restated as a requirement.

## Context

### Problem

In one sentence: **rotating `currentSessionId` on change-passcode logs
nobody out, because no JWT carries a session claim and `protect` never
compares one — so "other devices get logged out" is currently unenforceable.**

### Evidence (verified read-only in this worktree)

- `src/services/authService.js:11-15` — `generateToken(userId)` signs
  `{ id }` only; no session claim exists anywhere.
- `src/services/authService.js:92-96` — `login` stores `newSessionId` then
  mints a token that does not contain it; two devices hold
  indistinguishable tokens.
- `src/middlewares/protect.js:16-24` — verifies JWT validity, loads user
  by `decoded.id`, checks user-still-exists, sets `req.user`. No session-id
  comparison (matches SPEC-01 CON-API-08 stated limit).
- `src/services/authService.js:136-141` — `changePasscode` rotates the
  session id to a fresh UUID and returns a message only
  (`CON-API-05`). Consequence for this spec: once enforcement lands, the
  changer's own pre-change token would also mismatch — so the changer needs
  a fresh session-bound token (CON-API02-03 amendment) to honor the
  changer-stays-in decision (WiseWallet SPEC-35 DEC-03).

## Constraints (normative)

- **CON-API02-01 — Session-bound tokens.** `generateToken` MUST become
  `generateToken(userId, sessionId)` signing `{ id, sid: sessionId }`
  (24h expiry unchanged). `login` MUST mint with the `newSessionId` it just
  stored; `register` MUST mint with the `sessionId` it just created. No
  other payload change.
- **CON-API02-02 — Enforcement with grace (no mass logout on deploy).**
  `protect` MUST, after the existing user-exists check: pass tokens carrying
  **no** `sid` claim (pre-02 tokens, converge out within 24h expiry); 401
  tokens carrying an `sid` that differs from `users.currentSessionId`.
  Mismatch MUST go through `AppError` (401) into the existing global
  handler — no new failure shape (§1.7). Rationale: fail-closed without
  grace would log out every user on deploy the moment this ships.
- **CON-API02-03 — Change returns a fresh token (AMENDS SPEC-01
  CON-API-05).** `changePasscode` MUST rotate `currentSessionId`, mint a
  token bound to the new id, and return `{ message, token }` from the
  service; the controller MUST respond
  `200 { status:'success', message:'Passcode changed successfully',
  data:{ token } }`. The changer stores it and stays logged in; all other
  sid-bound tokens 401 on next call. Message copy otherwise unchanged
  (SPEC-01 DEC-API-02). Rollback = revert these files; old message-only
  clients treat the added `data.token` as unknown and ignore it.
- **CON-API02-04 — Logout stays consistent.** `logout` (nulls session id,
  unchanged) MUST thereby 401 all sid-bound tokens for that user on next
  call. No code change in `logout` itself.
- **CON-API02-05 — No new leaks (§1.6).** `sid` is an opaque UUID and safe
  to embed; bodies, PINs, hashes, and full tokens MUST NOT be logged. The
  §1.6 `JWT_SECRET` fallback gap and §1.7 `errorDetails`/`stack` gap stay
  out of scope (flagged, untouched).
- **CON-API02-06 — Stateless / deploy parity (§1.5).** Session state lives
  only in `users.currentSessionId`. No in-memory sessions; identical under
  `node index.js` and Vercel. No new dependency; throttling untouched.
- **CON-API02-07 — Contract freeze otherwise (§1.4).** Register/login
  envelopes keep `{ status:'success', data:{ user, token } }` shape (token
  content gains `sid`; readers MUST ignore unknown claims). Zod schemas,
  table shapes, 24h semantics unchanged.

## Goal

### Decisions

- **DEC-API02-01 — Grace over big-bang (RECOMMENDED, needs FINAL
  confirmation).** Pre-02 tokens without `sid` pass until expiry (≤24h
  convergence, zero forced logout on deploy). Rejected alternative:
  fail-closed for missing `sid` (instant enforcement, logs out every
  active user on deploy).
- **DEC-API02-02 — 401 copy (PROPOSED).**
  `'Your session was ended on another device.'` via `AppError(401)`. The
  app already maps any 401 to its `session_ended` alert + Login flow, so
  exact wording is display-only here — confirm at FINAL.
- **DEC-API02-03 — Change response shape (PROPOSED per CON-API02-03).**
  Message-only becomes message + `data:{ token }`. Confirm at FINAL (it
  amends SPEC-01 CON-API-05 and needs the app to store the refreshed
  token — WiseWallet SPEC-35 D-03).

### Acceptance (all user-run curl/Postman — no harness exists, §1.10)

- **ACC-API02-01 (enforcement):** device A logs in, device B logs in with
  `force:true`; device A's next protected call (e.g.
  `GET /api/profiles`) → 401 envelope; device B's succeeds.
- **ACC-API02-02 (change kills others, changer survives):** A changes
  passcode → 200 with `data.token`; A's next call with the **new** token
  succeeds; A's **old** token → 401; B's token → 401.
- **ACC-API02-03 (grace):** a pre-02 token (no `sid` claim) succeeds until
  its 24h expiry; any sid-bound mismatched token 401s immediately.
- **ACC-API02-04 (regression):** register/login/logout/deleteAccount
  behavior byte-identical apart from the `sid` inside tokens; 429 throttle
  behavior per SPEC-01 DEC-API-01 unchanged.
- **ACC-API02-05 (contract mirror):** `Wallet-API.postman_collection.json`
  gains the enforced-401 case + the change-returns-token case, with
  expected statuses/bodies.

## Deliverables (one layer at a time; stop after each for review)

- **D-API02-01 (`src/services/authService.js`):** `generateToken` + `login`
  + `register` session binding + `changePasscode` fresh-token return
  (CON-API02-01/03).
- **D-API02-02 (`src/middlewares/protect.js`):** grace + mismatch-401
  (CON-API02-02). Nothing else in the file.
- **D-API02-03 (`src/controllers/authController.js`):** change-passcode
  response shape only (CON-API02-03). Routes file untouched (wiring
  already `authRateLimiter → protect → validate → controller`).
- **D-API02-04 (Postman + user-run matrix):** collection entries +
  ACC-API02-01..05 curl run; user pastes output.
- **D-API02-05 (docs):** `docs/savepoint.md` entry + `AGENTS.md` §3 entry
  (§1.8). Status flips to FINAL only on explicit user call.

## Glossary

- **sid:** opaque session UUID carried as a JWT claim and mirrored in
  `users.currentSessionId`; the comparison that turns rotation into a kill.
- **Grace:** pre-02 tokens without `sid` keep working until expiry; bounds
  deploy blast radius to zero forced logouts.
- **Big-bang (rejected):** 401ing missing-`sid` tokens too — instant
  enforcement at the cost of logging out everyone on deploy.

## References

- `src/services/authService.js:11-15,92-96,136-141` · `src/middlewares/protect.js:16-24` · `src/controllers/authController.js` (changePasscode) · `src/routes/authRoutes.js:14`
- `specs/01-change-passcode-endpoint.md` FINAL v1.0 (CON-API-05 amended by CON-API02-03; CON-API-08 superseded for sid-bound tokens; DEC-API-01/02 untouched)
- WiseWallet `specs/35-pin-change-persistence-and-promotion-safety.md` DRAFT v0.1 (app half: DEC-03 changer-stays-in needs CON-API02-03's fresh token; D-03 stores it; multi-device clause blocked on this spec)
