import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearStoredAuth,
  getStoredAccessToken,
  getStoredRefreshToken,
  getStoredUser,
  setStoredAccessToken,
  setStoredRefreshToken,
  setStoredUser,
} from '@/lib/auth'
import type { User } from '@/types'

const user: User = { id: 'u-1', username: 'admin', email: 'a@b.com', role: 'admin' }

describe('lib/auth storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('round-trips access token (null when unset, cleared with null)', () => {
    expect(getStoredAccessToken()).toBeNull()
    setStoredAccessToken('tok-123')
    expect(getStoredAccessToken()).toBe('tok-123')
    setStoredAccessToken(null)
    expect(getStoredAccessToken()).toBeNull()
  })

  it('round-trips refresh token', () => {
    setStoredRefreshToken('ref-123')
    expect(getStoredRefreshToken()).toBe('ref-123')
    setStoredRefreshToken(null)
    expect(getStoredRefreshToken()).toBeNull()
  })

  it('round-trips user object', () => {
    expect(getStoredUser()).toBeNull()
    setStoredUser(user)
    expect(getStoredUser()).toEqual(user)
    setStoredUser(null)
    expect(getStoredUser()).toBeNull()
  })

  it('clearStoredAuth wipes access/refresh/user together', () => {
    setStoredAccessToken('a')
    setStoredRefreshToken('r')
    setStoredUser(user)
    clearStoredAuth()
    expect(getStoredAccessToken()).toBeNull()
    expect(getStoredRefreshToken()).toBeNull()
    expect(getStoredUser()).toBeNull()
  })

  it('getStoredUser returns null on corrupted JSON instead of throwing', () => {
    localStorage.setItem('starter-auth-user', '{not valid json')
    expect(getStoredUser()).toBeNull()
  })
})
