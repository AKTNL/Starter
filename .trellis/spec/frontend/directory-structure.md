# Directory Structure

> How frontend code is organized in this project.

---

## Overview

Single-page admin dashboard: Vite 8 + React 19 + TypeScript 6.
The app has **no feature-module boundaries yet** — it is small enough that
pages and shared components are separated, but components are grouped by
*kind* (`layout/` `ui/` `dashboard/`) rather than by feature.

Move to feature folders (`src/features/orders/`) only when one feature
accumulates 5+ files. Do not do it pre-emptively.

---

## Directory Layout

```
src/
├── main.tsx                  Entry point. Mounts <BrowserRouter>; no providers yet
├── App.tsx                   Route table only — no layout or business logic
├── index.css                 `@import 'tailwindcss'` + @theme tokens + base layer
├── components/
│   ├── layout/               App shell: AppLayout, Sidebar, Topbar
│   ├── ui/                   App-agnostic primitives: Card, Badge, StatCard, PagePlaceholder
│   └── dashboard/            Domain widgets: StatsGrid, RevenueChart, RecentOrders
├── pages/                    One file per route: Dashboard, Users, Orders, Products, Settings
├── data/
│   ├── mock.ts               All mock datasets (KPI_STATS, REVENUE_SERIES, RECENT_ORDERS)
│   └── navigation.ts         NAV_ITEMS — single source of truth for the sidebar
├── lib/utils.ts              cn(), formatCurrency(), formatCompact()
└── types/index.ts            Shared domain types
```

---

## Module Organization

- **`components/ui/`** — reusable and domain-agnostic. If a component needs
  to import from `data/` or `pages/`, it belongs in `components/dashboard/`
  or `pages/`, not here.
- **`components/dashboard/`** — widgets combining `ui/` primitives with domain
  data; these *may* import from `data/`.
- **`pages/`** — route targets. Compose widgets, own page-level copy
  (titles, descriptions). Keep thin.
- **`data/`** — static data and configuration. No React imports.
- **`lib/`** — pure functions only. No JSX, no hooks.

### Import rules

| From | May import |
| --- | --- |
| `pages/` | `components/**`, `data/`, `lib/`, `types/` |
| `components/dashboard/` | `components/ui/`, `data/`, `lib/`, `types/` |
| `components/ui/` | `lib/`, `types/` |
| `data/`, `lib/`, `types/` | nothing from the app |

Never import upward (e.g. `components/ui/` importing from `pages/`).

---

## Naming Conventions

- **Files**: `PascalCase.tsx` for components/pages, `camelCase.ts` for
  everything else (`utils.ts`, `mock.ts`, `navigation.ts`).
- **Components**: named export matching the filename —
  `export function StatCard()` in `StatCard.tsx`. **Not** default export.
  The only default export in `src/` is `App` in `App.tsx`.
- **Constants**: `SCREAMING_SNAKE_CASE` for module-level data
  (`KPI_STATS`, `RECENT_ORDERS`, `NAV_ITEMS`).
- **Path alias**: `@/` → `src/`. Prefer it over long relative chains.
  Configured in **two** places — `tsconfig.app.json` `paths` **and**
  `vite.config.ts` `resolve.alias`. Changing one without the other breaks
  the build.

> **Warning**: TypeScript 6 no longer needs `baseUrl`; `paths` resolves
> relative to the tsconfig file. Adding `baseUrl` back raises `TS5101` and
> fails `npm run build`.

---

## Examples

- Widget composition: `src/pages/Dashboard.tsx`
- Presentational primitive: `src/components/ui/StatCard.tsx`
- Config as single source of truth: `src/data/navigation.ts`
