# Quality Guidelines

> Code quality standards for backend development.

---

## Overview

The backend is small and contract-driven. The single most important rule is **do not "tidy up" the API contract** — it is dictated by the existing frontend and its historical quirks. Breaking it silently breaks login for everyone.

## Forbidden Patterns

- **Do NOT "unify" snake_case and camelCase.** The frontend contract is deliberately inconsistent:
  - Response bodies use **snake_case**: `access_token`, `refresh_token`.
  - The refresh **request** body uses **camelCase**: `{ refreshToken }` (not `refresh_token`).
  - Fixing this "inconsistency" on the backend breaks the frontend. Keep both as-is.
- **Do NOT rename `name` → `username` away.** Registration takes `name`, but the stored column and the response field are `username`. The route maps `name` → `username` on insert (`toUser()`). Preserve this mapping.
- **Do NOT switch `user.id` to an auto-increment integer.** It is a **string UUID** (TEXT PK). The frontend `User.id` is `string`.
- **Do NOT hardcode JWT secrets or commit `.env`.** Secrets come from `process.env` and fail-fast if missing.
- **Do NOT return `access_token` without an `exp` claim.** The frontend's `isTokenExpired()` reads `exp` from the decoded token; omitting it breaks auto-refresh.

## Required Patterns

- Two separate JWT secrets: `JWT_ACCESS_SECRET` (15m) and `JWT_REFRESH_SECRET` (7d), signed with `jose` (`HS256`).
- Passwords hashed with **argon2id** (`argon2.hash(..., { type: argon2.argon2id })`).
- `access_token` and `refresh_token` are always returned as a pair from login/register/refresh.
- `requireAuth` middleware attaches `req.user` (`sub`, `email`, `role`, `exp`) before handlers.

## Testing Requirements

- Server has no automated test suite yet. Verify manually via `curl` against the 4 endpoints (register, login, me, refresh) and the error cases (400/401/409).
- Frontend auth is covered by Vitest + MSW (`src/api/auth.test.ts`, `src/contexts/AuthContext.test.tsx`, `src/components/auth/ProtectedRoute.test.tsx`) — keep those green.

## Code Review Checklist

- [ ] Contract fields match exactly (snake_case responses, `refreshToken` body, `name`→`username`, string `id`, `exp` claim).
- [ ] No secret in source; fail-fast if `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` unset.
- [ ] All error paths return `{ message }` with the correct 4xx status.
- [ ] Passwords are argon2id; never stored/plaintext compared.
- [ ] `npm run lint` / `typecheck` / `build` (frontend) and `npm --prefix server run typecheck` stay green.
