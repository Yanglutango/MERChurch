import { Card } from '../ui/card'
import { LucideIcon } from 'lucide-react'

interface ActionCardProps {
  icon: LucideIcon
  label: string
  description: string
  gradient: string
  onClick: () => void
}

export const ActionCard = ({ icon: Icon, label, description, gradient, onClick }: ActionCardProps) => {
  return (
    <Card
      onClick={onClick}
      className="p-5 md:p-6 border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg cursor-pointer group"
    >
      <div className={`p-3 md:p-3.5 bg-gradient-to-br ${gradient} rounded-xl md:rounded-2xl w-fit mb-3 md:mb-4 group-hover:scale-105 transition-transform shadow-md`}>
        <Icon className="h-6 w-6 md:h-7 md:w-7 text-white" />
      </div>
      <div className="space-y-0.5">
        <h3 className="font-semibold md:font-bold text-sm md:text-base text-foreground group-hover:text-primary transition-colors leading-tight">
          {label}
        </h3>
        <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 leading-relaxed">{description}</p>
      </div>
    </Card>
  )
}
