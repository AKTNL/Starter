# Frontend Development Guidelines

> Best practices for frontend development in this project.

---

## Overview

Admin dashboard built with **Vite 8 + React 19 + TypeScript 6 + Tailwind CSS 4**,
routed with react-router-dom 7, charted with recharts 3, icons from lucide-react.

All guidelines below describe **what the code actually does today** — they were
written from the initial dashboard implementation (`src/`), not from
aspirational best practices.

---

## Pre-Development Checklist

Read these before writing frontend code:

- [ ] [Directory Structure](./directory-structure.md) — where the new file goes, import direction rules, naming
- [ ] [Component Guidelines](./component-guidelines.md) — component shape, props, Tailwind tokens, a11y
- [ ] [Type Safety](./type-safety.md) — strict-mode constraints, no enums, `import type`

Read when the task touches these areas:

- [ ] [State Management](./state-management.md) — before adding **any** shared state (there is no global store)
- [ ] [Hook Guidelines](./hook-guidelines.md) — before extracting a custom hook or adding data fetching
- [ ] [Quality Guidelines](./quality-guidelines.md) — before finishing; the lint/test/build bar

Also check the [thinking guides](../guides/index.md) when a change spans layers
or repeats an existing pattern.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Module organization and file layout | Filled |
| [Component Guidelines](./component-guidelines.md) | Component patterns, props, composition | Filled |
| [Hook Guidelines](./hook-guidelines.md) | Custom hooks, data fetching patterns | Filled (documents useAuth) |
| [State Management](./state-management.md) | Local state, global state, server state | Filled (auth uses Context) |
| [Quality Guidelines](./quality-guidelines.md) | Code standards, forbidden patterns | Filled |
| [Type Safety](./type-safety.md) | Type patterns, validation | Filled (no runtime validation yet) |

---

## Project-Defining Conventions

Three conventions are unusual enough that they trip people up. They are
documented in detail in the linked files, but worth stating up front:

1. **红涨绿跌** — trend indicators are red for up, green for down (China
   convention, opposite of US/EU). See `component-guidelines.md`.
2. **Linter is oxlint, not ESLint** — `npm run lint` runs `oxlint`. Do not add
   ESLint config expecting it to run. See `quality-guidelines.md`.
3. **Global state is minimal** — only auth state uses Context (because it
   meets all three criteria in `state-management.md`). Do not introduce
   Redux/Zustand/Context without meeting those criteria first.

---

## Known Gaps

Deliberate out-of-scope decisions from the initial build — confirm with the
team before relying on them:

- No test framework, no tests
- No runtime validation at API boundaries (no backend exists yet)
- Dark theme only; no light-mode switch

---

**Language**: All documentation in this directory is written in **English**.
User-facing copy in the app itself is **Chinese**.
