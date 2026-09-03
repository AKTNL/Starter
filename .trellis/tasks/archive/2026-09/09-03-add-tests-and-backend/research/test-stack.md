# 前端测试技术选型研究报告

> 任务：`09-03-add-tests-and-backend`
> 项目：`E:\Git\Starter`（React 19.2 + Vite 8.2 + TypeScript 6 严格模式 + Tailwind 4 + oxlint）
> 调研日期：2026-09-03　|　二次独立复核：2026-09-03（见 **§9**，含 3 处前文修正与 1 个未决问题的关闭）
> 本报告只做研究与写文件，**未改动任何项目代码**（未安装依赖、未改 `package.json` / `vite.config.ts` / `tsconfig*.json` / `.oxlintrc.json`）。
> 姊妹报告：同目录 `backend-stack.md`（后端选型，其中 §1.2 已记 localStorage key 不一致的阻塞级 Bug）

---

## 0. TL;DR 推荐速览

| 维度 | 推荐方案 | 版本（实查） | 一句话理由 |
|---|---|---|---|
| 测试运行器 | **Vitest** | `4.1.11` | peer 明确声明 `vite: ^6 \|\| ^7 \|\| ^8`，与 Vite 8.2 无冲突；与 Vite 同源，alias/插件直接复用 |
| DOM 环境 | **jsdom** | `30.0.1` | RTL 官方 CI 基准环境；happy-dom 在 React 19 事件/自定义元素上仍有零星坑 |
| 组件测试 | **@testing-library/react** | `16.3.3` | peer 为 `react: ^18 \|\| ^19`，16.1.0+ 才正式支持 React 19 |
| DOM 断言 | **@testing-library/jest-dom** | `7.0.1` | v7 新增 React 19 友好的 `toContainAnyBy*`/`toContainOneBy*`，且提供 `./vitest` 专用入口 |
| 用户交互 | **@testing-library/user-event** | `14.6.7` | 唯一维护中的交互模拟库 |
| HTTP mocking | **MSW** | `2.15.0` | 网络层拦截，**后端 Express 上线后同一套 handler 可平滑迁到 E2E/契约测试** |
| 覆盖率 | **@vitest/coverage-v8** | `4.1.11` | 与 Vitest 主版本必须严格一致（peer 写死 `4.1.11`） |
| 断言环境 | `globals: true` | — | 让 RTL 自动 cleanup 生效，省掉一类隐蔽的 DOM 泄漏 bug |

**一句话结论**：`vitest@4.1.11` + `jsdom@30.0.1` + `@testing-library/react@16.3.3` + `msw@2.15.0`，把 `test` 字段写进现有 `vite.config.ts`（不新建 `vitest.config.ts`，避免 alias 重复维护），`globals: true` + `src/test/setup.ts`。

---

## 0.1 环境实测基线

所有版本号均于 **2026-09-03** 在项目根目录通过 `npm view <pkg> version` 实查，非凭记忆。
原始命令与输出见 **附录 A**。

```
Node  v22.22.2
npm   10.9.7
```

项目现有关键版本（读自 `package.json` / `node_modules`）：

| 包 | 版本 | 备注 |
|---|---|---|
| react / react-dom | `19.2.8` | |
| vite | `8.2.2` | |
| typescript | `~6.0.2`（npm latest 是 `7.0.2`，项目刻意锁 6） | 报告内所有 TS 建议按 TS 6 行为编写 |
| oxlint | `^1.79.0`（npm latest `1.81.0`） | |
| axios | `^1.20.0`（latest `1.20.0`） | |
| jwt-decode | `^4.0.0`（latest `4.0.0`） | |
| @types/node | `^24.13.3` | 满足 vitest peer `>=24.0.0` |

---

## 1. Vitest 版本与 Vite 8 兼容性

### 1.1 版本实查结果

| 包 | latest | 本项目是否可用 | 依据 |
|---|---|---|---|
| `vitest` | `4.1.11` | 可用 | `npm view vitest dist-tags` → `{ latest: '4.1.11', rc: '5.0.0-rc.4', beta: '5.0.0-beta.7', V3: '3.2.7' }` |
| `@vitest/coverage-v8` | `4.1.11` | 可用 | 必须与 vitest 主版本完全一致 |
| `@vitest/ui` | `4.1.11` | 可选 | peer 写死 `4.1.11` |
| `jsdom` | `30.0.1` | 可用（Node 22.22.2 恰好踩线） | 见 1.3 |
| `happy-dom` | `20.13.2` | 可用 | `engines.node >= 20` |

> **不要用 `vitest@5.0.0-rc.4`**：仍是 rc，且 `@vitest/coverage-v8` 的 `latest` 停在 4.x，装 vitest 5 需要同时用 rc 版 coverage 包，风险不值当。

### 1.2 peer 依赖冲突检查（结论：无冲突）

`npm view vitest@4.1.11 peerDependencies` 实查输出：

```
vite: '^6.0.0 || ^7.0.0 || ^8.0.0'
jsdom: '*'
'happy-dom': '*'
'@vitest/ui': '4.1.11'
'@types/node': '^20.0.0 || ^22.0.0 || >=24.0.0'
'@vitest/coverage-v8': '4.1.11'
```

逐条比对本项目：

| peer | 项目实际 | 判定 |
|---|---|---|
| `vite ^6 \|\| ^7 \|\| ^8` | `8.2.2` | ✅ 命中 `^8.0.0` |
| `@types/node >=24` | `^24.13.3` | ✅ |
| `engines.node ^20 \|\| ^22 \|\| >=24` | `22.22.2` | ✅ |
| `jsdom: '*'` | 任选 | ✅ |
| `@vitest/coverage-v8: 4.1.11`（**精确版本**） | 必须装 `4.1.11` | ⚠️ 版本漂移会报 peer 警告 |

**唯一需要小心的**：`@vitest/coverage-v8` 的 peer 是**精确版本号**而不是范围。以后升级 vitest 时，coverage 包必须同步升级到同一个 patch 版本，否则 `npm install` 会报 `ERESOLVE`。

### 1.3 jsdom 还是 happy-dom？

| 维度 | jsdom `30.0.1` | happy-dom `20.13.2` |
|---|---|---|
| React 19 稳定性 | ✅ RTL 官方 CI 基准环境 | ⚠️ 社区偶发 React 19 事件系统 / 自定义元素（Web Components）属性未渲染问题 |
| 速度 | 慢（约 2–4x 慢于 happy-dom） | 快 |
| DOM API 完整度 | 最全（W3C 覆盖最广） | 有缺口（部分 layout / CSSOM / 表单 API 不完整） |
| Node 引擎 | `^22.22.2 \|\| ^24.15.0 \|\| >=26.0.0` | `>=20` |
| 本项目适配 | 项目是管理后台，大量表单 + 路由 + 图表（recharts），jsdom 更稳 | recharts 依赖较多布局/尺寸 API，happy-dom 风险更高 |

**推荐 jsdom `30.0.1`**，理由：
1. 项目规模小（34 个源文件），jsdom 的性能劣势在这个体量下完全无感；
2. `recharts` + `react-router-dom` + 表单是本项目重头，jsdom 的 API 完整度直接决定这些组件能不能测；
3. RTL 官方 issue triage 长期以 jsdom 为准。

**Node 版本踩线风险**：jsdom 30 要求 `^22.22.2 || ^24.15.0 || >=26.0.0`，本机 `v22.22.2` 是**最低允许值**，没有余量。若 CI/其他同事机器是 Node 22.22.1 或更低，会直接安装失败。兜底方案：

```
jsdom@29.0.0  engines: ^20.19.0 || ^22.13.0 || >=24.0.0   ← 推荐 CI 兜底
jsdom@28.0.0  engines: ^20.19.0 || ^22.12.0 || >=24.0.0
jsdom@27.0.0  engines: >=20
jsdom@26.1.0  engines: >=18                                ← 兼容性最好
```

建议在 `package.json` 里加 `engines` 字段把 Node 版本钉死，避免这类踩线问题：

```json
"engines": { "node": ">=22.22.2" }
```

### 1.4 配置文件：推荐改造现有 `vite.config.ts`

**为什么不新建 `vitest.config.ts`**：官方文档明确说明 `vitest.config.ts` 优先级更高，会**完全覆盖** `vite.config.ts`，即其中的 `@tailwindcss/vite`、`@vitejs/plugin-react`、以及 `'@' → './src'` alias 全部失效，需要再用 `mergeConfig` 手工合并回来（见 `https://vitest.dev/config/`）。多一层间接、多一处 alias 失同步风险，收益为负。

**方案（推荐）**：在 `vite.config.ts` 顶部加三斜杠指令，直接挂 `test` 字段。

`vite.config.ts`（完整可粘贴，只新增 3 处：`///` 指令、`test` 字段、无其他改动）：

```ts
/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // ── 环境 ────────────────────────────────────────────────
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        // 必须显式指定：axios baseURL 是相对路径 '/api'，
        // jsdom 需要一个真实的 origin 才能拼出绝对 URL，
        // 否则 MSW handler 无法用可预期的 URL 匹配。
        url: 'http://localhost:3000',
        pretendToBeVisual: true, // 提供 requestAnimationFrame，recharts 需要
      },
    },

    // ── 全局 API ────────────────────────────────────────────
    // 开启后 describe/it/expect/beforeEach 等为全局符号。
    // 关键副作用：@testing-library/react 的「自动 cleanup」
    // 依赖全局 afterEach 存在；不开启则必须手工 cleanup（见 §2.4）。
    globals: true,

    // ── 初始化 ──────────────────────────────────────────────
    setupFiles: ['./src/test/setup.ts'],

    // ── 文件发现 ────────────────────────────────────────────
    // Vitest 4 的默认 exclude 只排除 node_modules 和 .git，
    // 不再默认排除 dist / coverage。本项目根目录有 dist/，必须补。
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/.trellis/**'],

    // ── 隔离与 mock 复位 ────────────────────────────────────
    restoreMocks: true,   // 每个用例后还原 vi.spyOn
    unstubEnvs: true,     // 还原 vi.stubEnv（VITE_API_URL 等）
    unstubGlobals: true,  // 还原 vi.stubGlobal
    clearMocks: true,     // 清空 mock 调用记录

    // ── CSS ────────────────────────────────────────────────
    // 本项目是 Tailwind 4（通过 @tailwindcss/vite 插件），
    // 不处理 CSS 时测试只拿不到样式，不影响断言，关掉可提速。
    css: false,

    // ── 覆盖率（详见 §5.2）──────────────────────────────────
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/test/**',
        'src/mocks/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/types/**',
        'src/data/**',
      ],
    },
  },
})
```

> **注意 `server.deps`**：Vitest 4 已移除 `deps.external` / `deps.inline` / `deps.fallbackCJS`，改名为 `server.deps.*`。本项目没有需要 inline 的依赖，保持默认即可。

---

## 2. React 19 组件测试

### 2.1 版本与 peer 实查

`@testing-library/react@16.3.3` 的 `peerDependencies`：

```
react:                '^18.0.0 || ^19.0.0'
react-dom:            '^18.0.0 || ^19.0.0'
@types/react:         '^18.0.0 || ^19.0.0'
@types/react-dom:     '^18.0.0 || ^19.0.0'
'@testing-library/dom': '^10.0.0'      ← 是 peer，不是 dependency！必须显式安装
```

**结论**：
- React 19.2.8 ✅ 落在 `^19.0.0` 内，**无需等 RTL 17**。社区普遍认知「React 19 需要 RTL ≥ 16.1.0」（见 `testing-library/react-testing-library#1397` 中 reporter 的自述），`16.3.3` 远超此线。
- **`@testing-library/dom` 必须显式装**（`10.4.1`），否则 `npm ls` 会缺 peer，运行时报 `Cannot find module '@testing-library/dom'`。

`@testing-library/jest-dom@7.0.1`：

```
peerDependencies = { vitest: '>= 0.32', '@testing-library/dom': '>=10 <11' }
engines = { npm: '>=6', node: '>=22', yarn: '>=1' }
```

v7.0.0 的 BREAKING CHANGES（读自 `github.com/testing-library/jest-dom/releases`）：
> `@testing-library/dom` is now a required peer dependency. The minimum supported Node.js version is now 22.

- Node `22.22.2` ✅
- 有专门的 `./vitest` 子路径导出（实查 `exports` 字段确认）：
  ```json
  "./vitest": { "import": { "types": "./types/vitest.d.ts", "default": "./dist/vitest.mjs" } }
  ```
  即 setup 文件里写 `import '@testing-library/jest-dom/vitest'`，它会自动 `expect.extend(...)` 并做类型增强。

### 2.2 是否需要 jest-dom？

**需要，但不是刚需**。给 `toBeInTheDocument()` / `toBeDisabled()` / `toHaveValue()` / `toBeVisible()` 这些语义化断言。对本项目价值排序：

| 用例类型 | 无 jest-dom | 有 jest-dom |
|---|---|---|
| ProtectedRoute 断言 spinner 渲染 | `expect(container.querySelector('.animate-spin')).not.toBeNull()` | `expect(screen.getByTestId('auth-loading')).toBeInTheDocument()` |
| 断言重定向后 user 变 null | 读 context 值 | `expect(screen.getByRole('status')).toBeVisible()` |

结论：**装上**，成本 1 个包，收益是可读性。若追求极简依赖可省。

### 2.3 完整 `src/test/setup.ts`

放在 `src/test/` 下（而不是根目录），这样它被 `tsconfig.app.json` 的 `include: ["src"]` 覆盖，能被 `tsc -b` 类型检查到。

```ts
// src/test/setup.ts
import '@testing-library/jest-dom/vitest' // 必须在最前：扩展 expect + 注入 matcher 类型
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, afterAll, vi } from 'vitest'
import { server } from '@/mocks/server'

// 1) DOM 清理。globals:true 时 RTL 本会自动注册，这里显式调用一次
//    是幂等的（cleanup 内部对空容器无副作用），防止将来关掉 globals 后静默泄漏。
afterEach(() => {
  cleanup()
})

// 2) localStorage 隔离（详见 §4）
beforeEach(() => {
  localStorage.clear()
})

// 3) MSW 生命周期（详见 §3.4）
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})
afterEach(() => {
  server.resetHandlers()
})
afterAll(() => {
  server.close()
})

// 4) 静音预期内的 console.error
//    AuthContext 在 catch 分支里有 console.error('Auth check failed:'/'Login failed:')，
//    这些是「被测行为」的一部分，不该污染测试输出。
//    注意：只静音 error，warn 保留，避免掩盖 React 的 key/dep 警告。
//
//    ⚠️ 必须放在 beforeEach 里，不能放在模块顶层：
//    vite.config.ts 开了 restoreMocks: true，Vitest 会在「每个用例之后」还原所有
//    vi.spyOn 创建的 spy。写在顶层的 spy 会在第 1 个用例结束后被还原，
//    之后所有用例的 console.error 重新变得吵闹（且静默失效，不易察觉）。
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
```

> **副作用提醒**：MSW 的 `onUnhandledRequest: 'error'` 也是通过 `console.error` 打印详情的。
> 被静音后，你只会看到「请求失败」，看不到 MSW 的提示文字。请求依然会失败（测试照样红），
> 所以不影响正确性；调试时临时把上面那段注释掉即可。

> ⚠️ `erasableSyntaxOnly: true` 约束下：setup 文件里**不能**写 `enum`、`namespace`、类的构造函数参数属性（`constructor(private x: string)`）、`import x = require()`。以上代码已规避。
> ⚠️ `verbatimModuleSyntax: true` 约束下：类型导入**必须**写 `import type { X } from '...'`。

### 2.4 React 19 下的已知坑（逐条给解法）

**坑 1：`globals: false` 时 RTL 不自动 cleanup**

RTL 的自动清理是在 `index.js` 里检测全局 `afterEach` 是否存在后才注册的。`globals: false` + 显式 `import { afterEach } from 'vitest'` 时，**RTL 检测不到全局 `afterEach`，不会注册 cleanup**，导致 `render()` 产生的 DOM 一直挂在 `document.body` 上。症状：同一个测试文件里后一个用例的 `screen.getByText('登录')` 会查到前一个用例残留的节点，报 "Found multiple elements"。

解法（三选一，推荐 ①）：
1. `globals: true`（本报告方案），RTL 自动 cleanup 生效；
2. setup 文件里显式 `afterEach(() => cleanup())`（本报告已加，双保险）；
3. 每个测试文件自己 `afterEach(cleanup)`。

**坑 2：act 警告 `An update to X inside a test was not wrapped in act(...)`**

React 19 移除了 `react-dom/test-utils` 的 `act`，改为从 `react` 直接导出 `act`。RTL 16.3 已内部适配，但**异步状态更新**仍会触发警告。本项目 `AuthProvider` 恰好是重灾区——`useEffect` 里 `await authAPI.getCurrentUser()` 后 `setUser(...)`。

正确写法（**不要**用 `act(async () => {...})` 硬包）：

```ts
import { renderHook, screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

it('挂载后从 /auth/me 恢复用户', async () => {
  const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })

  // ✅ 正确：waitFor 内部已用 asyncWrapper 包裹 act，会等 React 完成提交
  await waitFor(() => {
    expect(result.current.isLoading).toBe(false)
  })
  expect(result.current.user).toEqual(mockUser)

  // ✅ 或者用 find* 系列，它们内部就是 waitFor + act
  // expect(await screen.findByText('admin@demo.com')).toBeInTheDocument()

  // ❌ 错误：同步断言，此时 setState 还没提交，必然拿到初始值
  // expect(result.current.user).toEqual(mockUser)
})
```

**坑 3：`IS_REACT_ACT_ENVIRONMENT`**

直接 `import { act } from 'react'` 手工驱动时，需要 `globalThis.IS_REACT_ACT_ENVIRONMENT = true`，否则 React 会警告并在 `act` 外更新时不 flush。用 RTL 的 `render` / `renderHook` / `waitFor` 时 RTL 已代为设置，**不要自己再设**。只有在写「脱离 RTL 的裸 `react` act 测试」时才需要：

```ts
// 仅在不使用 RTL 时需要，一般不需要写
beforeAll(() => {
  ;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})
```

**坑 4：React 19 + `use()` / Suspense**

如果后续组件用 `use()` 读 Promise，RTL 需要 `<Suspense>` 包裹且必须 `await screen.findBy*`。本项目当前没用到，先记录。

**坑 5：StrictMode 双调用**

测试里**不要**给 `wrapper` 套 `<StrictMode>`，否则 `AuthProvider` 的 `useEffect` 会跑两遍，`/auth/refresh` 会被调用两次，让「调用次数」断言凭空翻倍。生产代码 `main.tsx` 里的 `StrictMode` 与测试无关。

### 2.5 `renderHook` 测试 Context 的正确用法

**测 `useAuth()` hook 本身**（推荐形态，最接近真实用法）：

```ts
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
// 注意路径：Provider 定义在 `src/contexts/AuthContext.tsx`（文件名不是 AuthProvider.tsx），
// 而 Context 实例在 `src/contexts/auth-context.ts`。两个文件别搞混。
import { AuthProvider } from '@/contexts/AuthContext'
import { useAuth } from '@/hooks/useAuth'

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

it('登录成功后写入 localStorage 并更新 user', async () => {
  const { result } = renderHook(() => useAuth(), { wrapper })

  let ret: { success: boolean; error?: string } | undefined
  await waitFor(async () => {
    ret = await result.current.login('admin@demo.com', 'secret123')
  })

  expect(ret).toEqual({ success: true })
  expect(localStorage.getItem('starter-access-token')).toBe('access-abc')
  expect(localStorage.getItem('starter-auth-user')).toBe(JSON.stringify(mockUser))
  expect(result.current.isLoading).toBe(false)
})
```

**测 `AuthContext.Provider` 直接注入值**（适合测消费组件如 `ProtectedRoute`，绕过 Provider 的副作用）：

```ts
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthContext } from '@/contexts/auth-context'
import type { AuthContextType } from '@/contexts/auth-context'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

function renderWithAuth(
  value: Partial<AuthContextType>,
  initialPath = '/users',
  allowedRoles?: ('admin' | 'user')[],
) {
  const ctx: AuthContextType = {
    user: null,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    ...value,
  }
  return render(
    <AuthContext.Provider value={ctx}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<ProtectedRoute allowedRoles={allowedRoles} />}>
            <Route path="users" element={<div>受保护内容</div>} />
          </Route>
          <Route path="login" element={<div>登录页</div>} />
          <Route path="/" element={<div>首页</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}
```

**要点**：
- `renderHook` 的 `wrapper` 每次调用都会新建组件实例 → 天然隔离，不需要额外重置。
- 要拿到**最新**的 `result.current`，异步操作后必须 `await waitFor(...)` 或 `await act(async () => ...)`。
- 不要 `const { user } = result.current` 这样解构后跨 await 使用——拿到的是快照，永远是旧值。

---

## 3. axios mocking 方案对比

### 3.1 三方案逐维对比

| 维度 | `axios-mock-adapter@2.1.0` | **MSW `2.15.0`** | 手写 `vi.mock('axios')` |
|---|---|---|---|
| 拦截层级 | axios adapter 层（替换 `config.adapter`） | **网络层**（patch `http.ClientRequest` / XHR / fetch） | 模块层（整个 axios 被替换） |
| 与 axios 耦合 | 强：必须拿到**同一个** axios 实例 | 无：只要是真实网络请求就能拦 | 极强：绑死 import 路径 |
| 换成 `fetch` 会怎样 | 全废 | 无影响 | 无影响 |
| 能验证「请求头 / body / URL」 | 能（但要读 `config.headers`） | 能，且用标准的 `Request` 对象断言，更真实 | 能 |
| 后端上线后能否复用 | 不能，只能扔掉 | **能**：同一批 handler 可直接复用到 E2E、`server.listen()` 之外还可做契约测试基线 | 不能 |
| 未预期的请求 | 默认放行/报错二选一，需配置 | `onUnhandledRequest: 'error'` 严格报错，杜绝静默漏 mock | 静默返回 undefined，最危险 |
| 调试体验 | 一般 | 好：`server.events.on('request:start', ...)` 可打印所有流量 | 差 |
| 体积 / 依赖 | 极小（1 个包） | 中等（msw + @mswjs/interceptors） | 0 |
| 学习成本 | 低 | 中 | 低 |
| 维护活跃度 | 低（2024 后更新缓慢） | 高 | — |

### 3.2 推荐：MSW，理由三条

**① 后端马上就要来，MSW 是唯一「现在能用、将来不浪费」的投资。**

后端是 Express 5 + better-sqlite3 + Drizzle，接口契约已在 `backend-stack.md` §1.1 定义清楚（`POST /auth/login` / `POST /auth/register` / `GET /auth/me` / `POST /auth/refresh`）。用 MSW 写的 handler 本质上是**「前端对后端契约的可执行声明」**：

```
现在（无后端）          → MSW handler 是 mock，前端测试跑得通
后端联调期              → 同一批 handler 可以反向对照后端实现（字段对不对、状态码对不对）
E2E / CI 冒烟           → handler 可在 Playwright 里继续用作第三方依赖的 stub
```

`axios-mock-adapter` 和 `vi.mock` 在后端上线那一刻就变成了纯技术债，必须重写。

**② MSW 在网络层拦截，能测到「拦截器」这类真实行为。**

本项目 `src/api/auth.ts:13-22` 有请求拦截器注入 `Authorization: Bearer`。这一层逻辑在 axios adapter **之上**，用 `axios-mock-adapter`（替换 adapter）**也能测到**（因为 adapter 拿到的是已处理过的 config），但用 `vi.mock('axios')` 就**完全测不到**——整个 axios 被替换掉了，拦截器代码根本没执行。

而 §6 里最重要的那条回归用例（P0-4：Bearer header 是否注入）恰恰就是要测拦截器。

**③ `onUnhandledRequest: 'error'` 是防漏 mock 的安全网。**

手写 stub 的最大问题是「新增了一个请求但忘了 mock」时静默通过。MSW 严格模式下会直接报错。

### 3.3 备选：什么时候用 `axios-mock-adapter`

保留它作为**补充手段**的场景：只针对某个 axios 实例做一次性的、极简的「成功/失败」二分 mock，且完全不关心 URL 匹配细节。例如只想让 `authAPI.login` 无条件 reject 一次：

```ts
import MockAdapter from 'axios-mock-adapter'
import { api } from '@/api/auth' // ← 需要 export 出 axios 实例，当前代码没导出！

const mock = new MockAdapter(api)
mock.onPost('/auth/login').reply(401, { message: '邮箱或密码错误' })
// ...
mock.restore()
```

⚠️ **当前代码障碍**：`src/api/auth.ts` 里的 `const api = axios.create({...})` **没有 export**。要用 `axios-mock-adapter` 必须先改生产代码加 `export`，而 MSW 不需要——这是选 MSW 的又一个实操理由（符合「不改生产代码」的约束）。

### 3.4 MSW 完整落地代码

`src/mocks/handlers.ts`：

```ts
import { http, HttpResponse } from 'msw'
import type { User } from '@/types'

export const mockUser: User = {
  id: 'u-1',
  username: 'admin',
  email: 'admin@demo.com',
  role: 'admin',
}

/**
 * 注意：这里用 '*/api/...' 通配前缀而不是 '/auth/login'。
 * 原因：axios baseURL 是相对路径 '/api'，在 jsdom 下会被拼成
 * 'http://localhost:3000/api/auth/login'。用通配前缀可以同时兼容
 * jsdom(XHR 适配器) 与 node(http 适配器) 两种解析结果，
 * 也让 handler 对 VITE_API_URL 的变化免疫。
 */
const API = '*/api'

export const handlers = [
  http.post(`${API}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string }
    if (body.email === 'admin@demo.com' && body.password === 'secret123') {
      return HttpResponse.json({
        access_token: 'access-abc',
        refresh_token: 'refresh-xyz',
        user: mockUser,
      })
    }
    return HttpResponse.json({ message: '邮箱或密码错误' }, { status: 401 })
  }),

  http.post(`${API}/auth/register`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string; name: string }
    return HttpResponse.json({
      access_token: 'access-abc',
      refresh_token: 'refresh-xyz',
      user: { ...mockUser, username: body.name, email: body.email },
    })
  }),

  http.get(`${API}/auth/me`, ({ request }) => {
    const auth = request.headers.get('Authorization')
    if (auth !== 'Bearer access-abc') {
      return HttpResponse.json({ message: '未授权' }, { status: 401 })
    }
    return HttpResponse.json(mockUser)
  }),

  http.post(`${API}/auth/refresh`, async ({ request }) => {
    const body = (await request.json()) as { refreshToken: string }
    if (body.refreshToken !== 'refresh-xyz') {
      return HttpResponse.json({ message: 'refresh token 无效' }, { status: 401 })
    }
    return HttpResponse.json({
      access_token: 'access-new',
      refresh_token: 'refresh-new',
    })
  }),
]
```

`src/mocks/server.ts`：

```ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

单测里**覆盖**某个 handler（用于失败路径）：

```ts
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'

it('refresh 失败时清空登录态', async () => {
  server.use(
    http.post('*/api/auth/refresh', () =>
      HttpResponse.json({ message: 'refresh token 无效' }, { status: 401 }),
    ),
  )
  // ... 断言
})
```

断言请求被正确发出（这是 MSW 比 adapter 方案强的地方）：

```ts
import { server } from '@/mocks/server'

it('login 带上正确的 body', async () => {
  let captured: unknown
  server.events.on('request:start', ({ request }) => {
    void request.clone().json().then((b) => { captured = b })
  })
  await authAPI.login('admin@demo.com', 'secret123')
  await new Promise((r) => setTimeout(r, 0)) // 等事件回调
  expect(captured).toEqual({ email: 'admin@demo.com', password: 'secret123' })
})
```

### 3.5 MSW + jsdom 的风险点与验证步骤

**风险**：MSW 的 `setupServer` 官方描述是「augments the standard request modules like `http`」（见 `mswjs.io/docs/api/setup-server`）。而 axios 在 jsdom 环境下可能走 **XHR 适配器**（axios 的 `browser` 条件导出指向 `dist/browser/axios.cjs`，内部用 `XMLHttpRequest`），不是 `http.ClientRequest`。如果 MSW 在 Node 侧只启用了 ClientRequest 拦截器，请求就可能打穿 mock 直连 `localhost:3000`（连接失败 → axios 报 Network Error）。

**必须做的验证步骤（装完依赖后第一步就跑）**：

```bash
# 写一个最小验证用例 src/api/auth.smoke.test.ts
# 断言 authAPI.getCurrentUser() 能拿到 mockUser 而不是抛 Network Error
npx vitest run src/api/auth.smoke.test.ts
```

**若打穿，三个兜底方案（按推荐顺序）**：

1. **强制 axios 走 http 适配器**（最干净）：在 setup 文件里设
   ```ts
   // src/test/setup.ts
   import axios from 'axios'
   axios.defaults.adapter = 'http'
   ```
   axios 1.20 支持字符串形式的 adapter 名。这会把 axios 拉回 Node `http` 模块，MSW 100% 能拦。

2. **jsdom 环境改用 `@mswjs/interceptors` 的 XHR 拦截器**：需要额外装 `@mswjs/interceptors` 并手工 `new XMLHttpRequestInterceptor()`，配置成本高，不推荐。

3. **改用 `axios-mock-adapter`**：失败时的最后退路（此时必须给 `src/api/auth.ts` 的 `api` 加 `export`）。

> 顺带：上面方案 1 还有个额外好处——绕开 jsdom XHR 的 CORS 模拟问题（jsdom 对跨域 XHR 会走一套 preflight 逻辑，容易出莫名其妙的失败）。

---

## 4. 测试隔离：jsdom 下 localStorage 清理

### 4.1 三种方案对比

| 方案 | 做法 | 优点 | 缺点 |
|---|---|---|---|
| A. `beforeEach(localStorage.clear)` | setup 里全局注册 | 简单、覆盖全部用例、对「被测代码写入的 key」也有效 | 无法在用例内断言「清理前」的状态（用不上的场景） |
| B. `vi.stubGlobal('localStorage', fakeImpl)` | 用内存对象替换 | 可完全控制、可注入抛异常的 fake 来测 catch 分支 | 与 jsdom 的 `window.localStorage` 脱钩；RTL 内部或第三方库若读 `window.localStorage` 会拿到不同对象 |
| C. `afterEach(() => localStorage.clear())` | 收尾清理 | 和 A 等价 | 若某个用例崩溃中断，残留会带到下一个用例（A 更稳） |

### 4.2 推荐实践

**主方案：A（全局 `beforeEach(localStorage.clear)`），已在 §2.3 的 setup 文件里配好。**

理由：
1. jsdom 30 的 `localStorage` 是**按 origin 持久化**的，而 Vitest 默认隔离模式下每个测试文件有独立环境，但**同一文件内的多个用例共享同一个 jsdom 实例** → 同文件内不清理会串味。
2. `beforeEach` 而非 `afterEach`：用例失败时也能保证下一个用例起点干净。
3. 生产代码 `src/lib/auth.ts` 用的是裸 `localStorage.getItem(...)`（不是 `window.localStorage`），在 jsdom 环境下这两者指向同一个对象，A 方案完全覆盖。

**补充方案 B 的唯一正当用途**：测试「localStorage 不可用/抛异常」的降级路径。本项目 `src/lib/auth.ts:10-17` 的 `getStoredUser` 有 try/catch，但注意——它只在 `JSON.parse` 抛错时清 key，**`localStorage.getItem` 本身抛错（如 Safari 隐私模式）时不在 catch 保护范围内**吗？实际在：整个函数体都在 try 内。要测这条：

```ts
import { vi } from 'vitest'
import { getStoredUser } from '@/lib/auth'

it('localStorage 抛异常时降级返回 null 而不是崩溃', () => {
  const getItem = vi
    .spyOn(Storage.prototype, 'getItem')
    .mockImplementation(() => { throw new Error('SecurityError') })
  const removeItem = vi.spyOn(Storage.prototype, 'removeItem')

  // 注意：removeItem 在 catch 里也会抛，所以断言「不向外抛出」即可
  expect(() => getStoredUser()).not.toThrow()

  getItem.mockRestore()
  removeItem.mockRestore()
})
```

> ⚠️ 这条用例会暴露一个**真实的健壮性问题**：`getStoredUser` 的 catch 分支里调 `localStorage.removeItem(STORAGE_KEY)`，如果 `getItem` 因安全策略抛错，`removeItem` 大概率也会抛，导致错误逃逸。若这条测试挂了，说明生产代码需要改成嵌套 try 或把 removeItem 也包起来。这是「写测试顺手发现 bug」的典型收益。

**其他需要一并隔离的全局状态**（setup 文件已覆盖或按需添加）：

```ts
// setup.ts 追加
afterEach(() => {
  sessionStorage.clear()      // 若后续代码用到
  vi.useRealTimers()          // 还原 vi.useFakeTimers()
})

// 时间冻结：测 isTokenExpired 时非常有用
// 在用例里：
//   vi.useFakeTimers()
//   vi.setSystemTime(new Date('2026-09-03T10:00:00Z'))
//   ... 断言 ...
//   vi.useRealTimers()  ← setup 的 afterEach 已兜底
```

**模块级隔离**：`src/api/auth.ts` 里的 axios 实例是**模块单例**（`const api = axios.create(...)`），其 `baseURL` 在模块加载时读取 `import.meta.env.VITE_API_URL` 并固化。若某个用例要改 `VITE_API_URL`，必须：

```ts
// ✅ 正确：先 stubEnv，再动态 import
vi.stubEnv('VITE_API_URL', 'http://test.local/api')
const { authAPI } = await import('@/api/auth')  // 重新求值模块
// 用完：vi.unstubAllEnvs()（setup 里 unstubEnvs: true 已兜底）

// ❌ 错误：静态 import 在 stubEnv 之前就已完成，改了也无效
```

---

## 5. 接入现有工程

### 5.1 `package.json` scripts

只**新增**，不改现有 5 个 script：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "oxlint",
    "preview": "vite preview",
    "typecheck": "tsc -b --noEmit",

    "test": "vitest",
    "test:run": "vitest run",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:ci": "vitest run --coverage --reporter=default --reporter=junit --outputFile=coverage/junit.xml"
  }
}
```

设计说明：
- `test` = watch 模式（本地开发首选，Vitest 默认在 TTY 下就是 watch）；
- `test:run` = 单次运行（CI 用）；
- `test:ci` 里的 `--reporter=junit` 需要 `junit` reporter（Vitest 内置，无需装包）；
- **不要**把 `test` 挂到 `build` 里：后端还没接，测试套件初期必然不稳定，会挡住构建。建议先在 CI 单独跑，稳定后再考虑 `pretest` 之类的钩子。

若要加 `--ui`，额外装 `@vitest/ui@4.1.11`（peer 写死主版本）。

### 5.2 覆盖率配置要点

**用 `@vitest/coverage-v8` 吗？用。** 理由：它是 Vitest 官方 v8 provider，与 Vite 共用同一套 AST remap，对 TSX 的 sourcemap 还原比 istanbul 更准。Vitest 4 里 v8 provider 还换了全新的 AST-aware remapping 实现（旧实现基于 `v8-to-istanbul`，`coverage.experimentalAstAwareRemapping` 选项已移除并默认启用）。

**四个必须注意的点**：

1. **版本必须锁死同号**：`@vitest/coverage-v8` 的 peer 是精确的 `4.1.11`。

2. **`coverage.all` 在 Vitest 4 已被移除**（迁移文档原文："we have removed `coverage.all` completely and defaulted to include only covered files in the report"）。
   影响：**不再有「未被测到的文件也计入 0%」的行为**。要恢复「全量统计」效果，必须显式写 `coverage.include`：

   ```ts
   coverage: {
     include: ['src/**/*.{ts,tsx}'],  // ← 写死后，命中的文件（含 0% 覆盖的）都会进报告
     exclude: [...],                   // ← exclude 只在 include 命中的集合上生效
   }
   ```

3. **`coverage.extensions` 也被移除**，不要再写。

4. **阈值**：`coverage.thresholds.100` 是快捷开关（把 lines/functions/branches/statements 全设 100）。本项目初期**不要**设阈值，等覆盖率稳定后再加：

   ```ts
   coverage: {
     // 初期：不设 thresholds
     //
     // 稳定后（建议先只给认证链路设，键是 glob，会与 coverage.include 命中集合求交）：
     thresholds: {
       'src/lib/auth.ts': { statements: 95, branches: 90, functions: 100, lines: 95 },
       'src/contexts/AuthContext.tsx': { statements: 85, branches: 80 },
     },
     // 或全局阈值：thresholds: { lines: 60, functions: 60, branches: 50, statements: 60 }
     // 快捷开关：thresholds: { 100: true }  // 四项全设 100
   }
   ```

   > 注意：`thresholds` 的 glob 键只在 `coverage.include` 命中的文件集合上生效，
   > 被 `coverage.exclude` 排掉的文件（如 `src/test/**`、`src/mocks/**`）不会被计入。

5. **`.gitignore` 追加**（当前文件里**没有** `coverage`）：

   ```gitignore
   # Test coverage
   coverage
   ```

   > 注意 `.gitignore` 现有 `dist` 但无 `coverage`；同时建议加 `*.junit.xml`。

### 5.3 TypeScript 配置

**现状**：`tsconfig.app.json` 的 `include: ["src"]`，`types: ["vite/client"]`。

**问题 1**：`globals: true` 后，`describe` / `it` / `expect` / `beforeEach` 是全局符号，TS 不认识。

**解法**：给 `tsconfig.app.json` 的 `types` 加 `"vitest/globals"`：

```json
{
  "compilerOptions": {
    "types": ["vite/client", "vitest/globals"]
  }
}
```

**问题 2**：`src/test/setup.ts`、`src/mocks/**` 也在 `src/` 下，会被 `npm run build` 的 `tsc -b` 一起类型检查。

两种取向：

| 取向 | 做法 | 优点 | 缺点 |
|---|---|---|---|
| **A. 一起检查（推荐）** | 不改 include | 测试代码的类型错误在构建期就暴露；单测与源码类型永不漂移 | `tsc -b` 变慢；CI 构建必须装 devDeps |
| B. 拆分 | 在 `tsconfig.app.json` 加 `"exclude": ["src/**/*.{test,spec}.{ts,tsx}", "src/test/**", "src/mocks/**"]`，另建 `tsconfig.test.json` 单独引用 | 构建快、生产构建不依赖测试依赖 | 测试代码类型错误只能靠 `npm run typecheck` 之外的手段发现 |

**推荐 A**：项目体量小，构建耗时差异可忽略，而「源码改了类型、测试没跟上」是更贵的成本。

**问题 3**：`erasableSyntaxOnly: true` 对测试代码的具体约束（写用例时最容易踩）：

| 不允许 | 替代写法 |
|---|---|
| `enum Role { Admin = 'admin' }` | `const ROLES = { Admin: 'admin', User: 'user' } as const` |
| `namespace Fixtures { ... }` | 普通模块 `export const fixtures = {...}` |
| `class C { constructor(private x: string) {} }` | `class C { private x: string; constructor(x: string) { this.x = x } }` |
| `import axios = require('axios')` | `import axios from 'axios'` |

**问题 4**：`verbatimModuleSyntax: true` → 类型导入必须 `import type`。测试文件里高频：

```ts
import type { User } from '@/types'          // ✅
import { User } from '@/types'               // ❌ 编译时报错
import type { Mock } from 'vitest'
import { vi, describe, it, expect } from 'vitest'  // 值导入正常
```

**问题 5**：`noUnusedLocals` / `noUnusedParameters` → 测试里不要留未使用的变量、未使用的回调参数（用 `_` 前缀或不写）。

### 5.4 oxlint 配置

**现状** `.oxlintrc.json`：

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

**需要改吗？需要，加两处。**

oxlint 内置了 `vitest` 插件（源自 `@vitest/eslint-plugin`，见 `oxc.rs/docs/guide/usage/linter/plugins.html` 的 Supported plugins 表），且有 `env.vitest` 预设全局（见 config-file-reference 的 env 列表：`vitest - Vitest globals`）。

**改动 1：给测试文件单独开 `vitest` 插件 + env**

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  },
  "overrides": [
    {
      "files": [
        "**/*.{test,spec}.{ts,tsx}",
        "src/test/**",
        "src/mocks/**"
      ],
      "plugins": ["vitest", "typescript"],
      "env": { "vitest": true },
      "rules": {
        "typescript/no-explicit-any": "off",
        "react/only-export-components": "off"
      }
    }
  ]
}
```

**改动 2：`src/main.tsx` 已有 React 挂载代码，无需改。** 但要注意 `react/only-export-components` 对测试文件的影响：`src/contexts/auth-context.ts` 导出的是 `AuthContext`（非组件），已被 `allowConstantExport: true` 放行；测试文件里经常「一个文件导出多个 render 辅助函数」，所以 override 里把这条关掉。

**必须验证**：改完后跑 `npm run lint`，确认：
1. `oxlint` 不认识 `plugins: ["vitest"]` 时会静默忽略还是报错 → 若报错，说明当前 `oxlint@^1.79.0` 版本太老，需升到 `1.81.0`；
2. `env: { vitest: true }` 是否被 schema 接受（`.oxlintrc.json` 配了 `$schema`，编辑器会实时校验）。

> **待办**：`oxlint` 从 `^1.79.0` 升到 `^1.81.0` 前，先用 `npx oxlint --help` 确认是否有 `--vitest-plugin` flag（内置插件列表随版本变化）。这是本报告唯一一个「需要实机验证」的点，见 §7。

### 5.5 完整依赖清单

`npm install -D` 一次装齐（版本号已实查校验）：

```bash
npm install -D \
  vitest@4.1.11 \
  @vitest/coverage-v8@4.1.11 \
  @vitest/ui@4.1.11 \
  jsdom@30.0.1 \
  @testing-library/react@16.3.3 \
  @testing-library/dom@10.4.1 \
  @testing-library/jest-dom@7.0.1 \
  @testing-library/user-event@14.6.7 \
  msw@2.15.0
```

> `@testing-library/dom@10.4.1` 是 **RTL 16.3.3 和 jest-dom 7.0.1 的共同 peer**，必须显式装，npm 的自动 peer 安装可能漏。

> `msw` 的 peer 只有 `typescript: >= 4.8.x`，TS 6 ✅。

---

## 6. 用例设计建议

### 6.1 设计原则

针对这份认证代码，价值排序是：
**「状态机分支覆盖」 > 「边界/异常」 > 「happy path」 > 「UI 渲染细节」**。

原因：`AuthContext` 的 `checkAuthStatus` 是一个**4 分支状态机**（有效 token / 过期+可刷新 / 过期+刷新失败 / 过期+无 refresh token），每条分支的副作用（写/清 localStorage、setUser）都不一样，且**互相之间只有一行判断之差**——这是 bug 最容易藏的地方。

**前置说明**：本节每条用例都标注了「当前是否会通过」。标注为 **【预期失败·哨兵】** 的用例，其目的就是**钉死已知 bug**，修复前它必须红着。

### 6.2 P0 核心用例（12 条）

---

#### P0-1 `getStoredUser` 遇损坏数据时自愈

- **文件**：`src/lib/auth.test.ts`
- **前置**：`localStorage.setItem('starter-auth-user', '{not-json')`
- **操作**：`getStoredUser()`
- **期望**：
  1. 返回 `null`
  2. `localStorage.getItem('starter-auth-user') === null`（catch 分支的 `removeItem` 生效）
  3. 不向外抛出异常
- **价值**：覆盖 `src/lib/auth.ts:14-17` 的 catch 分支，这是唯一有副作用清理的分支

---

#### P0-2 `clearStoredAuth` 全清且不误伤无关 key

- **文件**：`src/lib/auth.test.ts`
- **前置**：4 个 `starter-*` key 全写入 + `localStorage.setItem('unrelated', 'keep-me')`
- **操作**：`clearStoredAuth()`
- **期望**：
  1. `starter-auth-user` / `starter-remember-email` / `starter-access-token` / `starter-refresh-token` 全部为 `null`
  2. `localStorage.getItem('unrelated') === 'keep-me'`（**不误删**，防止将来有人图省事改成 `localStorage.clear()`）
- **价值**：`clearStoredAuth` 是登出和刷新失败的共同收口，误删会连用户的主题偏好一起干掉

---

#### P0-3 `isTokenExpired` 四象限

- **文件**：`src/api/auth.test.ts`（`isTokenExpired` 定义在 `src/api/auth.ts:108`）
- **前置**：`vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-03T10:00:00Z'))`
- **操作 / 期望**（用 `jwt-decode` 能解出的真实 JWT 字符串，payload 里放 `exp`）：

| # | token 的 `exp` | 期望 |
|---|---|---|
| a | `now/1000 + 3600`（1 小时后） | `false` |
| b | `now/1000 - 1`（1 秒前） | `true` |
| c | `now/1000`（正好此刻） | `true`（代码是 `Date.now() >= exp*1000`，边界取等） |
| d | payload 无 `exp` 字段 | `true` |
| e | `'not-a-jwt'`（decode 抛错） | `true` |
| f | `''`（空串） | `true` |

- **构造 JWT 的辅助函数**（注意 `erasableSyntaxOnly`，用普通函数不是 enum）：
  ```ts
  function makeJwt(payload: Record<string, unknown>): string {
    const b64 = (o: unknown) =>
      btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.fakesig`
  }
  ```
- **价值**：`exp` 边界（用例 c）直接决定「token 恰好在验证那一刻过期」这种竞态下的行为

---

#### P0-4 请求拦截器注入 Bearer header 【预期失败·哨兵】

- **文件**：`src/api/auth.test.ts`
- **前置**：`localStorage.setItem('starter-access-token', 'access-abc')`（用 `lib/auth.ts` 的 key）
- **操作**：`await authAPI.getCurrentUser()`（MSW handler 放行）
- **期望**：MSW handler 收到的 `request.headers.get('Authorization') === 'Bearer access-abc'`
- **当前实际**：`src/api/auth.ts:15` 读的是 `localStorage.getItem('access_token')` → 拿到 `null` → **不发 Authorization 头** → handler 返回 401
- **【预期失败】** 这条用例**现在必须是红的**。它就是 `backend-stack.md` §1.2 记录的 ① 号阻塞级 Bug 的可执行断言。
- **修复后**：改为读 `starter-access-token`（或改为调用 `getStoredAccessToken()`）后本条转绿
- **价值**：**本项目目前价值最高的一条测试**。它把一个「后端联调时才发现的 401」提前到了本地单测

---

#### P0-5 `login` 请求形状正确

- **文件**：`src/api/auth.test.ts`
- **前置**：无
- **操作**：`await authAPI.login('admin@demo.com', 'secret123')`
- **期望**（通过 `server.events.on('request:start')` 抓取）：
  1. `request.method === 'POST'`
  2. `new URL(request.url).pathname === '/api/auth/login'`
  3. `await request.json()` 深等于 `{ email: 'admin@demo.com', password: 'secret123' }`
  4. `request.headers.get('Content-Type') === 'application/json'`
  5. 返回值深等于 handler 的 `{ access_token, refresh_token, user }`（**验证是 `response.data` 而非整个 response 对象**）
- **价值**：钉死与后端的接口契约（`backend-stack.md` §1.1）

---

#### P0-6 `refreshToken` 请求体是小驼峰 `refreshToken`

- **文件**：`src/api/auth.test.ts`
- **前置**：无
- **操作**：`await authAPI.refreshToken('refresh-xyz')`
- **期望**：
  1. `POST /api/auth/refresh`
  2. body 深等于 `{ refreshToken: 'refresh-xyz' }`（**不是 `{ refresh_token }`，不是 `{ token }`**）
- **价值**：`backend-stack.md` §1.1 明确标注「请求体是**小驼峰** `refreshToken`」，这是最容易被前后端写岔的字段

---

#### P0-7 401 错误对象结构可透传

- **文件**：`src/api/auth.test.ts`
- **前置**：`server.use(http.post('*/api/auth/login', () => HttpResponse.json({ message: '邮箱或密码错误' }, { status: 401 })))`
- **操作**：`await expect(authAPI.login('a@b.com', 'wrong')).rejects.toThrow()`
- **期望**（catch 后检查 error 对象）：
  1. `error.response.status === 401`
  2. `error.response.data.message === '邮箱或密码错误'`
- **价值**：`AuthContext.tsx:74` 依赖 `error.response?.data?.message` 做错误文案兜底，这个结构一旦被 axios 版本变更打破，用户会看到无意义的「登录失败，请检查邮箱和密码」

---

#### P0-8 挂载：token 有效 → 只调 `/auth/me`，不调 `/auth/refresh`

- **文件**：`src/contexts/AuthContext.test.tsx`
- **前置**：
  - `localStorage.setItem('starter-access-token', makeJwt({ exp: now/1000 + 3600 }))`
  - `localStorage.setItem('starter-refresh-token', 'refresh-xyz')`
  - 用 `server.events.on('request:start', ...)` 或 `vi.spyOn(authAPI, 'getCurrentUser')` 计数
- **操作**：`renderHook(() => useAuth(), { wrapper: AuthProvider })`，然后 `await waitFor(() => expect(result.current.isLoading).toBe(false))`
- **期望**：
  1. `/auth/me` 被调用 **恰好 1 次**
  2. `/auth/refresh` 被调用 **0 次**
  3. `result.current.user` 深等于 `mockUser`
  4. `result.current.isLoading === false`
  5. `localStorage` 里的 token **未被改动**（有效分支不该重写 token）
- **价值**：「有效 token 不触发刷新」是性能与幂等性的底线

---

#### P0-9 挂载：token 过期 + refresh 成功 → 完整刷新链

- **文件**：`src/contexts/AuthContext.test.tsx`
- **前置**：
  - `localStorage.setItem('starter-access-token', makeJwt({ exp: now/1000 - 60 }))`（已过期）
  - `localStorage.setItem('starter-refresh-token', 'refresh-xyz')`
- **操作**：同上 `renderHook` + `waitFor`
- **期望**：
  1. 调用顺序为 `/auth/refresh` → `/auth/me`（可用 `vi.fn()` 的 `invocationCallOrder` 或事件时间戳断言顺序）
  2. `/auth/me` 发出时带的 Authorization 是**新** token `Bearer access-new`（不是旧的 `access-abc`）
  3. `localStorage.getItem('starter-access-token') === 'access-new'`
  4. `localStorage.getItem('starter-refresh-token') === 'refresh-new'`（**refresh token 轮换必须落盘**）
  5. `result.current.user` 深等于 `mockUser`
  6. `isLoading` 最终为 `false`
- **价值**：这是整个认证链路最复杂的一条路径，也是「refresh token 轮换」正确性的唯一保障

---

#### P0-10 挂载：token 过期 + refresh 返回 401 → 清空登录态

- **文件**：`src/contexts/AuthContext.test.tsx`
- **前置**：
  - `starter-access-token` = 已过期 JWT
  - `starter-refresh-token` = `'refresh-xyz'`
  - `server.use(http.post('*/api/auth/refresh', () => HttpResponse.json({ message: 'refresh token 无效' }, { status: 401 })))`
- **操作**：`renderHook` + `waitFor`
- **期望**：
  1. 4 个 `starter-*` key **全部为 `null`**（`clearStoredAuth()` 被调用）
  2. `result.current.user === null`
  3. `result.current.isLoading === false`（**关键：不能卡在 loading**，否则 ProtectedRoute 永远转圈）
  4. `/auth/me` 被调用 **0 次**（refresh 失败后不该继续取用户信息）
  5. 无未处理的 Promise rejection
- **价值**：「刷新失败必须彻底登出」是安全底线；而 `isLoading` 卡死是这类 catch 分支最典型的 bug

---

#### P0-11 挂载：token 过期 + 无 refresh token → 直接清空，零请求

- **文件**：`src/contexts/AuthContext.test.tsx`
- **前置**：
  - `starter-access-token` = 已过期 JWT
  - `starter-refresh-token` **不设置**（`null`）
  - 另外先塞一个 `starter-auth-user`（模拟上次登录残留的用户信息）
- **操作**：`renderHook` + `waitFor`
- **期望**：
  1. **不发任何网络请求**（`/auth/refresh` 和 `/auth/me` 都 0 次）——用 `onUnhandledRequest: 'error'` 严格模式自动保证
  2. `starter-auth-user` 被清空（残留用户信息不能留）
  3. `result.current.user === null`
  4. `result.current.isLoading === false`
- **价值**：覆盖 `AuthContext.tsx:38-42` 的 else 分支；「不发请求」这条能防止将来有人在空 refresh token 时也去调接口

---

#### P0-12 `login` 成功/失败的返回值与落盘

- **文件**：`src/contexts/AuthContext.test.tsx`
- **子用例 a（成功）**：
  - 操作：`const ret = await result.current.login('admin@demo.com', 'secret123')`
  - 期望：
    1. `ret` 深等于 `{ success: true }`（**不能有多余的 `error: undefined` 字段**，用 `toEqual` 而非 `toMatchObject`）
    2. `localStorage.getItem('starter-access-token') === 'access-abc'`
    3. `localStorage.getItem('starter-refresh-token') === 'refresh-xyz'`
    4. `localStorage.getItem('starter-auth-user')` 解析后深等于 `mockUser`
    5. `result.current.user` 深等于 `mockUser`
- **子用例 b（401 带 message）**：
  - 前置：handler 返回 401 `{ message: '邮箱或密码错误' }`
  - 期望：`ret` 深等于 `{ success: false, error: '邮箱或密码错误' }`；localStorage **保持为空**
- **子用例 c（网络错误，无 response）**：
  - 前置：handler 返回 `HttpResponse.error()`
  - 期望：`ret` 深等于 `{ success: false, error: '登录失败，请检查邮箱和密码' }`（**fallback 文案**）；`result.current.user === null`
- **价值**：三个子用例分别覆盖 `AuthContext.tsx:69`、`:72-75` 的成功路径、服务端文案路径、兜底文案路径

---

### 6.3 P1 补充用例（建议第二批做）

#### P1-1 `register` 请求体字段是 `name` 不是 `username` 【预期失败·哨兵】

- **操作**：`await result.current.register('john', 'john@demo.com', 'pw123')`
- **期望**：请求 body 深等于 `{ email: 'john@demo.com', password: 'pw123', name: 'john' }`
- **当前实际**：`AuthContext.tsx:84` 传的确实是 `name`（`authAPI.register({ email, password, name: username })`），✅ 应该通过
- **价值**：`backend-stack.md` §1.1 标注「请求体字段是 **`name`**，不是 `username`」，这条用例防止有人"顺手改成 username"

#### P1-2 `logout` 不触发任何网络请求

- **操作**：先 login 成功，再 `result.current.logout()`
- **期望**：
  1. 4 个 `starter-*` key 全清
  2. `result.current.user === null`
  3. **新增请求数为 0**（`AuthContext.tsx:107-108` 的 `authAPI.logout()` 调用当前是注释掉的，将来若有人放开这条注释，本用例会立刻发现「登出变成了异步且有网络依赖」）
- **价值**：保护当前「登出纯客户端」的设计决策

#### P1-3 `logout`（api 层）的 key 一致性 【预期失败·哨兵】

- **操作**：写入 `starter-access-token` / `starter-refresh-token` / `starter-auth-user`，然后调 `authAPI.logout()`
- **期望**：三个 key 被清空
- **当前实际**：`src/api/auth.ts:65-67` 清的是 `access_token` / `refresh_token` / `user`，`starter-*` 三个 key **纹丝不动** → **必挂**
- **价值**：与 P0-4 同源的第二处 key 不一致，一起修

#### P1-4 `ProtectedRoute` 四分支

用 §2.5 的 `renderWithAuth` 辅助函数：

| # | `user` | `isLoading` | `allowedRoles` | 期望渲染 |
|---|---|---|---|---|
| a | `null` | `true` | — | spinner（`<div class="animate-spin">`），URL 不跳转 |
| b | `null` | `false` | — | 重定向到 `/login`，且 `state.from.pathname === '/users'`（保留来源路径） |
| c | `{...user, role: 'user'}` | `false` | `['admin']` | 重定向到 `/` |
| d | `{...user, role: 'admin'}` | `false` | `['admin']` | 渲染 `<Outlet />` 内容（"受保护内容"） |
| e | `{...user, role: 'admin'}` | `false` | `undefined` | 渲染 `<Outlet />` 内容（空 allowedRoles = 所有已登录用户） |

- 断言重定向：`expect(screen.getByText('登录页')).toBeInTheDocument()`
- 断言 `state.from`：需要额外包一层探针组件读 `useLocation().state`，或在 `/login` 路由渲染 `JSON.stringify(useLocation().state)`

#### P1-5 `useAuth` 在 Provider 外抛错

- **操作**：`expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within an AuthProvider')`
- **价值**：覆盖 `useAuth.ts:6-8` 的守卫分支；这条错误信息是开发者体验的关键

#### P1-6 并发 login（**先标记 `it.skip`，作为 known issue 记录**）

- **操作**：`await Promise.all([result.current.login(...), result.current.login(...)])`
- **期望（理想）**：`/auth/login` 只发 1 次，或至少最终 localStorage 状态自洽
- **当前实际**：`AuthContext.tsx:56-79` 的 `login` 无并发锁，会发 2 次请求，两个响应竞争 `setStoredAccessToken` → token 可能错配
- **处置**：先 `it.skip('TODO: 并发 login 缺少锁', ...)`，把问题显式记录下来，不要在零测试阶段就背上重构债

### 6.4 P2 可选（后端就绪后）

- **契约测试**：用 MSW handler 生成 OpenAPI 片段，与后端的实际响应做 diff
- **`GET /auth/me` 返回 500**：覆盖 `AuthContext.tsx:44-47` 的外层 catch（注意这条与 P0-10 的区别：P0-10 是 refresh 失败，这条是 me 失败）
- **localStorage 完全不可用**（隐私模式模拟）：见 §4.2 的 `Storage.prototype.getItem` spy 用例
- **`getRememberedEmail` 空值语义**：无 key 时返回 `''` 而非 `null`（`src/lib/auth.ts:30-32`），容易被误改成 `null` 导致 `<input value={null}>` 的 React 警告

### 6.5 用例清单速查

| ID | 目标 | 类型 | 当前 |
|---|---|---|---|
| P0-1 | getStoredUser 损坏数据自愈 | 单元 | 应通过 |
| P0-2 | clearStoredAuth 全清不误伤 | 单元 | 应通过 |
| P0-3 | isTokenExpired 六象限 | 单元 | 应通过 |
| P0-4 | Bearer header 注入 | 集成 | **红（哨兵）** |
| P0-5 | login 请求形状 | 集成 | 应通过 |
| P0-6 | refreshToken 小驼峰 | 集成 | 应通过 |
| P0-7 | 401 error 结构透传 | 集成 | 应通过 |
| P0-8 | 有效 token 不刷新 | 集成 | 应通过 |
| P0-9 | 过期+刷新成功全链 | 集成 | 应通过 |
| P0-10 | 刷新失败清空且不卡 loading | 集成 | 应通过 |
| P0-11 | 无 refresh token 零请求清空 | 集成 | 应通过 |
| P0-12 | login 成功/401/网络错误三态 | 集成 | 应通过 |
| P1-1 | register 用 name 字段 | 集成 | 应通过 |
| P1-2 | logout 无网络请求 | 集成 | 应通过 |
| P1-3 | api.logout key 一致性 | 单元 | **红（哨兵）** |
| P1-4 | ProtectedRoute 五分支 | 组件 | 应通过 |
| P1-5 | useAuth 守卫抛错 | 组件 | 应通过 |
| P1-6 | 并发 login | 集成 | `it.skip` |

---

## 7. 落地步骤（建议顺序）

按此顺序执行，每一步都可独立验证、随时可停：

| 步骤 | 动作 | 验证命令 | 通过标准 |
|---|---|---|---|
| 1 | 装依赖（§5.5） | `npm ls vitest @vitest/coverage-v8 @testing-library/dom` | 无 missing peer |
| 2 | 改 `vite.config.ts` 加 `test` 字段（§1.4） | `npx vitest run` | 「No test files found」而不是配置报错 |
| 3 | 写 `src/mocks/{handlers,server}.ts` + `src/test/setup.ts`（§3.4 / §2.3） | 同上 | 同上（MSW 未 listen 前不报错） |
| 4 | **MSW × jsdom 冒烟**（§3.5） | `npx vitest run src/api/auth.smoke.test.ts` | `getCurrentUser()` 返回 mockUser，**不是 Network Error** |
| 5 | 写 P0-1~P0-3（`src/lib/auth.ts` 纯函数） | `npx vitest run src/lib` | 3 条全绿（**这步不依赖 MSW，可先做**） |
| 6 | 改 `tsconfig.app.json` 加 `vitest/globals`（§5.3） | `npm run typecheck` | 无 TS 错误 |
| 7 | 写 P0-4~P0-7（`src/api/auth.ts` + MSW） | `npx vitest run src/api` | P0-4 变红（哨兵生效），其余绿 |
| 8 | 写 P0-8~P0-12（`AuthContext`） | `npx vitest run src/contexts` | 全绿 |
| 9 | 加 scripts + `.gitignore` + 覆盖率（§5.1/5.2） | `npm run test:coverage` | 报告生成在 `./coverage` |
| 10 | 改 `.oxlintrc.json`（§5.4） | `npm run lint` | 无新告警；**确认 `plugins:["vitest"]` 被接受** |
| 11 | **修复 P0-4 / P1-3 暴露的 key 不一致 bug** | `npx vitest run` | 两条哨兵转绿 |
| 12 | P1 用例 | `npx vitest run` | — |

> 步骤 4 是整个方案的**关键技术风险验证点**。它一挂，§3.5 的三个兜底方案就要上场。
> 步骤 10 是第二风险点（oxlint 版本是否支持 vitest 插件）。
> 步骤 5 建议提前：它不依赖任何网络 mocking，能先把「vitest + jsdom + TS 严格模式」这条链路跑通。

---

## 8. 风险与未决问题

| # | 风险 | 等级 | 处置 |
|---|---|---|---|
| R1 | MSW 在 jsdom 下拦不住 axios 的 XHR 请求 | 中（复核后由「高」下调，理由见 §9.3） | 步骤 4 验证；兜底：`axios.defaults.adapter = 'http'`（§3.5，已确认类型上支持） |
| R2 | jsdom 30 的 Node 引擎 `^22.22.2` 与本机**完全相等**，无余量 | 中 | `package.json` 加 `engines.node >= 22.22.2`；CI 兜底降 jsdom 到 `29.0.0` |
| R3 | `oxlint@^1.79.0` 可能不支持 `plugins: ["vitest"]` | 中 | 步骤 10 验证；不支持则升 `oxlint@^1.81.0` |
| R4 | `@vitest/coverage-v8` peer 是**精确版本** `4.1.11`，未来升级易 ERESOLVE | 中 | 升级 vitest 时同步升 coverage 包，或用 `npm install -D vitest@latest @vitest/coverage-v8@latest` 一起升 |
| R5 | `globals: true` 与项目 `verbatimModuleSyntax` 严格风格略有张力 | 低 | 已权衡：换来了 RTL 自动 cleanup（§2.4 坑 1），收益远大于风格成本 |
| R6 | 测试文件在 `src/` 下会被 `tsc -b` 检查，拖慢构建 | 低 | 项目体量小（34 文件），可接受；若未来变慢按 §5.3 方案 B 拆 |
| R7 | `console.error` 被全局静音后，可能掩盖真正的 React 警告 | 低 | 只静音 `error`，保留 `warn`；且 `server.listen({ onUnhandledRequest: 'error' })` 独立兜底 |
| R8 | Vitest 4 默认 `exclude` 不再排除 `dist/`，本项目根目录**确实有 `dist/`** | 中 | 已在 §1.4 配置的 `exclude` 里显式补 `**/dist/**` |
| R9 | TypeScript 6 与 `msw` / `@testing-library/*` 的类型兼容性未经实机验证 | 低 | `msw` peer 只要求 `>= 4.8.x`；步骤 6 的 `npm run typecheck` 会暴露 |

**未决问题（需要实机跑一遍才能定论）**：
1. `oxlint@^1.79.0` 是否接受 `plugins: ["vitest"]` 和 `env: { vitest: true }`；
2. axios 1.20 在 jsdom 环境下默认走哪个适配器（决定 §3.5 的方案 1 是否必要）；
3. `axios.defaults.adapter = 'http'` 字符串形式在 axios 1.20 是否受支持（若不支持，需 `import httpAdapter from 'axios/lib/adapters/http'`，但这是内部路径，不稳定）。

---

## 9. 二次复核记录（2026-09-03 独立复核）

本节是**对前文结论的独立复核**，不是新方案。复核方式为重新实查 npm、逐行 grep 源码、读 `node_modules` 内的类型定义。

### 9.1 复核通过项

| 复核对象 | 结论 |
|---|---|
| 全部版本号（vitest `4.1.11` / jsdom `30.0.1` / RTL `16.3.3` / jest-dom `7.0.1` / msw `2.15.0` …） | ✅ 与 §附录 A 一致 |
| `typescript` npm latest `7.0.2`、项目锁 `~6.0.2` | ✅ 一致，报告按 TS 6 编写是对的 |
| `oxlint` npm latest `1.81.0`、项目锁 `^1.79.0` | ✅ 一致 |
| vitest peer `vite: ^6 \|\| ^7 \|\| ^8` × 项目 `8.2.2` | ✅ 无冲突 |
| jsdom 30 engines `^22.22.2` × 本机 `22.22.2` | ✅ 踩线通过（风险 R2 成立） |
| `src/api/auth.ts:15` 读 `'access_token'` | ✅ 行号精确，P0-4 哨兵成立 |
| `src/api/auth.ts:65-67` 清 `'access_token'/'refresh_token'/'user'` | ✅ 行号精确，P1-3 哨兵成立 |
| `src/api/auth.ts:108` `isTokenExpired` | ✅ |
| `src/lib/auth.ts:14-15` catch 分支 removeItem | ✅ |
| `src/lib/auth.ts:30-31` `getRememberedEmail` 返回 `?? ''` | ✅ |
| `AuthContext.tsx` 三处 `clearStoredAuth()` 在 `:35` / `:40` / `:46` | ✅ 对应 refresh 失败 / 无 refresh token / 外层 catch |
| `AuthContext.tsx:74` `error.response?.data?.message` | ✅ |
| `AuthContext.tsx:84` `name: username` | ✅ P1-1 成立 |
| `AuthContext.tsx:108` `authAPI.logout()` 被注释 | ✅ P1-2 成立 |
| `User` 类型字段 = `id / username / email / role` | ✅ 与 §3.4 的 `mockUser` 完全一致（`src/types/index.ts`） |
| `.gitignore` 有 `dist` 无 `coverage` | ✅ 风险 R8 成立，§5.2 第 5 点必须做 |

### 9.2 修正项（本次已就地改入前文）

1. **§2.5 `AuthProvider` 的 import 路径写错了。** 原文写 `@/contexts/AuthProvider`，实际文件是 `src/contexts/AuthContext.tsx` → 已改为 `@/contexts/AuthContext`。照原文抄会直接 `TS2307`。
2. **§2.3 的 `console.error` 静音会被 `restoreMocks: true` 吃掉。** 原写法把 `vi.spyOn` 放在 setup 文件模块顶层，而 `restoreMocks: true` 在每个用例后还原 spy —— 只有第 1 个用例享受静音，之后全部失效。已改为放进 `beforeEach`。
3. **§5.2 第 4 点的代码块有 Markdown 排版错误**（多余的 `> ``` ` 行）。已修正，并补充「thresholds 的 glob 键只在 `coverage.include` 命中集合上生效」。

### 9.3 未决问题进展

| 原编号 | 内容 | 进展 |
|---|---|---|
| #3 | `axios.defaults.adapter = 'http'` 在 axios 1.20 是否受支持 | **已解决：支持。** 实查 `node_modules/axios/index.d.ts:378-380`：<br>`type AxiosAdapterName = StringLiteralsOrString<'xhr' \| 'http' \| 'fetch'>`<br>`type AxiosAdapterConfig = AxiosAdapter \| AxiosAdapterName`<br>且 `node_modules/axios/lib/adapters/` 下确实有 `http.js` / `xhr.js` / `fetch.js` 三个实现。§3.5 兜底方案 1 可直接用，无需碰内部路径。 |
| #1 | oxlint `plugins: ["vitest"]` 是否被接受 | 仍需实机验证（落地步骤 10） |
| #2 | axios 1.20 在 jsdom 下默认走哪个适配器 | 仍需实机验证（落地步骤 4）。**但注意**：即使默认走 XHR，MSW 2.x 的 `setupServer` 已内置 `XMLHttpRequestInterceptor`（`@mswjs/interceptors` 是 msw 的传递依赖），§3.5 的「打穿」风险等级可从「高」下调到「中」。 |

### 9.4 复核中发现的新增待办（不属于选型，但属于本任务范围）

**待办 A：`.trellis/spec/frontend/quality-guidelines.md` 的「Testing Requirements」段落需要同步更新。**

该段落当前写的是 *"No test framework is installed and no tests exist. This was an explicit out-of-scope decision for the initial shell build."*，并给出了一个 4 级优先级清单（`lib/utils.ts` → `components/ui/*` → `RevenueChart` → routing），最后一句是 *"Add them at that point and update this section with the chosen runner."*

两点需要处理：

1. **runner 信息要回填**：按 spec 自己的要求，把选定结果（vitest 4.1.11 + jsdom + RTL + msw）和本节报告路径写回去。
2. **优先级清单与本报告 §6 冲突**：spec 列的 4 项里**没有认证链路**，而本报告 §6 认为 P0 应全部给 `lib/auth.ts` + `api/auth.ts` + `AuthContext.tsx`。理由：认证链路是**唯一存在已知阻塞级 Bug 的区域**（`backend-stack.md` §1.2 ①：localStorage key 不一致导致受保护接口永远 401），而 spec 列的那 4 项是纯展示逻辑，没有 bug、也没有即将对接的后端依赖。

   建议：把认证链路插到 spec 优先级清单的**最前面**，作为第 1 级；原 4 项顺延为 2–5 级。此项属于 implement 阶段的 spec 维护动作，不在本报告改动范围内（本报告约定只写文件、不改代码；spec 正文的语义修改留给 implement 步骤）。

**待办 B：`src/test/` 与 `src/mocks/` 是新目录**，需与 `src/lib/` 等同受 `.trellis/spec/frontend/directory-structure.md` 的约束。目前该 spec 的目录树里没有这两个目录，加测试后应补进 `src/` 布局说明（`src/test/setup.ts`、`src/mocks/{handlers,server}.ts`）。

---

## 附录 A：版本号实查原始输出

执行环境：`E:\Git\Starter`，`Node v22.22.2` / `npm 10.9.7`，日期 2026-09-03。

```bash
# 命令
for p in vitest @vitest/coverage-v8 @vitest/ui jsdom happy-dom \
         @testing-library/react @testing-library/jest-dom \
         @testing-library/user-event @testing-library/dom msw \
         axios-mock-adapter vite @vitejs/plugin-react axios jwt-decode \
         react react-dom typescript oxlint; do
  npm view $p version
done
```

```
vitest                     4.1.11
@vitest/coverage-v8        4.1.11
@vitest/ui                 4.1.11
jsdom                      30.0.1
happy-dom                  20.13.2
@testing-library/react     16.3.3
@testing-library/jest-dom  7.0.1
@testing-library/user-event 14.6.7
@testing-library/dom       10.4.1
msw                        2.15.0
axios-mock-adapter         2.1.0
vite                       8.2.2
@vitejs/plugin-react       6.1.1
axios                      1.20.0
jwt-decode                 4.0.0
react                      19.2.8
react-dom                  19.2.8
typescript                 7.0.2      ← npm latest；项目锁 ~6.0.2
oxlint                     1.81.0     ← npm latest；项目锁 ^1.79.0
```

```bash
npm view vitest dist-tags
# { beta: '5.0.0-beta.7', latest: '4.1.11', rc: '5.0.0-rc.4', V3: '3.2.7' }

npm view vitest@4.1.11 peerDependencies
# {
#   vite: '^6.0.0 || ^7.0.0 || ^8.0.0',
#   jsdom: '*',
#   'happy-dom': '*',
#   '@vitest/ui': '4.1.11',
#   '@types/node': '^20.0.0 || ^22.0.0 || >=24.0.0',
#   '@edge-runtime/vm': '*',
#   '@opentelemetry/api': '^1.9.0',
#   '@vitest/coverage-v8': '4.1.11',
#   '@vitest/browser-preview': '4.1.11',
#   '@vitest/coverage-istanbul': '4.1.11',
#   '@vitest/browser-playwright': '4.1.11',
#   '@vitest/browser-webdriverio': '4.1.11'
# }
# engines = { node: '^20.0.0 || ^22.0.0 || >=24.0.0' }

npm view @vitest/coverage-v8@4.1.11 peerDependencies
# { vitest: '4.1.11', '@vitest/browser': '4.1.11' }

npm view @testing-library/react@16.3.3 peerDependencies
# { react: '^18.0.0 || ^19.0.0',
#   'react-dom': '^18.0.0 || ^19.0.0',
#   '@types/react': '^18.0.0 || ^19.0.0',
#   '@types/react-dom': '^18.0.0 || ^19.0.0',
#   '@testing-library/dom': '^10.0.0' }

npm view @testing-library/jest-dom@7.0.1 peerDependencies engines
# peerDependencies = { vitest: '>= 0.32', '@testing-library/dom': '>=10 <11' }
# engines = { npm: '>=6', node: '>=22', yarn: '>=1' }

npm view @testing-library/user-event@14.6.7 peerDependencies
# { '@testing-library/dom': '>=7.21.4' }

npm view msw@2.15.0 peerDependencies engines
# peerDependencies = { typescript: '>= 4.8.x' }
# engines = { node: '>=18' }

npm view jsdom@30.0.1 engines
# { node: '^22.22.2 || ^24.15.0 || >=26.0.0' }

npm view jsdom@29.0.0 engines    # { node: '^20.19.0 || ^22.13.0 || >=24.0.0' }
npm view jsdom@28.0.0 engines    # { node: '^20.19.0 || ^22.12.0 || >=24.0.0' }
npm view jsdom@27.0.0 engines    # { node: '>=20' }
npm view jsdom@26.1.0 engines    # { node: '>=18' }

npm view happy-dom@20.13.2 engines
# { node: '>=20.0.0' }

npm view @testing-library/jest-dom@7.0.1 exports
# 含 "./vitest": { import: { types: "./types/vitest.d.ts", default: "./dist/vitest.mjs" } }
```

## 附录 B：参考资料

| 主题 | 来源 |
|---|---|
| Vitest 4 破坏性变更（`environmentMatchGlobs` 移除、`coverage.all` 移除、`poolOptions` 移除、`workspace`→`projects`） | https://vitest.dev/guide/migration.html |
| Vitest 配置（`vitest.config.ts` 会**覆盖** `vite.config.ts`；`configDefaults`） | https://vitest.dev/config/ |
| `environment` 可选值与 `environmentOptions` | https://vitest.dev/config/environment |
| `pool` 默认值为 `'forks'` | https://vitest.dev/config/pool |
| Coverage 选项（`provider` 未移除，默认 `'v8'`；`thresholds.100`；`clean`） | https://vitest.dev/config/coverage.html |
| MSW Node 集成（`setupServer` / `listen` / `resetHandlers` / `close`） | https://mswjs.io/docs/integrations/node |
| MSW `setupServer` API 与「augments http module」说明 | https://mswjs.io/docs/api/setup-server |
| jest-dom v7 BREAKING CHANGES（`@testing-library/dom` 变必需 peer、Node ≥ 22） | https://github.com/testing-library/jest-dom/releases |
| oxlint 内置插件表（含 `vitest` 插件，源自 `@vitest/eslint-plugin`） | https://oxc.rs/docs/guide/usage/linter/plugins.html |
| oxlint `overrides` / `env` / `globals` 配置（env 列表含 `vitest`） | https://oxc.rs/docs/guide/usage/linter/config-file-reference.html |
| React 19 需 RTL ≥ 16.1.0（issue 中 reporter 自述） | https://github.com/testing-library/react-testing-library/issues/1397 |
| 本项目后端契约与 key 不一致 Bug | `.trellis/tasks/09-03-add-tests-and-backend/research/backend-stack.md` |
