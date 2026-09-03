import { describe, expect, it } from 'vitest'
import { authAPI } from '@/api/auth'
import { server } from '@/mocks/server'
import { setStoredAccessToken, clearStoredAuth } from '@/lib/auth'

describe('authAPI', () => {
  it('login success returns tokens and user', async () => {
    const res = await authAPI.login('admin@demo.com', 'secret123')
    expect(res.access_token).toBe('access-abc')
    expect(res.user.email).toBe('admin@demo.com')
  })

  it('login with wrong credentials rejects', async () => {
    await expect(authAPI.login('admin@demo.com', 'wrong')).rejects.toThrow()
  })

  it('getCurrentUser rejects when no token present', async () => {
    await expect(authAPI.getCurrentUser()).rejects.toThrow()
  })

  it('request interceptor attaches Authorization from stored token', async () => {
    clearStoredAuth()
    setStoredAccessToken('access-abc')
    let authHeader: string | null = null
    server.events.on('request:start', ({ request }) => {
      authHeader = request.headers.get('Authorization')
    })
    await authAPI.getCurrentUser().catch(() => {})
    await new Promise((r) => setTimeout(r, 0))
    // 直接验证 R1 修复点：拦截器读得到 token 并正确拼出 Bearer 头
    expect(authHeader).toBe('Bearer access-abc')
  })

  it('refreshToken returns new token pair', async () => {
    const res = await authAPI.refreshToken('refresh-xyz')
    expect(res.access_token).toBe('access-new')
    expect(res.refresh_token).toBe('refresh-new')
  })
})
