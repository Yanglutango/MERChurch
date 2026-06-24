import { useState, useEffect, useRef } from 'react'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Switch } from '../components/ui/switch'
import { useAuth } from '../hooks/useAuth'
import { useAuthStore } from '../stores/authStore'
import { useAppStore } from '../stores/appStore'
import { supabase } from '../lib/supabase'
import {
  Settings as SettingsIcon, User, Palette, Languages, Coins,
  Shield, Moon, Sun, Monitor, Upload, X, Bell, Lock, Eye, EyeOff, Save, CheckCircle2
} from 'lucide-react'
import { toast } from 'sonner'

type Tab = 'profile' | 'appearance' | 'notifications' | 'security'

const SettingsPage = () => {
  const { user } = useAuth()
  const { updateUser } = useAuthStore()
  const { language, currency, setLanguage, setCurrency, t } = useAppStore()
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [loading, setLoading] = useState(false)
  
  const [profile, setProfile] = useState({ username: '', phone: '' })
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('system')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' })
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false })
  const [notifications, setNotifications] = useState({ prayer: true, events: true, counseling: true, announcements: true, community: true })
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) {
      setProfile({ username: user.username || '', phone: user.phone || '' })
      loadPreferences()
    }
  }, [user])

  const loadPreferences = async () => {
    if (!user) return
    try {
      const { data } = await supabase.from('user_profiles').select('theme_mode, preferred_language, preferred_currency, notification_preferences').eq('id', user.id).single()
      if (data) {
        setThemeMode(data.theme_mode || 'system')
        if (data.preferred_language) setLanguage(data.preferred_language as any)
        if (data.preferred_currency) setCurrency(data.preferred_currency as any)
        if (data.notification_preferences) setNotifications(data.notification_preferences)
      }
    } catch (error) {
      console.error('Erro ao carregar preferências:', error)
    }
  }

  const applyTheme = (mode: 'light' | 'dark' | 'system') => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    if (mode === 'system') {
      root.classList.add(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    } else {
      root.classList.add(mode)
    }
    localStorage.setItem('theme', mode)
  }

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast.error('Apenas JPG, PNG ou WebP'); return }
    if (file.size > 2 * 1024 * 1024) { toast.error('Imagem deve ter no máximo 2MB'); return }
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setAvatarPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return null
    setUploadingAvatar(true)
    const fileExt = avatarFile.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`
    const { error } = await supabase.storage.from('avatars').upload(fileName, avatarFile, { upsert: true })
    if (error) { toast.error('Erro ao fazer upload do avatar'); setUploadingAvatar(false); return null }
    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
    setUploadingAvatar(false)
    return data.publicUrl
  }

  const saveProfile = async () => {
    if (!user) return
    setLoading(true)
    let avatarUrl = user?.avatar
    if (avatarFile) {
      const url = await uploadAvatar()
      if (url) avatarUrl = url
    }
    const { error } = await supabase.from('user_profiles').update({ username: profile.username, phone: profile.phone, avatar_url: avatarUrl }).eq('id', user.id)
    if (error) { toast.error(error.message); setLoading(false); return }
    updateUser({ username: profile.username, phone: profile.phone, avatar: avatarUrl })
    setAvatarFile(null)
    setAvatarPreview(null)
    toast.success('Perfil atualizado com sucesso!')
    setLoading(false)
  }

  const saveTheme = async (mode: 'light' | 'dark' | 'system') => {
    if (!user) return
    const { error } = await supabase.from('user_profiles').update({ theme_mode: mode }).eq('id', user.id)
    if (error) { toast.error(error.message); return }
    setThemeMode(mode)
    applyTheme(mode)
    toast.success('Tema atualizado!')
  }

  const saveLanguage = async (lang: string) => {
    if (!user) return
    const { error } = await supabase.from('user_profiles').update({ preferred_language: lang }).eq('id', user.id)
    if (!error) { setLanguage(lang as any); toast.success('Idioma atualizado!') }
  }

  const saveCurrency = async (curr: string) => {
    if (!user) return
    const { error } = await supabase.from('user_profiles').update({ preferred_currency: curr }).eq('id', user.id)
    if (!error) { setCurrency(curr as any); toast.success('Moeda atualizada!') }
  }

  const changePassword = async () => {
    if (!user) return
    if (!passwords.current) { toast.error('Insira a senha actual'); return }
    if (!passwords.new || passwords.new.length < 6) { toast.error('A nova senha deve ter pelo menos 6 caracteres'); return }
    if (passwords.new !== passwords.confirm) { toast.error('As senhas não coincidem'); return }
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: passwords.current })
    if (signInError) { toast.error('Senha actual incorrecta'); setLoading(false); return }

    const { error } = await supabase.auth.updateUser({ password: passwords.new })
    if (error) { toast.error(error.message); setLoading(false); return }

    toast.success('Senha alterada com sucesso!')
    setPasswords({ current: '', new: '', confirm: '' })
    setLoading(false)
  }

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'appearance', label: 'Aparência', icon: Palette },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'security', label: 'Segurança', icon: Lock },
  ]

  const languages = [
    { code: 'pt', name: 'Português', flag: '🇦🇴' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
  ]

  const currencies = [
    { code: 'AKZ', name: 'Kwanza', symbol: 'Kz', flag: '🇦🇴' },
    { code: 'USD', name: 'Dollar', symbol: '$', flag: '🇺🇸' },
    { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
    { code: 'GBP', name: 'Libra', symbol: '£', flag: '🇬🇧' },
  ]

  const isPasswordStrong = passwords.new.length >= 6

  return (
    <Layout title={t('settings.title')}>
      <div className="p-1 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
        {/* Header */}
        <Card className="p-5 md:p-8 border-2 bg-gradient-to-br from-[#0A2E4A] via-[#124263] to-[#4A90A4] text-white shadow-xl relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-black/5 mix-blend-overlay" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 md:p-4 bg-white/15 backdrop-blur-md rounded-2xl shadow-inner border border-white/10">
              <SettingsIcon className="h-7 w-7 md:h-9 md:w-9 animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-0.5">{t('settings.title')}</h1>
              <p className="text-white/80 text-xs md:text-base font-medium">Personalize sua experiência corporativa e de acessibilidade KAIRÓS</p>
            </div>
          </div>
        </Card>

        {/* Tab Navigation */}
        <div className="flex gap-1 overflow-x-auto p-1.5 bg-muted/60 rounded-2xl border-2 scrollbar-none snap-x">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap flex-shrink-0 transition-all snap-items ${
                activeTab === tab.id ? 'bg-[#0A2E4A] text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-background/80'
              }`}
            >
              <tab.icon className="h-4 w-4 stroke-[2.2]" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab: Profile */}
        {activeTab === 'profile' && (
          <Card className="p-5 md:p-8 border-2 shadow-md space-y-6 rounded-2xl bg-card">
            <div className="flex items-center gap-3 border-b pb-3">
              <div className="p-2 bg-muted/80 rounded-xl border">
                <User className="h-5 w-5 text-primary stroke-[2.2]" />
              </div>
              <h2 className="text-lg md:text-xl font-black text-foreground tracking-tight">Informações do Perfil</h2>
            </div>

            {/* Avatar Section */}
            <div className="bg-muted/30 p-4 rounded-xl border border-dashed border-border">
              <Label className="font-bold mb-3 block text-sm">Foto de Perfil</Label>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                <div className="relative flex-shrink-0 group">
                  <div className="h-20 w-20 md:h-24 md:w-24 rounded-2xl overflow-hidden bg-gradient-to-br from-[#0A2E4A] to-[#4A90A4] shadow-md border-2 border-background">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : user?.avatar ? (
                      <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-2xl md:text-3xl font-black">
                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  {avatarPreview && (
                    <button onClick={() => { setAvatarFile(null); setAvatarPreview(null) }} className="absolute -top-1.5 -right-1.5 p-1 bg-destructive text-destructive-foreground rounded-lg hover:scale-105 shadow-md transition-transform">
                      <X className="h-3.5 w-3.5 stroke-[2.5]" />
                    </button>
                  )}
                </div>
                <div className="text-center sm:text-left space-y-2">
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarSelect} className="hidden" />
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="border-2 font-bold h-10 px-4 rounded-xl transition-all shadow-sm active:scale-[0.98]">
                    <Upload className="mr-2 h-4 w-4 stroke-[2.2]" />
                    {avatarPreview ? 'Alterar Imagem' : 'Escolher Imagem'}
                  </Button>
                  <p className="text-xs text-muted-foreground font-medium">Formatos aceitos: JPG, PNG ou WebP de no máximo 2MB</p>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="font-bold text-sm text-foreground">{t('auth.username')}</Label>
                <Input value={profile.username} onChange={e => setProfile({ ...profile, username: e.target.value })} placeholder="Seu nome de usuário" className="h-11 border-2 font-medium rounded-xl text-base focus-visible:ring-1 focus-visible:ring-primary" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-bold text-sm text-foreground">{t('auth.phone')}</Label>
                <Input type="tel" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} placeholder="(244) 999-999-999" className="h-11 border-2 font-medium rounded-xl text-base focus-visible:ring-1 focus-visible:ring-primary" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-sm text-foreground">{t('auth.email')}</Label>
              <Input value={user?.email || ''} disabled className="bg-muted h-11 border-2 font-medium rounded-xl text-base opacity-75" />
              <p className="text-[11px] text-muted-foreground font-semibold">O endereço de email institucional não pode ser alterado por diretrizes de segurança.</p>
            </div>

            <div className="p-4 bg-muted/50 rounded-xl border-2 flex items-center gap-3.5">
              <div className="p-2 bg-[#0A2E4A]/10 text-[#0A2E4A] dark:text-blue-400 rounded-lg">
                <Shield className="h-5 w-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="text-xs font-bold text-muted-foreground tracking-wide uppercase">Nível de Permissão</div>
                <div className="font-black text-[#0A2E4A] dark:text-blue-300 capitalize text-sm">{user?.role || 'Membro'}</div>
              </div>
            </div>

            <Button onClick={saveProfile} disabled={loading || uploadingAvatar} className="w-full h-11 md:h-12 text-base font-bold bg-[#0A2E4A] hover:bg-[#0A2E4A]/90 text-white rounded-xl shadow-md active:scale-[0.99] transition-all" size="lg">
              <Save className="mr-2 h-4 w-4" />
              {loading ? (uploadingAvatar ? 'Fazendo upload...' : 'Salvando...') : 'Salvar Alterações do Perfil'}
            </Button>
          </Card>
        )}

        {/* Tab: Appearance */}
        {activeTab === 'appearance' && (
          <div className="space-y-5">
            {/* Theme Mode */}
            <Card className="p-5 md:p-8 border-2 shadow-md rounded-2xl bg-card">
              <div className="flex items-center gap-3 mb-5 border-b pb-3">
                <div className="p-2 bg-muted/80 rounded-xl border">
                  <Palette className="h-5 w-5 text-primary stroke-[2.2]" />
                </div>
                <h2 className="text-lg md:text-xl font-black text-foreground tracking-tight">Modo de Exibição</h2>
              </div>
              <div className="grid grid-cols-3 gap-3 md:gap-4">
                {[
                  { mode: 'light' as const, Icon: Sun, label: 'Claro', gradient: 'from-amber-400 to-orange-400 shadow-amber-500/10' },
                  { mode: 'dark' as const, Icon: Moon, label: 'Escuro', gradient: 'from-indigo-900 to-slate-900 shadow-slate-950/20' },
                  { mode: 'system' as const, Icon: Monitor, label: 'Sistema', gradient: 'from-slate-400 to-slate-600 shadow-slate-500/10' },
                ].map(({ mode, Icon, label, gradient }) => (
                  <button key={mode} onClick={() => saveTheme(mode)}
                    className={`p-4 md:p-6 border-2 rounded-2xl flex flex-col items-center gap-2 md:gap-3 transition-all ${themeMode === mode ? 'border-[#0A2E4A] bg-[#0A2E4A]/5 shadow-md scale-[1.02]' : 'border-border hover:border-primary/40'}`}>
                    <div className={`p-2.5 md:p-3 bg-gradient-to-br ${gradient} rounded-xl shadow-md`}>
                      <Icon className="h-5 w-5 md:h-6 md:w-6 text-white stroke-[2.2]" />
                    </div>
                    <span className="text-xs md:text-sm font-bold text-foreground">{label}</span>
                  </button>
                ))}
              </div>
            </Card>

            {/* Language */}
            <Card className="p-5 md:p-8 border-2 shadow-md rounded-2xl bg-card">
              <div className="flex items-center gap-3 mb-5 border-b pb-3">
                <div className="p-2 bg-muted/80 rounded-xl border">
                  <Languages className="h-5 w-5 text-primary stroke-[2.2]" />
                </div>
                <h2 className="text-lg md:text-xl font-black text-foreground tracking-tight">Idioma de Preferência</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {languages.map(lang => (
                  <button key={lang.code} onClick={() => saveLanguage(lang.code)}
                    className={`p-4 border-2 rounded-2xl flex flex-col items-center gap-2 transition-all ${language === lang.code ? 'border-[#0A2E4A] bg-[#0A2E4A]/5 shadow-md' : 'border-border hover:border-primary/40'}`}>
                    <span className="text-2xl filter drop-shadow-sm">{lang.flag}</span>
                    <span className="text-xs md:text-sm font-bold text-foreground">{lang.name}</span>
                  </button>
                ))}
              </div>
            </Card>

            {/* Currency */}
            <Card className="p-5 md:p-8 border-2 shadow-md rounded-2xl bg-card">
              <div className="flex items-center gap-3 mb-5 border-b pb-3">
                <div className="p-2 bg-muted/80 rounded-xl border">
                  <Coins className="h-5 w-5 text-primary stroke-[2.2]" />
                </div>
                <h2 className="text-lg md:text-xl font-black text-foreground tracking-tight">Moeda Padrão</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {currencies.map(curr => (
                  <button key={curr.code} onClick={() => saveCurrency(curr.code)}
                    className={`p-4 border-2 rounded-2xl flex flex-col items-center gap-2 transition-all ${currency === curr.code ? 'border-[#0A2E4A] bg-[#0A2E4A]/5 shadow-md' : 'border-border hover:border-primary/40'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{curr.flag}</span>
                      <span className="text-base font-black text-[#0A2E4A] dark:text-blue-400">{curr.symbol}</span>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground">{curr.code} - {curr.name}</span>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Tab: Notifications */}
        {activeTab === 'notifications' && (
          <Card className="p-5 md:p-8 border-2 shadow-md rounded-2xl bg-card">
            <div className="flex items-center gap-3 mb-5 border-b pb-3">
              <div className="p-2 bg-muted/80 rounded-xl border">
                <Bell className="h-5 w-5 text-primary stroke-[2.2]" />
              </div>
              <h2 className="text-lg md:text-xl font-black text-foreground tracking-tight">Preferências de Notificação</h2>
            </div>
            <div className="space-y-3.5">
              {[
                { key: 'prayer', label: 'Pedidos de Oração', desc: 'Alertar quando novos pedidos forem publicados no mural institucional.' },
                { key: 'events', label: 'Eventos', desc: 'Confirmações, alterações de cronograma e lembretes de eventos.' },
                { key: 'counseling', label: 'Aconselhamento', desc: 'Respostas e agendamentos diretos da equipe pastoral.' },
                { key: 'announcements', label: 'Anúncios Oficiais', desc: 'Notícias importantes, comunicados globais e circulares.' },
                { key: 'community', label: 'Interação Comunitária', desc: 'Respostas, reações e atividades ligadas às suas publicações.' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between p-4 border-2 border-muted rounded-xl hover:border-primary/20 bg-muted/10 transition-colors">
                  <div className="space-y-0.5 pr-4">
                    <div className="font-bold text-foreground text-sm md:text-base">{label}</div>
                    <div className="text-xs text-muted-foreground font-medium leading-relaxed">{desc}</div>
                  </div>
                  <Switch
                    checked={notifications[key as keyof typeof notifications]}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, [key]: checked }))}
                  />
                </div>
              ))}
            </div>
            <Button className="w-full h-11 md:h-12 mt-6 font-bold bg-[#0A2E4A] hover:bg-[#0A2E4A]/90 text-white rounded-xl shadow-md transition-all active:scale-[0.99]" onClick={async () => {
              const { error } = await supabase.from('user_profiles').update({ notification_preferences: notifications }).eq('id', user!.id)
              if (error) { toast.error(error.message); return }
              toast.success('Preferências salvas com sucesso!')
            }}>
              <Save className="mr-2 h-4 w-4" />Salvar Configurações de Notificação
            </Button>
          </Card>
        )}

        {/* Tab: Security */}
        {activeTab === 'security' && (
          <Card className="p-5 md:p-8 border-2 shadow-md rounded-2xl bg-card">
            <div className="flex items-center gap-3 mb-5 border-b pb-3">
              <div className="p-2 bg-muted/80 rounded-xl border">
                <Lock className="h-5 w-5 text-primary stroke-[2.2]" />
              </div>
              <h2 className="text-lg md:text-xl font-black text-foreground tracking-tight">Segurança da Conta</h2>
            </div>

            <div className="space-y-5">
              <div className="p-4 bg-muted/50 rounded-xl border-2 flex items-center gap-3.5">
                <Shield className="h-5 w-5 text-primary stroke-[2.2]" />
                <div>
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Identidade Autenticada</div>
                  <div className="text-foreground font-bold text-sm">{user?.email}</div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <h3 className="font-black text-sm text-foreground tracking-wide uppercase">Alterar Senha de Acesso</h3>

                {[
                  { key: 'current', label: 'Senha Actual', placeholder: 'Confirme sua senha de acesso atual' },
                  { key: 'new', label: 'Nova Senha', placeholder: 'Mínimo de 6 caracteres estruturados' },
                  { key: 'confirm', label: 'Confirmar Nova Senha', placeholder: 'Repita idêntica a nova senha inserida acima' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="font-bold text-xs text-muted-foreground uppercase tracking-wider">{label}</Label>
                    <div className="relative">
                      <Input
                        type={showPasswords[key as keyof typeof showPasswords] ? 'text' : 'password'}
                        value={passwords[key as keyof typeof passwords]}
                        onChange={e => setPasswords(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="h-11 border-2 font-medium rounded-xl pr-12 text-base focus-visible:ring-1 focus-visible:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, [key]: !prev[key as keyof typeof showPasswords] }))}
                        className="absolute right-3.5 top-3 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPasswords[key as keyof typeof showPasswords] ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {key === 'new' && passwords.new && (
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <div className={`h-1.5 w-16 rounded-full transition-all ${isPasswordStrong ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        <span className={`text-[11px] font-bold ${isPasswordStrong ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {isPasswordStrong ? 'Cumpre os requisitos mínimos' : 'Fraca (Mínimo de 6 dígitos)'}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Button onClick={changePassword} disabled={loading || !passwords.new} className="w-full h-11 md:h-12 font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl shadow-md transition-all active:scale-[0.99] mt-3" size="lg">
                <Lock className="mr-2 h-4 w-4" />
                {loading ? 'Processando alteração...' : 'Confirmar Nova Senha'}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  )
}

export default SettingsPage
