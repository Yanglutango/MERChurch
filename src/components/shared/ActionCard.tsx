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
      className="p-5 md:p-6 border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer group elevation-1"
    >
      <div className={`p-3.5 md:p-4 bg-gradient-to-br ${gradient} rounded-2xl w-fit mb-3 md:mb-4 group-hover:scale-110 transition-transform shadow-md`}>
        <Icon className="h-7 w-7 md:h-8 md:w-8 text-white" />
      </div>
      <div className="space-y-1">
        <h3 className="font-bold text-sm md:text-base text-foreground group-hover:text-primary transition-colors leading-snug">
          {label}
        </h3>
        <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 leading-relaxed">{description}</p>
      </div>
    </Card>
  )
}
