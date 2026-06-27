import { memo, useState } from 'react'
import { useAppStore } from '../../stores/appStore'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  className?: string
  animated?: boolean
  iconOnly?: boolean
}

// Pixel reais correspondentes a cada classe Tailwind do container, assumindo
// a raiz de 16px padrão (w-8=32px, w-12=48px, w-20=80px, w-32=128px).
// Usados só para os atributos width/height do <img>, que evitam layout
// shift — não substituem as classes, que continuam a controlar o tamanho
// visual real e responsivo.
const sizeMap = {
  sm: { container: 'w-8 h-8', text: 'text-sm', subtitle: 'text-[9px]', px: 32 },
  md: { container: 'w-12 h-12', text: 'text-lg', subtitle: 'text-[10px]', px: 48 },
  lg: { container: 'w-20 h-20', text: 'text-2xl', subtitle: 'text-xs', px: 80 },
  xl: { container: 'w-32 h-32', text: 'text-4xl', subtitle: 'text-sm', px: 128 },
}

const LOGO_URL = 'https://cdn-ai.onspace.ai/onspace/files/XApskyyhcaqpHfkzKVPzqb/kairoslogo.png'

export const Logo = memo(({ size = 'md', showText = true, className = '', animated = false, iconOnly = false }: LogoProps) => {
  const sizes = sizeMap[size] || sizeMap.md
  const { t } = useAppStore()
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className={`relative ${sizes.container} flex-shrink-0 ${animated ? 'motion-safe:hover:scale-105 motion-safe:transition-transform motion-safe:duration-300' : ''}`}>
        {imgFailed ? (
          // Fallback visual caso o CDN falhe — mesma linguagem visual já usada
          // nos avatares de utilizador em todo o resto da app (inicial sobre
          // gradiente da marca), em vez do ícone de imagem quebrada do browser.
          <div className="w-full h-full rounded-full bg-gradient-to-br from-[#0A2E4A] to-[#4A90A4] flex items-center justify-center text-white font-bold drop-shadow-sm">
            K
          </div>
        ) : (
          <img
            src={LOGO_URL}
            alt="KAIRÓS Logo"
            width={sizes.px}
            height={sizes.px}
            decoding="async"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-contain drop-shadow-sm"
          />
        )}
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
})

Logo.displayName = 'Logo'
