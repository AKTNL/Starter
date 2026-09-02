import { Boxes, DollarSign, ShoppingCart, Users } from 'lucide-react'
import type { KpiStat, RecentOrder, RevenuePoint, RevenueRange } from '@/types'

export const KPI_STATS: KpiStat[] = [
  {
    id: 'revenue',
    label: '总营收',
    value: '¥1,284,320',
    change: 12.8,
    trend: 'up',
    icon: DollarSign,
  },
  {
    id: 'orders',
    label: '订单量',
    value: '8,462',
    change: 5.2,
    trend: 'up',
    icon: ShoppingCart,
  },
  {
    id: 'customers',
    label: '新增客户',
    value: '1,193',
    change: 3.7,
    trend: 'down',
    icon: Users,
  },
  {
    id: 'inventory',
    label: '库存周转',
    value: '92.4%',
    change: 1.4,
    trend: 'up',
    icon: Boxes,
  },
]

/** 固定种子的伪随机，保证每次刷新看到同一条曲线 */
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function buildRevenueSeries(days: number): RevenuePoint[] {
  const today = new Date()
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (days - 1 - index))

    const weekday = date.getDay()
    const weekendFactor = weekday === 0 || weekday === 6 ? 0.72 : 1
    const noise = 0.85 + pseudoRandom(index + 1) * 0.3
    const growth = 1 + index * 0.006
    const revenue = Math.round(38000 * weekendFactor * noise * growth)

    return {
      date: `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      revenue,
      orders: Math.round(revenue / 150),
    }
  })
}

export const REVENUE_SERIES: Record<RevenueRange, RevenuePoint[]> = {
  '7d': buildRevenueSeries(7),
  '30d': buildRevenueSeries(30),
}

export const RECENT_ORDERS: RecentOrder[] = [
  {
    id: 'SO-20260902-0418',
    customer: '星海科技有限公司',
    amount: 128400,
    status: 'completed',
    createdAt: '2026-09-02 14:22',
  },
  {
    id: 'SO-20260902-0417',
    customer: '陈曦',
    amount: 3260,
    status: 'processing',
    createdAt: '2026-09-02 13:58',
  },
  {
    id: 'SO-20260902-0416',
    customer: '云图数据服务',
    amount: 45200,
    status: 'pending',
    createdAt: '2026-09-02 11:04',
  },
  {
    id: 'SO-20260901-0415',
    customer: '林知远',
    amount: 899,
    status: 'completed',
    createdAt: '2026-09-01 19:31',
  },
  {
    id: 'SO-20260901-0414',
    customer: '恒昌物流集团',
    amount: 236800,
    status: 'completed',
    createdAt: '2026-09-01 16:47',
  },
  {
    id: 'SO-20260901-0413',
    customer: '苏晚',
    amount: 1580,
    status: 'refunded',
    createdAt: '2026-09-01 10:12',
  },
]
