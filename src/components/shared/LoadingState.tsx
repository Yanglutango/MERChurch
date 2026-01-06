import { Loader2 } from 'lucide-react'
import { Card } from '../ui/card'

interface LoadingStateProps {
  message?: string
  fullScreen?: boolean
}

export const LoadingState = ({ message = 'Carregando...', fullScreen = false }: LoadingStateProps) => {
  if (fullScreen) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 md:h-12 md:w-12 animate-spin text-primary mx-auto" />
          <p className="text-sm md:text-base text-muted-foreground font-medium">{message}</p>
        </div>
      </div>
    )
  }

  return (
    <Card className="p-10 md:p-12 border-2">
      <div className="text-center space-y-4">
        <Loader2 className="h-10 w-10 md:h-12 md:w-12 animate-spin text-primary mx-auto" />
        <p className="text-sm md:text-base text-muted-foreground font-medium">{message}</p>
      </div>
    </Card>
  )
}
