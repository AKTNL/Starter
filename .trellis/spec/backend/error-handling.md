# Error Handling

> How errors are handled in this project.

---

## Overview

Errors are returned as a **fixed envelope** and never leak internals. Validation is done with `zod` at the top of each route handler.

## API Error Responses

Every error response is exactly:

```json
{ "message": "string" }
```

Status codes (see `server/src/routes/auth.ts`):

| Scenario | Status |
| --- | --- |
| Missing / malformed `Authorization` header | 401 |
| Invalid or expired access token | 401 |
| Invalid refresh token | 401 |
| Login with wrong credentials | 401 |
| Email already registered | 409 |
| `zod` validation failure (bad body) | 400 |
| User not found for a valid token | 401 |

## Error Handling Patterns

- Validate the request body with a `zod` schema's `.safeParse()`; on failure return `400` with a generic message (do **not** echo the zod error to the client).
- Wrap token verification in `try/catch`; on `jwtVerify` throw, return `401`.
- Password comparison failures must return the **same** generic message as "user not found" (`Invalid email or password`) to avoid user enumeration.

## Common Mistakes

- Returning stack traces or raw DB errors to the client.
- Using a different error shape (e.g. `{ error: ... }` or `{ error: { message } }`) — the frontend expects `{ message }`.
- Returning `200` with an error payload instead of a proper 4xx status.
