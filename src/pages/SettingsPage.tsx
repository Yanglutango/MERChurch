import { useState } from 'react'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useAuth } from '../hooks/useAuth'
import { useAuthStore } from '../stores/authStore'
import { useAppStore } from '../stores/appStore'
import { authService } from '../lib/authService'
import { Settings as SettingsIcon, User, Palette, Languages, Coins, Sparkles, Shield } from 'lucide-react'
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
  const [accentColor, setAccentColor] = useState(user?.accentColor || '#4A90A4')

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

  const updateProfile = async () => {
    setLoading(true)
    try {
      await authService.updateProfile({
        username: profile.username,
        phone: profile.phone,
      })

      updateUser({
        username: profile.username,
        phone: profile.phone,
      })

      toast.success(t('settings.profileUpdated'))
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar perfil')
    } finally {
      setLoading(false)
    }
  }

  const updateAccentColor = async () => {
    setLoading(true)
    try {
      await authService.updateProfile({
        accentColor: accentColor,
      })

      updateUser({
        accentColor: accentColor,
      })

      // Apply accent color to CSS variables
      document.documentElement.style.setProperty('--accent', accentColor)

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
              disabled={loading}
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-secondary text-white shadow-lg hover:shadow-xl transition-shadow"
              size="lg"
            >
              {loading ? t('common.loading') : t('common.save')}
            </Button>
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
                    onClick={() => setLanguage(lang.code as any)}
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
                    onClick={() => setCurrency(curr.code as any)}
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
