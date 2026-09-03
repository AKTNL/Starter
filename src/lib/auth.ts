import type { User } from '@/types'

const STORAGE_KEY = 'starter-auth-user'
const REMEMBER_KEY = 'starter-remember-email'
const ACCESS_TOKEN_KEY = 'starter-access-token'
const REFRESH_TOKEN_KEY = 'starter-refresh-token'

/** 从 localStorage 获取已登录用户 */
export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as User
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

/** 将用户信息存入 localStorage */
export function setStoredUser(user: User | null): void {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

/** 获取记住的邮箱 */
export function getRememberedEmail(): string {
  return localStorage.getItem(REMEMBER_KEY) ?? ''
}

/** 设置记住的邮箱 */
export function setRememberedEmail(email: string | null): void {
  if (email) {
    localStorage.setItem(REMEMBER_KEY, email)
  } else {
    localStorage.removeItem(REMEMBER_KEY)
  }
}

/** 从 localStorage 获取访问令牌 */
export function getStoredAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

/** 将访问令牌存入 localStorage */
export function setStoredAccessToken(token: string | null): void {
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token)
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
  }
}

/** 从 localStorage 获取刷新令牌 */
export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

/** 将刷新令牌存入 localStorage */
export function setStoredRefreshToken(token: string | null): void {
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token)
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }
}

/** 清除所有认证相关的存储 */
export function clearStoredAuth(): void {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(REMEMBER_KEY)
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}