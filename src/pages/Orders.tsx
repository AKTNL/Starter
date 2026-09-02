import { PagePlaceholder } from '@/components/ui/PagePlaceholder'
import { ShoppingCart } from 'lucide-react'

export function Orders() {
  return (
    <PagePlaceholder
      title="订单管理"
      description="查询、审核与处理客户订单。"
      icon={ShoppingCart}
    />
  )
}
