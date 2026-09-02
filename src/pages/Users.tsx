import { PagePlaceholder } from '@/components/ui/PagePlaceholder'
import { Users as UsersIcon } from 'lucide-react'

export function Users() {
  return (
    <PagePlaceholder
      title="用户管理"
      description="维护平台账号、角色与权限。"
      icon={UsersIcon}
    />
  )
}
