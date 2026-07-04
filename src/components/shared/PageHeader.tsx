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
    <Card className={`p-6 md:p-8 lg:p-10 border-0 bg-gradient-to-r ${gradient} text-white shadow-xl elevation-3`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 md:gap-6">
        <div className="flex items-start md:items-center gap-4 md:gap-6">
          <div className="p-3 md:p-4 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg flex-shrink-0">
            <Icon className="h-9 w-9 md:h-11 md:w-11" />
          </div>
          <div className="space-y-1.5 md:space-y-2">
            <h1 className="text-2xl md:text-4xl font-bold leading-tight tracking-tight">{title}</h1>
            <p className="text-white/90 text-sm md:text-lg leading-relaxed">{description}</p>
          </div>
        </div>
        {actions && <div className="self-start md:self-center flex-shrink-0">{actions}</div>}
      </div>
    </Card>
  )
}
