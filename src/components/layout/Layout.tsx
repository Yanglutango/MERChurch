import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  Home,
  Radio,
  BookOpen,
  Calendar,
  Bell,
  Sparkles,
  Users,
  GraduationCap,
  MessageCircle,
  DollarSign,
  Heart,
  HeadphonesIcon,
  Info,
  Settings,
  LayoutDashboard,
  LogOut,
  ScrollText,
  LibraryBig,
  Users2,
  Languages,
  Coins,
} from 'lucide-react'
import { useState } from 'react'
import { authService } from '../../lib/authService'
import { useAppStore } from '../../stores/appStore'
import { Logo } from '../ui/logo'
import { ThemeToggle } from '../ui/theme-toggle'
import { NotificationBell } from './NotificationBell'
import Footer from './Footer'

interface LayoutProps {
  children: React.ReactNode
  title: string
}

// ─── Navigation structure ────────────────────────────────────────────────────

interface NavItem {
  icon: React.ElementType
  label: string
  path: string
}

interface NavSection {
  heading?: string
  items: NavItem[]
}

function useNavSections(role: string | undefined, t: (key: string) => string): NavSection[] {
  const core: NavItem[] = [
    { icon: Home, label: t('nav.home'), path: '/home' },
    { icon: Radio, label: t('nav.live'), path: '/live' },
    { icon: BookOpen, label: t('nav.sermons'), path: '/sermons' },
    { icon: Calendar, label: t('nav.agenda'), path: '/agenda' },
  ]

  const community: NavItem[] = [
    { icon: MessageCircle, label: t('nav.community'), path: '/community' },
    { icon: Users2, label: 'Grupos & Células', path: '/groups' },
    { icon: Users, label: t('nav.ministries'), path: '/ministries' },
    { icon: Heart, label: t('nav.prayer'), path: '/prayer' },
    { icon: ScrollText, label: 'Testemunhos', path: '/testimonies' },
  ]

  const growth: NavItem[] = [
    { icon: GraduationCap, label: t('nav.academy'), path: '/academy' },
    { icon: LibraryBig, label: 'Recursos', path: '/resources' },
    { icon: Sparkles, label: 'Logos by KAIRÓS', path: '/ai' },
  ]

  const support: NavItem[] = [
    { icon: DollarSign, label: t('nav.treasury'), path: '/treasury' },
    { icon: HeadphonesIcon, label: t('nav.counseling'), path: '/counseling' },
    { icon: Bell, label: t('nav.notifications'), path: '/notifications' },
    { icon: Info, label: t('nav.about'), path: '/about' },
    { icon: Settings, label: t('nav.settings'), path: '/settings' },
  ]

  if (role === 'admin') {
    return [
      {
        items: [{ icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' }],
      },
      { heading: 'Conteúdo', items: core },
      { heading: 'Comunidade', items: community },
      { heading: 'Crescimento', items: growth },
      { heading: 'Gestão', items: support },
    ]
  }

  if (role === 'guest') {
    return [
      { items: core },
      {
        heading: 'Comunidade',
        items: [
          { icon: Heart, label: t('nav.prayer'), path: '/prayer' },
          { icon: ScrollText, label: 'Testemunhos', path: '/testimonies' },
          { icon: Info, label: t('nav.about'), path: '/about' },
        ],
      },
      {
        heading: 'Conta',
        items: [
          { icon: Settings, label: t('nav.settings'), path: '/settings' },
        ],
      },
    ]
  }

  // Member
  return [
    { items: core },
    { heading: 'Comunidade', items: community },
    { heading: 'Crescimento', items: growth },
    {
      heading: 'Suporte',
      items: support,
    },
  ]
}

// ─── Bottom tab bar items (mobile, max 5 per role) ───────────────────────────

function useBottomTabs(role: string | undefined, t: (key: string) => string): NavItem[] {
  if (role === 'admin') {
    return [
      { icon: Home, label: 'Início', path: '/home' },
      { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
      { icon: Radio, label: 'Ao Vivo', path: '/live' },
      { icon: MessageCircle, label: 'Comunidade', path: '/community' },
      { icon: Bell, label: 'Alertas', path: '/notifications' },
    ]
  }
  if (role === 'guest') {
    return [
      { icon: Home, label: 'Início', path: '/home' },
      { icon: Radio, label: 'Ao Vivo', path: '/live' },
      { icon: BookOpen, label: 'Sermões', path: '/sermons' },
      { icon: Heart, label: 'Oração', path: '/prayer' },
      { icon: Info, label: 'Sobre', path: '/about' },
    ]
  }
  // Member
  return [
    { icon: Home, label: 'Início', path: '/home' },
    { icon: Radio, label: 'Ao Vivo', path: '/live' },
    { icon: MessageCircle, label: 'Comunidade', path: '/community' },
    { icon: Heart, label: 'Oração', path: '/prayer' },
    { icon: Sparkles, label: 'Logos', path: '/ai' },
  ]
}

// ─── Layout ───────────────────────────────────────────────────────────────────

const Layout = ({ children, title }: LayoutProps) => {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { language, currency, setLanguage, setCurrency, t } = useAppStore()
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false)

  const navSections = useNavSections(user?.role, t)
  const bottomTabs = useBottomTabs(user?.role, t)

  const languages = [
    { code: 'pt', name: 'Português', flag: '🇦🇴' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
  ]

  const currencies = [
    { code: 'AKZ', name: 'Kwanza', symbol: 'Kz' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'Pound', symbol: '£' },
  ]

  const handleLogout = async () => {
    await authService.signOut()
    navigate('/auth')
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top Header ─────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-card/98 backdrop-blur-lg border-b border-border/50 h-14">
        <div className="flex items-center justify-between px-4 h-full">
          {/* Left: Logo */}
          <div className="flex items-center">
            <Link to="/home" className="transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-[#0A2E4A] rounded" aria-label="KAIRÓS - Início">
              <Logo size="sm" showText={true} />
            </Link>
          </div>

          {/* Center: Page title (desktop only) */}
          <h1 className="text-sm font-semibold text-foreground/80 hidden md:block absolute left-1/2 -translate-x-1/2 pointer-events-none">
            {title}
          </h1>

          {/* Right: controls */}
          <div className="flex items-center gap-1.5">
            <ThemeToggle />

            {/* Language */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                title={t('common.language')}
                aria-label="Selecionar idioma"
              >
                <Languages className="h-4 w-4" aria-hidden="true" />
              </button>
              {showLangMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowLangMenu(false)} aria-hidden="true" />
                  <div className="absolute top-full right-0 mt-1.5 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[140px] z-50">
                    {languages.map(lang => (
                      <button key={lang.code}
                        onClick={() => { setLanguage(lang.code as any); setShowLangMenu(false) }}
                        className={`w-full px-3 py-1.5 text-left hover:bg-muted transition-colors flex items-center gap-2 text-sm ${language === lang.code ? 'text-[#0A2E4A] dark:text-[#7bbdd4] font-semibold bg-primary/5' : 'text-foreground'}`}
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Currency */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setShowCurrencyMenu(!showCurrencyMenu)}
                className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                title={t('common.currency')}
                aria-label="Selecionar moeda"
              >
                <Coins className="h-4 w-4" aria-hidden="true" />
              </button>
              {showCurrencyMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowCurrencyMenu(false)} aria-hidden="true" />
                  <div className="absolute top-full right-0 mt-1.5 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[120px] z-50">
                    {currencies.map(curr => (
                      <button key={curr.code}
                        onClick={() => { setCurrency(curr.code as any); setShowCurrencyMenu(false) }}
                        className={`w-full px-3 py-1.5 text-left hover:bg-muted transition-colors text-sm ${currency === curr.code ? 'text-[#0A2E4A] dark:text-[#7bbdd4] font-semibold bg-primary/5' : 'text-foreground'}`}
                      >
                        <span className="font-semibold">{curr.symbol}</span> {curr.code}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Notifications (member/admin) */}
            {user?.role !== 'guest' && <NotificationBell />}

            {/* Avatar */}
            <div className="flex items-center gap-2 ml-1">
              <span className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-foreground leading-tight">{user?.username}</div>
                <div className="text-[10px] text-muted-foreground capitalize leading-tight">{user?.role === 'admin' ? 'Administrador' : user?.role === 'guest' ? 'Convidado' : 'Membro'}</div>
              </span>
              {user?.avatar ? (
                <img src={user.avatar} alt={user.username} className="h-8 w-8 rounded-full border-2 border-[#4A90A4]/50 object-cover flex-shrink-0" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-[#0A2E4A] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Sidebar (desktop: always visible; mobile: hidden in favor of bottom tabs) ── */}
      <aside
        className="hidden lg:flex fixed top-14 left-0 bottom-0 w-60 bg-card border-r border-border/50 z-40 flex-col overflow-y-auto"
        aria-label="Navegação principal"
      >
        <nav className="flex-1 p-2 space-y-4">
          {navSections.map((section, si) => (
            <div key={si}>
              {section.heading && (
                <div className="px-3 py-1 mb-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 select-none">
                    {section.heading}
                  </span>
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const active = isActive(item.path)
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-2 focus-visible:outline-[#0A2E4A] ${
                        active
                          ? 'bg-[#0A2E4A] text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                      aria-current={active ? 'page' : undefined}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
              {/* Separator between sections */}
              {si < navSections.length - 1 && (
                <div className="mt-4 border-t border-border/40" aria-hidden="true" />
              )}
            </div>
          ))}
        </nav>

        {/* Logout at bottom */}
        <div className="p-2 border-t border-border/40">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors duration-150"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main className="pt-14 lg:pl-60 min-h-screen pb-20 lg:pb-0">
        <div className="p-4 md:p-6">{children}</div>
        <Footer />
      </main>

      {/* ── Mobile Bottom Tab Bar (hidden on lg+) ────────────────────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/98 backdrop-blur-lg border-t border-border/50 safe-area-inset-bottom"
        aria-label="Navegação rápida"
      >
        <div className="flex items-stretch h-16">
          {bottomTabs.map(tab => {
            const active = isActive(tab.path)
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`flex-1 flex flex-col items-center justify-center gap-1 min-w-0 px-1 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#0A2E4A] ${
                  active
                    ? 'text-[#0A2E4A] dark:text-[#7bbdd4]'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <div className={`p-1.5 rounded-lg transition-colors ${active ? 'bg-[#0A2E4A]/10 dark:bg-[#4A90A4]/20' : ''}`}>
                  <tab.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <span className="text-[10px] font-semibold leading-none truncate max-w-full">{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export default Layout
