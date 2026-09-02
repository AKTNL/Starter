import { PagePlaceholder } from '@/components/ui/PagePlaceholder'
import { Package } from 'lucide-react'

export function Products() {
  return (
    <PagePlaceholder
      title="商品管理"
      description="管理商品目录、价格与库存。"
      icon={Package}
    />
  )
}
