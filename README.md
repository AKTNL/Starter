# Starter

一个 React 管理后台主界面（Dashboard），作为本仓库前端项目的起点，并配套一个真实的 Express 鉴权后端。

## 技术栈

| 用途 | 选型 |
| --- | --- |
| 构建工具 | Vite 8 |
| 框架 | React 19 + TypeScript 6（严格模式） |
| 样式 | Tailwind CSS 4（`@tailwindcss/vite`） |
| 路由 | react-router-dom 7 |
| 图表 | recharts 3 |
| 图标 | lucide-react |
| 代码检查 | oxlint |
| 后端 | Express 5 + better-sqlite3 + Drizzle |
| 鉴权 | jose（JWT 双 token）+ argon2id |
| 校验 | zod |

## 快速开始

```bash
npm install
cp .env.example .env          # 然后为 JWT_ACCESS_SECRET / JWT_REFRESH_SECRET 填入随机值
npm run dev                   # 同时启动前端(:5173) 与 后端(:3001)
```

打开 http://localhost:5173 即可。前端通过 Vite 的 `/api` 代理访问后端，无需额外 CORS 配置。

其他命令：

```bash
npm run dev:web      # 仅启动前端
npm run dev:server   # 仅启动后端（tsx watch）
npm run build        # 类型检查 + 生产构建（前端）
npm run lint         # oxlint 检查（前端）
npm run test         # Vitest 测试（前端）
npm run typecheck    # tsc 类型检查（前端）
```

## 目录结构

```
src/                       前端源码
├── main.tsx               入口，挂载 BrowserRouter
├── App.tsx                路由表
├── api/                   API 客户端（auth.ts 等）
├── components/            layout / ui / dashboard / auth
├── contexts/              AuthContext（登录态）
├── data/                  mock.ts（仪表盘模拟数据）
├── lib/                   auth.ts（token 存储）、utils.ts
├── mocks/                 MSW 处理器（测试用）
├── test/                  Vitest 全局配置
└── types/                共享类型定义

server/                    后端（独立 TS 项目，自带 package.json）
├── src/
│   ├── index.ts           入口（Express 启动）
│   ├── env.ts             加载仓库根目录 .env
│   ├── db/                better-sqlite3 连接 + Drizzle schema
│   ├── auth/              argon2 密码哈希、jose JWT、requireAuth 中间件
│   └── routes/auth.ts     4 个鉴权接口
├── scripts/seed.ts        幂等种子脚本（admin@demo.com）
└── data/                  SQLite 数据库文件（git-ignored）
```

`@/` 是 `src/` 的路径别名，同时在 `tsconfig.app.json` 的 `paths` 和
`vite.config.ts` 的 `resolve.alias` 中配置，改动时两边要同步。

## 后端（Backend）

后端是一个独立的 Express 服务，默认监听 `3001`，所有路由挂在 `/api` 下。

### 环境变量

复制 `.env.example` 为 `.env` 并填写：

| 变量 | 说明 |
| --- | --- |
| `PORT` | 端口，默认 `3001` |
| `JWT_ACCESS_SECRET` | access token 签名密钥（与 refresh 不同） |
| `JWT_REFRESH_SECRET` | refresh token 签名密钥 |
| `DB_PATH` | SQLite 文件路径，默认 `server/data/app.db` |

生成密钥：`openssl rand -base64 48`。**真实 `.env` 已被 `.gitignore` 忽略，请勿提交。**

### 鉴权接口

| 接口 | 请求 | 响应 |
| --- | --- | --- |
| `POST /api/auth/register` | `{email, password, name}` | `{access_token, refresh_token, user}` |
| `POST /api/auth/login` | `{email, password}` | `{access_token, refresh_token, user}` |
| `GET  /api/auth/me` | `Authorization: Bearer <access>` | `user` |
| `POST /api/auth/refresh` | `{refreshToken}`（camelCase） | `{access_token, refresh_token}` |

- `access_token` 有效期 15 分钟，必须带 `exp` 声明；`refresh_token` 7 天。
- 错误统一返回 `{ message: string }`：登录失败 401、邮箱重复 409、校验失败 400、token 缺失/无效 401。
- 历史契约保留：响应字段为 snake_case（`access_token`），但 refresh 请求体为 camelCase（`refreshToken`）；注册入参 `name` 映射为存储的 `username`；`user.id` 为字符串（uuid）。

### 数据库与种子

```bash
npm --prefix server run seed   # 幂等：已存在 admin@demo.com 则跳过
```

演示账号：`admin@demo.com` / `secret123`（role: admin）。数据库文件位于 `server/data/`，已被 git 忽略。

后端独立类型检查：`npm --prefix server run typecheck`。

## 约定

- **趋势配色：红涨绿跌**。与 A 股习惯一致（`+x%` 用 `text-red-400`，`-x%` 用 `text-emerald-400`），
  与欧美"绿涨红跌"相反，新增指标类组件时保持一致。
- **深色主题**。底色 `#0b0d12`，侧边栏 `#0f1117`，卡片为 `bg-white/[0.03]` + `border-white/10`。
- **不使用 `enum`**。`tsconfig` 开启了 `erasableSyntaxOnly`，需要枚举语义时用
  `as const` 对象配合联合类型（见 `src/types/index.ts` 的 `OrderStatus`）。
- **类型导入必须带 `import type`**。`verbatimModuleSyntax` 已开启。
- **仪表盘数据仍是本地 mock**，集中在 `src/data/mock.ts`；登录鉴权已接真实后端（见上文接口）。

## 后续扩展方向

- 仪表盘接入真实 API：替换 `src/data/mock.ts`
- 亮色/暗色主题切换：把 `src/index.css` 的 `@theme` 改为 CSS 变量驱动
- refresh token 轮换与重放检测（当前未实现）
