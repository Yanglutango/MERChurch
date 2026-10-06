import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { authService } from '../lib/authService'
import { Mail, Lock, User, Phone, Key, Loader2, Building2, Users, Shield, Eye, EyeOff } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card } from '../components/ui/card'
import { Logo } from '../components/ui/logo'
import { toast } from 'sonner'

const AuthPage = () => {
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
  const [role, setRole] = useState<'member' | 'admin' | 'guest'>('member')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials')
  const [showPassword, setShowPassword] = useState(false)

  const [showAdminAccess, setShowAdminAccess] = useState(false)

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
      toast.success('Código enviado para o seu email')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar código')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authService.verifyOtpAndRegister(
        identifier, otp, password, username, phone, role, adminKey, congregation
      )
      // Não chamamos login() aqui. O listener onAuthStateChange em useAuth.tsx
      // é a ÚNICA fonte da verdade para o role (lido de user_profiles) — chamar
      // login() aqui, em paralelo, criava uma condição de corrida entre dois
      // escritores do mesmo estado. A navegação abaixo usa o role escolhido
      // no formulário só para decidir o destino inicial; a autorização real
      // continua a ser feita pelo useAuth depois do redirecionamento.
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
      await authService.signInWithPassword(identifier, password, role, adminKey)
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

  // Handler único de submissão — corrige o bug em que premir Enter no passo
  // 'credentials' do registo disparava handleRegister directamente (com
  // otp ainda vazio), saltando por completo o envio do código. Agora a
  // tecla Enter em qualquer campo do formulário respeita o passo actual,
  // tal como o clique explícito no botão já fazia.
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isLogin) return handleLogin(e)
    if (step === 'credentials') return handleSendOtp()
    return handleRegister(e)
  }

  const visibleRole = role === 'admin' ? 'admin' : role

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-background relative overflow-hidden">

      {/* Fundo — uma única receita baseada no token `primary`, que já se
          adapta correctamente aos dois modos por si só (o --primary do
          index.css já tem valores diferentes para light/dark). Antes
          havia um gradiente de 3 cores no light, fundo plano no dark, e
          uma terceira orbe com `dark:hidden` — três receitas diferentes
          a fingir ser uma só página. */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-primary/[0.06] rounded-full blur-[100px]" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-primary/[0.08] rounded-full blur-[100px]" />
      </div>

      <Card className="w-full max-w-[440px] relative z-10 border rounded-lg overflow-hidden">
        <div className="p-8 sm:p-10">

          {/* Cabeçalho */}
          <div className="text-center mb-8">
            <div className="inline-flex justify-center mb-5 motion-safe:hover:scale-105 transition-transform duration-300">
              <Logo size="lg" showText={false} animated={false} />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">KAIRÓS</h1>
            <p className="text-[11px] font-medium tracking-wider uppercase text-primary mt-1">
              Missão Evangélica da Reconciliação
            </p>

            <div className="mt-6 space-y-1">
              <h2 className="text-lg font-semibold text-foreground tracking-tight">
                {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isLogin ? 'Continue sua jornada de fé' : 'Comece sua jornada connosco'}
              </p>
            </div>
          </div>

          {/* Selector de papel — mesmo padrão de abas usado em Agenda e
              Academy (bg-muted / bg-background), não cores de marca à mão */}
          <div className="grid grid-cols-2 gap-1 mb-6 p-1 bg-muted rounded-md" role="group" aria-label="Tipo de acesso">
            <button
              type="button"
              onClick={() => { setRole('member'); setShowAdminAccess(false); setAdminKey('') }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-sm font-medium text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                visibleRole === 'member' || role === 'admin'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-pressed={role === 'member' || role === 'admin'}
            >
              <Users className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
              Membro
            </button>

            <button
              type="button"
              onClick={() => { setRole('guest'); setShowAdminAccess(false); setAdminKey('') }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-sm font-medium text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                role === 'guest'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-pressed={role === 'guest'}
            >
              <Building2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
              Convidado
            </button>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-5" noValidate>

            {!isLogin && step === 'credentials' && (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-xs font-medium text-foreground/80">Nome de utilizador</Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground/60" aria-hidden="true" />
                    <Input id="username" type="text" value={username} onChange={e => setUsername(e.target.value)}
                      className="pl-11 h-11 rounded-md" placeholder="Seu nome de utilizador" required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-medium text-foreground/80">Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground/60" aria-hidden="true" />
                    <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                      className="pl-11 h-11 rounded-md" placeholder="(244) 923 456 789" required />
                  </div>
                </div>

                {role === 'guest' && (
                  // Opacidade sobre token, não sobre hex — bg-primary/5 adapta-se
                  // correctamente aos dois modos porque o próprio --primary já
                  // tem valores distintos para light/dark; opacidade sobre um
                  // hex fixo (#4A90A4/5) não tem essa propriedade.
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-md space-y-1.5">
                    <Label htmlFor="congregation" className="text-xs font-semibold text-primary">
                      Sua congregação
                    </Label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-3 h-4 w-4 text-primary/70" aria-hidden="true" />
                      <Input id="congregation" type="text" value={congregation}
                        onChange={e => setCongregation(e.target.value)}
                        className="pl-11 h-11 rounded-md bg-background"
                        placeholder="Nome da sua congregação" required />
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
                <Input id="identifier" type={isLogin ? 'text' : 'email'} value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  className="pl-11 h-11 rounded-md"
                  placeholder={isLogin ? 'Digite o seu acesso' : 'seu@email.com'}
                  required />
              </div>
            </div>

            {!isLogin && step === 'otp' && (
              <div className="p-4 bg-muted/40 border border-border rounded-md space-y-2 text-center">
                <Label htmlFor="otp" className="text-xs font-medium text-foreground">Código de verificação</Label>
                {/* Nota: maxLength=4 — vale confirmar que corresponde ao formato
                    real gerado por authService.sendOtp(); não alterei este
                    valor por não ter visibilidade da implementação. */}
                <div className="relative max-w-[160px] mx-auto">
                  <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" aria-hidden="true" />
                  <Input id="otp" type="text" value={otp} onChange={e => setOtp(e.target.value)}
                    className="pl-9 h-11 text-center text-xl tracking-widest font-semibold rounded-md"
                    placeholder="••••" maxLength={4} required />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-foreground/80">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground/60" aria-hidden="true" />
                <Input id="password" type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pl-11 pr-11 h-11 rounded-md" placeholder="••••••••••••" required />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-3 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {showAdminAccess && (
              // Âmbar mantido com os dois stops explícitos (não é um token
              // próprio da marca, ao contrário de primary) — mesmo padrão já
              // validado no alerta do Dashboard, funciona bem nos dois modos.
              <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 rounded-md space-y-1.5">
                <Label htmlFor="adminKey" className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" aria-hidden="true" />Chave de administrador
                </Label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-3 h-4 w-4 text-amber-700/60 dark:text-amber-400/60" aria-hidden="true" />
                  <Input id="adminKey" type="password" value={adminKey}
                    onChange={e => setAdminKey(e.target.value)}
                    className="pl-11 h-11 rounded-md bg-background"
                    placeholder="••••••••••••" required />
                </div>
              </div>
            )}

            <div className="pt-1">
              {!isLogin && step === 'credentials' ? (
                <Button type="button" onClick={handleSendOtp} disabled={loading || !identifier}
                  className="w-full h-11 rounded-md motion-safe:hover:-translate-y-0.5 transition-transform"
                >
                  {loading
                    ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Enviando...</span>
                    : 'Enviar código de verificação'}
                </Button>
              ) : (
                <Button type="submit" disabled={loading}
                  className="w-full h-11 rounded-md motion-safe:hover:-translate-y-0.5 transition-transform"
                >
                  {loading
                    ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{isLogin ? 'Entrando...' : 'Criando conta...'}</span>
                    : (isLogin ? 'Entrar' : 'Criar conta')}
                </Button>
              )}
            </div>
          </form>

          {isLogin && (role === 'member' || role === 'admin') && (
            <div>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                  <span className="px-3 bg-card text-muted-foreground">Ou continue com</span>
                </div>
              </div>

              {/* Ícone "Chrome" removido — era um ícone de navegador a
                  representar a marca Google, semanticamente errado. Mantido
                  apenas o texto, sem recriar o logótipo da Google (marca
                  registada). */}
              <Button type="button" variant="outline" onClick={() => handleOAuthLogin('google')}
                className="w-full h-11 rounded-md"
              >
                Continuar com Google
              </Button>
            </div>
          )}

          <div className="mt-7 text-center text-xs">
            <span className="text-muted-foreground">
              {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
            </span>{' '}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setStep('credentials'); setOtp('') }}
              className="text-primary font-medium hover:underline rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {isLogin ? 'Criar conta' : 'Entrar'}
            </button>
          </div>

          <div className="mt-7 text-center">
            <button
              type="button"
              onClick={handleToggleAdminAccess}
              className="text-[10px] tracking-wide text-muted-foreground/50 hover:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
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
