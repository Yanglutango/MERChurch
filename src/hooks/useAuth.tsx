import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { AuthUser } from '../types'
import type { User } from '@supabase/supabase-js'

// Substituir mapSupabaseUser inteira:
async function fetchAndMapUser(userId: string, supabaseUser: User): Promise<AuthUser> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, username, phone, avatar_url, theme_mode')
    .eq('id', userId)
    .single()

  return {
    id: supabaseUser.id,
    email: supabaseUser.email!,
    username: profile?.username || supabaseUser.user_metadata?.username || supabaseUser.email!.split('@')[0],
    avatar: profile?.avatar_url || supabaseUser.user_metadata?.avatar_url,
    role: profile?.role || 'member',   // ← fonte de verdade é o banco, não user_metadata
    phone: profile?.phone || supabaseUser.user_metadata?.phone,
    themeMode: profile?.theme_mode || supabaseUser.user_metadata?.theme_mode || 'system',
  }
}
export const useAuth = () => {
  const { user, loading, login, logout, setLoading } = useAuthStore()

  useEffect(() => {
    let mounted = true

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted && session?.user) {
        fetchAndMapUser(session.user.id, session.user).then(mapped => {
  if (mounted) { login(mapped); setLoading(false) }
    })

    // Listen to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      if (event === 'SIGNED_IN' && session?.user) {
        fetchAndMapUser(session.user.id, session.user).then(mapped => {
  if (mounted) login(mapped)
})
      } else if (event === 'SIGNED_OUT') {
        logout()
        setLoading(false)
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        fetchAndMapUser(session.user.id, session.user).then(mapped => {
  if (mounted) login(mapped)
})
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [login, logout, setLoading])

  return { user, loading, logout }
}
