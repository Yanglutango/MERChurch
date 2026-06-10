import { useNavigate } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { Logo } from '../ui/logo'
import { useAppStore } from '../../stores/appStore'

const Footer = () => {
  const navigate = useNavigate()
  const { t } = useAppStore()

  return (
    <footer className="mt-10 border-t border-border/60 bg-muted/20">
      <div className="container-custom py-10">
        <div className="grid md:grid-cols-3 gap-8 mb-8 pb-8 border-b border-border/50">
          {/* Brand */}
          <div className="space-y-3">
            <Logo size="sm" showText={true} />
            <p className="text-sm text-muted-foreground leading-relaxed italic">
              "Somos o Povo da Fé e a Geração dos Poderosos"
            </p>
            <p className="text-xs text-muted-foreground/70">
              Missão Evangélica da Reconciliação — desde 1989.
            </p>
          </div>

          {/* Institucional */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground/80 tracking-wider uppercase">Institucional</h4>
            <nav className="flex flex-col gap-2">
              {[
                { label: 'Sobre a MER', path: '/about' },
                { label: 'Ministérios', path: '/ministries' },
                { label: 'Agenda', path: '/agenda' },
              ].map(item => (
                <button key={item.path} onClick={() => navigate(item.path)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left">
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Espiritual */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground/80 tracking-wider uppercase">Espiritual</h4>
            <nav className="flex flex-col gap-2">
              {[
                { label: 'Ao Vivo', path: '/live' },
                { label: 'Sermões', path: '/sermons' },
                { label: 'Oração', path: '/prayer' },
              ].map(item => (
                <button key={item.path} onClick={() => navigate(item.path)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left">
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>
            © {new Date().getFullYear()}{' '}
            <span className="font-bold text-foreground">KAIRÓS</span> · MER
          </p>
          <p className="flex items-center gap-1">
            Desenvolvido com <Heart className="inline h-3 w-3 text-red-400 mx-0.5" /> por Yanglutango
            {' · '}
            <a href="mailto:lutangoyanivo1234@gmail.com" className="hover:text-foreground transition-colors underline underline-offset-2">
              lutangoyanivo1234@gmail.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
