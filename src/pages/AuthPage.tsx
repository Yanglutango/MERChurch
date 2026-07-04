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
        identifier, otp, password, username, phone, role, adminKey, congregation
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

  const visibleRole = role === 'admin' ? 'admin' : role

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden font-sans antialiased">
      
      {/* ── Background Gradients ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-[#4A90A4]/5 rounded-full blur-[120px]" />
      </div>

      <Card className="w-full max-w-[480px] relative z-10 bg-card/60 dark:bg-card/40 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-md">
        <div className="p-10 sm:p-12">
          
          {/* ── Header ── */}
          <div className="text-center mb-9">
            <div className="inline-flex justify-center mb-5 opacity-90 transition-all duration-300 hover:opacity-100 hover:scale-105 cursor-pointer">
              <Logo size="lg" showText={false} animated={false} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0A2E4A] dark:text-zinc-100 font-sans">
              KAIRÓS
            </h1>
            <p className="text-[11px] font-medium tracking-wider uppercase text-muted-foreground/80 mt-1">
              Missão Evangélica da Reconciliação
            </p>

            <div className="mt-6 space-y-1">
              <h2 className="text-lg font-medium text-foreground tracking-tight">
                {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
              </h2>
              <p className="text-xs text-muted-foreground/80">
                {isLogin ? 'Continue sua jornada de fé' : 'Comece sua jornada conosco'}
              </p>
            </div>
          </div>

          {/* ── Role Selector ── */}
          <div className="grid grid-cols-2 gap-1 mb-7 p-1 bg-muted/60 dark:bg-muted/40 rounded-xl" role="group" aria-label="Tipo de acesso">
            <button
              type="button"
              onClick={() => { setRole('member'); setShowAdminAccess(false); setAdminKey('') }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-medium text-xs transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-ring ${
                visibleRole === 'member' || role === 'admin'
                  ? 'bg-background text-[#0A2E4A] dark:text-zinc-100 shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/40 dark:hover:bg-background/10'
              }`}
              aria-pressed={role === 'member' || role === 'admin'}
            >
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Membro</span>
            </button>

            <button
              type="button"
              onClick={() => { setRole('guest'); setShowAdminAccess(false); setAdminKey('') }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-medium text-xs transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-ring ${
                role === 'guest'
                  ? 'bg-background text-[#0A2E4A] dark:text-zinc-100 shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/40 dark:hover:bg-background/10'
              }`}
              aria-pressed={role === 'guest'}
            >
              <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Convidado</span>
            </button>
          </div>

          {/* ── Form ── */}
          <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-5" noValidate>
            
            {!isLogin && step === 'credentials' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-xs font-medium text-foreground/80">Nome de Usuário</Label>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors duration-200" aria-hidden="true" />
                    <Input id="username" type="text" value={username} onChange={e => setUsername(e.target.value)}
                      className="pl-11 h-12 rounded-xl bg-background/50 border-border/60 hover:border-border/90 focus-visible:ring-muted-foreground/20 transition-all duration-200" placeholder="Seu nome de usuário"
                      required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-medium text-foreground/80">Telefone</Label>
                  <div className="relative group">
                    <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors duration-200" aria-hidden="true" />
                    <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                      className="pl-11 h-12 rounded-xl bg-background/50 border-border/60 hover:border-border/90 focus-visible:ring-muted-foreground/20 transition-all duration-200" placeholder="(244) 923 456 789"
                      required />
                  </div>
                </div>

                {role === 'guest' && (
                  <div className="p-5 bg-[#4A90A4]/5 border border-[#4A90A4]/15 rounded-xl space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                    <Label htmlFor="congregation" className="text-xs font-semibold text-[#4A90A4] dark:text-[#7bbdd4]">
                      Sua Congregação
                    </Label>
                    <div className="relative group">
                      <Building2 className="absolute left-3.5 top-3.5 h-4 w-4 text-[#4A90A4]/80 group-hover:text-[#4A90A4] transition-colors duration-200" aria-hidden="true" />
                      <Input id="congregation" type="text" value={congregation}
                        onChange={e => setCongregation(e.target.value)}
                        className="pl-11 h-12 rounded-xl bg-background border-[#4A90A4]/20 hover:border-[#4A90A4]/40 focus-visible:ring-[#4A90A4]/20 transition-all duration-200"
                        placeholder="Nome da sua congregação" required />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="identifier" className="text-xs font-medium text-foreground/80">
                {isLogin ? 'Email, Usuário ou Telefone' : 'Email'}
              </Label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors duration-200" aria-hidden="true" />
                <Input id="identifier" type={isLogin ? 'text' : 'email'} value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  className="pl-11 h-12 rounded-xl bg-background/50 border-border/60 hover:border-border/90 focus-visible:ring-muted-foreground/20 transition-all duration-200"
                  placeholder={isLogin ? 'Digite seu acesso' : 'seu@email.com'}
                  required />
              </div>
            </div>

            {/* OTP */}
            {!isLogin && step === 'otp' && (
              <div className="p-5 bg-muted/40 border border-border/60 rounded-xl space-y-2 text-center animate-in zoom-in-95 duration-200">
                <Label htmlFor="otp" className="text-xs font-semibold text-foreground/90">
                  Código de Verificação
                </Label>
                <div className="relative max-w-[160px] mx-auto group">
                  <Key className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors duration-200" aria-hidden="true" />
                  <Input id="otp" type="text" value={otp} onChange={e => setOtp(e.target.value)}
                    className="pl-9 h-12 text-center text-xl tracking-widest font-bold rounded-xl bg-background border-border/80 hover:border-border focus-visible:ring-muted-foreground/20 transition-all duration-200"
                    placeholder="••••" maxLength={4} required />
                </div>
              </div>
            )}

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-foreground/80">Senha</Label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors duration-200" aria-hidden="true" />
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className="pl-11 h-12 rounded-xl bg-background/50 border-border/60 hover:border-border/90 focus-visible:ring-muted-foreground/20 transition-all duration-200" placeholder="••••••••••••"
                  required />
              </div>
            </div>

            {/* Admin key */}
            {showAdminAccess && (
              <div className="p-5 bg-amber-500/5 border border-amber-500/15 rounded-xl space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                <Label htmlFor="adminKey" className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                  Chave de Administrador
                </Label>
                <div className="relative group">
                  <Key className="absolute left-3.5 top-3.5 h-4 w-4 text-amber-500/60 group-hover:text-amber-500 transition-colors duration-200" aria-hidden="true" />
                  <Input id="adminKey" type="password" value={adminKey}
                    onChange={e => setAdminKey(e.target.value)}
                    className="pl-11 h-12 rounded-xl bg-background border-amber-500/20 hover:border-amber-500/40 focus-visible:ring-amber-500/20 transition-all duration-200"
                    placeholder="••••••••••••" required />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              {!isLogin && step === 'credentials' ? (
                <Button type="button" onClick={handleSendOtp} disabled={loading || !identifier}
                  className="w-full h-12 bg-[#0A2E4A] text-white font-medium rounded-xl shadow-sm text-sm transform transition-all duration-200 ease-out hover:bg-[#0A2E4A]/95 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Enviando...</span>
                  ) : (
                    'Enviar Código de Verificação'
                  )}
                </Button>
              ) : (
                <Button type="submit" disabled={loading}
                  className="w-full h-12 bg-[#0A2E4A] text-white font-medium rounded-xl shadow-sm text-sm transform transition-all duration-200 ease-out hover:bg-[#0A2E4A]/95 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {isLogin ? 'Entrando...' : 'Criando conta...'}
                    </span>
                  ) : (
                    isLogin ? 'Entrar' : 'Criar Conta'
                  )}
                </Button>
              )}
            </div>
          </form>

          {/* ── OAuth ── */}
          {isLogin && (role === 'member' || role === 'admin') && (
            <div className="animate-in fade-in zoom-in-95 duration-200">
              <div className="relative my-7">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-border/60" />
                </div>
                <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                  <span className="px-3 bg-card text-muted-foreground/80">Ou continue com</span>
                </div>
              </div>

              <Button type="button" variant="outline" onClick={() => handleOAuthLogin('google')}
                className="w-full h-12 rounded-xl font-medium border-border/80 text-xs tracking-normal transform transition-all duration-200 ease-out hover:bg-muted hover:border-border hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0"
              >
                <Chrome className="mr-2 h-4 w-4 text-muted-foreground/80" aria-hidden="true" />
                Continuar com Google
              </Button>
            </div>
          )}

          {/* ── Toggle Login / Register ── */}
          <div className="mt-8 text-center text-xs">
            <span className="text-muted-foreground">
              {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
            </span>{' '}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setStep('credentials'); setOtp('') }}
              className="text-[#0A2E4A] dark:text-[#7bbdd4] font-semibold transition-colors duration-200 hover:text-[#0A2E4A]/80 dark:hover:text-[#7bbdd4]/80 hover:underline rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {isLogin ? 'Criar conta' : 'Entrar'}
            </button>
          </div>

          {/* ── Admin access ── */}
          <div className="mt-7 text-center">
            <button
              type="button"
              onClick={handleToggleAdminAccess}
              className="text-[10px] tracking-wide text-muted-foreground/50 hover:text-muted-foreground/90 transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
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
