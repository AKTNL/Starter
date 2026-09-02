import { LayoutDashboard, Package, Settings, ShoppingCart, Users } from 'lucide-react'
import type { NavItem } from '@/types'

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: '概览', icon: LayoutDashboard },
  { to: '/users', label: '用户管理', icon: Users },
  { to: '/orders', label: '订单管理', icon: ShoppingCart },
  { to: '/products', label: '商品管理', icon: Package },
  { to: '/settings', label: '系统设置', icon: Settings },
]
