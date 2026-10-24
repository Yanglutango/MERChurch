import { Link, useLocation, useNavigate } from 'react-router-dom'
import { type ElementType, type ReactNode, useMemo, useState } from 'react'

import {
  Bell,
  BookOpen,
  Calendar,
  ChevronRight,
  DollarSign,
  GraduationCap,
  HeadphonesIcon,
  Heart,
  Home,
  Info,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Megaphone,
  MessageCircle,
  MoreHorizontal,
  Radio,
  ScrollText,
  Settings,
  Sparkles,
  Users,
  Users2,
  X,
} from 'lucide-react'

import { authService } from '../../lib/authService'
import { useAuth } from '../../hooks/useAuth'
import { useAppStore } from '../../stores/appStore'
import { ThemeToggle } from '../ui/theme-toggle'
import { Logo } from '../ui/logo'
import { NotificationBell } from './NotificationBell'
import Footer from './Footer'

interface LayoutProps {
  children: ReactNode
  title: string
}

interface NavItem {
  icon: ElementType
  label: string
  path: string
}

interface NavSection {
  heading?: string
  items: NavItem[]
}

function useNavSections(role: string | undefined, t: (k: string) => string): NavSection[] {
  return useMemo(() => {
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
      { icon: Megaphone, label: 'Anúncios', path: '/announcements' },
      { icon: Bell, label: t('nav.notifications'), path: '/notifications' },
      { icon: Info, label: t('nav.about'), path: '/about' },
      { icon: Settings, label: t('nav.settings'), path: '/settings' },
    ]

    if (role === 'admin') {
      return [
        { items: [{ icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' }] },
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
            { icon: Megaphone, label: 'Anúncios', path: '/announcements' },
            { icon: Info, label: t('nav.about'), path: '/about' },
          ],
        },
        {
          heading: 'Conta',
          items: [{ icon: Settings, label: t('nav.settings'), path: '/settings' }],
        },
      ]
    }

    return [
      { items: core },
      { heading: 'Comunidade', items: community },
      { heading: 'Crescimento', items: growth },
      { heading: 'Suporte', items: support },
    ]
  }, [role, t])
}

function useBottomTabs(role: string | undefined, t: (k: string) => string) {
  return useMemo(() => {
    if (role === 'admin') {
      return [
        { icon: Home, label: 'Início', path: '/home' },
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: Radio, label: 'Ao Vivo', path: '/live' },
        { icon: MessageCircle, label: 'Comunidade', path: '/community' },
      ]
    }

    if (role === 'guest') {
      return [
        { icon: Home, label: 'Início', path: '/home' },
        { icon: Radio, label: 'Ao Vivo', path: '/live' },
        { icon: Info, label: 'Sobre', path: '/about' },
      ]
    }

    return [
      { icon: Home, label: 'Início', path: '/home' },
      { icon: Radio, label: 'Ao Vivo', path: '/live' },
      { icon: MessageCircle, label: 'Comunidade', path: '/community' },
      { icon: Heart, label: 'Oração', path: '/prayer' },
    ]
  }, [role, t])
}

const Layout = ({ children, title }: LayoutProps) => {
  const { user } = useAuth()
  const { t } = useAppStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)

  const navSections = useNavSections(user?.role, t)
  const bottomTabs = useBottomTabs(user?.role, t)

  const handleLogout = async () => {
    await authService.signOut()
    navigate('/auth')
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-[#0A2E4A]/20 selection:text-foreground">
      <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-border/50 bg-card/90 backdrop-blur-xl supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex h-full max-w-[1800px] items-center justify-between gap-3 px-3 sm:px-4 lg:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/home"
              className="flex-shrink-0 rounded-md transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-primary"
              aria-label="KAIRÓS – Início"
            >
              <Logo size="sm" showText={true} />
            </Link>

            <div className="hidden min-w-0 md:block">
              <p className="truncate text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground/80">
                {user?.role === 'admin' ? 'Administração' : user?.role === 'guest' ? 'Convidado' : 'Membro'}
              </p>
            </div>
          </div>

          <div className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 md:block">
            <h1 className="pointer-events-none max-w-xs truncate text-sm font-semibold text-foreground/80">
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            {user?.role !== 'guest' && <NotificationBell />}

            <div className="ml-1 flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-2 py-1.5">
              <div className="hidden text-right sm:block">
                <div className="max-w-[110px] truncate text-xs font-semibold leading-tight text-foreground">
                  {user?.username}
                </div>
                <div className="text-[10px] capitalize leading-tight text-muted-foreground">
                  {user?.role === 'admin' ? 'Administrador' : user?.role === 'guest' ? 'Convidado' : 'Membro'}
                </div>
              </div>

              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="h-7 w-7 flex-shrink-0 rounded-full border border-border object-cover"
                />
              ) : (
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#0A2E4A] text-xs font-bold text-white">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <aside
        className="fixed left-0 top-16 bottom-0 z-40 hidden w-64 flex-col border-r border-border/50 bg-card/95 backdrop-blur-xl lg:flex"
        aria-label="Navegação principal"
      >
        <nav className="flex-1 space-y-4 overflow-y-auto p-3 pb-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {navSections.map((section, sectionIndex) => (
            <div key={`${section.heading || 'section'}-${sectionIndex}`}>
              {section.heading && (
                <div className="px-3 pb-2 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground/65">
                    {section.heading}
                  </span>
                </div>
              )}

              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = isActive(item.path)
                  const Icon = item.icon

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={[
                        'group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-primary',
                        active
                          ? 'bg-[#0A2E4A] text-white shadow-[0_12px_30px_rgba(10,46,74,0.25)]'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      ].join(' ')}
                      aria-current={active ? 'page' : undefined}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                      <span className="truncate text-[13px]">{item.label}</span>
                    </Link>
                  )
                })}
              </div>

              {sectionIndex < navSections.length - 1 && (
                <div className="mt-4 border-t border-border/50" aria-hidden="true" />
              )}
            </div>
          ))}
        </nav>

        <div className="border-t border-border/50 p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-red-500 transition-all hover:bg-red-500/5 hover:text-red-400 focus-visible:outline-2 focus-visible:outline-red-500"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      <main className="min-h-screen pb-20 pt-16 lg:pb-0 lg:pl-64">
        {children}
        <Footer />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border/50 bg-card/95 backdrop-blur-xl lg:hidden"
        aria-label="Navegação rápida"
      >
        <div className="flex h-16 items-stretch">
          {bottomTabs.map((tab) => {
            const active = isActive(tab.path)
            const Icon = tab.icon

            return (
              <Link
                key={tab.path}
                to={tab.path}
                onClick={() => setMoreMenuOpen(false)}
                className={[
                  'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-primary',
                  active ? 'text-[#0A2E4A] dark:text-[#7bbdd4]' : 'text-muted-foreground hover:text-foreground',
                ].join(' ')}
                aria-current={active ? 'page' : undefined}
              >
                <div
                  className={[
                    'rounded-lg p-1.5 transition-colors',
                    active ? 'bg-[#0A2E4A]/10 dark:bg-[#4A90A4]/20' : '',
                  ].join(' ')}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <span className="max-w-full truncate text-[10px] font-semibold leading-none">{tab.label}</span>
              </Link>
            )
          })}

          <button
            onClick={() => setMoreMenuOpen((prev) => !prev)}
            className={[
              'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 transition-colors duration-150',
              moreMenuOpen ? 'text-[#0A2E4A] dark:text-[#7bbdd4]' : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}
            aria-label="Mais opções"
            aria-expanded={moreMenuOpen}
          >
            <div
              className={[
                'rounded-lg p-1.5 transition-colors',
                moreMenuOpen ? 'bg-[#0A2E4A]/10 dark:bg-[#4A90A4]/20' : '',
              ].join(' ')}
            >
              <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="text-[10px] font-semibold leading-none">Mais</span>
          </button>
        </div>
      </nav>

      {moreMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMoreMenuOpen(false)}
            aria-hidden="true"
          />

          <div className="fixed inset-x-0 bottom-16 z-50 max-h-[62vh] overflow-y-auto rounded-t-2xl border-t border-border/50 bg-card shadow-[0_-14px_40px_rgba(0,0,0,0.16)] lg:hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="p-2 space-y-4">
              <div className="flex items-center justify-between px-3 pt-2">
                <h2 className="text-sm font-semibold text-foreground">Mais opções</h2>
                <button
                  onClick={() => setMoreMenuOpen(false)}
                  className="rounded-lg p-1.5 transition-colors hover:bg-muted"
                  aria-label="Fechar menu"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              {navSections.map((section, sectionIndex) => (
                <div key={`mobile-${section.heading || 'section'}-${sectionIndex}`}>
                  {section.heading && (
                    <div className="px-3 pb-1 pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/65">
                        {section.heading}
                      </span>
                    </div>
                  )}

                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const active = isActive(item.path)
                      const Icon = item.icon

                      return (
                        <Link
                          key={`${item.path}-mobile`}
                          to={item.path}
                          onClick={() => setMoreMenuOpen(false)}
                          className={[
                            'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-primary',
                            active
                              ? 'bg-[#0A2E4A] text-white shadow-[0_12px_30px_rgba(10,46,74,0.25)]'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                          ].join(' ')}
                          aria-current={active ? 'page' : undefined}
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                          <span className="truncate text-[13px]">{item.label}</span>
                          {active && <ChevronRight className="ml-auto h-4 w-4" aria-hidden="true" />}
                        </Link>
                      )
                    })}
                  </div>

                  {sectionIndex < navSections.length - 1 && (
                    <div className="mt-3 border-t border-border/40" aria-hidden="true" />
                  )}
                </div>
              ))}

              <div className="border-t border-border/40 px-2 pb-4 pt-3">
                <button
                  onClick={() => {
                    setMoreMenuOpen(false)
                    void handleLogout()
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/5 hover:text-red-400"
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
