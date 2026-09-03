# Backend Development Guidelines

> Best practices for backend development in this project.

---

## Overview

This directory contains guidelines for backend development. Fill in each file with your project's specific conventions.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | `server/` layout, layered modules | Filled |
| [Database Guidelines](./database-guidelines.md) | better-sqlite3 + Drizzle, WAL, `DB_PATH`, gitignore | Filled |
| [Error Handling](./error-handling.md) | `{ message }` envelope, status-code map | Filled |
| [Quality Guidelines](./quality-guidelines.md) | **Contract-alignment rules (do NOT "fix" the API)** | Filled |
| [Logging Guidelines](./logging-guidelines.md) | Fail-fast on secrets, never log tokens | Filled |

## Backend Auth Contract (source of truth)

The 4 auth endpoints and their exact request/response shapes are the **contract** between `server/src/routes/auth.ts` and the frontend (`src/api/auth.ts`). They are deliberately inconsistent by historical design — read [Quality Guidelines](./quality-guidelines.md#forbidden-patterns) before changing anything. Full shape: see `README.md` "鉴权接口" and the task PRD `09-03-implement-backend-and-integrate/prd.md`.

---

## How to Fill These Guidelines

For each guideline file:

1. Document your project's **actual conventions** (not ideals)
2. Include **code examples** from your codebase
3. List **forbidden patterns** and why
4. Add **common mistakes** your team has made

The goal is to help AI assistants and new team members understand how YOUR project works.

---

**Language**: All documentation should be written in **English**.
