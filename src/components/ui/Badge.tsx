import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/types'

const STATUS_STYLES: Record<OrderStatus, { label: string; className: string }> =
  {
    completed: {
      label: '已完成',
      className: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
    },
    processing: {
      label: '处理中',
      className: 'bg-brand-500/15 text-brand-300 ring-brand-500/30',
    },
    pending: {
      label: '待付款',
      className: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
    },
    refunded: {
      label: '已退款',
      className: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
    },
  }

interface BadgeProps {
  status: OrderStatus
}

export function Badge({ status }: BadgeProps) {
  const { label, className } = STATUS_STYLES[status]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        className,
      )}
    >
      {label}
    </span>
  )
}
