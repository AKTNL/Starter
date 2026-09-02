import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@/types'
import { getStoredUser, setStoredUser } from '@/lib/auth'
import { AuthContext } from './auth-context'

// 模拟用户数据库
const MOCK_USERS: Array<{ user: User; password: string }> = [
  {
    user: { id: '1', username: 'admin', email: 'admin@example.com', role: 'admin' },
    password: 'admin123',
  },
  {
    user: { id: '2', username: 'user1', email: 'user1@example.com', role: 'user' },
    password: 'user123',
  },
]

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser())
  const [isLoading, setIsLoading] = useState(true)

  // 模拟初始加载
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 100)
    return () => clearTimeout(timer)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    // 模拟网络延迟
    await new Promise((resolve) => setTimeout(resolve, 800))

    const found = MOCK_USERS.find(
      (u) => (u.user.email === email || u.user.username === email) && u.password === password,
    )

    if (found) {
      setUser(found.user)
      setStoredUser(found.user)
      return { success: true }
    }
    return { success: false, error: '邮箱/用户名或密码错误' }
  }, [])

  const register = useCallback(async (username: string, email: string, password: string) => {
    // 模拟网络延迟
    await new Promise((resolve) => setTimeout(resolve, 800))

    // 检查用户名是否已存在
    if (MOCK_USERS.some((u) => u.user.username === username)) {
      return { success: false, error: '用户名已存在' }
    }

    // 检查邮箱是否已存在
    if (MOCK_USERS.some((u) => u.user.email === email)) {
      return { success: false, error: '邮箱已被注册' }
    }

    // 创建新用户
    const newUser: User = {
      id: String(MOCK_USERS.length + 1),
      username,
      email,
      role: 'user',
    }
    MOCK_USERS.push({ user: newUser, password })

    // 注册成功后自动登录
    setUser(newUser)
    setStoredUser(newUser)
    return { success: true }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setStoredUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}