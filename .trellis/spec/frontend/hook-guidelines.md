# Hook Guidelines

> How hooks are used in this project.

---

## Overview

**One custom hook exists now:** `useAuth` in `src/hooks/useAuth.ts`.
It consumes the auth context and throws if used outside the provider.

| Hook | Used in | Purpose |
| --- | --- | --- |
| `useState` | `AppLayout` | `collapsed`, `mobileOpen` |
| `useState` | `RevenueChart` | `range` (`'7d' \| '30d'`) |
| `lazy` / `Suspense` | `Dashboard` | Code-split the recharts bundle |
| `useAuth` | `Topbar`, `ProtectedRoute`, etc. | Consume auth context |

Do not invent a custom hook for a single `useState`. Extract only when the
logic is genuinely reused or when a component mixes unrelated concerns.

---

## Custom Hook Patterns

When a custom hook becomes justified, follow this shape:

- **File**: `src/hooks/useThing.ts` — one hook per file, named after it.
- **Export**: named export, `useThing` prefix (`src/` has no default exports
  except `App.tsx`).
- **Location**: `src/hooks/` for cross-cutting hooks; keep a hook inside the
  component folder when only that feature uses it.
- **Return type**: return an object for 3+ values, a tuple for 2 or fewer.
  Do not mix.

```ts
// src/hooks/useAuth.ts — actual implementation
import { useContext } from 'react'
import { AuthContext } from '@/contexts/auth-context'

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

### Extraction criteria

Extract a hook when **at least one** applies:

1. The same stateful logic appears in 2+ components.
2. A component exceeds ~150 lines and mixes state management with rendering.
3. The logic needs independent testing without rendering the component.

---

## Data Fetching

No data fetching exists — all data is static (see `state-management.md`).

When adding it, do **not** hand-roll `useEffect` + `useState`:

```tsx
// Bad — no caching, no error state, race conditions on fast navigation
useEffect(() => {
  fetch('/api/orders').then((r) => r.json()).then(setOrders)
}, [])
```

Use TanStack Query (or SWR) and put the fetch function in `src/api/`.

---

## Naming Conventions

- Hook names start with `use` (`useOrders`, `useDisclosure`).
- Never call a hook conditionally or inside a loop — `oxlint` enforces
  `react/rules-of-hooks` as an **error**, which fails `npm run lint`.
- Prefix event-handler *props* on components with `on`
  (`onToggleCollapsed`, `onCloseMobile`, `onOpenMobileMenu`).

---

## Common Mistakes

- **Extracting a hook for one `useState`.** Adds indirection with no benefit.
- **Putting side effects in render.** Effects belong in `useEffect`.
- **Re-creating objects passed to memoized children.** Hoist constant objects
  to module scope or wrap in `useMemo`.
- **Forgetting `Suspense` around a lazy component.** `RevenueChart` is loaded
  via `lazy()` in `Dashboard.tsx`; without the `Suspense` boundary the whole
  page fails to render.

```tsx
// Good — src/pages/Dashboard.tsx
const RevenueChart = lazy(() =>
  import('@/components/dashboard/RevenueChart').then((module) => ({
    default: module.RevenueChart,
  })),
)
// ...
<Suspense fallback={<ChartFallback />}>
  <RevenueChart />
</Suspense>
```

Note the `.then((m) => ({ default: m.RevenueChart }))` mapping — required
because `RevenueChart` is a **named** export, while `lazy()` expects default.
