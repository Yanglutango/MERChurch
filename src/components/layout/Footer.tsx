import { Link } from 'react-router-dom'
import { ArrowRight, Heart, Mail, Play } from 'lucide-react'
import { Logo } from '../ui/logo'

const institutionalLinks = [
  { label: 'Sobre a MER', to: '/about' },
  { label: 'Ministérios', to: '/ministries' },
  { label: 'Agenda', to: '/agenda' },
]

const spiritualLinks = [
  { label: 'Ao Vivo', to: '/live' },
  { label: 'Sermões', to: '/sermons' },
  { label: 'Oração', to: '/prayer' },
]

const Footer = () => {
  return (
    <footer className="mt-12 border-t border-border/60 bg-[#0d0d0d] text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
        <div className="grid gap-8 border-b border-border/60 pb-8 lg:grid-cols-[1.2fr_0.8fr_0.8fr_1fr]">
          <div className="space-y-4">
            <Logo size="sm" showText />

            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Somos o povo da fé e a geração dos poderosos.
            </p>

            <p className="text-xs text-muted-foreground/80">
              Missão Evangélica da Reconciliação — desde 2000.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300">
              Igreja
            </h4>

            <nav className="flex flex-col gap-2">
              {institutionalLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="text-sm text-muted-foreground transition-colors hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300">
              Recursos
            </h4>

            <nav className="flex flex-col gap-2">
              {spiritualLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="text-sm text-muted-foreground transition-colors hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300">
              Conectar
            </h4>

            <div className="space-y-3">
              <Link
                to="/live"
                className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-3 py-2 text-xs font-medium text-stone-950 transition-colors hover:bg-amber-400"
              >
                <Play className="h-3.5 w-3.5" />
                Ver transmissão
              </Link>

              <a
                href="mailto:lutangoyanivo1234@gmail.com"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-white"
              >
                <Mail className="h-3.5 w-3.5" />
                lutangoyanivo1234@gmail.com
              </a>

              <Link
                to="/prayer"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-white"
              >
                Pedir oração
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} KAIRÓS · MER</p>

          <p className="flex items-center gap-1.5">
            Desenvolvido para a <span className="font-medium text-white">MER</span>
            <Heart className="h-3 w-3 text-red-400" />
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
