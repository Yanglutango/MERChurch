import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { UserPlus, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface GuestPromptProps {
  title?: string
  description?: string
  actionText?: string
  variant?: 'card' | 'inline' | 'banner'
}

export const GuestPrompt = ({ 
  title = "Seja um Membro",
  description = "Crie sua conta para interagir com a comunidade, participar de eventos e muito mais.",
  actionText = "Criar Conta Grátis",
  variant = 'card'
}: GuestPromptProps) => {
  const navigate = useNavigate()

  if (variant === 'inline') {
    return (
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border-2 border-primary/20">
        <div className="flex-1">
          <p className="font-semibold text-foreground mb-0.5">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button 
          onClick={() => navigate('/auth')}
          className="gradient-primary text-white ml-4"
          size="sm"
        >
          <UserPlus className="h-4 w-4 mr-1.5" />
          {actionText}
        </Button>
      </div>
    )
  }

  if (variant === 'banner') {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-secondary to-accent p-8 text-white">
        <div className="relative z-10 text-center max-w-2xl mx-auto space-y-4">
          <h3 className="text-2xl md:text-3xl font-bold">{title}</h3>
          <p className="text-lg text-white/90">{description}</p>
          <Button 
            onClick={() => navigate('/auth')}
            size="lg"
            className="bg-white text-primary hover:bg-white/90 font-semibold mt-4"
          >
            <UserPlus className="h-5 w-5 mr-2" />
            {actionText}
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/20 rounded-full blur-3xl" />
      </div>
    )
  }

  // Default: card variant
  return (
    <Card className="p-6 md:p-8 border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="p-6 bg-gradient-to-br from-primary to-accent rounded-2xl">
          <UserPlus className="h-10 w-10 text-white" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">{title}</h3>
          <p className="text-muted-foreground mb-4">{description}</p>
          <Button 
            onClick={() => navigate('/auth')}
            className="gradient-primary text-white font-semibold"
            size="lg"
          >
            <UserPlus className="h-5 w-5 mr-2" />
            {actionText}
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
