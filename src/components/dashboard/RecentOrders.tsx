import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { RECENT_ORDERS } from '@/data/mock'
import { formatCurrency } from '@/lib/utils'

export function RecentOrders() {
  return (
    <Card>
      <CardHeader title="最近订单" description="最新 6 笔交易" />

      <div className="-mx-5 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-y border-white/10 text-left text-xs text-white/40">
              <th className="px-5 py-2.5 font-medium">订单号</th>
              <th className="px-5 py-2.5 font-medium">客户</th>
              <th className="px-5 py-2.5 font-medium">金额</th>
              <th className="px-5 py-2.5 font-medium">状态</th>
              <th className="px-5 py-2.5 font-medium">下单时间</th>
            </tr>
          </thead>
          <tbody>
            {RECENT_ORDERS.map((order) => (
              <tr
                key={order.id}
                className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.02]"
              >
                <td className="px-5 py-3 font-mono text-xs text-white/70">
                  {order.id}
                </td>
                <td className="px-5 py-3 text-white">{order.customer}</td>
                <td className="px-5 py-3 tabular-nums text-white">
                  {formatCurrency(order.amount)}
                </td>
                <td className="px-5 py-3">
                  <Badge status={order.status} />
                </td>
                <td className="px-5 py-3 text-white/50">{order.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
