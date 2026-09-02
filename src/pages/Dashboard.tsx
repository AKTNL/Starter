import { Suspense, lazy } from 'react'
import { RecentOrders } from '@/components/dashboard/RecentOrders'
import { StatsGrid } from '@/components/dashboard/StatsGrid'

// recharts 体积较大（d3 依赖），单独拆成异步 chunk，避免拖慢首屏
const RevenueChart = lazy(() =>
  import('@/components/dashboard/RevenueChart').then((module) => ({
    default: module.RevenueChart,
  })),
)

function ChartFallback() {
  return (
    <div className="h-[22.75rem] animate-pulse rounded-xl border border-white/10 bg-white/[0.03]" />
  )
}

export function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">概览</h1>
        <p className="mt-1 text-sm text-white/50">
          欢迎回来，这是今天的经营概况。
        </p>
      </div>

      <StatsGrid />

      <Suspense fallback={<ChartFallback />}>
        <RevenueChart />
      </Suspense>

      <RecentOrders />
    </div>
  )
}
