# 后端技术选型研究报告

> 任务：`09-03-add-tests-and-backend`
> 项目：`E:\Git\Starter`（React 19.2 + Vite 8.2 + TypeScript 6 严格模式 + Tailwind 4）
> 调研日期：2026-09-03
> 本报告只做研究，**未改动任何项目代码**。

---

## 0. TL;DR 推荐速览

| 维度 | 推荐方案 | 版本 | 一句话理由 |
|---|---|---|---|
| Web 框架 | **Express** | `5.2.1` | 4 个接口，样板代码最少；生态最大；与本项目 `erasableSyntaxOnly` 严格模式无冲突 |
| 备选框架 | Fastify | `5.12.1` | 若想要内置 schema 校验 + 更好的 TS 类型推导 |
| 数据库 | **SQLite（better-sqlite3）** | `13.0.3` | 零配置、单文件、开箱即跑，符合 starter 定位 |
| ORM | **Drizzle ORM** | `drizzle-orm@0.45.2` / `drizzle-kit@0.31.10` | SQL 贴近、无代码生成、冷启动快、迁移可读 |
| 仓库布局 | **顶层单 `server/` 目录** | — | 前端已在根，monorepo 迁移成本 > 收益 |
| 密码哈希 | **argon2** | `0.45.1`（argon2id） | OWASP 首推，抗 GPU/ASIC；Node 下原生模块成熟 |
| JWT | **jose** | `6.2.10` | 比 `jsonwebtoken` 更现代，支持 Web Crypto，维护活跃 |
| 校验 | **zod** | `4.5.4` | 与前端 TS 生态一致，Standard Schema 兼容 |
| 开发体验 | tsx + concurrently | `4.23.13` / `10.0.5` | 一条命令双启前后端 |
| 测试 | vitest + supertest | `4.1.11` / `7.2.2` | 与 Vite 8 同源，配置复用 |

**环境实测基线**（本报告所有版本号均通过 `npm view` 于 2026-09-03 实查）：
`Node v22.22.2` / `npm 10.9.7` / `TypeScript 6.0.2`（项目内 `node_modules`）

---

## 1. 前置：与现有前端接口契约的对齐要点（最重要，先读这一节）

后端必须**严格迁就现有前端**，因为前端已完成且不应为此改动。以下是从
`src/api/auth.ts`、`src/contexts/AuthContext.tsx`、`src/lib/auth.ts`、`src/types/index.ts`
逐行比对得出的约束。

### 1.1 四个接口的硬性契约

| 接口 | 请求 | 响应 | 关键约束 |
|---|---|---|---|
| `POST /auth/login` | `{email, password}` | `{access_token, refresh_token, user}` | 三个字段缺一不可 |
| `POST /auth/register` | `{email, password, name}` | `{access_token, refresh_token, user}` | 请求体字段是 **`name`**，不是 `username` |
| `GET /auth/me` | Header `Authorization: Bearer <token>` | `User`（**裸对象，不包 `{user}` 壳**） | `AuthContext` 直接 `setUser(userData)` |
| `POST /auth/refresh` | `{refreshToken}` | `{access_token, refresh_token}` | 请求体是 **小驼峰 `refreshToken`** |

### 1.2 五处易踩坑（按严重度排序）

**① 【阻塞级 Bug】localStorage key 不一致，导致受保护接口永远 401**

这不是后端问题，但**必须在联调前修掉**，否则 `GET /auth/me` 永远不通：

- `src/lib/auth.ts:5-6`（`AuthContext` 用的存/取）：
  ```ts
  const ACCESS_TOKEN_KEY = 'starter-access-token'
  const REFRESH_TOKEN_KEY = 'starter-refresh-token'
  ```
- `src/api/auth.ts:15, 65-66, 118`（axios 拦截器用的取）：
  ```ts
  localStorage.getItem('access_token')      // ← 永远读到 null
  localStorage.getItem('refresh_token')
  ```

两处 key 不一致 → 拦截器 `config.headers.Authorization` 永远不会被设置 → `/auth/me`
永久 401 → `AuthContext` 每次启动都判定登录态失效并清空。**修法**：把
`src/api/auth.ts` 里三处裸字符串改为从 `@/lib/auth` 导入的
`getStoredAccessToken()` / `setStoredAccessToken()` / `setStoredRefreshToken()`，
或统一改用 `ACCESS_TOKEN_KEY` 常量。推荐前者（消除重复实现）。

**② 响应字段是 snake_case，请求体字段是 camelCase，且两者混用**

- 响应：`access_token` / `refresh_token`（snake_case）
- refresh 请求体：`{ refreshToken }`（camelCase）

这是前后端不一致的遗留设计。**后端只能照做**，不要"顺手统一"成
`{refresh_token}`，否则 `AuthContext.tsx:59` 的 `authAPI.refreshToken()` 会 400。
若确实想统一，必须同时改前端，属于另一件事。

**③ `register` 的请求字段 `name` 与 `User` 类型字段 `username` 不一致**

`src/types/index.ts` 的 `User`：
```ts
export interface User {
  id: string
  username: string      // ← 字段名是 username
  email: string
  role: UserRole        // 'admin' | 'user'
}
```
但 `src/api/auth.ts:44-46` 注册时发的是 `{ email, password, name }`
（`AuthContext.tsx:84` 里 `name: username`）。

**后端做法**：`POST /auth/register` 的入参 schema 用 `name`，返回体映射成 `username`：
```ts
// 入库可以叫 name 也可以叫 username，但响应必须叫 username
return { id, username: row.username, email: row.email, role: row.role }
```
`id` 必须是 **string**（`User.id: string`），用 `text`/`uuid` 主键，不要用自增 int，
否则 `ProtectedRoute` / 用户列表的类型会不匹配。

**④ 错误响应必须带 `message` 字段**

`AuthContext.tsx:73` 与 `:99`：
```ts
error.response?.data?.message || '登录失败，请检查邮箱和密码'
```
所以错误响应体形状固定为 `{ message: string }`。建议统一错误中间件：
```ts
{ "message": "邮箱或密码错误" }
```
登录失败建议返回 **401**，注册邮箱重复建议返回 **409**，校验失败返回 **400**。
前端只展示文案，不区分状态码，但语义正确利于后续扩展。

**⑤ access token 必须包含 `exp` claim**

`src/api/auth.ts:108` 的 `isTokenExpired()` 依赖 `jwtDecode(token).exp`；若 `exp`
不存在则直接判定过期。`AuthContext` 启动时**不会**无条件调 `/auth/me`，而是先看
`exp` 是否过期，所以 `exp` 缺失会导致每次刷新页面都多走一轮 refresh。签发时必须带
`exp`（以及建议带 `sub`、`type`）。

### 1.3 前端不要求、但建议后端预留的端点

- `POST /auth/logout`：当前 `AuthContext.tsx:106-113` 的 `logout()` **只清本地存储，
  不调后端**。因此该端点不是必须的。但若第 4 节采用 refresh token 轮换，
  则需要它来吊销 token 家族，届时再改前端即可。
- `src/api/auth.ts` 中的 `userAPI`（`/users` 的 CRUD）当前没有页面调用，
  可作为"受保护接口"的验证样例实现。

### 1.4 baseURL 与 `/api` 前缀

`src/api/auth.ts:6`：
```ts
baseURL: import.meta.env.VITE_API_URL || '/api'
```
**推荐方案：让后端整体挂载在 `/api` 前缀下，Vite proxy 不做 rewrite。**
这样开发、生产、以及 `VITE_API_URL` 缺省时行为完全一致：

```
浏览器 → /api/auth/login  →  (dev) Vite proxy  → http://localhost:3001/api/auth/login
                          →  (prod) Nginx/CDN   → 后端 /api/auth/login
```

---

## 2. 问题一：Web 框架选型（Express 5 / Fastify / NestJS）

### 2.1 当前稳定版本（2026-09-03 实查 npm）

| 框架 | `latest` | 其他 dist-tag | 说明 |
|---|---|---|---|
| Express | **5.2.1** | `latest-4: 4.22.2` | v5 已是默认 latest，v4 进入维护分支 |
| Fastify | **5.12.1** | `next: 6.0.0-alpha.2`、`four: 4.29.1` | v5 稳定，v6 尚在 alpha |
| NestJS | **12.0.1** | `legacy: 10.4.22`、`next: 12.0.0-alpha.7` | v12 刚发布，处于大版本切换期 |

配套类型/中间件版本：
`@types/express@5.0.6`、`@types/cors@2.8.19`、`cors@2.8.6`、`helmet@8.3.0`、
`express-rate-limit@8.7.0`、`pino@10.3.1`。

### 2.2 三方案对比

| 维度 | Express 5.2.1 | Fastify 5.12.1 | NestJS 12.0.1 |
|---|---|---|---|
| 首次发布时间 | 2010 | 2017 | 2017 |
| 定位 | 极简中间件库 | schema-first 插件框架 | 企业级 DI 框架 |
| **TS 原生支持** | 靠 `@types/express`，中等；中间件泛型偏弱，需自写 helper | **优秀**，schema 驱动类型（TypeBox / JSON Schema → TS） | **优秀**，TS 为设计前提，装饰器 + DI 一体化 |
| 内置请求校验 | ❌ 需 zod/celebrate | ✅ 原生 JSON Schema 校验与序列化 | ✅ 需配 Zod / class-validator |
| 内置日志 | ❌ 需 morgan/pino-http | ✅ 内置 Pino | ✅ 内置 Logger |
| 相对吞吐 | 基线 1× | 约 **2–3×** | 取决于适配器（Express≈1×，Fastify≈2–3×） |
| 冷启动 | 最快 | 快 | 较慢（DI 容器 bootstrap） |
| 社区 / 中间件数量 | **最大**，事实标准 | 中等，生态在追赶 | 大且增长快 |
| 上手成本 | **最低** | 中（需理解插件封装与生命周期） | 高（模块/DI/装饰器/拦截器） |
| 4 个接口的样板代码量 | **约 80 行** | 约 110 行 | 约 250 行 + CLI 生成骨架 |
| 对本项目是否过重 | 否 | 否 | **是** |

### 2.3 关键否决理由：NestJS 与本项目 `erasableSyntaxOnly` 冲突（实测）

本项目 `tsconfig.app.json` 开启了 `"erasableSyntaxOnly": true`。
**用项目内自带的 TypeScript 6.0.2 实测**：

```ts
class A {
  constructor(private readonly x: string) {}   // ← TS1294
}
enum E { A = 1 }                                // ← TS1294
```

```
$ tsc --noEmit --erasableSyntaxOnly --target es2023 t.ts
t.ts(2,15): error TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.
t.ts(4,6): error TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.
```

而 **构造函数参数属性**（`constructor(private readonly svc: X) {}`）正是
NestJS 依赖注入的招牌写法。即 NestJS 必须给后端单独配一份**关掉**
`erasableSyntaxOnly` 的 tsconfig，这会打破项目统一的类型纪律。

补充：NestJS v12 本身也处于动荡期——据 InfoQ 2026-04 报道，v12 路线图包含
**全量 ESM 迁移、Standard Schema（Zod）校验、测试从 Jest 迁到 Vitest**，
工具链改动很大。为一个 4 接口的 starter 引入一个刚完成大版本重构的框架，风险不匹配。

### 2.4 推荐结论

**推荐 Express 5.2.1。**

理由（针对本项目的具体情境）：
1. **规模匹配**：只有 4 个认证接口 + 可选的 `/users` CRUD，NestJS 的模块/DI/装饰器在这里是净负担。
2. **迁移成本最低**：Express 中间件心智模型最简单，`cors` / `helmet` /
   `express-rate-limit` 生态最全，遇到问题搜得到答案。
3. **与严格 TS 模式无冲突**：不需要参数属性、不需要 `emitDecoratorMetadata`。
4. **Express 5 已成熟**：v5 现在是 `latest`，`@types/express@5.0.6` 已对齐 v5 类型。

**何时改选 Fastify 5.12.1**：如果你希望拿到「schema 即类型」的端到端安全
（用 TypeBox 或 Zod→JSON Schema 同时驱动运行时校验与 TS 类型），或介意 Express
的中间件类型推导较弱。代价是要理解插件封装模型，且部分 Express 中间件不能直接用。

### 2.5 Express 5 最小骨架（可直接用）

```ts
// server/src/app.ts
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { authRouter } from './modules/auth/auth.routes.js'
import { errorHandler } from './middleware/error-handler.js'

export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }))
  app.use(express.json())

  app.use('/api/auth', authRouter)

  app.use(errorHandler)          // 必须是最后一个中间件
  return app
}
```

```ts
// server/src/index.ts
import { createApp } from './app.js'

const port = Number(process.env.PORT ?? 3001)
createApp().listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
})
```

> **Express 5 注意**：v5 已内置 async 错误传播（async 中间件抛错会进 error handler，
> 不再需要 `express-async-errors`）；但路由路径语法改为 `path-to-regexp@8`，
> 通配符要写 `/*splat` 而不是 `/*`。

---

## 3. 问题二：数据库与 ORM

### 3.1 当前稳定版本（2026-09-03 实查）

| 包 | 版本 | 备注 |
|---|---|---|
| `better-sqlite3` | **13.0.3** | `engines.node: ">=22"`，本机 Node 22.22.2 满足 |
| `@libsql/client` | 0.18.0 | Turso / libSQL 客户端 |
| `node:sqlite` | Node 内置 | 本机 Node 22.22.2 **实测可用**（无需 flag，但有 `ExperimentalWarning`） |
| `drizzle-orm` | **0.45.2** | |
| `drizzle-kit` | **0.31.10** | |
| `@prisma/client` | **7.10.0** | `latest` = 7.10.0（稳定） |
| `prisma`（CLI） | ⚠️ `latest` = **8.0.0-rc.12** | **latest 指向 RC！** 稳定版需显式 `prisma@7.10.0` |

### 3.2 ⚠️ Prisma 安装陷阱

```
npm view prisma dist-tags
{
  "latest": "8.0.0-rc.12",   ← 直接 npm i prisma 会装到 RC
  "prev":   "7.10.0",        ← 这才是与 @prisma/client@7.10.0 配对的稳定版
  "next":   "8.0.0-rc.10",
  "dev":    "8.1.0-dev.2"
}
```

`prisma` CLI 的 `latest` 目前被 prerelease 占用，而 `@prisma/client` 的 `latest`
仍是 7.10.0。若执行 `npm i -D prisma && npm i @prisma/client`，会装上
**CLI 8 RC + Client 7 稳定版**的版本错配组合。**必须显式锁版本**：

```bash
npm i -D prisma@^7.10.0
npm i @prisma/client@^7.10.0
```

这一点本身就削弱了 Prisma 在本项目"开箱即用"的优势。

### 3.3 SQLite 驱动三选一

| 方案 | 零配置 | 成熟度 | 风险 |
|---|---|---|---|
| **better-sqlite3 13.0.3** | 高（prebuild，无需编译） | **最高**，社区事实标准，同步 API 简单 | 原生模块，需与 Node ABI 匹配（v13 要求 Node ≥22；大版本升级 Node 时可能需要重装） |
| `node:sqlite`（内置） | **最高**（零依赖） | 低——`ExperimentalWarning`，API 仍可能在 Node 小版本变动 | Drizzle 已支持，但用于 starter 会让新手困惑；且 Node 20 不可用 |
| `@libsql/client` 0.18.0 | 中 | 中（Turso 生态活跃） | 为分布式 SQLite 设计，本地场景是杀鸡用牛刀；引入额外依赖 |

**推荐：better-sqlite3 13.0.3。** 同步 API 在单进程 starter 场景毫无劣势
（SQLite 本身是本地文件 I/O，异步化收益极小），且 Drizzle 支持最完善、
文档示例最多。`node:sqlite` 虽然零依赖，但 `ExperimentalWarning` 会在每次启动时打印，
对一个"给人做模板"的 starter 是负面信号。

### 3.4 SQLite vs PostgreSQL

| 维度 | SQLite（better-sqlite3） | PostgreSQL（需 Docker） |
|---|---|---|
| 启动前提 | **无。clone 后 `npm i && npm run dev` 即可跑** | 需 Docker / 本地 PG 服务 / 云实例 |
| 配置文件 | 单文件 `server/data/app.db` | 连接串 + 容器编排 |
| 并发写入 | 单写者（WAL 下够用） | 多写者，行级锁 |
| 迁移能力 | Drizzle 支持，够用 | 更强（在线 DDL、并发迁移） |
| 生产可用性 | 中小流量完全可行（单机、边缘、嵌入式） | 面向规模化生产 |
| 类型支持 | 弱类型（需 text/integer + 约定） | 丰富（uuid、timestamptz、jsonb、enum） |
| 对 starter 的适配 | **完美契合** | 增加上手门槛 |

### 3.5 ORM 对比：Drizzle vs Prisma

| 维度 | Drizzle 0.45.2 | Prisma 7.10.0 |
|---|---|---|
| 范式 | **SQL 贴近**，schema 用 TS 定义 | Schema-first（`.prisma` DSL） |
| 代码生成 | **无**，schema 即 TS 代码 | 必须 `prisma generate` |
| 冷启动 | 快（纯 TS，无生成物） | 较慢（加载查询引擎） |
| 迁移 | `drizzle-kit generate` → 可读 SQL 文件 | `prisma migrate` → SQL 文件 |
| 类型安全 | 好，编译时推导 | 好，但依赖生成产物同步 |
| bundle / 依赖体积 | 小 | 大（引擎二进制） |
| SQLite 支持 | ✅ 一等公民 | ✅ 支持 |
| 学习曲线 | 会 SQL 就会用 | 需学 DSL + Client API |
| **当前安装风险** | 无 | **高**（CLI latest 是 RC，见 3.2） |

### 3.6 推荐结论与"如何保留 Postgres 逃生通道"

**推荐：SQLite（better-sqlite3 13.0.3）+ Drizzle ORM 0.45.2。**

理由：
1. **零配置开箱即用是本 starter 的第一优先级**——目标用户 clone 下来就要能跑通
   注册登录，不需要先装 Docker。
2. **Drizzle 的 schema 就是 TS 文件**，与本项目 TS 严格模式、`verbatimModuleSyntax`
   天然契合；没有 `prisma generate` 这一层，也不存在生成物与源码不同步的问题。
3. **迁移能力并没有真的牺牲**：Drizzle Kit 生成的是**人类可读的 SQL 迁移文件**，
   完全能进版本库、能 review。所谓"SQLite 迁移能力弱"主要指在线 DDL 场景，
   starter 阶段用不到。
4. **成本近乎为零的逃生通道**：Drizzle 的核心价值就是**同一套查询 API 换 dialect**。
   建议从第一天就把 datasource 抽成变量，未来切 Postgres 只需改
   `drizzle.config.ts` 的 `dialect` 与 `src/db/index.ts` 的驱动，业务查询代码基本不动。

**升级触发条件**（出现任一即可切 Postgres）：
- 需要多实例水平扩展 / 多写者并发
- 需要 `jsonb`、`uuid` 原生类型、全文检索、`timestamptz` 等 PG 专有能力
- 需要接入外部托管数据库（Neon / Supabase / RDS）

> **注意**：本项目 `tsconfig.app.json` 有 `erasableSyntaxOnly: true`，
> 而 `drizzle-kit` 生成的迁移文件与 Drizzle schema 均不涉及 enum/参数属性，
> 无冲突。但**不要在 Drizzle schema 里用 TS `enum`**（会触发 TS1294），
> 用 `text({ enum: ['admin','user'] })` 代替。

### 3.7 Drizzle 配置片段

```ts
// server/drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',                                  // 切 PG 时改为 'postgresql'
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? './data/app.db',
  },
  strict: true,
  verbose: true,
})
```

```ts
// server/src/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  // id 用 text：前端 User.id 是 string
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  // 注册入参叫 name，但前端 User 类型字段叫 username → 列名叫 username，路由层做映射
  username: text('username').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  // 不用 TS enum（erasableSyntaxOnly 禁止），用 text + enum 约束
  role: text('role', { enum: ['admin', 'user'] }).notNull().default('user'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull().$defaultFn(() => new Date()),
})

export const refreshTokens = sqliteTable('refresh_tokens', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),   // 只存哈希，不存原文
  familyId: text('family_id').notNull(),              // 用于重放检测（见 4.4）
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  revokedAt: integer('revoked_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull().$defaultFn(() => new Date()),
})
```

```ts
// server/src/db/index.ts
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema.js'

const sqlite = new Database(process.env.DATABASE_URL ?? './data/app.db')
sqlite.pragma('journal_mode = WAL')     // 提升并发读性能
sqlite.pragma('foreign_keys = ON')      // SQLite 默认关闭外键，必须显式开启

export const db = drizzle(sqlite, { schema })
```

```bash
# 常用命令（写入 server/package.json scripts）
npx drizzle-kit generate   # 生成 SQL 迁移文件
npx drizzle-kit migrate    # 应用迁移
npx drizzle-kit studio     # 可视化查看数据
```

---

## 4. 问题三：仓库布局

### 4.1 现状

- 前端**已在仓库根目录**：`src/`、`index.html`、`vite.config.ts`、`package.json`
  （`name: starter-dashboard`），没有 `workspaces` 字段。
- `.trellis/config.yaml` 中有 monorepo `packages` 配置段，但**未启用**（全注释）。

### 4.2 两方案对比

| 维度 | 方案 A：顶层 `server/` | 方案 B：npm workspaces monorepo |
|---|---|---|
| 布局 | `server/` + 根目录前端 | `apps/web` + `apps/server` + `packages/shared` |
| **前端迁移成本** | **零。前端完全不动** | **高。** 需把 `src/`、`index.html`、`public/`、
  `vite.config.ts`、3 个 tsconfig 全移入 `apps/web`，路径别名、相对引用、
  `.gitignore`、`dist` 输出全部要回归验证 |
| 破坏 git 历史 | 无 | 大量文件 rename，blame 历史断裂 |
| 依赖管理 | 两个 `package.json`，各自 `npm i` | 根 `npm i` 统一 hoist |
| 共享类型 | 靠手工同步（见下方建议） | `packages/shared` 真共享 |
| 一条命令启动 | `concurrently` 即可 | workspaces 原生支持 |
| 心智负担 | 低 | 中（workspace 协议、`-w` 参数、hoist 陷阱） |
| 适合团队规模 | 1–3 人 / starter 模板 | 5+ 人、多应用、多包复用 |

### 4.3 推荐结论

**推荐方案 A：顶层单 `server/` 目录。**

核心判断：**这是一次「加法」而不是「重构」。** 本任务的目标是加后端，
顺手把前端搬进 `apps/web` 会把一个低风险任务变成一次高风险的目录重构，
且收益（共享类型包）在只有一个前端、一个后端时几乎为零。

前端迁移到 `apps/web` 会牵动的具体清单（这些都是隐性成本）：
`src/**`（含 `@/` 别名）、`index.html`、`public/`、`vite.config.ts`、
`tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json`、
`package.json` 的 scripts、`.oxlintrc.json`、`.gitignore` 的 `dist`、
`AGENTS.md` / `README.md` 里的路径引用、以及 CI 配置。

### 4.4 共享类型怎么做（方案 A 下的务实做法）

不要为了共享类型而上 monorepo。两个办法，推荐第一个：

**办法 1（推荐）：后端类型作为唯一真源 + 前端生成**
后端用 zod 定义 DTO，前端用 `zod` 的 `z.infer<>` 复用。在 `server/` 内部自洽即可，
前端在 `src/types/api.ts` 里手写与之对应的接口（本项目已有 `src/types/index.ts`）。
4 个接口的 DTO 手写成本 < 30 行，且彻底避免构建期耦合。

**办法 2：前端 `src/types/` 里放纯类型，后端通过相对路径引用**
```ts
// server/src/modules/auth/auth.types.ts
import type { User } from '../../../../src/types/index.js'  // 丑，但有效
```
不推荐——跨目录相对引用很脆弱，且前端类型包含 `LucideIcon` 等浏览器依赖。

**未来升级触发条件**：出现**第二个前端应用**（如移动端 / 管理后台独立部署）
或需要发布**独立 npm 包**时，再迁移到 workspaces 不迟。届时迁移脚本是机械的，
风险可控。

### 4.5 推荐目录结构

```
E:\Git\Starter\
├── src/                        # 前端，完全不动
├── server/
│   ├── package.json
│   ├── tsconfig.json           # 后端独立 tsconfig，继承根严格设置
│   ├── drizzle.config.ts
│   ├── .env                    # 本地，必须 gitignore
│   ├── .env.example            # 提交进仓库
│   ├── data/                   # SQLite 文件，必须 gitignore
│   │   └── .gitkeep
│   ├── drizzle/                # 迁移文件，提交进仓库
│   └── src/
│       ├── index.ts            # 入口：listen
│       ├── app.ts              # 建 app（导出以便 supertest 复用）
│       ├── env.ts              # 环境变量校验（zod）
│       ├── db/
│       │   ├── index.ts        # drizzle 客户端
│       │   └── schema.ts
│       ├── middleware/
│       │   ├── auth.ts         # requireAuth
│       │   └── error-handler.ts
│       ├── modules/
│       │   └── auth/
│       │       ├── auth.routes.ts
│       │       ├── auth.service.ts
│       │       └── auth.schemas.ts    # zod
│       └── lib/
│           ├── jwt.ts
│           └── password.ts
└── .gitignore                  # ← 需新增 .env / server/data（见 4.6）
```

> **`app.ts` 与 `index.ts` 分离**是为了测试：`supertest` 可以直接
> `request(createApp())` 而不占用端口。

### 4.6 ⚠️ 必须先补的 `.gitignore` 条目

当前 `.gitignore` **没有忽略 `.env`**，这是个安全问题。后端落地前必须补：

```gitignore
# Environment
.env
.env.*
!.env.example

# Server
server/data/
*.db
*.db-shm
*.db-wal
```

---

## 5. 问题四：认证实现最佳实践

### 5.1 当前稳定版本（2026-09-03 实查）

| 用途 | 包 | 版本 | 说明 |
|---|---|---|---|
| 密码哈希（推荐） | `argon2` | **0.45.1** | 原生模块，`engines.node >=16.17.0` |
| 密码哈希（备选） | `bcryptjs` | 3.0.3 | 纯 JS，慢但零编译 |
| 密码哈希（不推荐） | `bcrypt` | 6.0.0 | 原生模块，需编译 |
| JWT（推荐） | `jose` | **6.2.10** | 现代、维护活跃、支持 Web Crypto |
| JWT（备选） | `jsonwebtoken` | 9.0.3 | 老牌，但已长期低频更新 |
| 校验 | `zod` | 4.5.4 | |
| 限流 | `express-rate-limit` | 8.7.0 | |

### 5.2 bcrypt vs argon2：2026 年推荐 argon2id

| 维度 | Argon2id（argon2 0.45.1） | bcrypt（6.0.0 / bcryptjs 3.0.3） |
|---|---|---|
| 权威推荐 | **OWASP 首选**，NIST 亦认可 | 仍安全，作为"无 Argon2 库时的次选" |
| 抗攻击 | **内存硬化**，抗 GPU/ASIC/侧信道 | 仅 CPU 密集，**无内存硬化** |
| 参数调节 | `memoryCost` / `timeCost` / `parallelism` 三维 | 只有 cost（轮数）一维 |
| 密码长度限制 | 无 | **72 字节硬上限**（超长密码被静默截断） |
| Node 下形态 | 原生模块（有 prebuild） | 原生（`bcrypt`）/ 纯 JS（`bcryptjs`） |
| 成熟度 | 成熟，2015 年 PHC 冠军 | 极成熟，1999 年起 |

**推荐：`argon2@0.45.1`，使用 `argon2id` 变体。** 理由：OWASP 首推；
bcrypt 的 72 字节上限是个容易踩的坑（长密码或 passphrase 会被静默截断）；
argon2 的三维参数让未来调参更灵活。

**唯一顾虑与对策**：`argon2` 是原生模块，Windows 上若 prebuild 缺失需
`node-gyp` / VS Build Tools。若目标用户环境不可控，退回 **`bcryptjs@3.0.3`**
（纯 JS，零编译，永远装得上；代价是哈希计算慢约 3–5 倍，但对登录这种低频操作无感知）。
**不要选 `bcrypt@6.0.0`**——它同样需要编译，却没有比 bcryptjs 多出决定性优势。

**推荐参数**（OWASP 基线）：
```ts
// server/src/lib/password.ts
import { hash, verify } from 'argon2'

// OWASP 建议：m=19456 (19MiB), t=2, p=1
const ARGON2_OPTIONS = {
  type: argon2id,          // 必须用 argon2id，不是 argon2i / argon2d
  memoryCost: 19456,       // 19 MiB
  timeCost: 2,
  parallelism: 1,
} as const

export const hashPassword = (plain: string) => hash(plain, ARGON2_OPTIONS)
export const verifyPassword = (hashValue: string, plain: string) =>
  verify(hashValue, plain, ARGON2_OPTIONS)
```

> **安全要点**：`verify` 前不要先查用户是否存在——用户不存在时用**固定 dummy hash**
> 做一次同样的 verify，避免通过响应时间枚举已注册邮箱（时序侧信道）。

### 5.3 Token 时效设计

| Token | 有效期 | 载荷 | 存储 |
|---|---|---|---|
| access token | **15 分钟** | `{ sub: userId, type: 'access', role }` + `exp`/`iat`/`jti` | localStorage（前端既定） |
| refresh token | **7 天** | 随机 32 字节；DB 只存 SHA-256 哈希 | localStorage（前端既定）+ DB 记录 |

**为什么 access 是 15 分钟**：前端 `isTokenExpired()` 依赖 `exp` 做本地判断，
15 分钟能在"被盗后的暴露窗口"与"刷新频率"之间取得平衡；社区通行区间是 5–15 分钟。

**为什么 refresh 是 7 天**：匹配"用户一周内回到后台无需重新登录"的常规预期，
同时符合社区对 refresh token 7–30 天的通行区间。

### 5.4 refresh token 轮换与重放检测：值得做，但可分期

| 方案 | 实现成本 | 安全性 | 前端改动 |
|---|---|---|---|
| **A. 不轮换**（refresh token 可重复使用直到过期） | 最低 | 低——被盗后可无限续期 | 无 |
| **B. 轮换**（每次 refresh 发新的、旧的立即失效） | 中 | **高**——大幅压缩被盗后窗口 | 无 |
| **C. 轮换 + 家族重放检测**（旧 token 被再用 → 吊销整个家族） | 中高 | 最高 | 无 |

**推荐：直接做 B，把 C 的数据表字段预留好但不急于实现。**

关键利好：**B 和 C 都不需要改前端代码。** `AuthContext.tsx:28-29` 已经把
`/auth/refresh` 返回的新 token 对**双双写回 localStorage** 了：
```ts
setStoredAccessToken(tokenData.access_token)
setStoredRefreshToken(tokenData.refresh_token)
```
这正是轮换所需的客户端行为——前端已经天然支持。既然零成本，没有理由不做。

**为什么 C（重放检测）可以缓一缓**：
- 会引入**误判风险**：用户多标签页 / 网络重试并发刷新时，后到的请求用的是已被消费的
  token，若直接吊销家族会把正常用户踢下线。正确处理需要"宽限窗口"
  （如 30 秒内同一家族的重复请求返回同一个新 token，而不是判为重放）。
- 对一个 starter 模板，这段复杂度会掩盖教学主线。
- **但表结构要预留**：上面 3.7 的 `refresh_tokens` 表已含 `familyId` 与 `revokedAt`，
  未来加检测无需迁移。

**若日后要启用 C，正确的防误判做法**：检测到已消费 token 时，先检查
`revoked_at` 是否在最近 N 秒内且属同一 `family_id` → 视为并发重试，返回原新 token；
超过窗口或跨 IP/UA → 判为重放，吊销整个家族并强制重新登录。

### 5.5 JWT 密钥的环境变量管理

**约定：**

1. `.env.example` **提交进仓库**，列出所有变量（值为占位符或空）；
   `.env` **绝不提交**。
2. 用 **zod 在启动时校验**环境变量，缺失即崩溃退出——把配置错误暴露在启动阶段，
   而不是运行时 500。
3. `JWT_SECRET` 至少 32 字节。开发/生产用不同值；生产用
   `openssl rand -base64 48` 生成。
4. access 与 refresh 用**不同的密钥**（或至少不同的 `aud`/`type` claim 严格校验），
   防止把 refresh token 当 access token 用。

```ts
// server/src/env.ts
import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().default('./data/app.db'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET 至少 32 字符'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET 至少 32 字符'),
  JWT_REFRESH_TTL: z.string().default('7d'),
})

export const env = envSchema.parse(process.env)
```

```bash
# server/.env.example  ← 提交进仓库
NODE_ENV=development
PORT=3001
DATABASE_URL=./data/app.db
CORS_ORIGIN=http://localhost:5173

# 生成方式：openssl rand -base64 48
# access / refresh 必须使用不同的密钥
JWT_SECRET=replace-me-with-at-least-32-random-chars
JWT_ACCESS_TTL=15m
JWT_REFRESH_SECRET=replace-me-with-a-DIFFERENT-32-random-chars
JWT_REFRESH_TTL=7d
```

```ts
// server/src/lib/jwt.ts —— 用 jose 签发，注意必须带 exp（前端 isTokenExpired 依赖）
import { SignJWT, jwtVerify } from 'jose'

const accessKey = new TextEncoder().encode(env.JWT_SECRET)
const refreshKey = new TextEncoder().encode(env.JWT_REFRESH_SECRET)

export function signAccessToken(user: { id: string; role: string }) {
  return new SignJWT({ role: user.role, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_TTL)   // '15m' → 产生 exp claim
    .setJti(crypto.randomUUID())
    .sign(accessKey)
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, accessKey, { algorithms: ['HS256'] })
  if (payload.type !== 'access') throw new Error('token type mismatch')  // 防串用
  return payload
}
```

### 5.6 四个接口的严格对齐实现（核心代码）

```ts
// server/src/modules/auth/auth.schemas.ts
import { z } from 'zod'

// 注意：注册入参是 name，不是 username（对齐前端 src/api/auth.ts:44-46）
export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(72),
})

export const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(72),
  name: z.string().min(1).max(50),        // ← 必须是 name
})

// 注意：refresh 入参是 camelCase refreshToken（对齐前端 src/api/auth.ts:59）
export const refreshSchema = z.object({
  refreshToken: z.string().min(1),        // ← 必须是 refreshToken
})
```

```ts
// server/src/modules/auth/auth.routes.ts
import { Router } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { users, refreshTokens } from '../../db/schema.js'
import { hashPassword, verifyPassword } from '../../lib/password.js'
import { signAccessToken, signRefreshTokenRaw } from '../../lib/jwt.js'
import { loginSchema, registerSchema, refreshSchema } from './auth.schemas.js'
import { requireAuth } from '../../middleware/auth.js'

export const authRouter = Router()

/** 统一响应构造：必须是 snake_case 的 access_token / refresh_token */
async function issueTokenPair(userId: string, role: string, familyId?: string) {
  const access_token = await signAccessToken({ id: userId, role })
  const { raw, hash: tokenHash } = await signRefreshTokenRaw(userId)
  const fid = familyId ?? crypto.randomUUID()

  await db.insert(refreshTokens).values({
    userId, tokenHash, familyId: fid,
    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
  })
  return { access_token, refresh_token: raw }
}

/** 用户序列化：字段名必须是 username（对齐 src/types/index.ts 的 User） */
function toUser(row: typeof users.$inferSelect) {
  return { id: row.id, username: row.username, email: row.email, role: row.role }
}

// POST /api/auth/register  body: {email, password, name}
authRouter.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = registerSchema.parse(req.body)

    const [existing] = await db.select().from(users)
      .where(eq(users.email, email)).limit(1)
    if (existing) {
      return res.status(409).json({ message: '该邮箱已被注册' })
    }

    const passwordHash = await hashPassword(password)
    const [row] = await db.insert(users).values({
      username: name,            // ← 入参 name → 列 username
      email, passwordHash, role: 'user',
    }).returning()

    const tokens = await issueTokenPair(row.id, row.role)
    res.status(201).json({ ...tokens, user: toUser(row) })
  } catch (e) { next(e) }
})

// POST /api/auth/login  body: {email, password}
authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body)
    const [row] = await db.select().from(users)
      .where(eq(users.email, email)).limit(1)

    // 用户不存在时也要走一次 verify，避免时序侧信道枚举邮箱
    const ok = row
      ? await verifyPassword(row.passwordHash, password)
      : await verifyPassword(DUMMY_HASH, password).then(() => false)

    if (!ok || !row) return res.status(401).json({ message: '邮箱或密码错误' })

    const tokens = await issueTokenPair(row.id, row.role)
    res.json({ ...tokens, user: toUser(row) })
  } catch (e) { next(e) }
})

// GET /api/auth/me  → 返回裸 User 对象（不包 {user} 壳）
authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const [row] = await db.select().from(users)
      .where(eq(users.id, req.userId!)).limit(1)
    if (!row) return res.status(404).json({ message: '用户不存在' })
    res.json(toUser(row))                 // ← 直接返回 user，对齐 setUser(userData)
  } catch (e) { next(e) }
})

// POST /api/auth/refresh  body: {refreshToken}   ← camelCase，轮换实现
authRouter.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body)
    const hash = sha256(refreshToken)

    const [rec] = await db.select().from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hash)).limit(1)

    if (!rec || rec.revokedAt || rec.expiresAt < new Date()) {
      return res.status(401).json({ message: '登录状态已失效，请重新登录' })
    }

    // 轮换：旧 token 立即失效
    await db.update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, rec.id))

    const [row] = await db.select().from(users)
      .where(eq(users.id, rec.userId)).limit(1)
    if (!row) return res.status(401).json({ message: '用户不存在' })

    // 沿用同一 familyId，为未来重放检测预留
    const tokens = await issueTokenPair(row.id, row.role, rec.familyId)
    res.json(tokens)                      // ← 只返回两个 token，不返回 user
  } catch (e) { next(e) }
})
```

```ts
// server/src/middleware/auth.ts
import type { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../lib/jwt.js'

declare global {
  namespace Express {
    interface Request { userId?: string; userRole?: string }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: '未登录' })
  }
  try {
    const payload = await verifyAccessToken(header.slice(7))
    req.userId = payload.sub
    req.userRole = payload.role as string
    next()
  } catch {
    // 过期与伪造都返回同一个 message，避免信息泄露
    return res.status(401).json({ message: '登录已过期' })
  }
}
```

```ts
// server/src/middleware/error-handler.ts —— 统一 { message } 形状
import type { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

export function errorHandler(
  err: unknown, _req: Request, res: Response, _next: NextFunction
) {
  if (err instanceof ZodError) {
    return res.status(400).json({ message: err.issues[0]?.message ?? '请求参数错误' })
  }
  console.error(err)
  res.status(500).json({ message: '服务器内部错误' })
}
```

### 5.7 必须加的限流

登录/注册端点必须限流，否则可被暴力破解与邮箱枚举：

```ts
import rateLimit from 'express-rate-limit'

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 分钟
  max: 20,                    // 同 IP 最多 20 次
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: '请求过于频繁，请稍后再试' },   // 保持 { message } 形状
})

// 只挂在登录/注册/刷新上，不要全局挂
authRouter.post('/login', authLimiter, handler)
authRouter.post('/register', authLimiter, handler)
```

---

## 6. 问题五：前后端联调

### 6.1 端口约定

| 服务 | 端口 | 说明 |
|---|---|---|
| Vite dev server | **5173** | Vite 默认 |
| Express API | **3001** | 避开 3000（常被其他占用）；与 5173 明显区分 |

### 6.2 Vite proxy 配置

```ts
// vite.config.ts（在现有配置上增加 server 段，其余不动）
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const API_TARGET = process.env.VITE_PROXY_TARGET ?? 'http://localhost:3001'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // 不做 rewrite：/api/auth/login → http://localhost:3001/api/auth/login
      // 与生产的 Nginx 反代行为完全一致
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
        // 若后端只认 /auth/login 而不要 /api 前缀，才加下面这行：
        // rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
})
```

> **说明**：Vite proxy 的正确选项名是 **`changeOrigin`**（不是 `changeOrigin` 之外的写法）。
> 这里特意**不加 `rewrite`**，让后端整体挂在 `/api` 前缀下，开发/生产行为一致。

配套前端环境变量（`VITE_API_URL` 留空即用默认 `/api`）：
```bash
# 仓库根 .env.example
# 保持 /api 走 Vite proxy；直连后端时才改成 http://localhost:3001/api
VITE_API_URL=/api
```

### 6.3 CORS：开发与生产的处理

| 环境 | 处理方式 | 说明 |
|---|---|---|
| **开发** | **优先用 Vite proxy，CORS 甚至可以不开** | 浏览器看来请求发往 `localhost:5173/api/*`，同源，**根本不触发 CORS 预检**。这是最省事、最不容易出错的方案 |
| 直连调试（前端 5173 直连后端 3001） | 开 CORS：`origin: 'http://localhost:5173'` | 用于想绕过 proxy 单独调后端的场景 |
| **生产（同域部署）** | 由 Nginx 反代 `/api` → 后端，**不需要 CORS** | 推荐部署方式 |
| 生产（跨域部署） | 后端 CORS 白名单填真实前端域名，**不要用 `*`** | 因为携带 `Authorization` 头，不能用 `origin: '*'` |

```ts
// server/src/app.ts
const allowed = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
  .split(',').map(s => s.trim())

app.use(cors({
  origin: allowed,
  credentials: true,       // 未来若改用 cookie 存 refresh token 需要
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
```

> **重要**：当前前端把 token 放 **localStorage** 并用 `Authorization` 头传递，
> 所以**不需要 `credentials: true`，也不需要 cookie**。上面保留是为了给未来
> "refresh token 改 HttpOnly cookie" 的演进留位。

### 6.4 一条命令双启：concurrently

**推荐：会用到，装在仓库根。**

版本：`concurrently@10.0.5`

```jsonc
// 根 package.json —— 只新增 dev:all / dev:web / dev:server，其余不动
{
  "scripts": {
    "dev": "vite",
    "dev:web": "vite",
    "dev:server": "npm --prefix server run dev",
    "dev:all": "concurrently -n web,api -c cyan,magenta \"npm:dev:web\" \"npm:dev:server\"",
    "build": "tsc -b && vite build",
    "lint": "oxlint",
    "preview": "vite preview",
    "typecheck": "tsc -b --noEmit"
  },
  "devDependencies": {
    "concurrently": "^10.0.5"
  }
}
```

```jsonc
// server/package.json
{
  "name": "starter-server",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",          // tsx 热重载
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "test": "vitest run"
  }
}
```

用法：
```bash
npm run dev:all      # 一条命令同时起 5173 + 3001
```

> **`server/` 下要单独执行一次 `npm install`**（方案 A 是双 package.json，
> 不是 workspaces，根 `npm i` 不会装后端依赖）。这一点必须写进 README，
> 否则新手会卡住。

### 6.5 后端 tsconfig（保持与前端一致的严格纪律）

```jsonc
// server/tsconfig.json
{
  "compilerOptions": {
    "target": "es2023",
    "lib": ["ES2023"],
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "types": ["node"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,          // 与前端保持一致
    "verbatimModuleSyntax": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "declaration": false
  },
  "include": ["src", "drizzle.config.ts"]
}
```

> **`module: nodenext` + `verbatimModuleSyntax`** 意味着：
> 相对导入**必须带 `.js` 扩展名**（如 `./db/index.js`），因为 TS 会按 Node ESM
> 规则解析到实际输出的 `.js` 文件。这是 NodeNext 下的常见坑，写错会报
> `ERR_MODULE_NOT_FOUND` 或 TS2307。

---

## 7. 完整依赖清单（已核实版本）

### 后端 `server/package.json`

```jsonc
{
  "dependencies": {
    "express": "^5.2.1",
    "cors": "^2.8.6",
    "helmet": "^8.3.0",
    "express-rate-limit": "^8.7.0",
    "drizzle-orm": "^0.45.2",
    "better-sqlite3": "^13.0.3",
    "argon2": "^0.45.1",
    "jose": "^6.2.10",
    "zod": "^4.5.4",
    "dotenv": "^17.4.2"
  },
  "devDependencies": {
    "tsx": "^4.23.13",
    "typescript": "~6.0.2",
    "@types/node": "^24.13.3",
    "@types/express": "^5.0.6",
    "@types/cors": "^2.8.19",
    "@types/better-sqlite3": "^9.6.0",
    "drizzle-kit": "^0.31.10",
    "vitest": "^4.1.11",
    "supertest": "^7.2.2",
    "@types/supertest": "^7.2.1"
  }
}
```

### 根 `package.json` 新增

```jsonc
{
  "devDependencies": {
    "concurrently": "^10.0.5"
  }
}
```

> **若选 Fastify 替代 Express**，依赖替换为：
> `fastify@^5.12.1`、`@fastify/cors@^11.3.0`、`@fastify/helmet@^13.1.1`、
> `@fastify/rate-limit@^11.2.0`（`pino@^10.3.1` 由 Fastify 内置，一般无需单独装）。

---

## 8. 实施前必须完成的前置项（Checklist）

按此顺序执行，可避免大部分返工：

- [ ] **修 `src/api/auth.ts` 的 localStorage key 不一致**（第 1.2 节 ①）——不修则 `/auth/me` 永远 401
- [ ] 在 `.gitignore` 补充 `.env`、`.env.*`、`!.env.example`、`server/data/`、`*.db*`（第 4.6 节）
- [ ] 创建 `server/`，单独 `npm install`（第 6.4 节，方案 A 不共享 node_modules）
- [ ] 写 `server/.env.example` 并在 `server/.env` 生成真实密钥（第 5.5 节）
- [ ] 按 3.7 建 schema → `drizzle-kit generate` → `drizzle-kit migrate`
- [ ] 实现 4 个接口，逐条对照第 1.1 节的契约表自查
- [ ] 配置 Vite proxy（第 6.2 节），**不加 rewrite**
- [ ] 根 `package.json` 加 `dev:all`，验证一条命令双启
- [ ] 用 supertest 覆盖 4 个接口（含"refresh 后旧 token 失效"用例）
- [ ] 更新 `README.md` 的启动说明（两次 `npm install`）
- [ ] 回填 `.trellis/spec/backend/` 下 4 个空模板文档
      （`database-guidelines.md` / `directory-structure.md` / `error-handling.md` /
      `logging-guidelines.md` / `quality-guidelines.md`，目前均为 "To be filled by the team" 占位）

---

## 9. 风险与注意事项汇总

| 风险 | 影响 | 应对 |
|---|---|---|
| `src/api/auth.ts` localStorage key 与 `lib/auth.ts` 不一致 | **阻塞**：受保护接口永远 401 | 实施前必修（第 1.2 节 ①） |
| `.gitignore` 未忽略 `.env` | **安全**：密钥可能入库 | 实施前必补（第 4.6 节） |
| `prisma` CLI `latest` 是 `8.0.0-rc.12` | 若选 Prisma 会装到 RC | 显式 `prisma@^7.10.0`；本方案选 Drizzle 已规避 |
| `better-sqlite3` 是原生模块 | Node 大版本升级后可能需重装 | v13 要求 Node ≥22，锁 Node LTS；CI 缓存注意 ABI |
| `argon2` 是原生模块 | Windows 无 prebuild 时需 VS Build Tools | 环境不可控时退回 `bcryptjs@3.0.3` |
| refresh 轮换 + 多标签页并发 | 可能误判为重放、踢用户下线 | 先只做轮换不做重放检测；启用时加宽限窗口（第 5.4 节） |
| NodeNext 下相对导入缺 `.js` 扩展名 | 运行期 `ERR_MODULE_NOT_FOUND` | 后端所有相对导入统一带 `.js`（第 6.5 节） |
| 后端依赖未安装 | `npm i` 只装了前端 | README 明确要在 `server/` 再装一次（第 6.4 节） |
| NestJS + `erasableSyntaxOnly` 冲突 | 需为后端单独放宽 TS 配置 | 已否决 NestJS（第 2.3 节） |
| SQLite 外键默认关闭 | 级联删除失效 | `sqlite.pragma('foreign_keys = ON')`（第 3.7 节） |

---

## 10. 参考来源

- npm registry（版本号均于 2026-09-03 通过 `npm view <pkg> version` / `dist-tags` 实查）
- 实测：本机 `node:sqlite` 可用性（Node v22.22.2，输出 `ExperimentalWarning`）
- 实测：项目内 TypeScript 6.0.2 下 `erasableSyntaxOnly` 对参数属性 / enum 报 TS1294
- [Drizzle ORM - Node SQLite](https://orm.drizzle.team/docs/sqlite/connect-node-sqlite)
- [NestJS v12 Roadmap: Full ESM Migration, Standard Schema, Modernised Toolchain — InfoQ, 2026-04](https://www.infoq.com/news/2026/04/nestjs-12-roadmap-esm/)
- [Express.js vs Fastify vs NestJS (2026 Comparison) — wfnext.com, 2026-05](https://wfnext.com/blog/expressjs-vs-fastify-vs-nestjs-2026/)
- [Argon2 vs Bcrypt vs Scrypt vs PBKDF2 (2026 Guide) — guptadeepak.com, 2025-12](https://guptadeepak.com/the-complete-guide-to-password-hashing-argon2-vs-bcrypt-vs-scrypt-vs-pbkdf2-2026/)
- [Prisma vs Drizzle: TypeScript ORM Comparison for 2026 — dev.to, 2026-03](https://dev.to/_d7eb1c1703182e3ce1782/prisma-vs-drizzle-typescript-orm-comparison-for-2026-1dp1)
- [Token lifecycle management: best practices for JWTs, refresh tokens, and rotation — authorize.live](https://authorize.live/token-lifecycle-management-best-practices-for-jwts-refresh-t)

### 项目内已读文件

`src/api/auth.ts`、`src/contexts/AuthContext.tsx`、`src/lib/auth.ts`、
`src/types/index.ts`、`src/contexts/auth-context.ts`、`vite.config.ts`、
`tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json`、
`package.json`、`.gitignore`、`.trellis/config.yaml`、`.trellis/spec/backend/*`
