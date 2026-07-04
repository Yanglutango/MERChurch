import { Card } from '../ui/card'
import { Loader2 } from 'lucide-react'

interface LoadingStateProps {
  message?: string
  fullScreen?: boolean
}

export const LoadingState = ({ message = 'Carregando...', fullScreen = false }: LoadingStateProps) => {
  if (fullScreen) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <div className="text-center space-y-5">
          <div className="relative inline-flex">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse-soft" />
            <div className="relative p-4 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl">
              <Loader2 className="h-12 w-12 text-primary animate-spin-slow" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm md:text-base text-foreground font-semibold">{message}</p>
            <div className="flex gap-1.5 justify-center">
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className="p-10 md:p-12 border-2 elevation-1">
      <div className="text-center space-y-5">
        <div className="relative inline-flex">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse-soft" />
          <div className="relative p-4 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl">
            <Loader2 className="h-12 w-12 text-primary animate-spin-slow" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm md:text-base text-foreground font-semibold">{message}</p>
          <div className="flex gap-1.5 justify-center">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
          </div>
        </div>
      </div>
    </Card>
  )
}
