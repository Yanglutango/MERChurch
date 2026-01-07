import { Card } from '../ui/card'
import { Logo } from '../ui/logo'

interface LoadingStateProps {
  message?: string
  fullScreen?: boolean
}

export const LoadingState = ({ message = 'Carregando...', fullScreen = false }: LoadingStateProps) => {
  if (fullScreen) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="animate-pulse">
            <Logo size="xl" showText={false} iconOnly className="justify-center" />
          </div>
          <p className="text-sm md:text-base text-muted-foreground font-medium">{message}</p>
        </div>
      </div>
    )
  }

  return (
    <Card className="p-10 md:p-12 border-2">
      <div className="text-center space-y-6">
        <div className="animate-pulse">
          <Logo size="xl" showText={false} iconOnly className="justify-center" />
        </div>
        <p className="text-sm md:text-base text-muted-foreground font-medium">{message}</p>
      </div>
    </Card>
  )
}
