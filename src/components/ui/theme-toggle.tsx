import { useEffect, useMemo, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { authService } from '../../lib/authService'

export const ThemeToggle = () => {
  const { user, updateUser } = useAuthStore()

  // Tema inicial: prioriza user.themeMode, depois localStorage, depois media query
  const initialTheme = useMemo<'light' | 'dark'>(() => {
    if (user?.themeMode === 'light' || user?.themeMode === 'dark') return user.themeMode
    const stored = typeof window !== 'undefined' ? localStorage.getItem('theme') : null
    if (stored === 'light' || stored === 'dark') return stored
    const prefersDark =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
    return prefersDark ? 'dark' : 'light'
  }, [user?.themeMode])

  const [theme, setTheme] = useState<'light' | 'dark'>(initialTheme)

  // ✅ Aplica sempre uma única classe global no <html> e persiste
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark') // limpa qualquer estado anterior
    root.classList.add(theme)              // aplica 'light' ou 'dark'
    localStorage.setItem('theme', theme)
  }, [theme])

  // Mantém estado em sincronia com mudanças do usuário (login/logout/atualização)
  useEffect(() => {
    if (user?.themeMode && user.themeMode !== theme) {
      setTheme(user.themeMode)
    }
  }, [user?.themeMode])

  const toggleTheme = async () => {
    const newTheme: 'light' | 'dark' = theme === 'light' ? 'dark' : 'light'

    if (user) {
      try {
        await authService.updateProfile({ themeMode: newTheme })
        updateUser({ themeMode: newTheme })
      } catch (error) {
        console.error('Failed to save theme preference:', error)
      }
    }
    setTheme(newTheme) // estado dispara o efeito global
  }

  return (
    <button
      onClick={toggleTheme}
      className="group relative h-11 w-20 rounded-full p-1 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50 bg-gradient-to-br from-secondary/20 to-accent/20 hover:from-secondary/30 hover:to-accent/30 border-2 border-border hover:border-primary/30"
      aria-label="Toggle theme"
    >
      {/* Track */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-secondary/10 to-accent/10" />
      
      {/* Slider */}
      <div
        className={`relative h-8 w-8 rounded-full shadow-lg transition-all duration-500 ease-out transform ${
          theme === 'dark'
            ? 'translate-x-9 bg-gradient-to-br from-[#4A90A4] to-[#5BA3B8]'
            : 'translate-x-0 bg-gradient-to-br from-[#D4A574] to-[#C89860]'
        }`}
      >
        {/* Sun Icon */}
        <Sun
          className={`absolute inset-0 m-auto h-5 w-5 transition-all duration-500 ${
            theme === 'light'
              ? 'rotate-0 scale-100 opacity-100 text-white drop-shadow-md'
              : 'rotate-180 scale-0 opacity-0'
          }`}
        />
        
        {/* Moon Icon */}
        <Moon
          className={`absolute inset-0 m-auto h-5 w-5 transition-all duration-500 ${
            theme === 'dark'
              ? 'rotate-0 scale-100 opacity-100 text-white drop-shadow-md'
              : '-rotate-180 scale-0 opacity-0'
          }`}
        />
      </div>

      {/* Glow effect on hover */}
      <div
        className={`absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
          theme === 'dark' ? 'bg-[#4A90A4]/20' : 'bg-[#D4A574]/20'
        } blur-md -z-10`}
      />
    </button>
  )
}