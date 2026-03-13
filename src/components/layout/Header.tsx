import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Menu, X, Shield, LogOut, Settings as SettingsIcon, UserPlus } from 'lucide-react'
import { Button } from '../ui/button'
import { Logo } from '../ui/logo'
import { ThemeToggle } from '../ui/theme-toggle'
import { NotificationBell } from './NotificationBell'
import { useAppStore } from '../../stores/appStore'
import { useAuth } from '../../hooks/useAuth'
import { authService } from '../../lib/authService'

const Header = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { t } = useAppStore()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const isGuest = user?.role === 'guest'
  const isMember = user?.role === 'member'
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Navegação contextual por papel
  const getMenuItems = () => {
    if (isGuest) {
      return [
        { label: t('nav.home'), path: '/home' },
        { label: t('nav.live'), path: '/live' },
        { label: 'Testemunhos', path: '/testimonies' },
        { label: 'Recursos', path: '/resources' },
        { label: t('nav.about'), path: '/about' },
      ]
    }

    if (isAdmin) {
      return [
        { label: t('nav.home'), path: '/home' },
        { label: t('nav.live'), path: '/live' },
        { label: t('nav.agenda'), path: '/agenda' },
        { label: t('nav.community'), path: '/community' },
        { label: t('nav.ministries'), path: '/ministries' },
        { label: 'Recursos', path: '/resources' },
      ]
    }

    // Member
    return [
      { label: t('nav.home'), path: '/home' },
      { label: t('nav.live'), path: '/live' },
      { label: t('nav.agenda'), path: '/agenda' },
      { label: t('nav.community'), path: '/community' },
      { label: t('nav.ministries'), path: '/ministries' },
      { label: 'Recursos', path: '/resources' },
    ]
  }

  const menuItems = getMenuItems()

  const handleLogout = async () => {
    await authService.signOut()
    navigate('/auth')
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-background/98 backdrop-blur-xl border-b border-border shadow-md elevation-1'
          : 'bg-background/95 backdrop-blur-sm border-b border-border/30'
      }`}
    >
      <div className="container-custom">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button onClick={() => navigate('/home')} className="flex-shrink-0 transition-opacity hover:opacity-80">
            <Logo size="md" showText={true} animated={false} />
          </button>

          {/* Desktop Menu */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`px-3.5 py-2 text-sm font-semibold transition-all rounded-lg ${
                  isActive(item.path)
                    ? 'text-primary bg-primary/10'
                    : 'text-foreground/70 hover:text-foreground hover:bg-muted/70'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {/* Guest CTAs */}
            {isGuest && (
              <>
                <Button 
                  onClick={() => navigate('/auth')} 
                  size="sm" 
                  className="gradient-primary text-white font-semibold"
                >
                  Entrar
                </Button>
              </>
            )}

            {/* Member/Admin Actions */}
            {(isMember || isAdmin) && (
              <>
                {/* Notifications */}
                <NotificationBell />

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  >
                    {user?.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt={user.username} 
                        className="h-9 w-9 rounded-full border-2 border-primary/50 object-cover" 
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm font-bold shadow-md">
                        {user?.username?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {isAdmin && (
                      <span className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-accent/20 text-accent text-xs font-bold rounded-full border border-accent/30">
                        <Shield className="h-3 w-3" />
                        Admin
                      </span>
                    )}
                  </button>

                  {/* User Dropdown */}
                  {isUserMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-52 bg-card border border-border rounded-xl shadow-xl py-1.5 z-50 elevation-2">
                      <div className="px-3.5 py-2.5 border-b border-border/60">
                        <div className="font-semibold text-sm text-foreground truncate">{user?.username}</div>
                        <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                        {isAdmin && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Shield className="h-3 w-3 text-accent" />
                            <span className="text-xs text-accent font-semibold">Administrador</span>
                          </div>
                        )}
                      </div>

                      {isAdmin && (
                        <button
                          onClick={() => {
                            navigate('/dashboard')
                            setIsUserMenuOpen(false)
                          }}
                          className="w-full px-3.5 py-2 text-left hover:bg-muted/70 transition-colors flex items-center gap-2.5 text-sm font-medium text-foreground"
                        >
                          <Shield className="h-4 w-4 text-accent" />
                          Dashboard
                        </button>
                      )}

                      <button
                        onClick={() => {
                          navigate('/settings')
                          setIsUserMenuOpen(false)
                        }}
                        className="w-full px-3.5 py-2 text-left hover:bg-muted/70 transition-colors flex items-center gap-2.5 text-sm font-medium text-foreground"
                      >
                        <SettingsIcon className="h-4 w-4 text-muted-foreground" />
                        {t('nav.settings')}
                      </button>

                      <div className="border-t border-border/60 my-1" />

                      <button
                        onClick={handleLogout}
                        className="w-full px-3.5 py-2 text-left hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center gap-2.5 text-sm font-medium text-red-600 dark:text-red-400"
                      >
                        <LogOut className="h-4 w-4" />
                        {t('nav.logout')}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden pb-4 border-t border-border/50 mt-2 pt-4">
            <nav className="flex flex-col gap-1">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    navigate(item.path)
                    setIsMobileMenuOpen(false)
                  }}
                  className={`px-3 py-2.5 text-sm font-medium transition-all rounded-lg text-left ${
                    isActive(item.path)
                      ? 'text-primary bg-primary/10 font-bold'
                      : 'text-foreground/80 hover:text-foreground hover:bg-muted/80'
                  }`}
                >
                  {item.label}
                </button>
              ))}

              {isGuest && (
                <>
                  <div className="border-t border-border my-2" />
                  <Button 
                    onClick={() => {
                      navigate('/about')
                      setIsMobileMenuOpen(false)
                    }}
                    size="sm" 
                    variant="outline"
                    className="font-semibold"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Junte-se à Família
                  </Button>
                  <Button 
                    onClick={() => {
                      navigate('/auth')
                      setIsMobileMenuOpen(false)
                    }}
                    size="sm" 
                    className="gradient-primary text-white font-semibold"
                  >
                    Entrar
                  </Button>
                </>
              )}
            </nav>
          </div>
        )}
      </div>

      {/* Close user menu when clicking outside */}
      {isUserMenuOpen && (
        <div 
          onClick={() => setIsUserMenuOpen(false)} 
          className="fixed inset-0 z-40" 
        />
      )}
    </header>
  )
}

export default Header
