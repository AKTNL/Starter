# 补齐测试覆盖与后端服务

## Goal

项目当前是「前端先行」状态：React 管理后台已完成，但**零测试**且**完全没有后端** —— `npm run dev` 后点登录必定 404（`vite.config.ts` 无 proxy，axios `baseURL` 默认 `/api` 但无服务）。

本任务要一次补齐这两块：
1. 建立前端测试体系，优先覆盖风险最高的 JWT 认证链路；
2. 写一个**真实的后端服务**（非 MSW、非 json-server mock），跑通注册 / 登录 / token 刷新 / 受保护接口，并让前后端真正联调成功。

## Requirements

### R1 — 修复联调阻塞级 Bug（必须最先做）

`src/api/auth.ts` 与 `src/lib/auth.ts` 的 localStorage key 不一致，导致 axios 拦截器永远读不到 token：

| 位置 | 使用的 key |
|---|---|
| `src/lib/auth.ts:5-6`（AuthContext 存/取） | `starter-access-token` / `starter-refresh-token` |
| `src/api/auth.ts:15,65-66,118`（axios 拦截器取） | `access_token` / `refresh_token` |

后果：`Authorization` 头永不设置 → `GET /auth/me` 永久 401 → 每次刷新页面被踢登录。

修法：把 `src/api/auth.ts` 三处裸字符串改为复用 `@/lib/auth` 的 `getStoredAccessToken()` 等函数，消除重复实现。

### R2 — 前端测试体系

- 引入 Vitest，不新建 `vitest.config.ts`，把 `test` 字段并入现有 `vite.config.ts`（避免 alias 两处维护）
- 覆盖认证链路 P0 用例：`src/lib/auth.ts` 存取与清理、`AuthProvider` 的 token 校验 / 刷新 / 刷新失败清空、`ProtectedRoute` 守卫跳转、`authAPI` 四个接口
- `npm test` 接入 package.json scripts

### R3 — 真实后端服务

- Express 服务，挂 `/api` 前缀，端口 `3001`
- 实现 4 个接口，严格对齐前端现有契约（见 Technical Notes 的契约表）
- SQLite 持久化用户，argon2id 哈希密码，JWT 用 access(15min) + refresh(7d) 双 token
- 提供 `.env.example` 占位，真实密钥只存本地 `.env`
- 种子脚本：初始化一个可登录的演示账号

### R4 — 前后端联调

- `vite.config.ts` 配 `server.proxy` 把 `/api` 转发到 `localhost:3001`（免 CORS）
- `npm run dev` 一条命令双启前后端（concurrently）
- 端到端验收：注册 → 登录 → 刷新页面保持登录 → token 过期自动刷新 → 登出

### R5 — 隐私与 .gitignore（用户明确要求，硬约束）

- **补 `.gitignore`**：新增 `.env`、`.env.*`（白名单 `!.env.example`）、`*.db` 及 `server/data/`
- 修改 `.gitignore` 前须经用户确认，本次仅新增条目、不改动任何既有规则
- JWT 密钥、数据库路径等一律走环境变量，禁止硬编码进源码或提交进仓库
- 提交前必查 `git status`，确认无 `.env`、无数据库文件、无本地工具目录入库

## Acceptance Criteria

- [ ] `npm run typecheck` / `npm run lint` / `npm run build` 全绿（不因新增内容退化）
- [ ] `npm test` 可执行，认证链路 P0 用例全部通过
- [ ] `npm run dev` 一条命令启动前后端，无端口冲突
- [ ] 能真实注册新账号并登录成功，数据落 SQLite
- [ ] 登录后刷新页面保持登录态（验证 R1 的 Bug 已修）
- [ ] access token 过期后能自动用 refresh token 换新，用户无感
- [ ] 登出后 localStorage 清空，再访问受保护路由跳转登录页
- [ ] 仓库中不含 `.env`、不含 `*.db`；`git status` 干净
- [ ] `.gitignore` 的 diff 只有新增行，既有规则零改动

## Definition of Done

- 新增代码通过 lint / typecheck / 测试
- README 补充后端启动说明、环境变量说明、测试命令
- 研究记录沉淀到 `.trellis/spec/`（后端分层与错误处理约定、前端测试约定）
- 敏感信息零入库

## Technical Approach

### 前端测试栈（来自 `research/test-stack.md`）

| 用途 | 选型 | 版本 |
|---|---|---|
| 测试运行器 | Vitest | 4.1.11（peer 声明支持 Vite 8） |
| DOM 环境 | jsdom | 30.0.1 |
| 组件测试 | @testing-library/react | 16.3.3 |
| DOM 断言 | @testing-library/jest-dom | 7.0.1 |
| 交互模拟 | @testing-library/user-event | 14.6.7 |
| HTTP mocking | MSW | 2.15.0 |
| 覆盖率 | @vitest/coverage-v8 | 4.1.11（须与 vitest 同版本） |

配置要点：`globals: true` + `src/test/setup.ts`，否则 RTL 的自动 cleanup 不生效，会产生隐蔽的 DOM 泄漏。

### 后端栈（来自 `research/backend-stack.md`）

| 用途 | 选型 | 版本 | 理由 |
|---|---|---|---|
| Web 框架 | Express | 5.2.1 | 4 个接口样板最少；与 `erasableSyntaxOnly` 无冲突 |
| 数据库 | SQLite（better-sqlite3） | 13.0.3 | 零配置单文件，符合 starter 定位 |
| ORM | Drizzle | 0.45.2 | 无代码生成、迁移可读；规避 prisma CLI 指向 RC 的坑 |
| 密码哈希 | argon2（argon2id） | 0.45.1 | OWASP 首推 |
| JWT | jose | 6.2.10 | 比 jsonwebtoken 现代，维护活跃 |
| 校验 | zod | 4.5.4 | 与前端 TS 生态一致 |
| 开发体验 | tsx + concurrently | 4.23.13 / 10.0.5 | 一条命令双启 |

**否决 NestJS 的硬理由**：项目 `tsconfig` 开了 `erasableSyntaxOnly: true`，实测对参数属性报 TS1294，而参数属性正是 NestJS 依赖注入的招牌写法。

**布局**：顶层单个 `server/` 目录，不上 monorepo —— 前端已在仓库根，迁移成本大于收益。

## Decision (ADR-lite)

**Context**：需要为前端 starter 项目配一个后端，并在其之上建立测试体系。候选方案差异大（MSW 拦截 / Express mock / 真实后端）。

**Decision**：用户选择**写真实后端**。技术栈取研究推荐：Express 5 + SQLite + Drizzle；测试取 Vitest + jsdom + RTL + MSW。

**数据库选型的二次评估（已闭环）**：用户一度倾向 PostgreSQL，但实测本机**未安装 Docker**、无本地 postgres、`C:\Program Files\Docker` 不存在，PG + Docker 方案无法落地。评估过 PGlite 0.5.8（PostgreSQL WASM 版，零安装、方言与生产 PG 100% 一致）后**仍选择 SQLite**，理由：

1. 数据模型仅一张 `users` 表、四个 auth 接口，PG 特有能力（JSONB / 数组 / 窗口函数 / pgvector）完全用不上 —— PGlite 的兼容性优势无法兑现
2. PGlite 当前 `0.5.8` 未到 1.0，把 starter 模板押在 pre-1.0 依赖上风险高于收益
3. 迁移成本被高估：Drizzle 已抽象 driver 层，单表迁 PG 约半小时（改 schema 类型 + 连接串）
4. better-sqlite3 同步 API 在 Express 中写法更直白，本地读写性能也更好

结论：保留 SQLite，接受「方言差异」这一项劣势。

**Consequences**：
- 优点：请求链路真实，能验证 axios 拦截器与 token 刷新；SQLite 零配置，克隆即可跑
- 代价：多一个 `server/` 进程与依赖树需要维护；SQLite 不适合多实例部署
- 逃生通道：Drizzle 的 schema 与 Postgres 兼容，必要时换 driver 即可迁移（`research/backend-stack.md` §3.6）

## Out of Scope

- 用户管理 / 角色权限的增删改查界面（只做后端必要的 `/auth/me`）
- Dashboard 数据接入真实后端 —— `src/data/mock.ts` 的假数据本次继续保留
- refresh token 轮换与重放检测（研究建议可分期，见 §5.4）
- E2E 测试（Playwright / Cypress）
- CI 流水线配置
- 前端目录结构迁移（不改成 monorepo）

## Research References

- [`research/backend-stack.md`](research/backend-stack.md) — 后端选型；§1.2 记录 5 处联调坑，§4.6 记录 `.gitignore` 缺口
- [`research/test-stack.md`](research/test-stack.md) — 测试栈选型；§6.2 给 12 条 P0 用例，§9 含二次复核修正

## Technical Notes

### 与前端的接口契约（后端只能照做，不可"顺手统一"）

| 接口 | 请求 | 响应 |
|---|---|---|
| `POST /auth/login` | `{email, password}` | `{access_token, refresh_token, user}` |
| `POST /auth/register` | `{email, password, name}` | 同上 |
| `GET /auth/me` | Bearer token | user |
| `POST /auth/refresh` | `{refreshToken}`（camelCase） | `{access_token, refresh_token}` |

三处必须对齐的历史遗留设计：
1. 响应用 snake_case、refresh 请求体用 camelCase —— 混用是前端既有设计，改了会让 `AuthContext.tsx:59` 报 400
2. 注册入参是 `name`，但 `User` 类型字段是 `username` —— 入库后用 `username` 返回
3. `User.id` 类型是 `string` —— 主键用 uuid/text，不要用自增 int

其他约束：
- 错误响应体必须是 `{ message: string }`（`AuthContext.tsx:73,99` 依赖它取文案）
- access token 必须带 `exp` claim（`isTokenExpired()` 依赖 `jwtDecode().exp`，缺失会导致每次刷新页面都多走一轮 refresh）

### 实施顺序

1. 修 R1 的 localStorage key Bug（阻塞联调，最先做）
2. 补 `.gitignore` 的 `.env` / `*.db` 条目
3. 搭测试栈骨架 + 认证链路 P0 用例
4. 写后端 `server/`（schema → 认证中间件 → 4 个接口 → 种子脚本）
5. 配 vite proxy + concurrently 双启
6. 端到端联调验证
7. 更新 README，沉淀 spec
