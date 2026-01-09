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
    <Card className={`p-5 md:p-6 border-2 bg-gradient-to-br ${gradient} text-white hover:scale-[1.02] transition-all duration-300 shadow-md hover:shadow-xl elevation-2`}>
      <div className="flex items-start justify-between mb-3 md:mb-4">
        <div className="p-2.5 md:p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-sm">
          <Icon className="h-6 w-6 md:h-7 md:w-7" />
        </div>
        {trend && (
          <div className="text-xs md:text-sm font-semibold bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <div className="text-3xl md:text-4xl font-bold leading-none">{value}</div>
        <div className="text-sm md:text-base text-white/80 font-medium leading-relaxed">{label}</div>
      </div>
    </Card>
  )
}
