import { Link, useLocation } from 'react-router-dom'
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
  Menu,
  X,
  Languages,
  Coins,
} from 'lucide-react'
import { useState } from 'react'
import { authService } from '../../lib/authService'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../stores/appStore'
import { Logo } from '../ui/logo'
import { ThemeToggle } from '../ui/theme-toggle'
import { Button } from '../ui/button'
import Footer from './Footer'

interface LayoutProps {
  children: React.ReactNode
  title: string
}

const Layout = ({ children, title }: LayoutProps) => {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { language, currency, setLanguage, setCurrency, t } = useAppStore()
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false)

  const menuItems = [
    { icon: Home, label: t('nav.home'), path: '/home' },
    { icon: Radio, label: t('nav.live'), path: '/live' },
    { icon: BookOpen, label: t('nav.sermons'), path: '/sermons' },
    { icon: Calendar, label: t('nav.agenda'), path: '/agenda' },
    { icon: Bell, label: t('nav.notifications'), path: '/notifications' },
    { icon: Sparkles, label: t('nav.ai'), path: '/ai' },
    { icon: Users, label: t('nav.ministries'), path: '/ministries' },
    { icon: GraduationCap, label: t('nav.academy'), path: '/academy' },
    { icon: MessageCircle, label: t('nav.community'), path: '/community' },
    { icon: DollarSign, label: t('nav.treasury'), path: '/treasury' },
    { icon: Heart, label: t('nav.prayer'), path: '/prayer' },
    { icon: HeadphonesIcon, label: t('nav.counseling'), path: '/counseling' },
    { icon: Info, label: t('nav.about'), path: '/about' },
    { icon: Settings, label: t('nav.settings'), path: '/settings' },
  ]

  // Add Dashboard for admins
  if (user?.role === 'admin') {
    menuItems.unshift({ icon: LayoutDashboard, label: t('nav.dashboard'), path: '/dashboard' })
  }

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

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
            >
              {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            
            <Logo size="md" showText={true} />
          </div>

          <h1 className="text-xl font-bold text-foreground hidden md:block">{title}</h1>

          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Language Selector */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                title={t('common.language')}
              >
                <Languages className="h-5 w-5" />
              </button>
              {showLangMenu && (
                <div className="absolute top-full right-0 mt-2 bg-card border border-border rounded-xl shadow-lg py-2 min-w-[160px] z-50">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code as any)
                        setShowLangMenu(false)
                      }}
                      className={`w-full px-4 py-2 text-left hover:bg-muted transition-colors flex items-center gap-2 ${
                        language === lang.code ? 'text-primary font-semibold bg-primary/10' : ''
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span className="text-sm">{lang.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Currency Selector */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setShowCurrencyMenu(!setShowCurrencyMenu)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                title={t('common.currency')}
              >
                <Coins className="h-5 w-5" />
              </button>
              {showCurrencyMenu && (
                <div className="absolute top-full right-0 mt-2 bg-card border border-border rounded-xl shadow-lg py-2 min-w-[140px] z-50">
                  {currencies.map((curr) => (
                    <button
                      key={curr.code}
                      onClick={() => {
                        setCurrency(curr.code as any)
                        setShowCurrencyMenu(false)
                      }}
                      className={`w-full px-4 py-2 text-left hover:bg-muted transition-colors ${
                        currency === curr.code ? 'text-primary font-semibold bg-primary/10' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">{curr.symbol}</span>
                        <span className="text-sm">{curr.code}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-foreground">{user?.username}</div>
              <div className="text-xs text-muted-foreground capitalize">{user?.role}</div>
            </div>
            {user?.avatar ? (
              <img src={user.avatar} alt={user.username} className="h-10 w-10 rounded-full border-2 border-primary object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold shadow-md">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed top-16 left-0 bottom-0 w-72 bg-card border-r border-border z-40 transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 overflow-y-auto`}
      >
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg scale-105'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted hover:scale-105'
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-all hover:scale-105 mt-4"
          >
            <LogOut className="h-5 w-5" />
            {t('nav.logout')}
          </button>
        </nav>
      </aside>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
        />
      )}

      {/* Main Content */}
      <main className="pt-16 lg:pl-72 min-h-screen">
        <div className="p-4 md:p-8">{children}</div>
        <Footer />
      </main>
    </div>
  )
}

export default Layout
