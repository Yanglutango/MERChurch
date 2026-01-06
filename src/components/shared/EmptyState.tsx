import { Card } from '../ui/card'
import { LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}

export const EmptyState = ({ icon: Icon, title, description, action }: EmptyStateProps) => {
  return (
    <Card className="p-8 md:p-12 text-center border-2 border-dashed hover:border-primary/30 transition-colors">
      <div className="max-w-md mx-auto space-y-5">
        <div className="inline-flex p-4 md:p-5 bg-muted rounded-2xl">
          <Icon className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="text-base md:text-lg font-semibold text-foreground">{title}</h3>
          {description && (
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{description}</p>
          )}
        </div>
        {action && <div className="pt-2">{action}</div>}
      </div>
    </Card>
  )
}
