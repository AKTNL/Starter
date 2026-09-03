# 修复认证 key Bug 并建立测试体系

## Goal

修复 axios 拦截器读不到 token 的阻塞级 Bug（不修则后端联调永远 401），并建立前端测试体系，优先覆盖风险最高的 JWT 认证链路。

本任务为父任务 `09-03-add-tests-and-backend` 的**第一批**，只做前端修复 + 测试，不做后端实现。

## Requirements

### R1 — 修复 localStorage key 不一致（阻塞级）

| 位置 | 使用的 key |
|---|---|
| `src/lib/auth.ts:5-6`（AuthContext 存/取） | `starter-access-token` / `starter-refresh-token` |
| `src/api/auth.ts:15,65-66,118`（axios 拦截器取） | `access_token` / `refresh_token` / `user` |

后果：拦截器 `config.headers.Authorization` 永不设置 → `GET /auth/me` 永久 401 → 每次刷新被踢登录。

修法：把 `src/api/auth.ts` 三处裸字符串改为复用 `@/lib/auth` 的 `getStoredAccessToken()` / `setStoredAccessToken()` / `setStoredRefreshToken()`（同时清理被注释掉、且用错 key 的 `authAPI.logout()` 删除逻辑）。消除重复实现。

验收点：修复后 `authAPI` 发出的请求 `Authorization` 头正确带上 token。

### R5a — 补 `.gitignore`（隐私硬约束）

新增以下条目，仅新增、不改动任何既有规则：

```gitignore
# Environment
.env
.env.*
!.env.example

# Server (后端子任务会用到)
server/data/
*.db
*.db-shm
*.db-wal
```

### R2 — 建立测试体系

- Vitest 4.1.11，把 `test` 字段并入现有 `vite.config.ts`（**不**新建 `vitest.config.ts`，避免 alias 两处维护）
- jsdom 30 + RTL 16.3.3 + jest-dom 7.0.1 + user-event 14.6.7
- HTTP mocking 用 MSW 2.15.0（后端上线后同一套 handler 可平滑迁到合同测试）
- `globals: true` + `src/test/setup.ts`（否则 RTL 自动 cleanup 不生效）
- `npm test` 接入 `package.json` scripts
- 跑 `npm install` 安装上述 devDependencies

### R2 — 认证链路 P0 用例（来自 `research/test-stack.md` §6.2）

- `src/lib/auth.ts`：存取 user / access token / refresh token，清空函数
- `AuthProvider`：`isTokenExpired` 未过期 → 调 `/auth/me`；过期但有 refresh → 先刷新再取；刷新失败 → 清空登录态并跳转
- `ProtectedRoute`：未登录跳转 `/login`，已登录放行
- `authAPI`：login / register / getCurrentUser / refreshToken 四个接口（MSW mock 响应）

## Acceptance Criteria

- [ ] `npm run typecheck` / `npm run lint` / `npm run build` 全绿（不因新增测试退化）
- [ ] `npm test` 可执行，认证链路 P0 用例全部通过
- [ ] R1 修复后，`authAPI` 请求带正确的 `Authorization` 头（用 MSW 断言拦截器行为）
- [ ] `.gitignore` diff 只有新增行，既有规则零改动
- [ ] 仓库中不含 `.env`；`git status` 干净

## Definition of Done

- 新增代码通过 lint / typecheck / 测试
- 无敏感信息入库
- 研究记录沉淀到 `.trellis/spec/frontend/`（测试约定）

## Technical Approach

全部技术细节见 `research/test-stack.md`（版本号均 2026-09-03 实查）：

| 用途 | 选型 | 版本 |
|---|---|---|
| 测试运行器 | Vitest | 4.1.11 |
| DOM 环境 | jsdom | 30.0.1 |
| 组件测试 | @testing-library/react | 16.3.3 |
| DOM 断言 | @testing-library/jest-dom | 7.0.1 |
| 交互模拟 | @testing-library/user-event | 14.6.7 |
| HTTP mocking | MSW | 2.15.0 |
| 覆盖率 | @vitest/coverage-v8 | 4.1.11 |

## Out of Scope

- 后端实现（`09-03-implement-backend-and-integrate`）
- 前后端联调（同子任务2）
- E2E 测试

## Research References

- [`research/test-stack.md`](../../09-03-add-tests-and-backend/research/test-stack.md) — 测试栈选型 + 12 条 P0 用例

## Technical Notes

- `tsconfig` 开 `verbatimModuleSyntax` → 类型导入必须 `import type`
- `erasableSyntaxOnly: true` → 不用 enum，用 `as const`
- 改 `vite.config.ts` 的 `test` 字段时，注意 `defineConfig` 需要引入 vitest 的类型扩展（典型坑见 test-stack.md §1.4）
