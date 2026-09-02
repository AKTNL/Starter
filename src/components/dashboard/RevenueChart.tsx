import { useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardHeader } from '@/components/ui/Card'
import { REVENUE_SERIES } from '@/data/mock'
import { cn, formatCompact } from '@/lib/utils'
import type { RevenueRange } from '@/types'

const RANGES: { value: RevenueRange; label: string }[] = [
  { value: '7d', label: '近 7 天' },
  { value: '30d', label: '近 30 天' },
]

const TOOLTIP_STYLE = {
  backgroundColor: '#151821',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '0.75rem',
  fontSize: '0.75rem',
  color: '#e6e8ee',
}

export function RevenueChart() {
  const [range, setRange] = useState<RevenueRange>('7d')
  const data = REVENUE_SERIES[range]

  return (
    <Card>
      <CardHeader
        title="营收趋势"
        description="单位：元"
        action={
          <div className="flex shrink-0 rounded-lg border border-white/10 bg-white/5 p-0.5">
            {RANGES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setRange(value)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs transition-colors',
                  range === value
                    ? 'bg-brand-500 text-white'
                    : 'text-white/50 hover:text-white',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.08)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              stroke="rgba(255,255,255,0.35)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              stroke="rgba(255,255,255,0.35)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={formatCompact}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
              formatter={(value) => [`¥${Number(value).toLocaleString('zh-CN')}`, '营收']}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#4f7cff"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#4f7cff' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
