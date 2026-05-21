import { useAppStore } from '../../stores/appStore'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  className?: string
  animated?: boolean
  iconOnly?: boolean
}

const sizeMap = {
  sm: { container: 'w-8 h-8', text: 'text-sm', subtitle: 'text-[9px]' },
  md: { container: 'w-12 h-12', text: 'text-lg', subtitle: 'text-[10px]' },
  lg: { container: 'w-20 h-20', text: 'text-2xl', subtitle: 'text-xs' },
  xl: { container: 'w-32 h-32', text: 'text-4xl', subtitle: 'text-sm' },
}

export const Logo = ({ size = 'md', showText = true, className = '', animated = false, iconOnly = false }: LogoProps) => {
  const sizes = sizeMap[size]
  const { t } = useAppStore()

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className={`relative ${sizes.container} flex-shrink-0 ${animated ? 'hover:scale-105 transition-transform duration-300' : ''}`}>
        <img
          src="https://cdn-ai.onspace.ai/onspace/files/XApskyyhcaqpHfkzKVPzqb/kairoslogo.png"
          alt="KAIRÓS Logo"
          className="w-full h-full object-contain drop-shadow-sm"
        />
      </div>

      {showText && !iconOnly && (
        <div className="flex flex-col leading-tight">
          <span className={`${sizes.text} font-bold tracking-tight bg-gradient-to-r from-[#0A2E4A] via-[#4A90A4] to-[#D4A574] bg-clip-text text-transparent`}>
            {t('brand.name')}
          </span>
          <span className={`${sizes.subtitle} text-muted-foreground font-semibold uppercase tracking-wider`}>
            {t('brand.church')}
          </span>
        </div>
      )}
    </div>
  )
}
