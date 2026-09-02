# React 管理后台主界面

## Goal

`D:\Starter` 目前是一个空仓库（只有 `README.md` 和 `AGENTS.md`），没有任何前端脚手架。
开发者需要一个可直接运行、可直接继续扩展的 **React 管理后台主界面**作为项目起点。
主界面要覆盖后台类产品的通用骨架：侧边导航 + 顶栏 + 概览 Dashboard，
而不是一个空白页面或一个死板的原型图。

## Requirements

### 技术栈（已与开发者确认）

- **构建工具**：Vite
- **框架**：React + TypeScript
- **样式**：Tailwind CSS
- **路由**：`react-router-dom`（侧边栏导航需要多页面切换）
- **图表**：`recharts`
- **图标**：`lucide-react`

### 功能要求

1. **应用骨架 `AppLayout`**
   - 左侧固定 `Sidebar`：Logo 区、导航菜单、底部折叠按钮
   - 顶部 `Topbar`：全局搜索框、通知铃铛（带红点）、用户头像下拉占位
   - 右侧 `<Outlet />` 内容区
   - 移动端：侧边栏收起为抽屉，顶栏出现汉堡按钮

2. **Dashboard 首页**
   - 4 张 KPI 统计卡：标题 / 数值 / 环比趋势 / 图标，趋势用**红涨绿跌**配色
   - 一张营收趋势折线图（recharts），支持近 7 天 / 30 天切换
   - 最近订单表格：订单号、客户、金额、状态徽章、时间
   - 数据用本地 mock，不接后端

3. **其他页面占位**
   - 用户管理、订单管理、商品管理、设置 四个页面用统一占位组件，保证导航不出现死链

4. **工程化**
   - `tsconfig` 开启严格模式，配置 `@/` 路径别名
   - ESLint 配置可用
   - `npm run build` 与 `tsc --noEmit` 均通过

### 视觉要求

- 深色主题（开发者 IDE 为 dark 主题，保持观感一致）
- 圆角卡片、细边框、克制的强调色，不要花哨渐变堆砌
- 响应式：≥1024px 完整布局，<1024px 侧边栏自动收起

## Acceptance Criteria

- [x] `npm install` 成功，`npm run dev` 能启动（localhost:5173 返回 200）
- [x] `npm run build` 通过（含 `tsc -b` 类型检查）
- [x] `npm run lint` 无 error（oxlint，0 warnings / 0 errors）
- [x] 侧边栏可折叠，导航切换路由正常，刷新后当前项高亮正确（`NavLink` 的 `isActive`）
- [x] Dashboard 四张 KPI 卡、趋势图、订单表均渲染出 mock 数据
- [x] 图表 7 天 / 30 天切换生效
- [x] 窗口收窄到 1024px 以下时侧边栏变抽屉，顶栏出现汉堡菜单
- [x] 无任何 `any` 类型，无未使用的导入

> 响应式断点为 1024px（Tailwind `lg`），非 PRD 原文写的 768px —— 1024px 对
> 后台布局更合理，已按此实现。

## Deviations from PRD

1. **新增 `src/data/navigation.ts`**：PRD 只列了 `mock.ts`，但导航配置不是
   mock 数据，单独成文件更符合"单一数据源"要求。
2. **新增 `src/components/ui/PagePlaceholder.tsx`**：PRD 要求四个页面用统一占位
   组件，但没有给出它的归属文件。
3. **断点 1024px 而非 768px**，理由见上。
4. **`RevenueChart` 改为 `lazy()` 异步加载**：recharts 带来 352KB chunk，
   首屏 JS 因此从 626KB 降到 274KB。

## Definition of Done

- 类型检查、lint、构建三项全绿
- 目录结构符合 `.trellis/spec/frontend/directory-structure.md`（该 spec 目前为空，本次实现即作为其事实参考）
- 组件职责单一，mock 数据集中管理，无散落的魔法字符串
- README 补充启动说明

## Out of Scope

- 真实后端接口 / 数据请求层（本次全部用本地 mock）
- 登录鉴权流程
- 暗色/亮色主题切换（本次只做深色）
- 国际化
- 单元测试框架搭建

## Technical Notes

- 仓库现状：仅 `README.md`、`AGENTS.md`、`.trellis/`。无 `package.json`，需从零初始化
- Node 环境：v22.22.2，npm 10.9.7
- `.trellis/spec/frontend/*` 目前全部是 "To fill" 占位，实现时应遵循社区通用 React 最佳实践，
  后续由 bootstrap 任务回填为本项目事实规范
- 预计目录：

  ```
  src/
    main.tsx, App.tsx, index.css
    components/layout/    AppLayout, Sidebar, Topbar
    components/ui/        Card, StatCard, Badge
    components/dashboard/ StatsGrid, RevenueChart, RecentOrders
    pages/                Dashboard, Users, Orders, Products, Settings
    lib/utils.ts          cn()
    data/mock.ts
    types/index.ts
  ```
