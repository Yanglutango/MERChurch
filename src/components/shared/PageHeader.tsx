import { Card } from '../ui/card'
import { LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description: string
  icon: LucideIcon
  gradient?: string
  actions?: ReactNode
}

export const PageHeader = ({ 
  title, 
  description, 
  icon: Icon, 
  gradient = 'from-primary via-secondary to-accent',
  actions 
}: PageHeaderProps) => {
  return (
    <Card className={`p-6 md:p-8 border-2 bg-gradient-to-r ${gradient} text-white shadow-lg`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start md:items-center gap-4 md:gap-5">
          <div className="p-3 md:p-4 bg-white/20 backdrop-blur-sm rounded-2xl shadow-xl flex-shrink-0">
            <Icon className="h-8 w-8 md:h-10 md:w-10" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold leading-tight">{title}</h1>
            <p className="text-white/85 text-base md:text-lg leading-relaxed">{description}</p>
          </div>
        </div>
        {actions && <div className="self-start md:self-center">{actions}</div>}
      </div>
    </Card>
  )
}
