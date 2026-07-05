import * as React from "react"
import { cn } from "../../lib/utils"

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
Avatar.displayName = "Avatar"

interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  onLoadingStatusChange?: (status: "loading" | "loaded" | "error") => void
}

const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, src, onError, onLoad, onLoadingStatusChange, ...props }, ref) => {
    const [status, setStatus] = React.useState<"loading" | "loaded" | "error">(
      src ? "loading" : "error"
    )

    React.useEffect(() => {
      setStatus(src ? "loading" : "error")
    }, [src])

    if (status === "error" || !src) return null

    return (
      <img
        ref={ref}
        src={src}
        className={cn("aspect-square h-full w-full object-cover", className)}
        onLoad={(e) => {
          setStatus("loaded")
          onLoad?.(e)
          onLoadingStatusChange?.("loaded")
        }}
        onError={(e) => {
          setStatus("error")
          onError?.(e)
          onLoadingStatusChange?.("error")
        }}
        {...props}
      />
    )
  }
)
AvatarImage.displayName = "AvatarImage"

interface AvatarFallbackProps extends React.HTMLAttributes<HTMLDivElement> {
  delayMs?: number
}

const AvatarFallback = React.forwardRef<HTMLDivElement, AvatarFallbackProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-medium",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback }
