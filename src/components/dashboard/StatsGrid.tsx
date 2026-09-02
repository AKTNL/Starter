import { StatCard } from '@/components/ui/StatCard'
import { KPI_STATS } from '@/data/mock'

export function StatsGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {KPI_STATS.map((stat) => (
        <StatCard key={stat.id} {...stat} />
      ))}
    </div>
  )
}
