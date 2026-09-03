# Quality Guidelines

> Code quality standards for frontend development.

---

## Overview

Quality bar is enforced by four commands, all of which must pass before work
is considered done:

```bash
npm run build   # tsc -b (type check) && vite build
npm run lint    # oxlint
npm test        # vitest run
```

**Linter is oxlint, not ESLint.** The Vite template ships `oxlint` with
`.oxlintrc.json`; `eslint` and `typescript-eslint` are not installed. Do not
add them, and do not write `.eslintrc` expecting it to run.

Active rules: `react`, `typescript`, `oxc` plugins, with
`react/rules-of-hooks` as **error** and `react/only-export-components` as
warn (`allowConstantExport: true`).

---

## After Merging a Branch

`git merge` / merging a PR that touched `package.json` updates the manifest but
**not** `node_modules`. Building straight away produces `TS2307: Cannot find
module 'x'` plus a cascade of `TS7006: Parameter implicitly has an 'any' type`
on that library's callbacks — which reads like broken code but is just a stale
install. Run `npm install` before diagnosing anything else.

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

测试运行器为 **Vitest**（`npm test`）。与 ESLint 无关 —— `oxlint` 仍管 lint。

```bash
npm test          # vitest run（一次跑完，CI 友好）
npm run coverage  # 带 v8 覆盖率报告
```

约定：

- 测试文件与源码同目录，命名 `*.test.ts` / `*.test.tsx`
- Vitest 配置并入 `vite.config.ts` 的 `test` 字段（**不**新建 `vitest.config.ts`，否则 alias
  失同步）；CR 级别的 alias 会被覆盖丢失
- `globals: true` + `src/test/setup.ts`，否则 `@testing-library/react` 的自动 cleanup 不生效
- HTTP 请求用 **MSW** mock（`src/mocks/handlers.ts` + `src/mocks/server.ts`），后端上线后
  handler 可平滑迁移到契约测试
- jsdom 的 `url` 设为 `http://localhost:3000`，否则 axios 相对 `/api` 在测试里拼不出绝对 URL，
  MSW 无法匹配
- `localStorage` 在 `setup.ts` 的 `beforeEach` 清空，保证用例隔离
- 覆盖边界/错误路径优先

已覆盖（P0）：

1. `src/lib/auth.ts` — token/user 存取与清理、`clearStoredAuth` 全清
2. `src/api/auth.ts` — 四个接口 + 请求拦截器带 `Authorization`（直接验证 token key 不一致修复）
3. `src/contexts/AuthContext.tsx` — 无 token 时稳定到 `user === null`
4. `src/components/auth/ProtectedRoute.tsx` — 未登录跳 `/login`、已登录放行

后续新增测试请沿用以上结构。

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
