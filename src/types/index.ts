import type { LucideIcon } from 'lucide-react'

/** 环比方向：up / down 决定 KPI 卡的红涨绿跌配色 */
export type TrendDirection = 'up' | 'down'

export interface KpiStat {
  id: string
  label: string
  value: string
  /** 环比变化百分比，正数为增长 */
  change: number
  trend: TrendDirection
  icon: LucideIcon
}

/** 营收趋势图可选区间 */
export type RevenueRange = '7d' | '30d'

export interface RevenuePoint {
  /** 轴上显示，格式 MM-DD */
  date: string
  revenue: number
  orders: number
}

export type OrderStatus = 'completed' | 'processing' | 'pending' | 'refunded'

export interface RecentOrder {
  id: string
  customer: string
  amount: number
  status: OrderStatus
  createdAt: string
}

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

/** 用户角色 */
export type UserRole = 'admin' | 'user'

/** 用户信息 */
export interface User {
  id: string
  username: string
  email: string
  role: UserRole
}

/** 登录表单数据 */
export interface LoginFormData {
  email: string
  password: string
  rememberMe: boolean
}

/** 注册表单数据 */
export interface RegisterFormData {
  username: string
  email: string
  password: string
  confirmPassword: string
}

/** 表单验证错误 */
export interface FormErrors {
  [key: string]: string
}