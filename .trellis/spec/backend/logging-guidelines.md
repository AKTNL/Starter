# Logging Guidelines

> How logging is done in this project.

---

## Overview

Logging is minimal and uses the Node `console` (no external logging library). The priority is **fail-fast on misconfiguration** and **never log secrets**.

## Log Levels (as console methods)

- `console.error` — fatal/startup failures (e.g. missing JWT secrets, uncaught seed errors).
- `console.log` — startup success (`API server listening on ...`), and seed results.

## Fail-Fast (startup)

- `server/src/index.ts` checks `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` **before** `app.listen()`. If either is missing it `console.error`s a clear message and `process.exit(1)`.
- `server/scripts/seed.ts` does the same before touching the DB.

## What NOT to Log

- **Never** log `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `.env` contents, or any token value.
- **Never** log raw passwords or `password_hash`.
- Do not log full request bodies that may contain credentials — the login/register handlers return only shaped responses, no echoed input.

## Common Mistakes

- Continuing to boot when secrets are unset (leads to cryptic `jose` errors at request time instead of a clear startup failure).
- Logging the `refresh_token` for debugging — treat all tokens as secrets.
