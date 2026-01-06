import { Card } from '../ui/card'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  gradient?: string
  trend?: {
    value: string
    isPositive: boolean
  }
}

export const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  gradient = 'from-primary to-secondary',
  trend 
}: StatCardProps) => {
  return (
    <Card className="p-6 border-2 hover:border-primary/50 transition-all hover:shadow-xl hover:-translate-y-1 duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div className={`inline-flex p-3 rounded-2xl bg-gradient-to-br ${gradient} shadow-lg group-hover:scale-110 transition-transform`}>
          <Icon className="h-7 w-7 text-white" />
        </div>
        {trend && (
          <div className={`text-sm font-semibold ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </div>
        )}
      </div>
      <div className="text-3xl font-bold text-foreground mb-1">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </Card>
  )
}
