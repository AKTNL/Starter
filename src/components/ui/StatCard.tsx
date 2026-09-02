import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { KpiStat } from '@/types'

export function StatCard({
  label,
  value,
  change,
  trend,
  icon: Icon,
}: KpiStat) {
  const isUp = trend === 'up'
  const TrendIcon = isUp ? TrendingUp : TrendingDown

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm text-white/50">{label}</span>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-500/15 text-brand-400">
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-3 text-2xl font-semibold tracking-tight text-white">
        {value}
      </div>

      <div
        className={cn(
          'mt-2 flex items-center gap-1 text-xs',
          isUp ? 'text-red-400' : 'text-emerald-400',
        )}
      >
        <TrendIcon className="h-3.5 w-3.5" />
        <span>
          {isUp ? '+' : '-'}
          {Math.abs(change)}%
        </span>
        <span className="text-white/40">较上周期</span>
      </div>
    </div>
  )
}
