# State Management

> How state is managed in this project.

---

## Overview

**No global state library.** There is no Redux / Zustand / Jotai / Context
store in this project. State is deliberately local and colocated:

- `AppLayout` owns UI-shell state (`collapsed`, `mobileOpen`).
- `RevenueChart` owns its own `range` (`'7d' | '30d'`).
- Everything else renders from static data in `src/data/`.

This is a deliberate choice, not an oversight — the app is a shell with mock
data. Do **not** introduce a global store for the sake of it.

---

## State Categories

| Category | Where it lives | Current examples |
| --- | --- | --- |
| UI-shell state | Closest common parent of the components that need it | `AppLayout`: `collapsed`, `mobileOpen` |
| Widget-local state | Inside the widget | `RevenueChart`: `range` |
| Route state | The URL, via react-router | Current page (`/`, `/users`, …) |
| Server state | Does not exist yet | — |

### Rules

- Keep state as low as possible. Lift it only when a **sibling** needs it —
  not a descendant.
- `AppLayout` holds `collapsed` because both `Sidebar` (width) and the
  content wrapper (`lg:pl-*`) depend on it.
- Route state belongs in the URL, never in a `useState`. Sidebar active-item
  highlighting uses `NavLink`'s `isActive`, so a page refresh keeps the
  correct item highlighted with zero extra state.

---

## When to Use Global State

Only when **all** of the following are true:

1. The value is read by 3+ components in unrelated branches of the tree.
2. Passing it down would require threading props through 3+ layers.
3. It must survive route changes.

Today nothing qualifies. Auth/session state and theme preference are the
most likely first real candidates — add a store at that point, and update
this file with the chosen library and patterns.

---

## Server State

There is no server state. All data comes from `src/data/mock.ts`.

When wiring a real API:

1. Add `src/api/` for the fetch layer (keep it out of `data/`).
2. Introduce a server-state library (TanStack Query or SWR) rather than
   hand-rolling `useEffect` + `useState` fetching.
3. Validate responses at that boundary (see `type-safety.md`).
4. Replace `data/mock.ts` imports in `components/dashboard/*` — do not keep
   both paths alive.

---

## Common Mistakes

- **Adding Context "just in case".** Context re-renders every consumer; for
  `collapsed` that would re-render the whole tree on each toggle.
- **Mirroring the URL into state.** If it is in the URL, read it from
  react-router (`useLocation`, `useParams`, `NavLink.isActive`).
- **Storing derived values.** Compute during render; `RevenueChart` derives
  its dataset via `REVENUE_SERIES[range]` rather than storing the array.
- **Prop-drilling through an intermediate that does not use the value.** That
  is the signal to move state down or restructure, not to add a store.
