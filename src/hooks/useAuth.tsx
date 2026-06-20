import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { AuthUser } from '../types'
import type { User } from '@supabase/supabase-js'

async function fetchAndMapUser(userId: string, supabaseUser: User): Promise<AuthUser> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, username, phone, avatar_url, theme_mode')
    .eq('id', userId)
    .single()

  return {
    id: supabaseUser.id,
    email: supabaseUser.email!,
    username:
      profile?.username ||
      supabaseUser.user_metadata?.username ||
      supabaseUser.email!.split('@')[0],
    avatar: profile?.avatar_url || supabaseUser.user_metadata?.avatar_url,
    role: profile?.role || 'member',
    phone: profile?.phone || supabaseUser.user_metadata?.phone,
    themeMode:
      profile?.theme_mode ||
      supabaseUser.user_metadata?.theme_mode ||
      'system',
  }
}

export const useAuth = () => {
  const { user, loading, login, logout, setLoading } = useAuthStore()

  useEffect(() => {
    let mounted = true

    // Safety #1: Check existing session (page refresh)
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return

        if (session?.user) {
          fetchAndMapUser(session.user.id, session.user)
            .then(mapped => {
              if (mounted) {
                login(mapped)
              }
            })
            .catch(() => {
              // Fallback para não travar o app caso a tabela de perfis falhe
              if (mounted) {
                login({
                  id: session.user.id,
                  email: session.user.email!,
                  username: session.user.user_metadata?.username || session.user.email!.split('@')[0],
                  avatar: session.user.user_metadata?.avatar_url,
                  role: 'member',
                  phone: session.user.user_metadata?.phone,
                  themeMode: 'system',
                })
              }
            })
            .finally(() => {
              if (mounted) setLoading(false)
            })
        } else {
          setLoading(false)
        }
      })
      .catch(() => {
        if (mounted) setLoading(false)
      })

    // Safety #2: Listen to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        // Evita re-buscar se os dados essenciais da sessão atual já forem idênticos aos salvos
        if (user?.id === session.user.id && event === 'SIGNED_IN') {
          setLoading(false)
          return
        }

        fetchAndMapUser(session.user.id, session.user).then(mapped => {
          if (mounted) {
            login(mapped)
            setLoading(false)
          }
        }).catch(() => {
          if (mounted) setLoading(false)
        })
      } else if (event === 'SIGNED_OUT') {
        logout()
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [login, logout, setLoading, user?.id])

  return { user, loading, logout }
}
