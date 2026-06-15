import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { authService } from '../lib/authService'
import { Mail, Lock, User, Phone, Key, Loader2, Chrome, Building2, Users, Shield } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card } from '../components/ui/card'
import { Logo } from '../components/ui/logo'
import { toast } from 'sonner'

const AuthPage = () => {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [isLogin, setIsLogin] = useState(true)
  const [role, setRole] = useState<'member' | 'admin' | 'guest'>('member')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials')

  // Admin access visibility
  const [showAdminAccess, setShowAdminAccess] = useState(false)

  // Form fields
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [congregation, setCongregation] = useState('')
  const [adminKey, setAdminKey] = useState('')
  const [otp, setOtp] = useState('')

  // When admin key is revealed, role switches to admin; when hidden, revert
  const handleToggleAdminAccess = () => {
    if (showAdminAccess) {
      setShowAdminAccess(false)
      setAdminKey('')
      if (role === 'admin') setRole('member')
    } else {
      setShowAdminAccess(true)
      setRole('admin')
    }
  }

  const handleSendOtp = async () => {
    setLoading(true)
    try {
      await authService.sendOtp(identifier)
      setStep('otp')
      toast.success('Código OTP enviado para seu email!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await authService.verifyOtpAndRegister(
        identifier,
        otp,
        password,
        username,
        phone,
        role,
        adminKey,
        congregation
      )
      login(authService.mapUser(user!))
      navigate(role === 'admin' ? '/dashboard' : '/home')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar conta')
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await authService.signInWithPassword(identifier, password, role, adminKey)
      login(authService.mapUser(user))
      navigate(role === 'admin' ? '/dashboard' : '/home')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer login')
      setLoading(false)
    }
  }

  const handleOAuthLogin = async (provider: 'google') => {
    try {
      await authService.signInWithOAuth(provider, role, adminKey)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer login')
    }
  }

  // Visible role: for UI display only ('member' | 'guest'); admin is hidden
  const visibleRole = role === 'admin' ? 'admin' : role

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100 dark:from-[#050e17] dark:via-[#071525] dark:to-[#050e17]">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-20 left-20 w-64 h-64 bg-[#0A2E4A]/6 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#4A90A4]/5 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative z-10 bg-white dark:bg-[#0d1f2d] border border-border shadow-2xl">
        <div className="p-8">
          {/* ── Header ────────────────────────────────────── */}
          <div className="text-center mb-8">
            <div className="inline-flex justify-center mb-4">
              <Logo size="lg" showText={false} animated={false} />
            </div>
            <h1 className="text-3xl font-bold mb-0.5 text-[#0A2E4A] dark:text-white tracking-tight">
              KAIRÓS
            </h1>
            <p className="text-sm text-muted-foreground mb-5">Missão Evangélica da Reconciliação</p>

            <div className="mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-0.5">
                {isLogin ? 'Bem-vindo de Volta' : 'Junte-se à Nossa Comunidade'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isLogin ? 'Continue sua jornada de fé' : 'Comece sua jornada conosco'}
              </p>
            </div>
          </div>

          {/* ── Role Selector: only Membro / Convidado ────── */}
          <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-muted rounded-lg" role="group" aria-label="Tipo de acesso">
            <button
              type="button"
              onClick={() => { setRole('member'); setShowAdminAccess(false); setAdminKey('') }}
              className={`flex flex-col items-center gap-1 py-3 px-4 rounded-md font-semibold text-sm transition-all duration-150 focus-visible:outline-2 focus-visible:outline-[#0A2E4A] ${
                visibleRole === 'member' || role === 'admin'
                  ? 'bg-[#0A2E4A] text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
              }`}
              aria-pressed={role === 'member' || role === 'admin'}
            >
              <Users className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs">Membro</span>
            </button>

            <button
              type="button"
              onClick={() => { setRole('guest'); setShowAdminAccess(false); setAdminKey('') }}
              className={`flex flex-col items-center gap-1 py-3 px-4 rounded-md font-semibold text-sm transition-all duration-150 focus-visible:outline-2 focus-visible:outline-[#0A2E4A] ${
                role === 'guest'
                  ? 'bg-[#0A2E4A] text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
              }`}
              aria-pressed={role === 'guest'}
            >
              <Building2 className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs">Convidado</span>
            </button>
          </div>

          {/* ── Form ──────────────────────────────────────── */}
          <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4" noValidate>
            {/* Register extra fields */}
            {!isLogin && step === 'credentials' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="username" className="font-medium">Nome de Usuário</Label>
                  <div className="relative mt-1.5">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <Input id="username" type="text" value={username} onChange={e => setUsername(e.target.value)}
                      className="pl-10 h-11" placeholder="Seu nome de usuário" required />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone" className="font-medium">Telefone</Label>
                  <div className="relative mt-1.5">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                      className="pl-10 h-11" placeholder="(244) 999-999-999" required />
                  </div>
                </div>

                {role === 'guest' && (
                  <div className="p-3 bg-[#4A90A4]/8 border border-[#4A90A4]/25 rounded-lg">
                    <Label htmlFor="congregation" className="font-medium text-[#4A90A4] dark:text-[#7bbdd4]">
                      Sua Congregação
                    </Label>
                    <div className="relative mt-1.5">
                      <Building2 className="absolute left-3 top-3 h-4 w-4 text-[#4A90A4]" aria-hidden="true" />
                      <Input id="congregation" type="text" value={congregation}
                        onChange={e => setCongregation(e.target.value)}
                        className="pl-10 h-11 border-[#4A90A4]/30"
                        placeholder="Nome da sua congregação" required />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Compartilhe de qual congregação você faz parte
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Email */}
            <div>
              <Label htmlFor="identifier" className="font-medium">
                {isLogin ? 'Email, Usuário ou Telefone' : 'Email'}
              </Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input id="identifier" type={isLogin ? 'text' : 'email'} value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  className="pl-10 h-11"
                  placeholder={isLogin ? 'Digite email, usuário ou telefone' : 'seu@email.com'}
                  required />
              </div>
            </div>

            {/* OTP */}
            {!isLogin && step === 'otp' && (
              <div className="p-4 bg-[#0A2E4A]/6 border border-[#0A2E4A]/20 rounded-lg">
                <Label htmlFor="otp" className="font-medium text-[#0A2E4A] dark:text-[#7bbdd4]">
                  Código de Verificação
                </Label>
                <div className="relative mt-1.5">
                  <Key className="absolute left-3 top-3 h-4 w-4 text-[#0A2E4A] dark:text-[#4A90A4]" aria-hidden="true" />
                  <Input id="otp" type="text" value={otp} onChange={e => setOtp(e.target.value)}
                    className="pl-10 h-11 text-center text-xl tracking-widest font-semibold"
                    placeholder="••••" maxLength={4} required />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 text-center">
                  Digite o código de 4 dígitos enviado para seu email
                </p>
              </div>
            )}

            {/* Password */}
            <div>
              <Label htmlFor="password" className="font-medium">Senha</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className="pl-10 h-11" placeholder="••••••••" required />
              </div>
            </div>

            {/* Admin key — only shown when admin access revealed */}
            {showAdminAccess && (
              <div className="p-3 bg-[#D4A574]/10 border border-[#D4A574]/30 rounded-lg animate-in fade-in slide-in-from-top-2 duration-200">
                <Label htmlFor="adminKey" className="font-medium text-[#8a6030] dark:text-[#D4A574] flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                  Chave de Administrador
                </Label>
                <div className="relative mt-1.5">
                  <Key className="absolute left-3 top-3 h-4 w-4 text-[#D4A574]" aria-hidden="true" />
                  <Input id="adminKey" type="password" value={adminKey}
                    onChange={e => setAdminKey(e.target.value)}
                    className="pl-10 h-11 border-[#D4A574]/30"
                    placeholder="••••••••••••" required />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Chave secreta para acesso administrativo
                </p>
              </div>
            )}

            {/* Submit */}
            {!isLogin && step === 'credentials' ? (
              <Button type="button" onClick={handleSendOtp} disabled={loading || !identifier}
                className="w-full h-11 bg-[#0A2E4A] hover:bg-[#0d3a5c] active:bg-[#071f33] text-white font-semibold transition-colors duration-150">
                {loading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</>
                  : 'Enviar Código de Verificação'
                }
              </Button>
            ) : (
              <Button type="submit" disabled={loading}
                className="w-full h-11 bg-[#0A2E4A] hover:bg-[#0d3a5c] active:bg-[#071f33] text-white font-semibold transition-colors duration-150">
                {loading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isLogin ? 'Entrando...' : 'Criando conta...'}</>
                  : isLogin ? 'Entrar' : 'Criar Conta'
                }
              </Button>
            )}
          </form>

          {/* ── OAuth (login only) ─────────────────────────── */}
          {isLogin && (
            <>
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-card text-muted-foreground">Ou continue com</span>
                </div>
              </div>

              <Button type="button" variant="outline" onClick={() => handleOAuthLogin('google')}
                className="w-full h-11 font-medium hover:bg-muted/60 transition-colors duration-150">
                <Google className="mr-2 h-4 w-4" aria-hidden="true" />
                Continuar com Google
              </Button>
            </>
          )}

          {/* ── Toggle Login / Register ────────────────────── */}
          <div className="mt-5 text-center text-sm">
            <span className="text-muted-foreground">
              {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
            </span>{' '}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setStep('credentials'); setOtp('') }}
              className="text-[#0A2E4A] dark:text-[#7bbdd4] font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-[#0A2E4A] rounded"
            >
              {isLogin ? 'Criar conta' : 'Entrar'}
            </button>
          </div>

          {/* ── Admin access — low-visibility link ────────── */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={handleToggleAdminAccess}
              className="text-[11px] leading-none text-muted-foreground/60 hover:text-muted-foreground transition-colors duration-150 focus-visible:outline-1 focus-visible:outline-muted-foreground rounded"
              aria-expanded={showAdminAccess}
            >
              {showAdminAccess ? 'Ocultar acesso administrativo' : 'Acesso Administrativo'}
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default AuthPage
