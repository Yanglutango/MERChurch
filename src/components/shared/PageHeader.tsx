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
    <Card className={`p-8 border-2 bg-gradient-to-r ${gradient} text-white shadow-lg`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl shadow-xl">
            <Icon className="h-12 w-12" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">{title}</h1>
            <p className="text-white/90 text-lg">{description}</p>
          </div>
        </div>
        {actions && <div>{actions}</div>}
      </div>
    </Card>
  )
}
