import { useEffect, useRef, useState } from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

type ThemeMode = 'light' | 'dark' | 'system'
type ActiveTheme = 'light' | 'dark'

const resolveTheme = (mode: ThemeMode): ActiveTheme =>
  mode === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    : mode

const applyThemeToDom = (mode: ThemeMode) => {
  const active = resolveTheme(mode)
  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.classList.add(active)
  localStorage.setItem('theme', mode)
}

export const ThemeToggle = () => {
  const { user, updateUser } = useAuthStore()
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const getInitial = (): ThemeMode => {
    if (user?.themeMode) return user.themeMode
    const stored = localStorage.getItem('theme') as ThemeMode
    return stored && ['light', 'dark', 'system'].includes(stored) ? stored : 'system'
  }

  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitial)

  // Sync system preference listener
  useEffect(() => {
    if (themeMode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyThemeToDom('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [themeMode])

  // Sync from user store
  useEffect(() => {
    if (user?.themeMode && user.themeMode !== themeMode) {
      setThemeMode(user.themeMode)
      applyThemeToDom(user.themeMode)
    }
  }, [user?.themeMode])

  const toggleTheme = () => {
    const next: ThemeMode =
      themeMode === 'light' ? 'dark' : themeMode === 'dark' ? 'system' : 'light'

    // 1. Apply immediately to DOM + localStorage
    applyThemeToDom(next)
    setThemeMode(next)
    updateUser({ themeMode: next })

    // 2. Debounce Supabase save — only last click within 2s is persisted
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      if (!user) return
      try {
        await supabase
          .from('user_profiles')
          .update({ theme_mode: next })
          .eq('id', user.id)
      } catch (err) {
        console.error('[ThemeToggle] Failed to persist theme:', err)
      }
    }, 2000)
  }

  const Icon = themeMode === 'light' ? Sun : themeMode === 'dark' ? Moon : Monitor
  const label = themeMode === 'light' ? 'Claro' : themeMode === 'dark' ? 'Escuro' : 'Sistema'

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
      aria-label={`Tema: ${label}`}
      title={`Tema: ${label}`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  )
}
