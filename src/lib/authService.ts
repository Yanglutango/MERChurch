import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'
import { AuthUser } from '../types'

// Chave usada para guardar temporariamente o role escolhido no formulário
// antes de um redireccionamento OAuth. O signInWithOAuth do supabase-js não
// tem (nunca teve) um campo `data`/`options.data` para gravar user_metadata
// — isso só existe em signUp/updateUser. Guardamos aqui para o callback do
// OAuth (em useAuth.tsx, ou onde o evento SIGNED_IN é tratado) poder ler
// este valor e decidir se deve persistir o role em user_profiles.
const PENDING_OAUTH_ROLE_KEY = 'kairos_pending_oauth_role'

class AuthService {
  private async verifyAdminKey(adminKey: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke('verify-admin-key', {
      body: { keyAttempt: adminKey },
    })
    if (error) throw new Error('Erro ao verificar chave de administrador')
    if (!data?.valid) throw new Error('Chave de administrador inválida')
  }

  // Lê o role de user_profiles — a única fonte de verdade real da
  // plataforma (estabelecido na auditoria de segurança do projecto).
  // Nunca confiar em user_metadata.role para decisões de acesso: é editável
  // pelo próprio utilizador através de supabase.auth.updateUser() no
  // cliente, e pode ficar desincronizado se o role for alterado
  // directamente na tabela por um administrador.
  private async getRealRole(userId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (error || !data) return null
    return data.role
  }

  mapUser(user: User, realRole?: string | null): AuthUser {
    return {
      id: user.id,
      email: user.email!,
      username: user.user_metadata?.username || user.user_metadata?.full_name || user.email!.split('@')[0],
      avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture,
      // Corrigido: antes era uma string fixa 'member', sempre, independente
      // do role real do utilizador — a raiz do bug "admin perde privilégio
      // após login" identificado na auditoria. Agora aceita o role real
      // (vindo de user_profiles, via getRealRole) como parâmetro explícito,
      // com 'member' apenas como fallback de segurança caso não seja
      // fornecido ou a consulta falhe.
      role: (realRole as any) || 'member',
      phone: user.user_metadata?.phone,
      congregation: user.user_metadata?.congregation,
      themeMode: user.user_metadata?.theme_mode || 'system',
      accentColor: user.user_metadata?.accent_color || '#4A90A4',
    }
  }

  async sendOtp(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    if (error) throw error
  }

  async verifyOtpAndRegister(
    email: string,
    token: string,
    password: string,
    username: string,
    phone: string,
    role: 'member' | 'admin' | 'guest',
    adminKey?: string,
    congregation?: string
  ) {
    if (role === 'admin') {
      if (!adminKey) throw new Error('Chave de administrador obrigatória')
      await this.verifyAdminKey(adminKey)
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })
    if (error) throw error

    const userData: any = { username, phone, role }
    if (role === 'guest' && congregation) {
      userData.congregation = congregation
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: userData,
    })
    if (updateError) throw updateError

    const profileData: any = { username, phone, role }
    if (role === 'guest' && congregation) {
      profileData.congregation = congregation
    }

    const { error: profileError } = await supabase
      .from('user_profiles')
      .update(profileData)
      .eq('id', data.user!.id)

    if (profileError) throw profileError

    return data.user
  }

  async signInWithPassword(identifier: string, password: string, role: 'member' | 'admin' | 'guest', adminKey?: string) {
    if (role === 'admin') {
      if (!adminKey) throw new Error('Chave de administrador obrigatória')
      await this.verifyAdminKey(adminKey)
    }

    const isEmail = identifier.includes('@')
    let email = identifier

    if (!isEmail) {
      // Corrigido: a versão anterior interpolava `identifier` directamente
      // dentro de uma única string de filtro .or('username.eq.X,phone.eq.X'),
      // sem qualquer sanitização — risco de injecção na sintaxe de filtro do
      // PostgREST (vírgulas e parênteses têm significado próprio nesse
      // formato). Também usava .single(), que rebenta com um erro genérico
      // se, por coincidência, um username e um phone de utilizadores
      // diferentes colidirem. Agora faz duas consultas separadas e seguras,
      // com .maybeSingle(), que nunca lança excepção por ambiguidade.
      const [byUsername, byPhone] = await Promise.all([
        supabase.from('user_profiles').select('email').eq('username', identifier).maybeSingle(),
        supabase.from('user_profiles').select('email').eq('phone', identifier).maybeSingle(),
      ])

      const profile = byUsername.data || byPhone.data
      if (!profile?.email) {
        throw new Error('Usuário não encontrado')
      }
      email = profile.email
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    // Corrigido: a verificação de role usava user_metadata.role, uma fonte
    // que pode desincronizar da tabela user_profiles (fonte de verdade real
    // da plataforma) se o role for alterado por outro caminho que não
    // updateUser(). Agora lê o role real da tabela antes de decidir.
    const realRole = await this.getRealRole(data.user!.id)
    if (realRole !== role) {
      await supabase.auth.signOut()
      throw new Error('Tipo de conta incorreto')
    }

    return data.user
  }

  async signInWithOAuth(provider: 'google' | 'apple' | 'facebook', role: 'member' | 'admin' | 'guest', adminKey?: string) {
    if (role === 'admin') {
      if (!adminKey) throw new Error('Chave de administrador obrigatória')
      await this.verifyAdminKey(adminKey)
    }

    // Corrigido: `options.data` não existe na assinatura de signInWithOAuth
    // do supabase-js — nunca existiu. O role escolhido na UI estava a ser
    // descartado em silêncio pelo SDK, sem erro nenhum, dando a falsa
    // impressão de que estava a funcionar. Guardamos o role pretendido em
    // sessionStorage antes do redireccionamento; depois do callback OAuth
    // (tratado onde o evento SIGNED_IN é ouvido — provavelmente
    // useAuth.tsx), essa página deve ler PENDING_OAUTH_ROLE_KEY e persistir
    // o valor em user_profiles antes de limpar a chave. Não escrevo esse
    // lado da integração aqui por não ter visibilidade do ficheiro —
    // partilha o useAuth.tsx e fechamos esse elo com precisão.
    try {
      sessionStorage.setItem(PENDING_OAUTH_ROLE_KEY, role)
    } catch {
      // sem sessionStorage disponível (modo privado) — o callback deve
      // tratar a ausência da chave como "usar o role por omissão da tabela"
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        skipBrowserRedirect: false,
      },
    })

    if (error) throw error
  }

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  async updateProfile(updates: { username?: string; phone?: string; themeMode?: string; accentColor?: string }) {
    const { data, error } = await supabase.auth.updateUser({ data: updates })
    if (error) throw error

    const { error: profileError } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', data.user!.id)

    if (profileError) throw profileError

    return data.user
  }
}

export const authService = new AuthService()
