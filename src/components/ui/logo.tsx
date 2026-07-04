import { memo, useEffect } from 'react'
import { useAppStore } from '../../stores/appStore'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  className?: string
  animated?: boolean
  iconOnly?: boolean
}

const sizeMap = {
  sm: { container: 'w-8 h-8', text: 'text-sm', subtitle: 'text-[9px]', tracking: 'tracking-wider' },
  md: { container: 'w-12 h-12', text: 'text-lg', subtitle: 'text-[10px]', tracking: 'tracking-widest' },
  lg: { container: 'w-20 h-20', text: 'text-2xl', subtitle: 'text-xs', tracking: 'tracking-[0.15em]' },
  xl: { container: 'w-32 h-32', text: 'text-4xl', subtitle: 'text-sm', tracking: 'tracking-[0.2em]' },
}

// Representação vetorial limpa da marca (Substitua as paths abaixo pelo desenho oficial se necessário)
const LogoSvg = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 100 100" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={`w-full h-full ${className}`}
  >
    {/* Círculo de Reconciliação / Infinito */}
    <circle 
      cx="50" 
      cy="50" 
      r="44" 
      stroke="url(#logo-gradient)" 
      strokeWidth="6" 
      strokeLinecap="round"
      strokeDasharray="6 6"
      className="opacity-40"
    />
    <circle 
      cx="50" 
      cy="50" 
      r="36" 
      stroke="var(--logo-accent, #C5A880)" 
      strokeWidth="2"
    />
    {/* Geometria Central Kairós (Fusão da letra K com a Cruz estilizada) */}
    <path 
      d="M38 25V75M38 50L62 25M46 42L64 75" 
      stroke="var(--logo-primary, #0F172A)" 
      strokeWidth="8" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <defs>
      <linearGradient id="logo-gradient" x1="0" y1="0" x2="100" y2="100">
        <stop offset="0%" stopColor="var(--logo-primary, #0F172A)" />
        <stop offset="50%" stopColor="var(--logo-accent, #C5A880)" />
        <stop offset="100%" stopColor="var(--logo-secondary, #334155)" />
      </linearGradient>
    </defs>
  </svg>
)

export const Logo = memo(({ 
  size = 'md', 
  showText = true, 
  className = '', 
  animated = false, 
  iconOnly = false 
}: LogoProps) => {
  const sizes = sizeMap[size] || sizeMap.md
  const { t } = useAppStore()

  const shouldRenderText = showText && !iconOnly
  const brandName = t('brand.name') || 'KAIRÓS'
  const brandChurch = t('brand.church') || 'MISSÃO EVANGÉLICA DA RECONCILIAÇÃO'

  // Efeito colateral para gerir dinamicamente Favicons e Open Graph Tag baseados no tema
  useEffect(() => {
    const updateHeadTags = () => {
      const isDarkMode = document.documentElement.classList.contains('dark')
      
      // Atualização do Favicon Dinâmico
      let favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement
      if (!favicon) {
        favicon = document.createElement('link')
        favicon.rel = 'shortcut icon'
        document.head.appendChild(favicon)
      }
      
      // Gera uma variação simplificada em SVG Data URI para o Favicon sem quebras
      const strokeColor = isDarkMode ? '%23F8FAFC' : '%230F172A'
      const accentColor = '%23C5A880'
      const svgRaw = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='40' fill='none' stroke='${accentColor}' stroke-width='8'/><path d='M40 25V75M40 50L65 25M48 42L67 75' stroke='${strokeColor}' stroke-width='12' stroke-linecap='round'/></svg>`
      favicon.href = `data:image/svg+xml;utf8,${svgRaw}`

      // Atualização de Metadados Open Graph (SEO e Compartilhamento)
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
    }

    updateHeadTags()
    
    // Opcional: Observador de mutação caso o tema mude em tempo de execução sem recarregar a página
    const observer = new MutationObserver(updateHeadTags)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    
    return () => observer.disconnect()
  }, [brandName, brandChurch])

  return (
    <div 
      className={`flex items-center gap-3.5 select-none ${className}`}
      aria-label={shouldRenderText ? undefined : `${brandName} — ${brandChurch}`}
      role={shouldRenderText ? undefined : 'img'}
    >
      {/* Container do Logo SVG */}
      <div 
        className={`relative ${sizes.container} flex-shrink-0 flex items-center justify-center
          ${animated ? 'transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110 active:scale-95 motion-reduce:transition-none' : ''}`}
      >
        <LogoSvg className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.04)] dark:drop-shadow-[0_4px_12px_rgba(255,255,255,0.03)]" />
      </div>

      {/* Bloco de Identidade Nominal da Marca */}
      {shouldRenderText && (
        <div className="flex flex-col leading-none py-0.5 px-[2px] items-start justify-center">
          {/* KAIRÓS - Renderização sólida, limpa e imponente */}
          <span 
            className={`${sizes.text} font-black tracking-tight text-[var(--logo-primary,#0F172A)] antialiased transition-colors duration-300`}
            style={{ fontFeatureSettings: '"ss01", "cv10"' }}
          >
            {brandName}
          </span>
          
          {/* MER / Subtítulo - Muted Luxury com alta legibilidade espacial */}
          <span className={`${sizes.subtitle} ${sizes.tracking} font-bold uppercase block mt-1 text-[var(--logo-subtitle,#64748B)] antialiased transition-colors duration-300`}>
            {brandChurch}
          </span>
        </div>
      )}
    </div>
  )
})

Logo.displayName = 'Logo'
