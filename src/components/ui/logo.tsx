import { useAppStore } from '../../stores/appStore'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  className?: string
  animated?: boolean
  iconOnly?: boolean
}

const sizeMap = {
  sm: { container: 'w-8 h-8', text: 'text-sm', subtitle: 'text-[8px]' },
  md: { container: 'w-12 h-12', text: 'text-lg', subtitle: 'text-[10px]' },
  lg: { container: 'w-20 h-20', text: 'text-2xl', subtitle: 'text-xs' },
  xl: { container: 'w-32 h-32', text: 'text-4xl', subtitle: 'text-sm' },
}

export const Logo = ({ size = 'md', showText = true, className = '', animated = false, iconOnly = false }: LogoProps) => {
  const sizes = sizeMap[size]
  const { t } = useAppStore()

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* KAIRÓS Circular Logo */}
      <div className={`relative ${sizes.container} flex-shrink-0 ${animated ? 'transform hover:scale-105 transition-transform duration-300' : ''}`}>
        <img
          src="https://cdn-ai.onspace.ai/onspace/files/XApskyyhcaqpHfkzKVPzqb/kairoslogo.png"
          alt="KAIRÓS Logo"
          className="w-full h-full object-contain drop-shadow-lg"
        />
      </div>

      {/* Text */}
      {showText && !iconOnly && (
        <div className="flex flex-col leading-tight">
          <div className={`${sizes.text} font-bold tracking-tight`}>
            <span className="bg-gradient-to-r from-[#0A2E4A] via-[#4A90A4] to-[#D4A574] bg-clip-text text-transparent">
              {t('brand.name')}
            </span>
          </div>
          <div className={`${sizes.subtitle} text-muted-foreground font-semibold uppercase tracking-wider`}>
            {t('brand.church')}
          </div>
        </div>
      )}
    </div>
  )
}

// Hero version with elegant presentation
export const LogoHero = () => {
  const { t } = useAppStore()
  
  return (
    <div className="relative inline-flex flex-col items-center justify-center gap-12 py-16">
      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/10 to-primary/10 blur-3xl" />

      {/* Main logo container */}
      <div className="relative z-10">
        <div className="relative w-56 h-56 md:w-72 md:h-72 animate-gentle-float drop-shadow-2xl">
          <img
            src="https://cdn-ai.onspace.ai/onspace/files/XApskyyhcaqpHfkzKVPzqb/kairoslogo.png"
            alt="KAIRÓS Logo"
            className="w-full h-full object-contain drop-shadow-2xl"
          />
          {/* Elegant glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 blur-3xl -z-10" />
        </div>
      </div>

      {/* Brand text below */}
      <div className="text-center space-y-6 relative z-10 max-w-4xl px-6">
        <div className="text-5xl md:text-7xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-[#0A2E4A] via-[#4A90A4] to-[#D4A574] bg-clip-text text-transparent drop-shadow-lg">
            {t('brand.name')}
          </span>
        </div>
        <div className="text-xl md:text-3xl text-foreground font-bold">
          {t('brand.fullName')}
        </div>
        <div className="text-base md:text-xl text-muted-foreground italic font-medium">
          "{t('brand.tagline')}"
        </div>
      </div>
    </div>
  )
}
