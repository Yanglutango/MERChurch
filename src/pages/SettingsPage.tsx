import { useState, useEffect, useRef } from 'react'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useAuth } from '../hooks/useAuth'
import { useAuthStore } from '../stores/authStore'
import { useAppStore } from '../stores/appStore'
import { authService } from '../lib/authService'
import { supabase } from '../lib/supabase'
import { Settings as SettingsIcon, User, Palette, Languages, Coins, Sparkles, Shield, Moon, Sun, Monitor, Upload, X } from 'lucide-react'
import { toast } from 'sonner'

const SettingsPage = () => {
  const { user } = useAuth()
  const { updateUser } = useAuthStore()
  const { language, currency, setLanguage, setCurrency, t } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState({
    username: user?.username || '',
    phone: user?.phone || '',
  })
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('system')
  const [accentColor, setAccentColor] = useState('#4A90A4')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadUserPreferences()
  }, [user])

  const loadUserPreferences = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('theme_mode, accent_color, preferred_language, preferred_currency')
        .eq('id', user.id)
        .single()

      if (error) throw error

      if (data) {
        setThemeMode(data.theme_mode || 'system')
        setAccentColor(data.accent_color || '#4A90A4')
        if (data.preferred_language) setLanguage(data.preferred_language as any)
        if (data.preferred_currency) setCurrency(data.preferred_currency as any)
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
    }
  }

  const applyTheme = (mode: 'light' | 'dark' | 'system') => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')

    if (mode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.add(prefersDark ? 'dark' : 'light')
    } else {
      root.classList.add(mode)
    }

    localStorage.setItem('theme', mode)
  }

  const languages = [
    { code: 'pt', name: 'Português', nativeName: 'Português', flag: '🇦🇴' },
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
    { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
    { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  ]

  const currencies = [
    { code: 'AKZ', name: 'Kwanza Angolano', symbol: 'Kz', flag: '🇦🇴' },
    { code: 'USD', name: 'Dólar Americano', symbol: '$', flag: '🇺🇸' },
    { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
    { code: 'GBP', name: 'Libra Esterlina', symbol: '£', flag: '🇬🇧' },
  ]

  const accentColors = [
    { name: 'Teal (Padrão)', value: '#4A90A4' },
    { name: 'Navy Blue', value: '#0A2E4A' },
    { name: 'Golden', value: '#D4A574' },
    { name: 'Royal Blue', value: '#2563EB' },
    { name: 'Emerald', value: '#10B981' },
    { name: 'Rose', value: '#F43F5E' },
    { name: 'Amber', value: '#F59E0B' },
    { name: 'Purple', value: '#9333EA' },
  ]

  const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Apenas imagens JPG ou PNG são permitidas')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 2MB')
      return
    }

    setAvatarFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const uploadAvatar = async () => {
    if (!avatarFile) return null

    setUploadingAvatar(true)
    try {
      const fileExt = avatarFile.name.split('.').pop()
      const fileName = `${user!.id}/${Date.now()}.${fileExt}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      return data.publicUrl
    } catch (error: any) {
      console.error('Avatar upload error:', error)
      throw error
    } finally {
      setUploadingAvatar(false)
    }
  }

  const updateProfile = async () => {
    setLoading(true)
    try {
      let avatarUrl = user?.avatar

      // Upload avatar if selected
      if (avatarFile) {
        avatarUrl = await uploadAvatar()
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({
          username: profile.username,
          phone: profile.phone,
          avatar_url: avatarUrl,
        })
        .eq('id', user!.id)

      if (error) throw error

      updateUser({
        username: profile.username,
        phone: profile.phone,
        avatar: avatarUrl,
      })

      // Clear avatar selection
      setAvatarFile(null)
      setAvatarPreview(null)

      toast.success(t('settings.profileUpdated'))
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar perfil')
    } finally {
      setLoading(false)
    }
  }

  const updateThemeMode = async (mode: 'light' | 'dark' | 'system') => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ theme_mode: mode })
        .eq('id', user!.id)

      if (error) throw error

      setThemeMode(mode)
      applyTheme(mode)
      toast.success('Tema atualizado!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar tema')
    } finally {
      setLoading(false)
    }
  }

  const updateLanguagePreference = async (lang: string) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ preferred_language: lang })
        .eq('id', user!.id)

      if (error) throw error

      setLanguage(lang as any)
      toast.success('Idioma atualizado!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar idioma')
    }
  }

  const updateCurrencyPreference = async (curr: string) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ preferred_currency: curr })
        .eq('id', user!.id)

      if (error) throw error

      setCurrency(curr as any)
      toast.success('Moeda atualizada!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar moeda')
    }
  }

  const updateAccentColor = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ accent_color: accentColor })
        .eq('id', user!.id)

      if (error) throw error

      toast.success('Cor de destaque atualizada!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar cor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout title={t('settings.title')}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <Card className="p-8 border-2 bg-gradient-to-r from-primary via-secondary to-accent text-white shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl shadow-xl">
              <SettingsIcon className="h-12 w-12" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-1">{t('settings.title')}</h1>
              <p className="text-white/90 text-lg">Personalize sua experiência KAIRÓS</p>
            </div>
          </div>
        </Card>

        {/* Profile Settings */}
        <Card className="p-8 border-2 hover:shadow-2xl transition-shadow elevation-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-primary to-secondary rounded-xl shadow-lg">
              <User className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-foreground">{t('settings.profile')}</h2>
          </div>

          <div className="space-y-5">
            {/* Avatar Upload */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Foto de Perfil</Label>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full overflow-hidden bg-gradient-to-br from-primary to-secondary shadow-lg">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : user?.avatar ? (
                      <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
                        {user?.username?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {avatarPreview && (
                    <button
                      onClick={() => { setAvatarFile(null); setAvatarPreview(null); }}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handleAvatarSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="mb-2"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {avatarPreview ? 'Alterar Imagem' : 'Escolher Imagem'}
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    JPG ou PNG • Máximo 2MB
                  </p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <Label htmlFor="username" className="text-base font-semibold mb-2 block">
                  {t('auth.username')}
                </Label>
                <Input
                  id="username"
                  value={profile.username}
                  onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                  placeholder="Seu nome de usuário"
                  className="h-12 text-base"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-base font-semibold mb-2 block">
                  {t('auth.phone')}
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="(244) 999-999-999"
                  className="h-12 text-base"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-base font-semibold mb-2 block">
                {t('auth.email')}
              </Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-muted h-12 text-base"
              />
              <p className="text-sm text-muted-foreground mt-1.5">O email não pode ser alterado</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label className="text-base font-semibold mb-2 block">{t('settings.accountType')}</Label>
                <div className="flex items-center gap-3 p-4 bg-muted rounded-xl border-2 border-border">
                  <Shield className="h-6 w-6 text-primary" />
                  <span className="text-lg font-bold text-primary capitalize">{user?.role}</span>
                </div>
              </div>
            </div>

            <Button
              onClick={updateProfile}
              disabled={loading || uploadingAvatar}
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-secondary text-white shadow-lg hover:shadow-xl transition-shadow"
              size="lg"
            >
              {loading ? (uploadingAvatar ? 'Fazendo upload...' : t('common.loading')) : t('common.save')}
            </Button>
          </div>
        </Card>

        {/* Theme Mode */}
        <Card className="p-8 border-2 hover:shadow-2xl transition-shadow elevation-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow-lg">
              <Palette className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-foreground">{t('settings.themeMode')}</h2>
          </div>

          <div className="space-y-4">
            <Label className="text-base font-semibold mb-3 block">Escolha o modo de exibição</Label>
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => updateThemeMode('light')}
                className={`p-6 border-2 rounded-xl flex flex-col items-center gap-3 transition-all transform hover:scale-105 ${
                  themeMode === 'light'
                    ? 'border-primary bg-primary/10 shadow-lg scale-105'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="p-3 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-xl">
                  <Sun className="h-8 w-8 text-white" />
                </div>
                <span className="text-sm font-bold text-foreground">Claro</span>
              </button>

              <button
                onClick={() => updateThemeMode('dark')}
                className={`p-6 border-2 rounded-xl flex flex-col items-center gap-3 transition-all transform hover:scale-105 ${
                  themeMode === 'dark'
                    ? 'border-primary bg-primary/10 shadow-lg scale-105'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl">
                  <Moon className="h-8 w-8 text-white" />
                </div>
                <span className="text-sm font-bold text-foreground">Escuro</span>
              </button>

              <button
                onClick={() => updateThemeMode('system')}
                className={`p-6 border-2 rounded-xl flex flex-col items-center gap-3 transition-all transform hover:scale-105 ${
                  themeMode === 'system'
                    ? 'border-primary bg-primary/10 shadow-lg scale-105'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="p-3 bg-gradient-to-br from-gray-500 to-gray-700 rounded-xl">
                  <Monitor className="h-8 w-8 text-white" />
                </div>
                <span className="text-sm font-bold text-foreground">Sistema</span>
              </button>
            </div>
          </div>
        </Card>

        {/* Language & Currency */}
        <Card className="p-8 border-2 hover:shadow-2xl transition-shadow elevation-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
              <Languages className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-foreground">{t('settings.languageCurrency')}</h2>
          </div>

          <div className="space-y-6">
            {/* Language */}
            <div>
              <Label className="text-base font-semibold mb-3 block">{t('settings.selectLanguage')}</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => updateLanguagePreference(lang.code)}
                    className={`p-5 border-2 rounded-xl flex flex-col items-center gap-2 transition-all transform hover:scale-105 ${
                      language === lang.code
                        ? 'border-primary bg-primary/10 shadow-lg scale-105'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span className="text-4xl">{lang.flag}</span>
                    <span className="text-sm font-bold text-foreground">{lang.nativeName}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Currency */}
            <div>
              <Label className="text-base font-semibold mb-3 block">{t('settings.selectCurrency')}</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {currencies.map((curr) => (
                  <button
                    key={curr.code}
                    onClick={() => updateCurrencyPreference(curr.code)}
                    className={`p-5 border-2 rounded-xl flex flex-col items-center gap-2 transition-all transform hover:scale-105 ${
                      currency === curr.code
                        ? 'border-primary bg-primary/10 shadow-lg scale-105'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{curr.flag}</span>
                      <span className="text-2xl font-bold text-primary">{curr.symbol}</span>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-foreground">{curr.code}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Accent Color */}
        <Card className="p-8 border-2 hover:shadow-2xl transition-shadow elevation-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
              <Palette className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-foreground">{t('settings.accentColor')}</h2>
          </div>

          <div className="space-y-6">
            <div>
              <Label className="text-base font-semibold mb-3 block">Escolha uma cor</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {accentColors.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setAccentColor(color.value)}
                    className={`p-5 border-2 rounded-xl flex flex-col items-center gap-3 transition-all transform hover:scale-105 ${
                      accentColor === color.value
                        ? 'border-primary bg-primary/10 shadow-lg scale-105'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div
                      className="w-14 h-14 rounded-full shadow-lg"
                      style={{ backgroundColor: color.value }}
                    />
                    <span className="text-xs text-foreground font-semibold text-center">{color.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="customColor" className="text-base font-semibold mb-2 block">
                {t('settings.customColor')}
              </Label>
              <div className="flex gap-3 items-center">
                <Input
                  id="customColor"
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-24 h-14 cursor-pointer"
                />
                <Input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  placeholder="#4A90A4"
                  className="flex-1 h-14 text-base font-mono"
                />
              </div>
            </div>

            <Button
              onClick={updateAccentColor}
              disabled={loading}
              className="w-full h-12 text-base font-semibold text-white shadow-lg hover:shadow-xl transition-shadow"
              style={{ backgroundColor: accentColor }}
              size="lg"
            >
              {loading ? t('common.loading') : t('settings.applyTheme')}
            </Button>
          </div>
        </Card>

        {/* Preview */}
        <Card className="p-8 border-2 shadow-xl" style={{ borderColor: accentColor }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl shadow-lg" style={{ backgroundColor: accentColor }}>
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-3xl font-bold text-foreground">{t('settings.preview')}</h3>
          </div>
          
          <div className="space-y-5">
            <Button style={{ backgroundColor: accentColor }} className="w-full h-12 text-white font-semibold">
              Exemplo de Botão
            </Button>
            <div className="grid grid-cols-3 gap-4">
              {[100, 50, 25].map((num) => (
                <div key={num} className="p-5 bg-muted rounded-xl text-center border-2" style={{ borderColor: `${accentColor}20` }}>
                  <div className="text-3xl font-bold mb-1" style={{ color: accentColor }}>
                    {num}+
                  </div>
                  <div className="text-sm text-muted-foreground">Exemplo</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  )
}

export default SettingsPage
