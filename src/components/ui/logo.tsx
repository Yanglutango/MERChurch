import { memo, useState } from 'react'
import { useAppStore } from '../../stores/appStore'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  className?: string
  animated?: boolean
  iconOnly?: boolean
}

// Mapeamento estático e escalável de tamanhos e tipografias associadas.
const sizeMap = {
  sm: { container: 'w-8 h-8', text: 'text-sm', subtitle: 'text-[9px]', fallbackText: 'text-xs', px: 32 },
  md: { container: 'w-12 h-12', text: 'text-lg', subtitle: 'text-[10px]', fallbackText: 'text-base', px: 48 },
  lg: { container: 'w-20 h-20', text: 'text-2xl', subtitle: 'text-xs', fallbackText: 'text-2xl', px: 80 },
  xl: { container: 'w-32 h-32', text: 'text-4xl', subtitle: 'text-sm', fallbackText: 'text-4xl', px: 128 },
}

const LOGO_URL = 'https://cdn-ai.onspace.ai/onspace/files/XApskyyhcaqpHfkzKVPzqb/kairoslogo.png'

export const Logo = memo(({ 
  size = 'md', 
  showText = true, 
  className = '', 
  animated = false, 
  iconOnly = false 
}: LogoProps) => {
  const sizes = sizeMap[size] || sizeMap.md
  const { t } = useAppStore()
  const [imgFailed, setImgFailed] = useState(false)

  const shouldRenderText = showText && !iconOnly
  const brandName = t('brand.name') || 'KAIRÓS'

  return (
    <div 
      className={`flex items-center gap-3 select-none ${className}`}
      aria-label={shouldRenderText ? undefined : brandName}
      role={shouldRenderText ? undefined : 'img'}
    >
      {/* Container do Logo / Ícone */}
      <div 
        className={`relative ${sizes.container} flex-shrink-0 flex items-center justify-center rounded-full
          ${animated ? 'transition-transform duration-300 ease-out hover:scale-105 motion-reduce:transition-none' : ''}`}
      >
        {imgFailed ? (
          <div 
            className={`w-full h-full rounded-full bg-gradient-to-br from-[#0A2E4A] to-[#4A90A4] 
              flex items-center justify-center text-white font-bold tracking-wider shadow-sm ${sizes.fallbackText}`}
            aria-hidden="true"
          >
            K
          </div>
        ) : (
          <img
            src={LOGO_URL}
            alt={shouldRenderText ? "" : `Logo ${brandName}`} // Evita redundância caso o texto já esteja na tela
            width={sizes.px}
            height={sizes.px}
            decoding="async"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-contain drop-shadow-sm select-none pointer-events-none"
          />
        )}
      </div>

      {/* Bloco de Identidade Nominal da Marca */}
      {shouldRenderText && (
        <div className="flex flex-col leading-none py-0.5 px-[2px] items-start justify-center">
          <span className={`${sizes.text} font-bold tracking-tight bg-gradient-to-r from-[#0A2E4A] via-[#4A90A4] to-[#D4A574] bg-clip-text text-transparent pb-0.5`}>
            {brandName}
          </span>
          <span className={`${sizes.subtitle} text-muted-foreground font-semibold uppercase tracking-widest block mt-0.5`}>
            {t('brand.church')}
          </span>
        </div>
      )}
    </div>
  )
})

Logo.displayName = 'Logo'
