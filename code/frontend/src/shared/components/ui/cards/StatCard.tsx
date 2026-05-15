import { type LucideIcon } from 'lucide-react'
import { GlassCard } from './GlassCard'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: string
}

export function StatCard({ title, value, icon: Icon, trend }: StatCardProps) {
  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <Icon className="w-8 h-8 text-primary" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-3xl font-bold mt-1">{value}</p>
        {trend && (
          <p className="text-xs text-muted-foreground mt-2">{trend}</p>
        )}
      </div>
    </GlassCard>
  )
}
