# 实现 Express 后端并完成前后端联调

## Goal

为前端 playground 写一个**真实的后端服务**（Express 5 + better-sqlite3 + Drizzle），跑通注册 / 登录 / token 刷新 / 受保护接口，并让 `npm run dev` 一条命令双启前后端、端到端联调成功。

本任务为父任务 `09-03-add-tests-and-backend` 的**第二批**，依赖第一批已完成的：R1（localStorage key 修复）、R2（Vitest 测试体系）、R5a（.gitignore 已含 `.env`）。

## Requirements

### R3 — 后端服务

- Express 5，挂 `/api` 前缀，端口 `3001`（端口可经 `PORT` 环境变量覆盖）
- 引入 JWT 认证中间件 `requireAuth`（verify `access_token`，签发用 `jose`）
- 实现 4 个接口，严格对齐前端既有契约（见下方「接口契约」）
- SQLite 持久化 `users` 表；`argon2id` 哈希密码
- `access_token` 短期（15min）、`refresh_token` 长期（7d），双 token 分开密钥
- 种子脚本：创建演示账号 `admin@demo.com` / `secret123`（role: admin）

### R4 — 前后端联调

- `vite.config.ts` 加 `server.proxy`：`/api` → `http://localhost:3001`
- 根 `package.json` 用 `concurrently` 双启（或 `npm-run-all`）；加 `dev:web` / `dev:server` / `dev` 组合脚本
- 端到端验收（见 Acceptance Criteria）

### R5b — 隐私与 .env（延续硬约束）

- 提供 `.env.example`（占位，提交进仓库）
- 真实 `.env` 只留本地，已被 `.gitignore` 忽略（已确认 `git check-ignore .env` 命中）
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` 不同密钥，由 `openssl rand -base64 48` 生成
- 绝不把密钥硬编码进源码或提交 `.env`

## 接口契约（后端只能照做，不可"顺手统一"）

| 接口 | 请求 | 响应 |
|---|---|---|
| `POST /auth/login` | `{email, password}` | `{access_token, refresh_token, user}` |
| `POST /auth/register` | `{email, password, name}` | 同上 |
| `GET /auth/me` | `Authorization: Bearer <access>` | `user` |
| `POST /auth/refresh` | `{refreshToken}`（camelCase） | `{access_token, refresh_token}` |

三处历史遗留设计必须对齐：

1. 响应用 **snake_case**（`access_token`），但 refresh 请求体用 **camelCase**（`{refreshToken}`）
2. 注册入参叫 `name`，但 `User` 类型字段是 `username` → 入库后响应映射成 `username`
3. `User.id` 是 **string** → 主键用 `text`/`uuid`，**不要**自增 int

错误响应体固定为 `{ message: string }`；登录失败 401、邮箱重复 409、校验失败 400。`access_token` 必须带 `exp` claim（前端 `isTokenExpired` 依赖它）。

## Acceptance Criteria

- [ ] `curl -XPOST localhost:3001/api/auth/register` 可注册，`users` 表落库（密码是 argon2 哈希）
- [ ] `login` 返回 `access_token`/`refresh_token`/`user`
- [ ] `GET /auth/me` 带 Bearer 返回 user；无/错 token 返回 401
- [ ] `POST /auth/refresh` 用 `refresh_token` 返回新的双 token；错误 refresh 返回 401
- [ ] `npm run dev` 一条命令双启；浏览器登录 → 刷新页面保持登录 → token 过期自动刷新无感 → 登出跳转
- [ ] `.env` 不在 `git status` 中；`git status` 无非预期文件
- [ ] 根 `npm run lint` / `typecheck` / `build` 仍绿（前端改动不退化）

## Definition of Done

- 后端可被 `npm run dev` 拉起并与前端联调通过
- 种子账号可登录
- README 补充说明：后端启动、`.env` 变量、数据库位置
- 无敏感信息入库

## Technical Approach

全部细节见 `research/backend-stack.md`（版本号均 2026-09-03 实查）：

| 用途 | 选型 | 版本 |
|---|---|---|
| Web 框架 | Express | 5.2.1 |
| 数据库 | better-sqlite3 | 13.0.3 |
| ORM | Drizzle | 0.45.2 / drizzle-kit 0.31.10 |
| 密码哈希 | argon2 | 0.45.1 |
| JWT | jose | 6.2.10 |
| 校验 | zod | 4.5.4 |
| 开发 | tsx + concurrently | 4.23.13 / 10.0.5 |

布局：顶层单 `server/` 目录（不入 monorepo）。

## Out of Scope

- 用户管理 CRUD 界面（仅做 `/auth/me`）
- refresh token 轮换与重放检测（见 backend-stack.md §5.4，可分期）
- Dashboard 数据接入真实后端（`src/data/mock.ts` 保留）
- E2E 测试（Playwright）

## Research References

- [`research/backend-stack.md`](../../09-03-add-tests-and-backend/research/backend-stack.md) — 后端选型、4 接口契约、§1.2 五处坑、§4.6 .gitignore
- [`research/test-stack.md`](../../09-03-add-tests-and-backend/research/test-stack.md) — 前端测试（本批只读，验证用）

## Technical Notes

- `server/src/` 为独立 TS 项目，`package.json` 放在 `server/`，与根 `package.json` 分开
- better-sqlite3 是原生模块，安装可能触发 node-gyp 编译；Node 22 下原生 prebuilt 通常可用
- JWT 密钥走 `process.env`，无值则启动报错并退出（fail-fast）
- 种子脚本幂等：已存在同名邮箱则跳过
