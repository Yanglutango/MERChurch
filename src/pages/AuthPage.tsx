import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../lib/authService'
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Lock,
  Mail,
  Phone,
  Shield,
  User,
  Users,
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card } from '../components/ui/card'
import { Logo } from '../components/ui/logo'
import { toast } from 'sonner'

type Role = 'member' | 'admin' | 'guest'
type AuthStep = 'credentials' | 'otp'

type FormMessage = {
  type: 'error' | 'success' | 'info'
  text: string
}

const roleOptions = [
  { value: 'member' as const, label: 'Membro', icon: Users },
  { value: 'guest' as const, label: 'Convidado', icon: Building2 },
]

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
const isValidPhone = (value: string) => value.replace(/\D/g, '').length >= 9

const getPasswordStrength = (password: string) => {
  if (!password) return { score: 0, label: 'Sem senha', tone: 'bg-border' }

  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length

  if (checks <= 2) return { score: 1, label: 'Fraca', tone: 'bg-red-500' }
  if (checks === 3 || checks === 4) return { score: 2, label: 'Boa', tone: 'bg-amber-500' }
  return { score: 3, label: 'Forte', tone: 'bg-emerald-500' }
}

const GoogleMark = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true" className="h-4 w-4 shrink-0">
    <path
      fill="#FFC107"
      d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20c10.493 0 19.438-7.64 19.438-18 0-1.341-.138-2.639-.389-3.917z"
    />
    <path
      fill="#FF3D00"
      d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.222 0-9.651-3.342-11.303-7.98l-6.564 5.06C4.36 39.557 13.033 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.611 20.083H42V20H24v8h11.303c-1.043 2.946-3.122 5.477-5.892 7.053l6.19 5.238C39.32 39.237 44 34.265 44 24c0-1.341-.138-2.639-.389-3.917z"
    />
  </svg>
)

const AuthPage = () => {
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
  const [role, setRole] = useState<Role>('member')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<AuthStep>('credentials')
  const [showPassword, setShowPassword] = useState(false)
  const [showAdminAccess, setShowAdminAccess] = useState(false)
  const [formMessage, setFormMessage] = useState<FormMessage | null>(null)

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [congregation, setCongregation] = useState('')
  const [adminKey, setAdminKey] = useState('')
  const [otp, setOtp] = useState('')

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password])
  const roleBadgeLabel =
    showAdminAccess ? 'Admin' : role === 'guest' ? 'Convidado' : 'Membro'

  const resetFlow = () => {
    setStep('credentials')
    setOtp('')
    setFormMessage(null)
  }

  const handleToggleAdminAccess = () => {
    if (showAdminAccess) {
      setShowAdminAccess(false)
      setAdminKey('')
      setRole('member')
      setFormMessage(null)
      return
    }

    setShowAdminAccess(true)
    setRole('admin')
    setFormMessage({
      type: 'info',
      text: 'Acesso administrativo ativado. Introduza a chave da organização.',
    })
  }

  const validateLogin = () => {
    if (!identifier.trim()) return 'Informe o seu email, utilizador ou telefone.'
    if (!password.trim()) return 'Digite a sua senha.'
    if (password.length < 6) return 'A senha deve ter pelo menos 6 caracteres.'
    return null
  }

  const validateRegister = () => {
    if (!username.trim()) return 'Informe o nome de utilizador.'
    if (!identifier.trim()) return 'Informe o seu email.'
    if (!isValidEmail(identifier)) return 'Digite um email válido.'
    if (!phone.trim()) return 'Informe o seu telefone.'
    if (!isValidPhone(phone)) return 'Digite um telefone válido.'
    if (!password.trim()) return 'Digite uma senha.'
    if (password.length < 6) return 'A senha deve ter pelo menos 6 caracteres.'
    if (role === 'guest' && !congregation.trim()) return 'Informe a sua congregação.'
    if (step === 'otp' && !otp.trim()) return 'Digite o código de verificação.'
    return null
  }

  const handleSendOtp = async () => {
    setLoading(true)
    setFormMessage(null)

    if (!identifier.trim()) {
      setFormMessage({ type: 'error', text: 'Informe o seu email para receber o código.' })
      setLoading(false)
      return
    }

    if (!isValidEmail(identifier)) {
      setFormMessage({ type: 'error', text: 'Digite um email válido para continuar.' })
      setLoading(false)
      return
    }

    try {
      await authService.sendOtp(identifier)
      setStep('otp')
      setFormMessage({ type: 'success', text: 'Código enviado com sucesso para o seu email.' })
      toast.success('Código enviado com sucesso para o seu email.')
    } catch (error: any) {
      const message = error.message || 'Não foi possível enviar o código.'
      setFormMessage({ type: 'error', text: message })
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationError = validateRegister()
    if (validationError) {
      setFormMessage({ type: 'error', text: validationError })
      toast.error(validationError)
      return
    }

    setLoading(true)
    setFormMessage(null)

    try {
      await authService.verifyOtpAndRegister(
        identifier,
        otp,
        password,
        username,
        phone,
        role,
        adminKey,
        congregation
      )

      navigate(role === 'admin' ? '/dashboard' : '/home')
    } catch (error: any) {
      const message = error.message || 'Erro ao criar conta'
      setFormMessage({ type: 'error', text: message })
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationError = validateLogin()
    if (validationError) {
      setFormMessage({ type: 'error', text: validationError })
      toast.error(validationError)
      return
    }

    setLoading(true)
    setFormMessage(null)

    try {
      await authService.signInWithPassword(identifier, password, role, adminKey)
      navigate(role === 'admin' ? '/dashboard' : '/home')
    } catch (error: any) {
      const message = error.message || 'Erro ao fazer login'
      setFormMessage({ type: 'error', text: message })
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthLogin = async (provider: 'google') => {
    try {
      await authService.signInWithOAuth(provider, role, adminKey)
    } catch (error: any) {
      const message = error.message || 'Erro ao fazer login'
      setFormMessage({ type: 'error', text: message })
      toast.error(message)
    }
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isLogin) return handleLogin(e)
    if (step === 'credentials') return handleSendOtp()
    return handleRegister(e)
  }

  const handleRoleChange = (selectedRole: Exclude<Role, 'admin'>) => {
    setRole(selectedRole)
    setShowAdminAccess(false)
    setAdminKey('')
    setFormMessage(null)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 sm:p-6">
      <Card className="w-full max-w-[440px] overflow-hidden rounded-xl border border-border bg-card shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        <div className="p-7 sm:p-8">
          <div className="text-center mb-7">
            <div className="mb-4 inline-flex items-center justify-center rounded-full border border-border bg-muted p-2.5">
              <Logo size="lg" showText={false} animated={false} />
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-foreground">KAIRÓS</h1>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Missão Evangélica da Reconciliação
            </p>
          </div>

          <div className="mb-6">
            <div className="rounded-lg border border-border bg-muted/60 p-1" role="group" aria-label="Tipo de acesso">
              <div className="grid grid-cols-2 gap-1">
                {roleOptions.map(({ value, label, icon: Icon }) => {
                  const isSelected = role === value && !showAdminAccess

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleRoleChange(value)}
                      className={`flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-[11px] font-medium transition-colors ${
                        isSelected
                          ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      aria-pressed={isSelected}
                    >
                      <Icon className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="mb-5 flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2.5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Perfil</p>
              <p className="text-sm font-medium text-foreground">{roleBadgeLabel}</p>
            </div>

            <button
              type="button"
              onClick={handleToggleAdminAccess}
              className="text-[10px] font-medium tracking-[0.12em] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-expanded={showAdminAccess}
            >
              {showAdminAccess ? 'Ocultar admin' : 'Admin'}
            </button>
          </div>

          <div className="mb-6 text-left">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              {isLogin ? 'Bem-vindo de volta' : 'Crie a sua conta'}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {isLogin ? 'Continue a sua jornada de fé' : 'Comece a sua jornada connosco'}
            </p>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-5" noValidate>
            {!isLogin && step === 'credentials' && (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-xs font-medium text-foreground/80">
                    Nome de utilizador
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground/60" aria-hidden="true" />
                    <Input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="h-11 rounded-md pl-11"
                      placeholder="Seu nome de utilizador"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-medium text-foreground/80">
                    Telefone
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground/60" aria-hidden="true" />
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-11 rounded-md pl-11"
                      placeholder="+244 923 456 789"
                      required
                    />
                  </div>
                </div>

                {role === 'guest' && (
                  <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="congregation" className="text-xs font-semibold text-primary">
                        Sua congregação
                      </Label>
                      <div className="relative">
                        <Building2 className="absolute left-3.5 top-3 h-4 w-4 text-primary/70" aria-hidden="true" />
                        <Input
                          id="congregation"
                          type="text"
                          value={congregation}
                          onChange={(e) => setCongregation(e.target.value)}
                          className="h-11 rounded-md bg-background pl-11"
                          placeholder="Nome da sua congregação"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="identifier" className="text-xs font-medium text-foreground/80">
                {isLogin ? 'Email, utilizador ou telefone' : 'Email'}
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground/60" aria-hidden="true" />
                <Input
                  id="identifier"
                  type={isLogin ? 'text' : 'email'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="h-11 rounded-md pl-11"
                  placeholder={isLogin ? 'Digite o seu acesso' : 'seu@email.com'}
                  required
                />
              </div>
            </div>

            {!isLogin && step === 'otp' && (
              <div className="rounded-md border border-border bg-muted/50 p-4 text-center">
                <p className="mb-2 text-sm font-medium text-foreground">Código de verificação</p>
                <p className="mb-3 text-xs text-muted-foreground">
                  Enviámos o código para <span className="font-medium text-foreground">{identifier}</span>
                </p>

                <div className="mx-auto max-w-[170px]">
                  <div className="relative">
                    <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" aria-hidden="true" />
                    <Input
                      id="otp"
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="h-11 rounded-md pl-9 text-center text-xl font-semibold tracking-[0.4em]"
                      placeholder="••••"
                      maxLength={4}
                      required
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="mt-3 text-[11px] font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={loading}
                >
                  Reenviar código
                </button>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-foreground/80">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground/60" aria-hidden="true" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-md pl-11 pr-11"
                  placeholder="••••••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-3 text-muted-foreground/60 transition-colors hover:text-muted-foreground"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {isLogin && password.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    <span>Segurança</span>
                    <span>{passwordStrength.label}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${passwordStrength.tone}`}
                      style={{ width: `${(passwordStrength.score / 3) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {showAdminAccess && (
              <div className="rounded-md border border-amber-300 bg-amber-50/70 p-4 dark:border-amber-800 dark:bg-amber-950/20">
                <div className="space-y-1.5">
                  <Label htmlFor="adminKey" className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                    <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                    Chave de administrador
                  </Label>
                  <div className="relative">
                    <Key className="absolute left-3.5 top-3 h-4 w-4 text-amber-700/60 dark:text-amber-400/60" aria-hidden="true" />
                    <Input
                      id="adminKey"
                      type="password"
                      value={adminKey}
                      onChange={(e) => setAdminKey(e.target.value)}
                      className="h-11 rounded-md bg-background pl-11"
                      placeholder="••••••••••••"
                    />
                  </div>
                </div>
              </div>
            )}

            {formMessage && (
              <div
                aria-live="polite"
                className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
                  formMessage.type === 'error'
                    ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300'
                    : formMessage.type === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300'
                      : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-300'
                }`}
              >
                {formMessage.type === 'error' ? (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                ) : formMessage.type === 'success' ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                ) : (
                  <Shield className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                )}
                <span>{formMessage.text}</span>
              </div>
            )}

            <div className="pt-1">
              {!isLogin && step === 'credentials' ? (
                <Button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading || !identifier || !isValidEmail(identifier)}
                  className="h-11 w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Enviar código de verificação
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              ) : (
                <Button type="submit" disabled={loading} className="h-11 w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {isLogin ? 'Entrando...' : 'Criando conta...'}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      {isLogin ? 'Entrar' : 'Criar conta'}
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              )}
            </div>
          </form>

          {isLogin && (role === 'member' || role === 'admin') && (
            <div className="mt-6">
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-[0.18em]">
                  <span className="bg-card px-3 text-muted-foreground">Ou continue com</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => handleOAuthLogin('google')}
                className="h-11 w-full rounded-lg border-slate-200 bg-white text-slate-900 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <span className="flex items-center justify-center gap-2.5">
                  <GoogleMark />
                  Continuar com Google
                </span>
              </Button>
            </div>
          )}

          <div className="mt-7 text-center text-xs">
            <span className="text-muted-foreground">
              {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
            </span>{' '}
            <button
              type="button"
              onClick={() => {
                setIsLogin((prev) => !prev)
                resetFlow()
              }}
              className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {isLogin ? 'Criar conta' : 'Entrar'}
            </button>
          </div>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => {
                if (!isLogin) {
                  setStep('credentials')
                }
                handleToggleAdminAccess()
              }}
              className="text-[10px] font-medium tracking-[0.14em] text-muted-foreground/70 hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-expanded={showAdminAccess}
            >
              {showAdminAccess ? 'Ocultar acesso administrativo' : 'Acesso administrativo'}
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default AuthPage
