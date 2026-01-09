import { Card } from '../ui/card'
import { Logo } from '../ui/logo'

interface LoadingStateProps {
  message?: string
  fullScreen?: boolean
}

export const LoadingState = ({ message = 'Carregando...', fullScreen = false }: LoadingStateProps) => {
  if (fullScreen) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse" />
            <div className="relative animate-gentle-float">
              <Logo size="xl" showText={false} iconOnly className="justify-center" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm md:text-base text-foreground font-semibold">{message}</p>
            <div className="flex gap-1.5 justify-center">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className="p-12 md:p-14 border-2 elevation-1">
      <div className="text-center space-y-6">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-primary/15 rounded-full blur-2xl animate-pulse" />
          <div className="relative animate-gentle-float">
            <Logo size="xl" showText={false} iconOnly className="justify-center" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm md:text-base text-foreground font-semibold">{message}</p>
          <div className="flex gap-1.5 justify-center">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          </div>
        </div>
      </div>
    </Card>
  )
}
