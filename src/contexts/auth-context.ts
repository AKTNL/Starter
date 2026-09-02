import { createContext } from 'react'
import type { User } from '@/types'

export interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)