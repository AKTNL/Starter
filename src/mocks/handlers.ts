import { http, HttpResponse } from 'msw'
import type { User } from '@/types'

export const mockUser: User = {
  id: 'u-1',
  username: 'admin',
  email: 'admin@demo.com',
  role: 'admin',
}

/**
 * 用 '* /api' 通配前缀而不是 '/auth/login'。
 * 原因：axios baseURL 是相对路径 '/api'，在 jsdom 下会被拼成
 * 'http://localhost:3000/api/auth/login'。通配前缀同时兼容
 * jsdom(XHR 适配器) 与 node(http 适配器) 两种解析结果。
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
