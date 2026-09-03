// src/test/setup.ts
import '@testing-library/jest-dom/vitest' // 必须在最前：扩展 expect + 注入 matcher 类型
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, afterAll, beforeAll, vi } from 'vitest'
import { server } from '@/mocks/server'

// 1) DOM 清理。globals:true 时 RTL 本会自动注册，显式调用一次是幂等的。
afterEach(() => {
  cleanup()
})

// 2) localStorage 隔离：每个用例前清空，防止用例间泄漏登录态。
beforeEach(() => {
  localStorage.clear()
})

// 3) MSW 生命周期。
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})
afterEach(() => {
  server.resetHandlers()
})
afterAll(() => {
  server.close()
})

// 4) 静音预期内的 console.error。
//    AuthContext 在 catch 分支里有 console.error（'Auth check failed:' / 'Login failed:'），
//    这些是「被测行为」的一部分，不该污染测试输出。
//    ⚠️ 必须放在 beforeEach 里：vite.config 开了 restoreMocks:true，Vitest 会在每个用例
//    之后还原所有 vi.spyOn 创建的 spy；写在顶层会在第 1 个用例结束后被还原。
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
