import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@/types'
import { getStoredUser, setStoredUser, clearStoredAuth, getStoredAccessToken, setStoredAccessToken, getStoredRefreshToken, setStoredRefreshToken } from '@/lib/auth'
import { AuthContext } from './auth-context'
import { authAPI, isTokenExpired } from '@/api/auth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser())
  const [isLoading, setIsLoading] = useState(true)

  // 初始加载时检查token状态
  useEffect(() => {
    const checkAuthStatus = async () => {
      setIsLoading(true)
      try {
        const accessToken = getStoredAccessToken()
        if (accessToken && !isTokenExpired(accessToken)) {
          // Token有效，获取用户信息
          const userData = await authAPI.getCurrentUser()
          setUser(userData)
        } else {
          // Token无效或过期，尝试刷新
          const refreshToken = getStoredRefreshToken()
          if (refreshToken) {
            try {
              const tokenData = await authAPI.refreshToken(refreshToken)
              setStoredAccessToken(tokenData.access_token)
              setStoredRefreshToken(tokenData.refresh_token)
              
              const userData = await authAPI.getCurrentUser()
              setUser(userData)
            } catch {
              // 刷新失败，清除所有认证数据
              clearStoredAuth()
              setUser(null)
            }
          } else {
            // 没有刷新令牌，清除认证数据
            clearStoredAuth()
            setUser(null)
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        clearStoredAuth()
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuthStatus()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const response = await authAPI.login(email, password)
      
      // 存储token
      setStoredAccessToken(response.access_token)
      setStoredRefreshToken(response.refresh_token)
      
      // 存储用户信息
      setUser(response.user)
      setStoredUser(response.user)
      
      return { success: true }
    } catch (error: any) {
      console.error('Login failed:', error)
      return { 
        success: false, 
        error: error.response?.data?.message || '登录失败，请检查邮箱和密码' 
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const register = useCallback(async (username: string, email: string, password: string) => {
    setIsLoading(true)
    try {
      const response = await authAPI.register({ email, password, name: username })
      
      // 存储token
      setStoredAccessToken(response.access_token)
      setStoredRefreshToken(response.refresh_token)
      
      // 存储用户信息
      setUser(response.user)
      setStoredUser(response.user)
      
      return { success: true }
    } catch (error: any) {
      console.error('Registration failed:', error)
      return { 
        success: false, 
        error: error.response?.data?.message || '注册失败' 
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    // 调用登出API（如果需要的话）
    // authAPI.logout()
    
    // 清除所有存储的认证数据
    clearStoredAuth()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}