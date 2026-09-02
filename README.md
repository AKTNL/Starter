# Starter

一个 React 管理后台主界面（Dashboard），作为本仓库前端项目的起点。

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

## 快速开始

```bash
npm install
npm run dev      # http://localhost:5173
```

其他命令：

```bash
npm run build     # 类型检查 + 生产构建
npm run lint      # oxlint 检查
npm run preview   # 预览构建产物
```

## 目录结构

```
src/
├── main.tsx                 入口，挂载 BrowserRouter
├── App.tsx                  路由表
├── index.css                Tailwind 入口 + 全局基础样式
├── components/
│   ├── layout/              AppLayout / Sidebar / Topbar
│   ├── ui/                  Card / Badge / StatCard / PagePlaceholder
│   └── dashboard/           StatsGrid / RevenueChart / RecentOrders
├── pages/                   Dashboard / Users / Orders / Products / Settings
├── data/                    mock.ts（模拟数据）、navigation.ts（导航配置）
├── lib/utils.ts             cn() / formatCurrency() / formatCompact()
└── types/                   共享类型定义
```

`@/` 是 `src/` 的路径别名，同时在 `tsconfig.app.json` 的 `paths` 和
`vite.config.ts` 的 `resolve.alias` 中配置，改动时两边要同步。

## 约定

- **趋势配色：红涨绿跌**。与 A 股习惯一致（`+x%` 用 `text-red-400`，`-x%` 用 `text-emerald-400`），
  与欧美"绿涨红跌"相反，新增指标类组件时保持一致。
- **深色主题**。底色 `#0b0d12`，侧边栏 `#0f1117`，卡片为 `bg-white/[0.03]` + `border-white/10`。
- **不使用 `enum`**。`tsconfig` 开启了 `erasableSyntaxOnly`，需要枚举语义时用
  `as const` 对象配合联合类型（见 `src/types/index.ts` 的 `OrderStatus`）。
- **类型导入必须带 `import type`**。`verbatimModuleSyntax` 已开启。
- **数据目前全是本地 mock**，集中在 `src/data/mock.ts`，接后端时从这里替换。

## 后续扩展方向

- 接入真实 API：在 `src/data/mock.ts` 之外新增 `src/api/` 与数据请求 hook
- 登录鉴权：在 `App.tsx` 的路由外层包一层守卫路由
- 亮色/暗色主题切换：把 `src/index.css` 的 `@theme` 改为 CSS 变量驱动
