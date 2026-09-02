import type { User } from '@/types'

const STORAGE_KEY = 'starter-auth-user'
const REMEMBER_KEY = 'starter-remember-email'

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