import { useState, useEffect } from 'react'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useAuth } from '../hooks/useAuth'
import { useAuthStore } from '../stores/authStore'
import { useAppStore } from '../stores/appStore'
import { supabase } from '../lib/supabase'
import {
  Settings as SettingsIcon, User, Palette, Languages, Coins,
  Shield, Moon, Sun, Monitor, Upload, X, Bell, Lock, Eye, EyeOff, Save,
} from 'lucide-react'
import { toast } from 'sonner'
import { useRef } from 'react'

type Tab = 'profile' | 'appearance' | 'notifications' | 'security'

const SettingsPage = () => {
  const { user } = useAuth()
  const { updateUser } = useAuthStore()
  const { language, currency, setLanguage, setCurrency, t } = useAppStore()
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState({ username: user?.username || '', phone: user?.phone || '' })
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('system')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' })
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false })
  const [notifications, setNotifications] = useState({ prayer: true, events: true, counseling: true, announcements: true, community: true })
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadPreferences() }, [user])

  const loadPreferences = async () => {
    if (!user) return
    const { data } = await supabase.from('user_profiles').select('theme_mode, accent_color, preferred_language, preferred_currency, notification_preferences').eq('id', user.id).single()
    if (data) {
      setThemeMode(data.theme_mode || 'system')
      if (data.preferred_language) setLanguage(data.preferred_language as any)
      if (data.preferred_currency) setCurrency(data.preferred_currency as any)
      if (data.notification_preferences) setNotifications(data.notification_preferences)
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
    if (!avatarFile) return null
    setUploadingAvatar(true)
    const fileExt = avatarFile.name.split('.').pop()
    const fileName = `${user!.id}/${Date.now()}.${fileExt}`
    const { error } = await supabase.storage.from('avatars').upload(fileName, avatarFile, { upsert: true })
    if (error) { toast.error('Erro ao fazer upload do avatar'); setUploadingAvatar(false); return null }
    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
    setUploadingAvatar(false)
    return data.publicUrl
  }

  const saveProfile = async () => {
    setLoading(true)
    let avatarUrl = user?.avatar
    if (avatarFile) {
      const url = await uploadAvatar()
      if (url) avatarUrl = url
    }
    const { error } = await supabase.from('user_profiles').update({ username: profile.username, phone: profile.phone, avatar_url: avatarUrl }).eq('id', user!.id)
    if (error) { toast.error(error.message); setLoading(false); return }
    updateUser({ username: profile.username, phone: profile.phone, avatar: avatarUrl })
    setAvatarFile(null)
    setAvatarPreview(null)
    toast.success('Perfil atualizado com sucesso!')
    setLoading(false)
  }

  const saveTheme = async (mode: 'light' | 'dark' | 'system') => {
    const { error } = await supabase.from('user_profiles').update({ theme_mode: mode }).eq('id', user!.id)
    if (error) { toast.error(error.message); return }
    setThemeMode(mode)
    applyTheme(mode)
    toast.success('Tema atualizado!')
  }

  const saveLanguage = async (lang: string) => {
    const { error } = await supabase.from('user_profiles').update({ preferred_language: lang }).eq('id', user!.id)
    if (!error) { setLanguage(lang as any); toast.success('Idioma atualizado!') }
  }

  const saveCurrency = async (curr: string) => {
    const { error } = await supabase.from('user_profiles').update({ preferred_currency: curr }).eq('id', user!.id)
    if (!error) { setCurrency(curr as any); toast.success('Moeda atualizada!') }
  }

  const changePassword = async () => {
  if (!passwords.current) {
    toast.error('Insira a senha actual')
    return
  }
  if (!passwords.new || passwords.new.length < 6) {
    toast.error('A nova senha deve ter pelo menos 6 caracteres')
    return
  }
  if (passwords.new !== passwords.confirm) {
    toast.error('As senhas não coincidem')
    return
  }
  setLoading(true)

  /*Verificar senha actual antes de qualquer alteração*/
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user!.email,
    password: passwords.current,
  })
  if (signInError) {
    toast.error('Senha actual incorrecta')
    setLoading(false)
    return
  }

  const { error } = await supabase.auth.updateUser({ password: passwords.new })
  if (error) {
    toast.error(error.message)
    setLoading(false)
    return
  }

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



  return (
    <Layout title={t('settings.title')}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="p-5 md:p-8 border-2 bg-gradient-to-r from-primary via-secondary to-accent text-white shadow-2xl">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-3 md:p-4 bg-white/20 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-xl">
              <SettingsIcon className="h-8 w-8 md:h-10 md:w-10" />
            </div>
            <div>
              <h1 className="text-2xl md:text-4xl font-bold mb-1">{t('settings.title')}</h1>
              <p className="text-white text-sm md:text-lg">Personalize sua experiência KAIRÓS</p>
            </div>
          </div>
        </Card>

        {/* Tab Navigation */}
        <Card className="p-1.5 border-2">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 md:px-5 py-2.5 md:py-3 rounded-xl font-semibold text-sm transition-all whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Tab: Profile */}
        {activeTab === 'profile' && (
          <Card className="p-5 md:p-8 border-2 shadow-lg space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-primary to-secondary rounded-xl shadow-lg">
                <User className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">Informações do Perfil</h2>
            </div>

            {/* Avatar */}
            <div>
              <Label className="font-semibold mb-3 block">Foto de Perfil</Label>
              <div className="flex items-center gap-5">
                <div className="relative flex-shrink-0">
                  <div className="h-20 w-20 md:h-24 md:w-24 rounded-full overflow-hidden bg-gradient-to-br from-primary to-secondary shadow-lg">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : user?.avatar ? (
                      <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-2xl md:text-3xl font-bold">
                        {user?.username?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {avatarPreview && (
                    <button onClick={() => { setAvatarFile(null); setAvatarPreview(null) }} className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarSelect} className="hidden" />
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="border-2 font-semibold mb-2">
                    <Upload className="mr-2 h-4 w-4" />
                    {avatarPreview ? 'Alterar Imagem' : 'Escolher Imagem'}
                  </Button>
                  <p className="text-xs text-muted-foreground">JPG, PNG ou WebP • Máximo 2MB</p>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="font-semibold mb-1.5 block">{t('auth.username')}</Label>
                <Input value={profile.username} onChange={e => setProfile({ ...profile, username: e.target.value })} placeholder="Seu nome de usuário" className="h-11 border-2 text-base" />
              </div>
              <div>
                <Label className="font-semibold mb-1.5 block">{t('auth.phone')}</Label>
                <Input type="tel" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} placeholder="(244) 999-999-999" className="h-11 border-2 text-base" />
              </div>
            </div>

            <div>
              <Label className="font-semibold mb-1.5 block">{t('auth.email')}</Label>
              <Input value={user?.email || ''} disabled className="bg-muted h-11 border-2 text-base" />
              <p className="text-xs text-muted-foreground mt-1">O email não pode ser alterado</p>
            </div>

            <div className="p-4 bg-muted/50 rounded-xl border-2 border-border flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <div>
                <div className="text-sm font-semibold text-muted-foreground">Tipo de Conta</div>
                <div className="font-bold text-primary capitalize">{user?.role}</div>
              </div>
            </div>

            <Button onClick={saveProfile} disabled={loading || uploadingAvatar} className="w-full h-11 md:h-12 text-base font-bold bg-gradient-to-r from-primary to-secondary text-white shadow-lg" size="lg">
              <Save className="mr-2 h-4 w-4" />
              {loading ? (uploadingAvatar ? 'Fazendo upload...' : 'Salvando...') : 'Salvar Perfil'}
            </Button>
          </Card>
        )}

        {/* Tab: Appearance */}
        {activeTab === 'appearance' && (
          <div className="space-y-5">
            {/* Theme Mode */}
            <Card className="p-5 md:p-8 border-2 shadow-lg">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow-lg">
                  <Palette className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground">Modo de Exibição</h2>
              </div>
              <div className="grid grid-cols-3 gap-3 md:gap-4">
                {[
                  { mode: 'light' as const, Icon: Sun, label: 'Claro', gradient: 'from-yellow-400 to-orange-400' },
                  { mode: 'dark' as const, Icon: Moon, label: 'Escuro', gradient: 'from-indigo-600 to-purple-600' },
                  { mode: 'system' as const, Icon: Monitor, label: 'Sistema', gradient: 'from-gray-500 to-gray-700' },
                ].map(({ mode, Icon, label, gradient }) => (
                  <button key={mode} onClick={() => saveTheme(mode)}
                    className={`p-4 md:p-6 border-2 rounded-xl flex flex-col items-center gap-2 md:gap-3 transition-all ${themeMode === mode ? 'border-primary bg-primary/10 shadow-lg scale-105' : 'border-border hover:border-primary/50'}`}>
                    <div className={`p-2.5 md:p-3 bg-gradient-to-br ${gradient} rounded-xl`}>
                      <Icon className="h-6 w-6 md:h-8 md:w-8 text-white" />
                    </div>
                    <span className="text-xs md:text-sm font-bold text-foreground">{label}</span>
                  </button>
                ))}
              </div>
            </Card>

            {/* Language */}
            <Card className="p-5 md:p-8 border-2 shadow-lg">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
                  <Languages className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground">Idioma</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {languages.map(lang => (
                  <button key={lang.code} onClick={() => saveLanguage(lang.code)}
                    className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${language === lang.code ? 'border-primary bg-primary/10 shadow-lg scale-105' : 'border-border hover:border-primary/50'}`}>
                    <span className="text-3xl">{lang.flag}</span>
                    <span className="text-xs md:text-sm font-bold text-foreground">{lang.name}</span>
                  </button>
                ))}
              </div>
            </Card>

            {/* Currency */}
            <Card className="p-5 md:p-8 border-2 shadow-lg">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg">
                  <Coins className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground">Moeda</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {currencies.map(curr => (
                  <button key={curr.code} onClick={() => saveCurrency(curr.code)}
                    className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${currency === curr.code ? 'border-primary bg-primary/10 shadow-lg scale-105' : 'border-border hover:border-primary/50'}`}>
                    <div className="flex items-center gap-1">
                      <span className="text-2xl">{curr.flag}</span>
                      <span className="text-xl font-bold text-primary">{curr.symbol}</span>
                    </div>
                    <span className="text-xs font-bold text-foreground">{curr.code}</span>
                  </button>
                ))}
              </div>
            </Card>


          </div>
        )}

        {/* Tab: Notifications */}
        {activeTab === 'notifications' && (
          <Card className="p-5 md:p-8 border-2 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg">
                <Bell className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">Preferências de Notificação</h2>
            </div>
            <div className="space-y-4">
              {[
                { key: 'prayer', label: 'Pedidos de Oração', desc: 'Quando novos pedidos forem publicados' },
                { key: 'events', label: 'Eventos', desc: 'Confirmações e lembretes de eventos' },
                { key: 'counseling', label: 'Aconselhamento', desc: 'Respostas da equipe pastoral' },
                { key: 'announcements', label: 'Anúncios', desc: 'Notícias e comunicados da igreja' },
                { key: 'community', label: 'Comunidade', desc: 'Interações com suas publicações' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between p-4 border-2 border-border rounded-xl hover:border-primary/30 transition-colors">
                  <div>
                    <div className="font-semibold text-foreground text-sm md:text-base">{label}</div>
                    <div className="text-xs md:text-sm text-muted-foreground">{desc}</div>
                  </div>
                  <button
                    onClick={() => setNotifications(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications[key as keyof typeof notifications] ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${notifications[key as keyof typeof notifications] ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              ))}
            </div>
            <Button className="w-full h-11 mt-5 font-bold bg-gradient-to-r from-primary to-secondary text-white" onClick={async () => {
              const { error } = await supabase.from('user_profiles').update({ notification_preferences: notifications }).eq('id', user!.id)
              if (error) { toast.error(error.message); return }
              toast.success('Preferências salvas!')
            }}>
              <Save className="mr-2 h-4 w-4" />Salvar Preferências
            </Button>
          </Card>
        )}

        {/* Tab: Security */}
        {activeTab === 'security' && (
          <Card className="p-5 md:p-8 border-2 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl shadow-lg">
                <Lock className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">Segurança da Conta</h2>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-xl border-2 border-border mb-5">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-semibold text-foreground text-sm">Email da Conta</div>
                    <div className="text-muted-foreground text-sm">{user?.email}</div>
                  </div>
                </div>
              </div>

              <h3 className="font-bold text-foreground">Alterar Senha</h3>

              {[
                { key: 'current', label: 'Senha Actual', placeholder: 'Sua senha actual' },
                { key: 'new', label: 'Nova Senha', placeholder: 'Mínimo 6 caracteres' },
                { key: 'confirm', label: 'Confirmar Nova Senha', placeholder: 'Repita a nova senha' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <Label className="font-semibold mb-1.5 block">{label}</Label>
                  <div className="relative">
                    <Input
                      type={showPasswords[key as keyof typeof showPasswords] ? 'text' : 'password'}
                      value={passwords[key as keyof typeof passwords]}
                      onChange={e => setPasswords(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="h-11 border-2 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, [key]: !prev[key as keyof typeof showPasswords] }))}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPasswords[key as keyof typeof showPasswords] ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              ))}

              <Button onClick={changePassword} disabled={loading || !passwords.new} className="w-full h-11 font-bold bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white mt-2" size="lg">
                <Lock className="mr-2 h-4 w-4" />
                {loading ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  )
}

export default SettingsPage
