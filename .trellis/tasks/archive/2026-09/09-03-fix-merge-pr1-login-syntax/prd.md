# 修复合并 PR #1 后的构建失败

## 背景

用户合并了 `pull request #1`（提交 `08d67a5`，来自 `EIR9264/main`）后，运行 `npm run dev` 时
Vite/oxc 报解析错误导致白屏。该 PR 改动了 11 个文件（新增 `src/api/auth.ts`、
`src/lib/auth.ts`、`src/components/ui/*`，重写 `src/pages/Login.tsx`、`src/pages/Register.tsx`、
`src/contexts/AuthContext.tsx`）。

已确认 **不是** git 冲突残留（源码中无 `<<<<<<<` / `=======` / `>>>>>>>` 标记），
而是 PR 作者提交的代码本身存在 4 处语法错误。

## 目标

修复 4 处语法错误，使 `npx tsc -b --noEmit` 与 `npx oxlint src/` 均无 error，
`npm run dev` 可正常启动。

## 问题清单

### P0 — 语法错误（阻断构建）

| # | 文件 | 位置 | 问题 | 修复 |
|---|------|------|------|------|
| 1 | `src/pages/Login.tsx` | 107 行 | `{isLoading ? '登录中...' : '登录}` 字符串缺右引号 | 补 `'` → `'登录'}` |
| 2 | `src/pages/Register.tsx` | 127 行 | `{isLoading ? '注册中...' : '立即注册}` 字符串缺右引号 | 补 `'` → `'立即注册'}` |
| 3 | `src/components/ui/Button.tsx` | 51 行 | `forwardRef<...>(...)` 调用缺右括号，箭头函数体的 `}` 后应为 `})` | `}` → `})` |
| 4 | `src/components/ui/Input.tsx` | 49 行 | 同上 | `}` → `})` |

### P1 — 未使用变量（lint warning，不阻断构建）

> 【决策】用户已确认**一并清理**。

| # | 文件 | 位置 | 问题 | 修复 |
|---|------|------|------|------|
| 5 | `src/lib/auth.ts` | 2 行 | `getAccessToken` 导入未使用 | 从 import 语句中移除 |
| 6 | `src/api/auth.ts` | 102 行 | `catch (error)` 中 `error` 未使用 | 改为可选 catch 绑定 `catch {` |
| 7 | `src/contexts/AuthContext.tsx` | 6 行 | `decodeToken` 导入未使用 | 从 import 语句中移除 |
| 8 | `src/contexts/AuthContext.tsx` | 33 行 | `catch (refreshError)` 中 `refreshError` 未使用 | 改为可选 catch 绑定 `catch {` |

**约束**：清理时只删除未使用的标识符，不得改动任何业务逻辑、控制流或错误信息。
`catch` 块内部的语句一律保持原样。

## 明确不在范围内

- 不重构 PR 引入的认证逻辑（`AuthContext` / `api/auth.ts` / `lib/auth.ts`）
- 不修改 `package.json`、`package-lock.json`
- 不改动 `.trellis/` 下的其他既有改动（`.template-hashes.json`、`.opencode/`）

## 验收标准

1. `npx tsc -b --noEmit` 无 error
2. `npx oxlint src/` 无 error 且无 warning
3. `npm run build` 能完成编译

## 验证方式

```bash
cd /d/Starter
npx tsc -b --noEmit
npx oxlint src/
```
