import { PagePlaceholder } from '@/components/ui/PagePlaceholder'
import { Settings as SettingsIcon } from 'lucide-react'

export function Settings() {
  return (
    <PagePlaceholder
      title="系统设置"
      description="站点配置、通知规则与安全策略。"
      icon={SettingsIcon}
    />
  )
}
