import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { AuthUser } from '../types'
import type { User } from '@supabase/supabase-js'

function mapSupabaseUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email!,
    username: user.user_metadata?.username || user.user_metadata?.full_name || user.email!.split('@')[0],
    avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture,
    role: user.user_metadata?.role || 'member',
    phone: user.user_metadata?.phone,
    themeMode: user.user_metadata?.theme_mode || 'system',
    accentColor: user.user_metadata?.accent_color || '#4A90A4',
  }
}

export const useAuth = () => {
  const { user, loading, login, logout, setLoading } = useAuthStore()

  useEffect(() => {
    let mounted = true

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted && session?.user) {
        login(mapSupabaseUser(session.user))
      }
      if (mounted) setLoading(false)
    })

    // Listen to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      if (event === 'SIGNED_IN' && session?.user) {
        login(mapSupabaseUser(session.user))
        setLoading(false)
      } else if (event === 'SIGNED_OUT') {
        logout()
        setLoading(false)
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        login(mapSupabaseUser(session.user))
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [login, logout, setLoading])

  return { user, loading, logout }
}
