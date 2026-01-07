import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'
import { AuthUser } from '../types'

class AuthService {
  mapUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email!,
      username: user.user_metadata?.username || user.user_metadata?.full_name || user.email!.split('@')[0],
      avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture,
      role: user.user_metadata?.role || 'member',
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
    // Verify admin key if role is admin
    if (role === 'admin' && adminKey !== '1989-2000-2026') {
      throw new Error('Chave de administrador inválida')
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

    // Update user_profiles
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
    // Verify admin key if role is admin
    if (role === 'admin' && adminKey !== '1989-2000-2026') {
      throw new Error('Chave de administrador inválida')
    }

    // Check if identifier is email or username/phone
    const isEmail = identifier.includes('@')
    
    let email = identifier
    
    if (!isEmail) {
      // Query user_profiles to get email from username or phone
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('email')
        .or(`username.eq.${identifier},phone.eq.${identifier}`)
        .single()

      if (profileError || !profiles) {
        throw new Error('Usuário não encontrado')
      }
      
      email = profiles.email
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error

    // Verify role matches
    if (data.user?.user_metadata?.role !== role) {
      await supabase.auth.signOut()
      throw new Error('Tipo de conta incorreto')
    }

    return data.user
  }

  async signInWithOAuth(provider: 'google' | 'apple' | 'facebook', role: 'member' | 'admin' | 'guest', adminKey?: string) {
    // Verify admin key if role is admin
    if (role === 'admin' && adminKey !== '1989-2000-2026') {
      throw new Error('Chave de administrador inválida')
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
        data: {
          role,
        },
      },
    })

    if (error) throw error
  }

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  async updateProfile(updates: { username?: string; phone?: string; themeMode?: string; accentColor?: string }) {
    const { data, error } = await supabase.auth.updateUser({
      data: updates,
    })
    if (error) throw error

    // Also update user_profiles table
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', data.user!.id)

    if (profileError) throw profileError

    return data.user
  }
}

export const authService = new AuthService()
