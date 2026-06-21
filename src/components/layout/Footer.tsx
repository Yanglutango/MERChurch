import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { Logo } from '../ui/logo'
import { useAppStore } from '../../stores/appStore'

const Footer = () => {
  const { t } = useAppStore()

  // Memoriza o ano atual para evitar instanciar um novo Date a cada render
  const currentYear = useMemo(() => new Date().getFullYear(), [])

  // Definições de menus usando a função de tradução 't'
  const institutionalLinks = useMemo(() => [
    { label: t('footer.about', 'Sobre a MER'), path: '/about' },
    { label: t('footer.ministries', 'Ministérios'), path: '/ministries' },
    { label: t('footer.agenda', 'Agenda'), path: '/agenda' },
  ], [t])

  const spiritualLinks = useMemo(() => [
    { label: t('footer.live', 'Ao Vivo'), path: '/live' },
    { label: t('footer.sermons', 'Sermões'), path: '/sermons' },
    { label: t('footer.prayer', 'Oração'), path: '/prayer' },
  ], [t])

  return (
    <footer className="mt-10 border-t border-border/60 bg-muted/20">
      <div className="container-custom py-10">
        <div className="grid md:grid-cols-3 gap-8 mb-8 pb-8 border-b border-border/50">
          
          {/* Brand */}
          <div className="space-y-3">
            <Logo size="sm" showText={true} />
            <p className="text-sm text-muted-foreground leading-relaxed italic">
              "{t('footer.slogan', 'Somos o Povo da Fé e a Geração dos Poderosos')}"
            </p>
            <p className="text-xs text-muted-foreground/70">
              {t('footer.sub_brand', 'Missão Evangélica da Reconciliação — desde 1989.')}
            </p>
          </div>

          {/* Institucional */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground/80 tracking-wider uppercase">
              {t('footer.title_institutional', 'Institucional')}
            </h4>
            <nav className="flex flex-col gap-2" aria-label={t('footer.aria_institutional', 'Navegação institucional')}>
              {institutionalLinks.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Espiritual */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground/80 tracking-wider uppercase">
              {t('footer.title_spiritual', 'Espiritual')}
            </h4>
            <nav className="flex flex-col gap-2" aria-label={t('footer.aria_spiritual', 'Navegação espiritual')}>
              {spiritualLinks.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>
            © {currentYear}{' '}
            <span className="font-bold text-foreground">KAIRÓS</span> · MER
          </p>
          <p className="flex items-center gap-1 flex-wrap justify-center sm:justify-start">
            <span>
              {t('footer.developed_by', 'Desenvolvido com')}
            </span>
            <Heart 
              className="inline h-3 w-3 text-red-400 mx-0.5 animate-pulse" 
              aria-hidden="true" 
            /> 
            <span>por Yanglutango</span>
            {' · '}
            <a 
              href="mailto:lutangoyanivo1234@gmail.com" 
              className="hover:text-foreground transition-colors underline underline-offset-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
            >
              lutangoyanivo1234@gmail.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
