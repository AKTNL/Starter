# Quality Guidelines

> Code quality standards for frontend development.

---

## Overview

Quality bar is enforced by three commands, all of which must pass before work
is considered done:

```bash
npm run build   # tsc -b (type check) && vite build
npm run lint    # oxlint
```

**Linter is oxlint, not ESLint.** The Vite template ships `oxlint` with
`.oxlintrc.json`; `eslint` and `typescript-eslint` are not installed. Do not
add them, and do not write `.eslintrc` expecting it to run.

Active rules: `react`, `typescript`, `oxc` plugins, with
`react/rules-of-hooks` as **error** and `react/only-export-components` as
warn (`allowConstantExport: true`).

---

## Forbidden Patterns

- **`any`.** Use `unknown` + a type guard. See `type-safety.md`.
- **`enum` / `namespace` / parameter properties.** Rejected by
  `erasableSyntaxOnly`; they emit runtime code.
- **`baseUrl` in tsconfig.** Deprecated in TS 6 (`TS5101`), breaks the build.
- **Default exports (except `App.tsx`).** Breaks `lazy()` and import consistency.
- **Duplicated long Tailwind class strings.** Promote to a `components/ui/`
  primitive after the third copy.
- **Bare `<div onClick>`.** Use `<button type="button">`, or
  `role="presentation"` for a non-interactive backdrop.
- **Green-for-up trend colors.** This project uses 红涨绿跌
  (red = up, green = down). See `component-guidelines.md`.
- **Disabling lint rules to make a check pass.** Fix the code.

---

## Required Patterns

- `cn()` for any conditional or merged className.
- `import type` for type-only imports (`verbatimModuleSyntax`).
- `@/` path alias over deep relative chains.
- Icon passed as a **component reference**, with an alias when the name would
  collide (`import { Users as UsersIcon } from 'lucide-react'`).
- Named exports everywhere except `App.tsx`.
- Module-level constants for lookup maps (status styles, nav items, ranges).
- One source of truth for config: nav items come from `data/navigation.ts`,
  never hardcoded in `Sidebar`.

---

## Testing Requirements

**No test framework is installed and no tests exist.** This was an explicit
out-of-scope decision for the initial shell build.

When tests are added, in priority order:

1. `lib/utils.ts` — pure functions (`cn`, `formatCurrency`, `formatCompact`);
   cheapest meaningful coverage.
2. `components/ui/*` — presentational primitives, assert rendered output for
   each `OrderStatus` / `TrendDirection`.
3. `components/dashboard/RevenueChart` — assert the 7d/30d toggle swaps the
   dataset (`REVENUE_SERIES['7d']` length 7 vs `['30d']` length 30).
4. Routing — assert each nav item renders its page and that an unknown path
   redirects to `/`.

Add them at that point and update this section with the chosen runner.

---

## Code Review Checklist

- [ ] `npm run build` passes (includes `tsc -b`)
- [ ] `npm run lint` passes with 0 errors
- [ ] No `any`, no `as` casts added to silence errors
- [ ] No new default exports
- [ ] Types come from `types/` rather than being re-declared inline
- [ ] Conditional classes go through `cn()`
- [ ] New shared UI moved to `components/ui/`, not copy-pasted
- [ ] Trend indicators follow red-up / green-down
- [ ] Interactive elements are real `<button>`s with `aria-label` when icon-only
- [ ] Bundle impact checked — `npm run build` reports no chunk-size warning
  (recharts is lazy-loaded in `Dashboard.tsx` for this reason)
