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
    <Card className="p-10 md:p-14 text-center border-2 border-dashed border-border bg-muted/20 hover:border-primary/30 transition-colors elevation-1">
      <div className="max-w-md mx-auto space-y-6">
        <div className="inline-flex p-5 md:p-6 bg-muted/70 rounded-3xl shadow-sm">
          <Icon className="h-14 w-14 md:h-16 md:w-16 text-muted-foreground/70" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl md:text-2xl font-bold text-foreground">{title}</h3>
          {description && (
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-sm mx-auto">{description}</p>
          )}
        </div>
        {action && <div className="pt-3">{action}</div>}
      </div>
    </Card>
  )
}
