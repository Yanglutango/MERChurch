import { useEffect, useMemo, useState } from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { authService } from '../../lib/authService'
import { supabase } from '../../lib/supabase'

type ThemeMode = 'light' | 'dark' | 'system'
type ActiveTheme = 'light' | 'dark'

export const ThemeToggle = () => {
  const { user, updateUser } = useAuthStore()

  // Determina o tema ativo baseado na preferência do usuário ou localStorage
  const getInitialThemeMode = (): ThemeMode => {
    if (user?.themeMode) return user.themeMode
    const stored = localStorage.getItem('theme') as ThemeMode
    if (stored && ['light', 'dark', 'system'].includes(stored)) return stored
    return 'system'
  }

  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialThemeMode)

  // Converte 'system' para 'light' ou 'dark' baseado na preferência do SO
  const resolveTheme = (mode: ThemeMode): ActiveTheme => {
    if (mode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return mode
  }

  const [activeTheme, setActiveTheme] = useState<ActiveTheme>(() => resolveTheme(themeMode))

  // ✅ Aplica o tema no DOM sempre que activeTheme muda
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(activeTheme)
    localStorage.setItem('theme', themeMode)
  }, [activeTheme, themeMode])

  // ✅ Sincroniza com mudanças de preferência do usuário
  useEffect(() => {
    if (user?.themeMode && user.themeMode !== themeMode) {
      setThemeMode(user.themeMode)
      setActiveTheme(resolveTheme(user.themeMode))
    }
  }, [user?.themeMode])

  // ✅ Ouve mudanças de preferência do sistema quando mode é 'system'
  useEffect(() => {
    if (themeMode !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      setActiveTheme(e.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [themeMode])

  const toggleTheme = async () => {
    const nextMode: ThemeMode = themeMode === 'light' ? 'dark' : themeMode === 'dark' ? 'system' : 'light'
    const nextActive = resolveTheme(nextMode)

    if (user) {
      try {
        const { error } = await supabase
          .from('user_profiles')
          .update({ theme_mode: nextMode })
          .eq('id', user.id)

        if (error) throw error

        await authService.updateProfile({ themeMode: nextMode })
        updateUser({ themeMode: nextMode })
      } catch (error) {
        console.error('Failed to save theme preference:', error)
      }
    }

    setThemeMode(nextMode)
    setActiveTheme(nextActive)
  }

  const getIcon = () => {
    if (themeMode === 'light') return Sun
    if (themeMode === 'dark') return Moon
    return Monitor
  }

  const Icon = getIcon()

  return (
    <button
      onClick={toggleTheme}
      className="group relative p-2.5 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50 bg-gradient-to-br from-secondary/20 to-accent/20 hover:from-secondary/30 hover:to-accent/30 border-2 border-border hover:border-primary/30"
      aria-label={`Theme: ${themeMode}`}
      title={`Tema: ${themeMode === 'light' ? 'Claro' : themeMode === 'dark' ? 'Escuro' : 'Sistema'}`}
    >
      <div className="relative">
        <Icon className="h-5 w-5 text-foreground transition-transform duration-300 group-hover:scale-110" />
        
        {/* Glow effect */}
        <div
          className={`absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
            activeTheme === 'dark' ? 'bg-[#4A90A4]/30' : 'bg-[#D4A574]/30'
          } blur-lg -z-10`}
        />
      </div>
    </button>
  )
}