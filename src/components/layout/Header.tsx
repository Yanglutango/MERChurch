import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '../ui/button'
import { Logo } from '../ui/logo'
import { ThemeToggle } from '../ui/theme-toggle'
import { useAppStore } from '../../stores/appStore'

const Header = () => {
  const { t } = useAppStore()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const menuItems = [
    { label: t('nav.home'), href: '#home' },
    { label: t('nav.about'), href: '#about' },
    { label: t('nav.ministries'), href: '#services' },
    { label: t('nav.agenda'), href: '#events' },
    { label: t('nav.sermons'), href: '#sermons' },
    { label: 'Contato', href: '#contact' },
  ]

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-background/95 backdrop-blur-xl border-b border-border shadow-sm elevation-2'
          : 'bg-background/0'
      }`}
    >
      <div className="container-custom">
        <div className="flex items-center justify-between h-18 md:h-20">
          {/* Logo */}
          <a href="#home" className="flex-shrink-0 transition-opacity hover:opacity-80">
            <Logo size="md" showText={true} animated={false} />
          </a>

          {/* Desktop Menu */}
          <nav className="hidden lg:flex items-center gap-1">
            {menuItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="px-4 py-2 text-sm font-semibold text-foreground/75 hover:text-foreground transition-colors rounded-lg hover:bg-muted/60"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            {/* CTA Button */}
            <div className="hidden lg:block">
              <Button size="default" className="gradient-primary text-white font-semibold shadow-md hover:shadow-lg">
                Seja Membro
              </Button>
            </div>

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
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-3 py-2.5 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted/80 rounded-lg transition-colors"
                >
                  {item.label}
                </a>
              ))}
              <Button size="sm" className="gradient-primary text-white font-medium mt-2">
                Seja Membro
              </Button>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header
