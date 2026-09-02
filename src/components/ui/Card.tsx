import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  className?: string
  children: ReactNode
}

export function Card({ className, children }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-white/10 bg-white/[0.03] p-5',
        className,
      )}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: string
  description?: string
  action?: ReactNode
}

export function CardHeader({ title, description, action }: CardHeaderProps) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-sm font-medium text-white">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-white/40">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}
