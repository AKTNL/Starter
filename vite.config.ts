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
  // 前后端联调：把 /api 代理到本地 Express 服务（端口 3001）
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  test: {
    // ── 环境 ────────────────────────────────────────────────
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        // axios baseURL 是相对路径 '/api'，jsdom 需要真实 origin 才能拼出绝对 URL，
        // 否则 MSW handler 无法用可预期的 URL 匹配。
        url: 'http://localhost:3000',
        pretendToBeVisual: true, // 提供 requestAnimationFrame，recharts 需要
      },
    },

    // ── 全局 API ────────────────────────────────────────────
    // globals: true 后 describe/it/expect/beforeEach 为全局符号。
    // 关键副作用：@testing-library/react 的「自动 cleanup」依赖全局 afterEach 存在。
    globals: true,

    // ── 初始化 ──────────────────────────────────────────────
    setupFiles: ['./src/test/setup.ts'],

    // ── 文件发现 ────────────────────────────────────────────
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/.trellis/**'],

    // ── 隔离与 mock 复位 ────────────────────────────────────
    restoreMocks: true, // 每个用例后还原 vi.spyOn
    unstubEnvs: true, // 还原 vi.stubEnv（VITE_API_URL 等）
    unstubGlobals: true, // 还原 vi.stubGlobal
    clearMocks: true, // 清空 mock 调用记录

    // ── CSS ────────────────────────────────────────────────
    css: false, // Tailwind 4 通过插件处理，测试不需要样式

    // ── 覆盖率 ────────────────────────────────────────────
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
