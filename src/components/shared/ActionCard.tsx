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
      className="group p-6 cursor-pointer hover:shadow-2xl transition-all duration-500 border-2 hover:border-primary/50 hover:-translate-y-2 transform"
    >
      <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${gradient} mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <h3 className="font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
        {label}
      </h3>
      <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
    </Card>
  )
}
