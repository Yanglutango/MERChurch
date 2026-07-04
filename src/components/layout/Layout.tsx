import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useMemo } from 'react'
import { useAuth } from '../../hooks/useAuth'
import {
  Home, Radio, BookOpen, Calendar, Bell, Sparkles, Users, GraduationCap,
  MessageCircle, DollarSign, Heart, HeadphonesIcon, Info, Settings,
  LayoutDashboard, LogOut, ScrollText, LibraryBig, Users2, MoreHorizontal, X,
} from 'lucide-react'
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

interface NavItem { icon: React.ElementType; label: string; path: string }
interface NavSection { heading?: string; items: NavItem[] }

function useNavSections(role: string | undefined, t: (k: string) => string): NavSection[] {
  return useMemo(() => {
    const core: NavItem[] = [
      { icon: Home,      label: t('nav.home'),    path: '/home' },
      { icon: Radio,     label: t('nav.live'),    path: '/live' },
      { icon: BookOpen,  label: t('nav.sermons'), path: '/sermons' },
      { icon: Calendar,  label: t('nav.agenda'),  path: '/agenda' },
    ]
    const community: NavItem[] = [
      { icon: MessageCircle, label: t('nav.community'),  path: '/community' },
      { icon: Users2,        label: 'Grupos & Células',  path: '/groups' },
      { icon: Users,         label: t('nav.ministries'), path: '/ministries' },
      { icon: Heart,         label: t('nav.prayer'),     path: '/prayer' },
      { icon: ScrollText,    label: 'Testemunhos',       path: '/testimonies' },
    ]
    const growth: NavItem[] = [
      { icon: GraduationCap, label: t('nav.academy'), path: '/academy' },
      { icon: LibraryBig,    label: 'Recursos',       path: '/resources' },
      { icon: Sparkles,      label: 'Logos by KAIRÓS', path: '/ai' },
    ]
    const support: NavItem[] = [
      { icon: DollarSign,     label: t('nav.treasury'),     path: '/treasury' },
      { icon: HeadphonesIcon, label: t('nav.counseling'),   path: '/counseling' },
      { icon: Bell,           label: t('nav.notifications'), path: '/notifications' },
      { icon: Info,           label: t('nav.about'),        path: '/about' },
      { icon: Settings,       label: t('nav.settings'),     path: '/settings' },
    ]

    if (role === 'admin') {
      return [
        { items: [{ icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' }] },
        { heading: 'Conteúdo',    items: core },
        { heading: 'Comunidade',  items: community },
        { heading: 'Crescimento', items: growth },
        { heading: 'Gestão',      items: support },
      ]
    }
    if (role === 'guest') {
      return [
        { items: core },
        { heading: 'Comunidade', items: [
          { icon: Heart,      label: t('nav.prayer'),   path: '/prayer' },
          { icon: ScrollText, label: 'Testemunhos',     path: '/testimonies' },
          { icon: Info,       label: t('nav.about'),    path: '/about' },
        ]},
        { heading: 'Conta', items: [
          { icon: Settings, label: t('nav.settings'), path: '/settings' },
        ]},
      ]
    }
    
    // Member
    return [
      { items: core },
      { heading: 'Comunidade',  items: community },
      { heading: 'Crescimento', items: growth },
      { heading: 'Suporte',     items: support },
    ]
  }, [role, t])
}

function useBottomTabs(role: string | undefined, t: (k: string) => string) {
  return useMemo(() => {
    if (role === 'admin') return [
      { icon: Home,            label: 'Início',    path: '/home' },
      { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
      { icon: Radio,           label: 'Ao Vivo',   path: '/live' },
      { icon: MessageCircle,   label: 'Comunidade', path: '/community' },
    ]
    if (role === 'guest') return [
      { icon: Home,    label: 'Início',  path: '/home' },
      { icon: Radio,   label: 'Ao Vivo', path: '/live' },
      { icon: Info,    label: 'Sobre',   path: '/about' },
    ]
    
    // Member — 4 tabs
    return [
      { icon: Home,          label: 'Início',    path: '/home' },
      { icon: Radio,         label: 'Ao Vivo',   path: '/live' },
      { icon: MessageCircle, label: 'Comunidade', path: '/community' },
      { icon: Heart,         label: 'Oração',    path: '/prayer' },
    ]
  }, [role, t])
}

const Layout = ({ children, title }: LayoutProps) => {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useAppStore()
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)

  const navSections = useNavSections(user?.role, t)
  const bottomTabs  = useBottomTabs(user?.role, t)

  const handleLogout = async () => {
    await authService.signOut()
    navigate('/auth')
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="min-h-screen bg-background scroll-smooth selection:bg-[#0A2E4A]/20">
      {/* ── Top Header ───────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-card/98 backdrop-blur-lg border-b border-border/50 h-14">
        <div className="flex items-center justify-between px-3 h-full gap-2">
          {/* Logo */}
          <Link to="/home" className="flex-shrink-0 hover:opacity-80 transition-opacity focus-visible:outline-2 focus-visible:outline-primary rounded" aria-label="KAIRÓS – Início">
            <Logo size="sm" showText={true} />
          </Link>

          {/* Page title (desktop) */}
          <h1 className="hidden md:block text-sm font-semibold text-foreground/70 absolute left-1/2 -translate-x-1/2 pointer-events-none truncate max-w-xs">
            {title}
          </h1>

          {/* Right controls */}
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {user?.role !== 'guest' && <NotificationBell />}

            {/* Avatar + name */}
            <div className="flex items-center gap-2 ml-1">
              <span className="hidden sm:block text-right">
                <div className="text-xs font-semibold text-foreground leading-tight truncate max-w-[100px]">{user?.username}</div>
                <div className="text-[10px] text-muted-foreground leading-tight capitalize">
                  {user?.role === 'admin' ? 'Administrador' : user?.role === 'guest' ? 'Convidado' : 'Membro'}
                </div>
              </span>
              {user?.avatar
                ? <img src={user.avatar} alt={user.username} className="h-7 w-7 rounded-full border border-border object-cover flex-shrink-0" />
                : <div className="h-7 w-7 rounded-full bg-[#0A2E4A] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {user?.username?.charAt(0).toUpperCase()}
                  </div>
              }
            </div>
          </div>
        </div>
      </header>

      {/* ── Sidebar (lg+ only) ───────────────────────────────────────── */}
      {/* Adicionado 'scrollbar-none' e 'scroll-smooth' */}
      <aside
        className="hidden lg:flex fixed top-14 left-0 bottom-0 w-56 bg-card border-r border-border/50 z-40 flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        aria-label="Navegação principal"
      >
        <nav className="flex-1 p-2 space-y-4">
          {navSections.map((section, si) => (
            <div key={si}>
              {section.heading && (
                <div className="px-3 pt-1 pb-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 select-none">
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
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-2 focus-visible:outline-primary ${
                        active
                          ? 'bg-[#0A2E4A] text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                      aria-current={active ? 'page' : undefined}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                      <span className="truncate text-[13px]">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
              {si < navSections.length - 1 && (
                <div className="mt-3 border-t border-border/40" aria-hidden="true" />
              )}
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-2 border-t border-border/40">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <main className="pt-14 lg:pl-56 min-h-screen pb-20 lg:pb-0">
        {children}
        <Footer />
      </main>

      {/* ── Mobile Bottom Tab Bar (hidden on lg+) ───────────────────── */}
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
                onClick={() => setMoreMenuOpen(false)}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 px-1 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-primary ${
                  active ? 'text-[#0A2E4A] dark:text-[#7bbdd4]' : 'text-muted-foreground hover:text-foreground'
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

          {/* More → Open Modal (not Link) */}
          <button
            onClick={() => setMoreMenuOpen(!moreMenuOpen)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 px-1 transition-colors duration-150 ${
              moreMenuOpen ? 'text-[#0A2E4A] dark:text-[#7bbdd4]' : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-label="Mais opções"
            aria-expanded={moreMenuOpen}
          >
            <div className={`p-1.5 rounded-lg transition-colors ${moreMenuOpen ? 'bg-[#0A2E4A]/10 dark:bg-[#4A90A4]/20' : ''}`}>
              <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="text-[10px] font-semibold leading-none">Mais</span>
          </button>
        </div>
      </nav>

      {/* ── Mobile More Menu Modal (overlay + drawer) ───────────────── */}
      {moreMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setMoreMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          {/* Adicionado 'scrollbar-none' e 'scroll-smooth' */}
          <div className="lg:hidden fixed bottom-16 left-0 right-0 z-50 max-h-[60vh] bg-card border-t border-border/50 overflow-y-auto rounded-t-lg [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="p-2 space-y-4">
              {/* Header + Close button */}
              <div className="flex items-center justify-between px-3 pt-2">
                <h2 className="text-sm font-semibold text-foreground">Mais opções</h2>
                <button
                  onClick={() => setMoreMenuOpen(false)}
                  className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                  aria-label="Fechar menu"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              {/* Navigation Sections */}
              {navSections.map((section, si) => (
                <div key={si}>
                  {section.heading && (
                    <div className="px-3 pt-1 pb-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 select-none">
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
                          onClick={() => setMoreMenuOpen(false)}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-2 focus-visible:outline-primary ${
                            active
                              ? 'bg-[#0A2E4A] text-white shadow-sm'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          }`}
                          aria-current={active ? 'page' : undefined}
                        >
                          <item.icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                          <span className="truncate text-[13px]">{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                  {si < navSections.length - 1 && (
                    <div className="mt-3 border-t border-border/40" aria-hidden="true" />
                  )}
                </div>
              ))}

              {/* Logout Button */}
              <div className="px-2 pt-2 pb-4 border-t border-border/40">
                <button
                  onClick={() => {
                    setMoreMenuOpen(false)
                    handleLogout()
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <LogOut className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  {t('nav.logout')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Layout
