import { useEffect, useRef } from 'react'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { AuthUser } from '../types'
import type { User } from '@supabase/supabase-js'
import { toast } from 'sonner'

// Mesma chave usada em authService.signInWithOAuth — guarda temporariamente
// o role escolhido no formulário antes do redireccionamento OAuth, já que
// signInWithOAuth não tem (nunca teve) forma própria de gravar isso.
const PENDING_OAUTH_ROLE_KEY = 'kairos_pending_oauth_role'

async function fetchAndMapUser(userId: string, supabaseUser: User): Promise<AuthUser> {
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('role, username, phone, avatar_url, theme_mode')
    .eq('id', userId)
    .single()

  // Corrigido: o erro da query nunca era lido — qualquer falha (RLS, rede,
  // ou a linha ainda não existir no instante exacto de um login OAuth
  // recém-criado) ficava indistinguível de "utilizador sem perfil", sem
  // log nenhum. Agora fica registado, para ser diagnosticável em produção.
  if (error) {
    console.error('Erro ao buscar perfil do utilizador:', error)
  }

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

// Aplica o role escolhido antes de um redireccionamento OAuth — mas APENAS
// se ainda não existir nenhuma linha em user_profiles para este utilizador.
// Nunca sobrescreve um role já estabelecido: isso evitaria, por exemplo,
// que um administrador clicasse por hábito na aba "Membro" num dia e fosse
// silenciosamente despromovido. A chave é sempre limpa no final, para não
// vazar para uma sessão futura.
//
// AVISO: esta lógica assume que "não existe linha" é um sinal fiável de
// "conta acabada de criar". Se user_profiles for populada automaticamente
// por um trigger em auth.users, essa linha pode já existir (com role por
// omissão) antes deste código correr, e esta escrita nunca se efectiva.
// A confirmar com visibilidade do schema real.
async function maybeApplyPendingOAuthRole(userId: string) {
  let pendingRole: string | null = null
  try {
    pendingRole = sessionStorage.getItem(PENDING_OAUTH_ROLE_KEY)
  } catch {
    return
  }
  if (!pendingRole) return

  try {
    const { data: existing, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (!error && !existing) {
      const { error: insertError } = await supabase
        .from('user_profiles')
        .insert({ id: userId, role: pendingRole })

      if (insertError) {
        console.error('Erro ao aplicar role pendente de OAuth:', insertError)
      }
    }
  } finally {
    try { sessionStorage.removeItem(PENDING_OAUTH_ROLE_KEY) } catch { /* noop */ }
  }
}

export const useAuth = () => {
  const { user, loading, login, logout, setLoading } = useAuthStore()

  // Ref em vez de dependência do efeito: permite comparar "é o mesmo
  // utilizador que já tínhamos?" sem forçar o efeito inteiro (incluindo
  // getSession() e a subscrição) a desmontar e remontar sempre que o id
  // muda de undefined para um valor real — que era exactamente o que
  // acontecia antes, causando uma segunda busca redundante a user_profiles
  // em todo carregamento com sessão já existente.
  const currentUserIdRef = useRef<string | undefined>(user?.id)
  useEffect(() => {
    currentUserIdRef.current = user?.id
  }, [user?.id])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return

        if (session?.user) {
          fetchAndMapUser(session.user.id, session.user)
            .then(mapped => {
              if (mounted) login(mapped)
            })
            .catch((err) => {
              console.error('Falha ao carregar perfil na sessão existente:', err)
              if (mounted) {
                // Corrigido: antes caía silenciosamente para role:'member',
                // sem qualquer aviso — um administrador via uma versão
                // rebaixada da app sem saber porquê. Agora avisa
                // explicitamente que algo correu mal, em vez de fingir
                // que está tudo normal com permissões erradas.
                toast.error('Não foi possível confirmar o seu nível de acesso. Tente recarregar a página.')
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        // Guard lido via ref — compara o id actual sem depender dele no
        // array de dependências do efeito, que é precisamente o que
        // causava a reexecução indesejada.
        if (currentUserIdRef.current === session.user.id && event === 'SIGNED_IN') {
          setLoading(false)
          return
        }

        maybeApplyPendingOAuthRole(session.user.id)
          .catch((err) => console.error('Erro ao processar role pendente de OAuth:', err))
          .then(() => fetchAndMapUser(session.user.id, session.user))
          .then(mapped => {
            if (mounted) {
              login(mapped)
              setLoading(false)
            }
          })
          .catch((err) => {
            console.error('Falha ao carregar perfil após login:', err)
            if (mounted) {
              toast.error('Não foi possível confirmar o seu nível de acesso. Tente entrar novamente.')
              setLoading(false)
            }
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
    // Efeito corre uma única vez (montagem). login/logout/setLoading vêm do
    // Zustand e são referências estáveis entre renders — não precisam, e
    // não devem, disparar nova subscrição.
  }, [login, logout, setLoading])

  return { user, loading, logout }
}
