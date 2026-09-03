import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from './ProtectedRoute'
import { server } from '@/mocks/server'
import { setStoredUser, setStoredAccessToken } from '@/lib/auth'
import { mockUser } from '@/mocks/handlers'

// 构造一个带 exp 且在未来过期的假 JWT（handler 只校验 Bearer 前缀，不验签名）
function futureToken(): string {
  const enc = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc({ sub: 'u-1', exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>secret content</div>} />
          </Route>
          <Route path="/login" element={<div>login page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  it('redirects an unauthenticated user to /login', async () => {
    renderAt('/dashboard')
    expect(await screen.findByText('login page')).toBeInTheDocument()
  })

  it('renders the outlet when an authenticated session is present', async () => {
    setStoredUser(mockUser)
    setStoredAccessToken(futureToken())
    // 让 /auth/me 接受任意 Bearer，返回当前用户
    server.use(
      http.get('*/api/auth/me', () => HttpResponse.json(mockUser)),
    )
    renderAt('/dashboard')
    expect(await screen.findByText('secret content')).toBeInTheDocument()
  })
})
