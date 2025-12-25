import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { authService } from '../lib/authService'
import { Mail, Lock, User, Phone, Key, Loader2, Chrome, Apple as AppleIcon, Building2, Users, Shield } from 'lucide-react'
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

  // Form fields
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [congregation, setCongregation] = useState('')
  const [adminKey, setAdminKey] = useState('')
  const [otp, setOtp] = useState('')

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

  const handleOAuthLogin = async (provider: 'google' | 'apple' | 'facebook') => {
    try {
      await authService.signInWithOAuth(provider, role, adminKey)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer login')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border shadow-2xl elevation-3">
        <div className="p-8">
          {/* Header with logo */}
          <div className="text-center mb-8">
            <div className="inline-flex justify-center mb-4">
              <Logo size="lg" showText={false} animated={false} />
            </div>
            <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              MER
            </h1>
            <p className="text-sm text-muted-foreground mb-4">Missão Evangélica da Reconciliação</p>
            
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground mb-1">
                {isLogin ? 'Bem-vindo de Volta' : 'Junte-se à Nossa Comunidade'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isLogin ? 'Continue sua jornada de fé' : 'Comece sua jornada conosco'}
              </p>
            </div>
          </div>

          {/* Role Selector */}
          <div className="grid grid-cols-3 gap-2 mb-6 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setRole('member')}
              className={`py-2.5 px-3 rounded-md font-medium text-sm transition-all ${
                role === 'member'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="h-4 w-4 mx-auto mb-1" />
              <span className="text-xs">Membro</span>
            </button>
            
            <button
              onClick={() => setRole('guest')}
              className={`py-2.5 px-3 rounded-md font-medium text-sm transition-all ${
                role === 'guest'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Building2 className="h-4 w-4 mx-auto mb-1" />
              <span className="text-xs">Convidado</span>
            </button>
            
            <button
              onClick={() => setRole('admin')}
              className={`py-2.5 px-3 rounded-md font-medium text-sm transition-all ${
                role === 'admin'
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Shield className="h-4 w-4 mx-auto mb-1" />
              <span className="text-xs">Admin</span>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
            {!isLogin && step === 'credentials' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="username">Nome de Usuário</Label>
                  <div className="relative mt-1.5">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10"
                      placeholder="Seu nome de usuário"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <div className="relative mt-1.5">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10"
                      placeholder="(244) 999-999-999"
                      required
                    />
                  </div>
                </div>

                {role === 'guest' && (
                  <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg">
                    <Label htmlFor="congregation" className="text-accent">Sua Congregação</Label>
                    <div className="relative mt-1.5">
                      <Building2 className="absolute left-3 top-3 h-4 w-4 text-accent" />
                      <Input
                        id="congregation"
                        type="text"
                        value={congregation}
                        onChange={(e) => setCongregation(e.target.value)}
                        className="pl-10 border-accent/30"
                        placeholder="Nome da sua congregação"
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Compartilhe de qual congregação você faz parte
                    </p>
                  </div>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="identifier">
                {isLogin ? 'Email, Usuário ou Telefone' : 'Email'}
              </Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="identifier"
                  type={isLogin ? 'text' : 'email'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="pl-10"
                  placeholder={isLogin ? 'Digite email, usuário ou telefone' : 'seu@email.com'}
                  required
                />
              </div>
            </div>

            {!isLogin && step === 'otp' && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <Label htmlFor="otp" className="text-primary">Código de Verificação</Label>
                <div className="relative mt-1.5">
                  <Key className="absolute left-3 top-3 h-4 w-4 text-primary" />
                  <Input
                    id="otp"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="pl-10 text-center text-xl tracking-widest font-semibold"
                    placeholder="••••"
                    maxLength={4}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Digite o código de 4 dígitos enviado para seu email
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="password">Senha</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {role === 'admin' && (
              <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg">
                <Label htmlFor="adminKey" className="text-accent flex items-center gap-2">
                  <Shield className="h-3 w-3" />
                  Chave de Administrador
                </Label>
                <div className="relative mt-1.5">
                  <Key className="absolute left-3 top-3 h-4 w-4 text-accent" />
                  <Input
                    id="adminKey"
                    type="password"
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    className="pl-10 border-accent/30"
                    placeholder="••••••••••••"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Chave secreta para acesso administrativo
                </p>
              </div>
            )}

            {!isLogin && step === 'credentials' ? (
              <Button
                type="button"
                onClick={handleSendOtp}
                disabled={loading || !identifier}
                className="w-full gradient-primary text-white font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar Código de Verificação'
                )}
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={loading}
                className={`w-full font-semibold ${
                  role === 'admin' ? 'gradient-warm' : 'gradient-primary'
                } text-white`}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isLogin ? 'Entrando...' : 'Criando conta...'}
                  </>
                ) : isLogin ? (
                  'Entrar'
                ) : (
                  'Criar Conta'
                )}
              </Button>
            )}
          </form>

          {/* OAuth */}
          {isLogin && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-card text-muted-foreground">Ou continue com</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOAuthLogin('google')}
                  className="font-medium"
                >
                  <Chrome className="mr-2 h-4 w-4" />
                  Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOAuthLogin('apple')}
                  className="font-medium"
                >
                  <AppleIcon className="mr-2 h-4 w-4" />
                  Apple
                </Button>
              </div>
            </>
          )}

          {/* Toggle Login/Register */}
          <div className="mt-6 text-center">
            <div className="text-sm">
              <span className="text-muted-foreground">
                {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
              </span>{' '}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin)
                  setStep('credentials')
                  setOtp('')
                }}
                className="text-primary font-semibold hover:underline"
              >
                {isLogin ? 'Criar conta' : 'Entrar'}
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default AuthPage
