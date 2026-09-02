# Component Guidelines

> How components are built in this project.

---

## Overview

Function components only. No class components, no `React.FC`.
Props are a local `interface` in the same file.
Styling is Tailwind utility classes merged through `cn()`.

---

## Component Structure

Order inside a component file:

1. imports (React types first, then third-party, then `@/`; `import type` for types)
2. module-level constants
3. props `interface`
4. named-export component

```tsx
import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { KpiStat } from '@/types'

export function StatCard({ label, value, change, trend, icon: Icon }: KpiStat) {
  const isUp = trend === 'up'
  const TrendIcon = isUp ? TrendingUp : TrendingDown

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      {/* ... */}
    </div>
  )
}
```

Keep lookup maps at module level so they are not re-created per render:

```tsx
// src/components/ui/Badge.tsx
const STATUS_STYLES: Record<OrderStatus, { label: string; className: string }> = { /* ... */ }
```

---

## Props Conventions

- Declare props as `interface FooProps` in the same file; export it only if
  another module genuinely needs it.
- **Prefer reusing a domain type over re-declaring fields.** `StatCard`
  takes `KpiStat` directly instead of five separate props.
- Destructure in the parameter list; rename on destructure when a name
  collides or is not a valid identifier (`icon: Icon`).
- Use `children: ReactNode` for open-ended composition. Typed slots are fine
  when clearer (`CardHeader` uses `title` + `description` + `action`).
- Optional props: mark with `?`; handle absence by conditional rendering.
  Do not add required props for hypothetical future needs.

### Icon props

Pass the **component**, not an element or a name string:

```tsx
// Good
import { Users as UsersIcon } from 'lucide-react'
<PagePlaceholder icon={UsersIcon} />

// Bad
<PagePlaceholder icon={<Users />} />
<PagePlaceholder icon="users" />
```

> **Warning**: A page component named `Users` or `Settings` **collides with
> the same-named lucide icon import**, producing `TS2440` plus a confusing
> `TS2741` about `$$typeof`. Always alias the icon import
> (`import { Users as UsersIcon } from 'lucide-react'`).

---

## Styling Patterns

Tailwind CSS 4 via `@tailwindcss/vite`. Brand colors are `@theme` tokens in
`src/index.css`, so `bg-brand-500` / `text-brand-400` work out of the box.

| Role | Class |
| --- | --- |
| Page background | `bg-[#0b0d12]` |
| Sidebar background | `bg-[#0f1117]` |
| Card | `rounded-xl border border-white/10 bg-white/[0.03] p-5` |
| Muted text | `text-white/50`; `text-white/40` for secondary |
| Brand accent | `text-brand-400`, `bg-brand-500`, `bg-brand-500/15` |

Rules:

- **Always build className through `cn()`** when classes are conditional or
  merged from a prop. `cn()` = `twMerge(clsx(...))`, so later classes win.
- Extract a shared constant instead of pasting long class strings. If the
  same card container appears 3+ times, promote it to `components/ui/Card`.
- No inline `style` objects except for computed values (e.g. chart colors
  handed to recharts).

### Trend color convention (China)

`up` → **red** (`text-red-400`); `down` → **green** (`text-emerald-400`).
This is the opposite of the US/EU convention and applies to **every**
metric/indicator component, not just `StatCard`.

---

## Accessibility

- Icon-only buttons must carry `aria-label` (see `Topbar`'s menu and
  notification buttons).
- Decorative overlays (`AppLayout`'s mobile backdrop) use
  `role="presentation"` with `onClick` — never a bare `<div onClick>`.
- Every `<input>` needs a label: visible `<label>` or `aria-label` when the
  design has no room.
- Interactive elements are real `<button type="button">`, not `<div>`.

---

## Common Mistakes

- **Exporting a component as default.** Only `App.tsx` uses a default export;
  everything else is named. Mixing the two makes imports inconsistent and
  breaks the `lazy()` pattern used for `RevenueChart`.
- **Duplicating the card wrapper.** Four copies of
  `rounded-xl border border-white/10 ...` means it should be `Card`.
- **Re-declaring domain fields in props** when a `types/` interface already
  describes the shape.
- **Inline conditional class strings without `cn()`** — conflicting Tailwind
  classes then resolve unpredictably.
