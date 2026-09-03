# Type Safety

> Type safety patterns in this project.

---

## Overview

TypeScript 6 in strict mode, with `noUnusedLocals`, `noUnusedParameters`,
`verbatimModuleSyntax`, and `erasableSyntaxOnly` all enabled
(see `tsconfig.app.json`). Type checking runs as part of `npm run build`
(`tsc -b && vite build`), so **type errors break the build** — they are not
advisory.

---

## Type Organization

- Shared domain types live in `src/types/index.ts` and are imported as
  `@/types`.
- A type used by exactly one component stays in that component's file.
  Promote it to `types/` the moment a second module needs it.
- Type-only imports **must** use `import type` — `verbatimModuleSyntax` is on.

```ts
import type { LucideIcon } from 'lucide-react'
import type { KpiStat, OrderStatus } from '@/types'
```

### `erasableSyntaxOnly`: no enums

Enums emit runtime code and are therefore rejected. Use a union of string
literals plus a lookup map:

```ts
// Good — src/types/index.ts
export type OrderStatus = 'completed' | 'processing' | 'pending' | 'refunded'

// Good — src/components/ui/Badge.tsx
const STATUS_STYLES: Record<OrderStatus, { label: string; className: string }> = {
  completed: { label: '已完成', className: 'bg-emerald-500/15 ...' },
  processing: { label: '处理中', className: 'bg-brand-500/15 ...' },
  pending: { label: '待付款', className: 'bg-amber-500/15 ...' },
  refunded: { label: '已退款', className: 'bg-rose-500/15 ...' },
}

// Bad — rejected by erasableSyntaxOnly
enum OrderStatus { Completed = 'completed' }
```

`Record<Union, T>` is the key benefit: adding a member to the union makes
TypeScript flag every unhandled lookup map at compile time.

---

## Validation

No runtime validation library is installed yet — all data comes from local
mocks in `src/data/mock.ts` and is trusted at compile time.

When a real API is introduced, validate at the **boundary** (the fetch
layer), not inside components, so downstream code keeps working with clean
domain types from `types/`.

---

## Common Patterns

- **Component-vs-icon type collision**: `LucideIcon` is imported from
  `lucide-react` when a component accepts an icon. See the naming collision
  warning in `component-guidelines.md`.
- **Narrowing**: prefer exhaustive `switch` / `Record` lookups over chains of
  `if`, so a new union member surfaces as a type error.
- **Library callbacks**: let TypeScript infer parameter types from the
  library signature instead of annotating them. Annotating a recharts
  `Tooltip` formatter as `(value: number)` fails — the library passes
  `ValueType | undefined`.

```tsx
// Good — inferred
formatter={(value) => [`¥${Number(value).toLocaleString('zh-CN')}`, '营收']}

// Bad — TS2322, parameter is ValueType | undefined
formatter={(value: number) => [`¥${value.toLocaleString('zh-CN')}`, '营收']}
```

---

## Typing `forwardRef` Primitives

`components/ui/*` primitives wrap native elements with `forwardRef`. Three
mistakes recur here — all of them fail the build, not just lint.

### 1. Close the `forwardRef(...)` call

The generic call, the arrow function, and the `return (` paren each need their
own closer. The last line before `displayName` is `})`, **not** `}`:

```tsx
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <Comp ref={ref} className={/* ... */} {...props} />
    )
  },
)          // ← arrow body `}` then forwardRef `)`; easy to drop one
Button.displayName = 'Button'
```

Symptom when wrong: `TS1005: ',' expected` pointing at the `displayName` line
far below the real mistake.

### 2. `React.DivHTMLAttributes` does not exist

There is no `DivHTMLAttributes`. Use `HTMLAttributes<HTMLDivElement>`:

```tsx
// Good
interface AlertProps extends React.HTMLAttributes<HTMLDivElement> { /* ... */ }

// Bad — TS2724, and className/children then vanish from the type
interface AlertProps extends React.DivHTMLAttributes<HTMLDivElement> { /* ... */ }
```

### 3. `Omit` native props you redefine

Declaring `size?: 'default' | 'sm' | 'lg'` on an input collides with the native
`size?: number` and triggers `TS2430` on the interface itself. Omit the native
prop before extending:

```tsx
// Good
interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: 'default' | 'destructive'
  size?: 'default' | 'sm' | 'lg'
}

// Bad — TS2430: interface incorrectly extends InputHTMLAttributes
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  size?: 'default' | 'sm' | 'lg'
}
```

Same treatment applies to `color`, `width`, `height`, and `type` whenever a
primitive redefines them with a different domain.

### 4. `jwt-decode` v4 has no default export

`import jwtDecode from 'jwt-decode'` fails with `TS2613`. It is a named export:

```ts
import { jwtDecode } from 'jwt-decode'
```

---

## Forbidden Patterns

- **`any`** anywhere. Use `unknown` plus a type guard when a value is
  genuinely unknown.
- **Non-null assertion `!` on DOM lookups.** `main.tsx` throws an explicit
  error instead:

  ```tsx
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error('未找到挂载节点 #root')
  }
  ```
- **`as` casts to silence errors.** Fix the type; a cast here usually hides a
  real mismatch.
- **`enum`, `namespace`, constructor parameter properties** — all rejected by
  `erasableSyntaxOnly`.
