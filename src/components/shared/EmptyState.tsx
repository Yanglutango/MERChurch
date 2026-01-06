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
    <Card className="p-12 text-center border-2 border-dashed hover:border-primary/30 transition-colors">
      <div className="max-w-md mx-auto space-y-4">
        <div className="inline-flex p-4 bg-muted rounded-2xl">
          <Icon className="h-12 w-12 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="pt-2">{action}</div>}
      </div>
    </Card>
  )
}
