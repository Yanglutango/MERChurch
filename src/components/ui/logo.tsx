import { memo, useState, useEffect } from 'react'
import { useAppStore } from '../../stores/appStore'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  className?: string
  animated?: boolean
  iconOnly?: boolean
}

// Mapeamento estático calibrado com tracking tipográfico elegante
const sizeMap = {
  sm: { container: 'w-8 h-8', text: 'text-sm', subtitle: 'text-[9px]', fallbackText: 'text-xs', px: 32, tracking: 'tracking-wider' },
  md: { container: 'w-12 h-12', text: 'text-lg', subtitle: 'text-[10px]', fallbackText: 'text-base', px: 48, tracking: 'tracking-widest' },
  lg: { container: 'w-20 h-20', text: 'text-2xl', subtitle: 'text-xs', fallbackText: 'text-2xl', px: 80, tracking: 'tracking-[0.15em]' },
  xl: { container: 'w-32 h-32', text: 'text-4xl', subtitle: 'text-sm', fallbackText: 'text-4xl', px: 128, tracking: 'tracking-[0.2em]' },
}

// O SEU LOGO ORIGINAL MANTIDO AQUI:
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
  const brandChurch = t('brand.church') || 'MISSÃO EVANGÉLICA DA RECONCILIAÇÃO'

  // ── Suporte Dinâmico de OG / Favicons Light & Dark ──
  useEffect(() => {
    const updateHeadTags = () => {
      // Atualização do Favicon usando a imagem original
      let favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement
      if (!favicon) {
        favicon = document.createElement('link')
        favicon.rel = 'shortcut icon'
        document.head.appendChild(favicon)
      }
      favicon.href = LOGO_URL

      // Atualização das Meta Tags Open Graph (SEO / Partilha)
      const updateMetaTag = (property: string, content: string) => {
        let element = document.querySelector(`meta[property='${property}']`)
        if (!element) {
          element = document.createElement('meta')
          element.setAttribute('property', property)
          document.head.appendChild(element)
        }
        element.setAttribute('content', content)
      }

      updateMetaTag('og:title', `${brandName} — ${brandChurch}`)
      updateMetaTag('og:description', 'Portal oficial da Missão Evangélica da Reconciliação.')
      updateMetaTag('og:type', 'website')
      updateMetaTag('og:image', LOGO_URL)
    }

    updateHeadTags()
  }, [brandName, brandChurch])

  return (
    <div 
      className={`flex items-center gap-3.5 select-none ${className}`}
      aria-label={shouldRenderText ? undefined : `${brandName} — ${brandChurch}`}
      role={shouldRenderText ? undefined : 'img'}
    >
      {/* Container do Logo (Mantido o fluxo de imagem original) */}
      <div class="relative w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full
            /* Light Mode: Efeito Cerâmico 3D */
            bg-gradient-to-b from-white to-slate-50/90 
            border border-slate-900/[0.05] 
            shadow-[0_3px_8px_-1px_rgba(0,0,0,0.04),0_1px_3px_0px_rgba(0,0,0,0.02)]
            
  /* Dark Mode: Reset Absoluto (Invisível) */
            dark:bg-none dark:from-transparent dark:to-transparent dark:border-0 dark:shadow-none">
  <img 
    src="https://cdn-ai.onspace.ai/onspace/files/XApskyyhcaqpHfkzKVPzqb/kairoslogo.png" 
    alt="" 
    width="32" 
    height="32" 
    decoding="async" 
    class="w-full h-full object-contain drop-shadow-sm select-none pointer-events-none p-1 dark:p-0"
  >
</div>
      {/* Bloco de Identidade Nominal da Marca */}
      {shouldRenderText && (
        <div className="flex flex-col leading-none py-0.5 px-[2px] items-start justify-center">
          {/* "KAIRÓS" — Cor sólida ultra-profissional via CSS Variable */}
          <span 
            className={`${sizes.text} font-black tracking-tight text-[var(--logo-primary,#0F172A)] antialiased transition-colors duration-300 pb-0.5`}
            style={{ fontFeatureSettings: '"ss01", "cv10"' }}
          >
            {brandName}
          </span>
          
          {/* "MER" / Subtítulo — Espaçamento nobre e cor refinada */}
          <span className={`${sizes.subtitle} ${sizes.tracking} font-bold uppercase block mt-1 text-[var(--logo-subtitle,#64748B)] antialiased transition-colors duration-300`}>
            {brandChurch}
          </span>
        </div>
      )}
    </div>
  )
})

Logo.displayName = 'Logo'
