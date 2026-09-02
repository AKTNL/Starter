import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/Card'

interface PagePlaceholderProps {
  title: string
  description: string
  icon: LucideIcon
}

export function PagePlaceholder({
  title,
  description,
  icon: Icon,
}: PagePlaceholderProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">{title}</h1>
        <p className="mt-1 text-sm text-white/50">{description}</p>
      </div>

      <Card className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-500/15 text-brand-400">
          <Icon className="h-6 w-6" />
        </span>
        <p className="text-sm font-medium text-white">功能建设中</p>
        <p className="max-w-sm text-xs text-white/40">
          该模块尚未实现，界面骨架已经铺好，可以在此基础上继续扩展。
        </p>
      </Card>
    </div>
  )
}
