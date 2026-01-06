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
    <Card className="p-5 md:p-6 border-2 bg-gradient-to-br ${gradient} text-white hover:scale-[1.02] transition-all duration-300 shadow-md hover:shadow-xl">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2.5 bg-white/15 rounded-xl">
          <Icon className="h-6 w-6 md:h-7 md:w-7" />
        </div>
        {trend && (
          <div className="text-xs md:text-sm font-semibold bg-white/20 px-2 py-1 rounded-full">
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <div className="text-2xl md:text-3xl font-bold leading-none">{value}</div>
        <div className="text-xs md:text-sm text-white/75 font-medium leading-relaxed">{label}</div>
      </div>
    </Card>
  )
}
