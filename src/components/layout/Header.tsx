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
    { label: t('nav.treasury'), href: '#donations' },
    { label: 'Contato', href: '#contact' },
  ]

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-background/95 backdrop-blur-md shadow-lg border-b border-border'
          : 'bg-transparent'
      }`}
    >
      <div className="container-custom">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <a href="#home" className="group">
            <Logo size="md" showText={true} animated={false} />
          </a>

          {/* Desktop Menu */}
          <nav className="hidden lg:flex items-center gap-1">
            {menuItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="px-4 py-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors relative group"
              >
                {item.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-primary group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* CTA Button */}
            <div className="hidden lg:block">
              <Button className="gradient-primary text-white font-semibold shadow-lg hover:shadow-xl transition-shadow">
                Seja Membro
              </Button>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-foreground hover:text-primary transition-colors"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden pb-6 animate-fade-in-up">
            <nav className="flex flex-col gap-2">
              {menuItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-4 py-3 text-sm font-medium text-foreground/80 hover:text-primary hover:bg-muted rounded-lg transition-all"
                >
                  {item.label}
                </a>
              ))}
              <Button className="gradient-primary text-white font-semibold mt-2">
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
