import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { authService } from '../lib/authService'
import { 
  Mail, Lock, User, Phone, Key, Loader2, Building2, Users, Shield, 
  Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, Zap
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card } from '../components/ui/card'
import { Logo } from '../components/ui/logo'
import { toast } from 'sonner'
import { cn } from '../lib/utils'

// ============================================================================
// TIPOS
// ============================================================================

type AuthMode = 'login' | 'register'
type AuthRole = 'member' | 'guest'
type RegistrationStep = 'credentials' | 'verification' | 'profile'

interface FormState {
  identifier: string
  password: string
  username: string
  phone: string
  congregation: string
  adminKey: string
  otp: string
  confirmPassword: string
}

interface AuthError {
  field?: keyof FormState
  message: string
}

interface ValidationResult {
  isValid: boolean
  errors: AuthError[]
}

// ============================================================================
// CONSTANTES
// ============================================================================

const INITIAL_FORM_STATE: FormState = {
  identifier: '',
  password: '',
  username: '',
  phone: '',
  congregation: '',
  adminKey: '',
  otp: '',
  confirmPassword: '',
}

const OTP_LENGTH = 6
const OTP_EXPIRY_MINUTES = 10
const PASSWORD_MIN_LENGTH = 8

const VALIDATION_RULES = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[0-9+\-\s()]{7,}$/,
  username: /^[a-zA-Z0-9_]{3,20}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
}

const TRANSITION_DURATION = 300

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const AuthPage = () => {
  const navigate = useNavigate()

  // Estados de UI
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [role, setRole] = useState<AuthRole>('member')
  const [registrationStep, setRegistrationStep] = useState<RegistrationStep>('credentials')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showAdminAccess, setShowAdminAccess] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otpExpiry, setOtpExpiry] = useState<number | null>(null)
  const [countdown, setCountdown] = useState(0)

  // Estados de validação
  const [errors, setErrors] = useState<AuthError[]>([])
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({})

  // Form state
  const [form, setForm] = useState<FormState>(INITIAL_FORM_STATE)

  // Timer para OTP
  useEffect(() => {
    if (!otpExpiry) return

    const interval = setInterval(() => {
      const now = Date.now()
      const remaining = Math.ceil((otpExpiry - now) / 1000)

      if (remaining <= 0) {
        setOtpExpiry(null)
        setCountdown(0)
        setOtp('')
        clearInterval(interval)
      } else {
        setCountdown(remaining)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [otpExpiry])

  // ========================================================================
  // VALIDAÇÕES
  // ========================================================================

  const validateField = useCallback(
    (field: keyof FormState, value: string): AuthError[] => {
      const fieldErrors: AuthError[] = []

      switch (field) {
        case 'identifier': {
          if (!value) {
            fieldErrors.push({ field, message: 'Email é obrigatório' })
          } else if (!VALIDATION_RULES.email.test(value)) {
            fieldErrors.push({ field, message: 'Email inválido' })
          }
          break
        }

        case 'password': {
          if (!value) {
            fieldErrors.push({ field, message: 'Senha é obrigatória' })
          } else if (value.length < PASSWORD_MIN_LENGTH) {
            fieldErrors.push({
              field,
              message: `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`,
            })
          } else if (authMode === 'register' && !VALIDATION_RULES.password.test(value)) {
            fieldErrors.push({
              field,
              message: 'Senha fraca. Use maiúsculas, números e símbolos',
            })
          }
          break
        }

        case 'confirmPassword': {
          if (authMode === 'register' && value !== form.password) {
            fieldErrors.push({ field, message: 'Senhas não coincidem' })
          }
          break
        }

        case 'username': {
          if (!value) {
            fieldErrors.push({ field, message: 'Nome de utilizador é obrigatório' })
          } else if (!VALIDATION_RULES.username.test(value)) {
            fieldErrors.push({
              field,
              message: 'Use 3-20 caracteres (letras, números, _)',
            })
          }
          break
        }

        case 'phone': {
          if (!value) {
            fieldErrors.push({ field, message: 'Telefone é obrigatório' })
          } else if (!VALIDATION_RULES.phone.test(value)) {
            fieldErrors.push({ field, message: 'Telefone inválido' })
          }
          break
        }

        case 'congregation': {
          if (role === 'guest' && !value) {
            fieldErrors.push({ field, message: 'Congregação é obrigatória' })
          }
          break
        }

        case 'otp': {
          if (!value) {
            fieldErrors.push({ field, message: 'Código é obrigatório' })
          } else if (value.length !== OTP_LENGTH) {
            fieldErrors.push({
              field,
              message: `Código deve ter ${OTP_LENGTH} dígitos`,
            })
          }
          break
        }

        case 'adminKey': {
          if (showAdminAccess && !value) {
            fieldErrors.push({ field, message: 'Chave de admin é obrigatória' })
          }
          break
        }
      }

      return fieldErrors
    },
    [authMode, form.password, role, showAdminAccess]
  )

  const validateForm = useCallback((): ValidationResult => {
    const fieldsToValidate: (keyof FormState)[] = ['identifier', 'password']

    if (authMode === 'register') {
      if (registrationStep === 'credentials') {
        fieldsToValidate.push('confirmPassword', 'username', 'phone')
        if (role === 'guest') fieldsToValidate.push('congregation')
      } else if (registrationStep === 'verification') {
        fieldsToValidate.push('otp')
      }
    }

    if (showAdminAccess) fieldsToValidate.push('adminKey')

    const allErrors = fieldsToValidate.flatMap(field =>
      validateField(field, form[field])
    )

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
    }
  }, [authMode, registrationStep, role, showAdminAccess, form, validateField])

  // ========================================================================
  // HANDLERS DE FORM
  // ========================================================================

  const updateForm = useCallback((field: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))

    // Validação em tempo real após touched
    if (touched[field]) {
      const fieldErrors = validateField(field, value)
      setErrors(prev => prev.filter(e => e.field !== field).concat(fieldErrors))
    }
  }, [touched, validateField])

  const handleFieldBlur = useCallback((field: keyof FormState) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    const fieldErrors = validateField(field, form[field])
    setErrors(prev => prev.filter(e => e.field !== field).concat(fieldErrors))
  }, [form, validateField])

  const getFieldError = useCallback(
    (field: keyof FormState): string | undefined => {
      return errors.find(e => e.field === field)?.message
    },
    [errors]
  )

  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM_STATE)
    setErrors([])
    setTouched({})
    setRegistrationStep('credentials')
    setOtpSent(false)
    setOtpExpiry(null)
    setCountdown(0)
  }, [])

  const handleToggleMode = useCallback(() => {
    resetForm()
    setAuthMode(authMode === 'login' ? 'register' : 'login')
    setShowAdminAccess(false)
  }, [authMode, resetForm])

  const handleSetRole = useCallback((newRole: AuthRole) => {
    setRole(newRole)
    setShowAdminAccess(false)
    updateForm('adminKey', '')
    updateForm('congregation', '')
  }, [updateForm])

  const handleToggleAdminAccess = useCallback(() => {
    setShowAdminAccess(!showAdminAccess)
    if (!showAdminAccess) {
      setTouched(prev => ({ ...prev, adminKey: false }))
    }
  }, [showAdminAccess])

  // ========================================================================
  // FLUXOS DE AUTENTICAÇÃO
  // ========================================================================

  const handleSendOtp = useCallback(async () => {
    const validation = validateForm()
    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }

    setLoading(true)
    try {
      await authService.sendOtp(form.identifier)

      setOtpSent(true)
      setRegistrationStep('verification')
      setOtpExpiry(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

      toast.success('Código enviado! Verifique seu email')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar código')
    } finally {
      setLoading(false)
    }
  }, [form.identifier, validateForm])

  const handleResendOtp = useCallback(async () => {
    if (countdown > 0) {
      toast.error(`Aguarde ${countdown}s antes de reenviar`)
      return
    }

    await handleSendOtp()
  }, [countdown, handleSendOtp])

  const handleRegister = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      const validation = validateForm()
      if (!validation.isValid) {
        setErrors(validation.errors)
        toast.error('Corrija os erros no formulário')
        return
      }

      setLoading(true)
      try {
        await authService.verifyOtpAndRegister({
          email: form.identifier,
          otp: form.otp,
          password: form.password,
          username: form.username,
          phone: form.phone,
          role,
          adminKey: showAdminAccess ? form.adminKey : undefined,
          congregation: role === 'guest' ? form.congregation : undefined,
        })

        resetForm()
        toast.success('Conta criada com sucesso! Bem-vindo!')
        navigate(role === 'guest' ? '/home' : '/dashboard', { replace: true })
      } catch (error: any) {
        toast.error(error.message || 'Erro ao criar conta')
      } finally {
        setLoading(false)
      }
    },
    [form, role, showAdminAccess, validateForm, resetForm, navigate]
  )

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      const validation = validateForm()
      if (!validation.isValid) {
        setErrors(validation.errors)
        return
      }

      setLoading(true)
      try {
        await authService.signInWithPassword({
          identifier: form.identifier,
          password: form.password,
          role,
          adminKey: showAdminAccess ? form.adminKey : undefined,
        })

        resetForm()
        toast.success('Login realizado com sucesso!')
        navigate(role === 'guest' ? '/home' : '/dashboard', { replace: true })
      } catch (error: any) {
        toast.error(error.message || 'Email ou senha incorretos')
      } finally {
        setLoading(false)
      }
    },
    [form, role, showAdminAccess, validateForm, resetForm, navigate]
  )

  const handleOAuthLogin = useCallback(
    async (provider: 'google') => {
      setLoading(true)
      try {
        await authService.signInWithOAuth({
          provider,
          role,
          adminKey: showAdminAccess ? form.adminKey : undefined,
        })

        resetForm()
        toast.success('Login realizado com sucesso!')
        navigate(role === 'guest' ? '/home' : '/dashboard', { replace: true })
      } catch (error: any) {
        toast.error(error.message || 'Erro ao fazer login')
      } finally {
        setLoading(false)
      }
    },
    [form.adminKey, role, showAdminAccess, resetForm, navigate]
  )

  const handleFormSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      if (authMode === 'login') {
        return handleLogin(e)
      }

      if (registrationStep === 'credentials') {
        return handleSendOtp()
      }

      return handleRegister(e)
    },
    [authMode, registrationStep, handleLogin, handleSendOtp, handleRegister]
  )

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Decorative background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-primary/[0.06] rounded-full blur-[100px] animate-float" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-primary/[0.08] rounded-full blur-[100px] animate-float animation-delay-2000" />
      </div>

      {/* Main Card */}
      <Card className="w-full max-w-[480px] relative z-10 border border-border/50 rounded-2xl overflow-hidden shadow-lg backdrop-blur-sm bg-card/95">
        <div className="p-8 sm:p-10">
          {/* Header */}
          <HeaderSection authMode={authMode} />

          {/* Role Selector */}
          <RoleSelector
            role={role}
            onRoleChange={handleSetRole}
            disabled={loading}
          />

          {/* Form */}
          <form onSubmit={handleFormSubmit} className="space-y-6 mt-8" noValidate>
            {/* Registration: Credentials Step */}
            {authMode === 'register' && registrationStep === 'credentials' && (
              <CredentialsStep
                form={form}
                role={role}
                errors={errors}
                touched={touched}
                onFieldChange={updateForm}
                onFieldBlur={handleFieldBlur}
                getFieldError={getFieldError}
              />
            )}

            {/* Email Field */}
            <FormField
              id="identifier"
              label={authMode === 'login' ? 'Email, utilizador ou telefone' : 'Email'}
              placeholder={authMode === 'login' ? 'seu@email.com' : 'seu@email.com'}
              icon={Mail}
              type="email"
              value={form.identifier}
              error={getFieldError('identifier')}
              touched={touched.identifier}
              onChange={(v) => updateForm('identifier', v)}
              onBlur={() => handleFieldBlur('identifier')}
              disabled={loading || (authMode === 'register' && otpSent)}
            />

            {/* Registration: Verification Step */}
            {authMode === 'register' && registrationStep === 'verification' && (
              <OtpSection
                value={form.otp}
                error={getFieldError('otp')}
                touched={touched.otp}
                onChange={(v) => updateForm('otp', v)}
                onBlur={() => handleFieldBlur('otp')}
                countdown={countdown}
                onResend={handleResendOtp}
                disabled={loading}
              />
            )}

            {/* Password Field */}
            <PasswordField
              id="password"
              label="Senha"
              value={form.password}
              showPassword={showPassword}
              error={getFieldError('password')}
              touched={touched.password}
              onChange={(v) => updateForm('password', v)}
              onBlur={() => handleFieldBlur('password')}
              onToggleShow={() => setShowPassword(!showPassword)}
              disabled={loading}
              showStrength={authMode === 'register'}
            />

            {/* Confirm Password Field (Register Only) */}
            {authMode === 'register' && (
              <PasswordField
                id="confirmPassword"
                label="Confirmar senha"
                value={form.confirmPassword}
                showPassword={showConfirmPassword}
                error={getFieldError('confirmPassword')}
                touched={touched.confirmPassword}
                onChange={(v) => updateForm('confirmPassword', v)}
                onBlur={() => handleFieldBlur('confirmPassword')}
                onToggleShow={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
              />
            )}

            {/* Admin Key Field */}
            {showAdminAccess && (
              <AdminKeyField
                value={form.adminKey}
                error={getFieldError('adminKey')}
                touched={touched.adminKey}
                onChange={(v) => updateForm('adminKey', v)}
                onBlur={() => handleFieldBlur('adminKey')}
                disabled={loading}
              />
            )}

            {/* Submit Button */}
            <SubmitButton
              authMode={authMode}
              registrationStep={registrationStep}
              loading={loading}
              disabled={loading}
              onSubmit={handleFormSubmit}
              onSendOtp={handleSendOtp}
            />
          </form>

          {/* OAuth Section (Login Only) */}
          {authMode === 'login' && (
            <OAuthSection
              role={role}
              loading={loading}
              onLoginGoogle={() => handleOAuthLogin('google')}
            />
          )}

          {/* Admin Access Toggle */}
          <AdminAccessToggle
            showAdminAccess={showAdminAccess}
            onToggle={handleToggleAdminAccess}
            disabled={loading}
          />

          {/* Mode Toggle */}
          <ModeToggle
            authMode={authMode}
            onToggle={handleToggleMode}
            disabled={loading}
          />
        </div>
      </Card>
    </div>
  )
}

// ============================================================================
// SUB-COMPONENTES
// ============================================================================

interface HeaderSectionProps {
  authMode: AuthMode
}

const HeaderSection = ({ authMode }: HeaderSectionProps) => (
  <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
    <div className="inline-flex justify-center mb-6 motion-safe:hover:scale-110 transition-transform duration-300">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
        <Logo size="lg" showText={false} animated={false} />
      </div>
    </div>

    <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">
      KAIRÓS
    </h1>
    <p className="text-xs font-semibold tracking-widest uppercase text-primary/70 mb-6">
      Missão Evangélica da Reconciliação
    </p>

    <div className="space-y-2">
      <h2 className="text-xl font-semibold text-foreground tracking-tight">
        {authMode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
      </h2>
      <p className="text-sm text-muted-foreground">
        {authMode === 'login'
          ? 'Continue sua jornada de fé conosco'
          : 'Comece sua jornada na comunidade KAIRÓS'}
      </p>
    </div>
  </div>
)

interface RoleSelectorProps {
  role: AuthRole
  onRoleChange: (role: AuthRole) => void
  disabled: boolean
}

const RoleSelector = ({ role, onRoleChange, disabled }: RoleSelectorProps) => (
  <div
    className="grid grid-cols-2 gap-2 p-1 bg-muted/60 rounded-lg backdrop-blur-sm border border-border/50 animate-in fade-in slide-in-from-top-2 duration-500 delay-100"
    role="group"
    aria-label="Tipo de acesso"
  >
    {(['member', 'guest'] as const).map((roleOption) => (
      <button
        key={roleOption}
        type="button"
        onClick={() => onRoleChange(roleOption)}
        disabled={disabled}
        className={cn(
          'flex items-center justify-center gap-2.5 py-2.5 px-3 rounded-md font-medium text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
          role === roleOption
            ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25 scale-105'
            : 'text-muted-foreground hover:text-foreground bg-background/50 hover:bg-background'
        )}
        aria-pressed={role === roleOption}
      >
        {roleOption === 'member' ? (
          <Users className="h-4 w-4" strokeWidth={2} />
        ) : (
          <Building2 className="h-4 w-4" strokeWidth={2} />
        )}
        <span>{roleOption === 'member' ? 'Membro' : 'Convidado'}</span>
      </button>
    ))}
  </div>
)

interface FormFieldProps {
  id: string
  label: string
  placeholder: string
  icon: React.ElementType
  type?: string
  value: string
  error?: string
  touched?: boolean
  onChange: (value: string) => void
  onBlur: () => void
  disabled?: boolean
}

const FormField = ({
  id,
  label,
  placeholder,
  icon: Icon,
  type = 'text',
  value,
  error,
  touched,
  onChange,
  onBlur,
  disabled,
}: FormFieldProps) => {
  const hasError = touched && error

  return (
    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-500">
      <Label
        htmlFor={id}
        className={cn(
          'text-xs font-semibold transition-colors',
          hasError ? 'text-destructive' : 'text-foreground/80'
        )}
      >
        {label}
      </Label>

      <div className="relative group">
        <Icon
          className={cn(
            'absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200 pointer-events-none',
            hasError ? 'text-destructive/50' : 'text-muted-foreground/60 group-focus-within:text-primary'
          )}
          aria-hidden="true"
        />

        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          className={cn(
            'pl-10 h-11 rounded-lg border transition-all duration-200',
            hasError
              ? 'border-destructive/50 bg-destructive/5 focus:border-destructive focus:ring-destructive/20'
              : 'border-border/60 focus:border-primary focus:ring-primary/20',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          placeholder={placeholder}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
          required
        />

        {hasError && (
          <AlertCircle className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive animate-in spin-in-180 duration-300" />
        )}
      </div>

      {hasError && (
        <p id={`${id}-error`} className="text-xs text-destructive animate-in fade-in slide-in-from-top-1 duration-200">
          {error}
        </p>
      )}
    </div>
  )
}

interface CredentialsStepProps {
  form: FormState
  role: AuthRole
  errors: AuthError[]
  touched: Partial<Record<keyof FormState, boolean>>
  onFieldChange: (field: keyof FormState, value: string) => void
  onFieldBlur: (field: keyof FormState) => void
  getFieldError: (field: keyof FormState) => string | undefined
}

const CredentialsStep = ({
  form,
  role,
  errors,
  touched,
  onFieldChange,
  onFieldBlur,
  getFieldError,
}: CredentialsStepProps) => (
  <div className="space-y-5 animate-in fade-in slide-in-from-left-4 duration-500">
    <FormField
      id="username"
      label="Nome de utilizador"
      placeholder="seuusuario"
      icon={User}
      value={form.username}
      error={getFieldError('username')}
      touched={touched.username}
      onChange={(v) => onFieldChange('username', v)}
      onBlur={() => onFieldBlur('username')}
    />

    <FormField
      id="phone"
      label="Telefone"
      placeholder="+244 923 456 789"
      icon={Phone}
      type="tel"
      value={form.phone}
      error={getFieldError('phone')}
      touched={touched.phone}
      onChange={(v) => onFieldChange('phone', v)}
      onBlur={() => onFieldBlur('phone')}
    />

    {role === 'guest' && (
      <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-lg space-y-2 animate-in fade-in slide-in-from-left-4 duration-500 delay-75">
        <Label htmlFor="congregation" className="text-xs font-semibold text-primary flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5" />
          Sua congregação
        </Label>
        <div className="relative">
          <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/70 pointer-events-none" />
          <Input
            id="congregation"
            type="text"
            value={form.congregation}
            onChange={(e) => onFieldChange('congregation', e.target.value)}
            onBlur={() => onFieldBlur('congregation')}
            className="pl-10 h-11 rounded-lg bg-background/50 border border-primary/20 focus:border-primary focus:ring-primary/20"
            placeholder="Nome da sua congregação"
            required
          />
        </div>
      </div>
    )}
  </div>
)

interface PasswordFieldProps {
  id: string
  label: string
  value: string
  showPassword: boolean
  error?: string
  touched?: boolean
  onChange: (value: string) => void
  onBlur: () => void
  onToggleShow: () => void
  disabled?: boolean
  showStrength?: boolean
}

const PasswordField = ({
  id,
  label,
  value,
  showPassword,
  error,
  touched,
  onChange,
  onBlur,
  onToggleShow,
  disabled,
  showStrength,
}: PasswordFieldProps) => {
  const hasError = touched && error
  const strength = calculatePasswordStrength(value)

  return (
    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-500">
      <Label
        htmlFor={id}
        className={cn(
          'text-xs font-semibold transition-colors',
          hasError ? 'text-destructive' : 'text-foreground/80'
        )}
      >
        {label}
      </Label>

      <div className="relative group">
        <Lock
          className={cn(
            'absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200 pointer-events-none',
            hasError ? 'text-destructive/50' : 'text-muted-foreground/60 group-focus-within:text-primary'
          )}
          aria-hidden="true"
        />

        <Input
          id={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          className={cn(
            'pl-10 pr-11 h-11 rounded-lg border transition-all duration-200',
            hasError
              ? 'border-destructive/50 bg-destructive/5 focus:border-destructive focus:ring-destructive/20'
              : 'border-border/60 focus:border-primary focus:ring-primary/20'
          )}
          placeholder="••••••••••"
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
          required
        />

        <button
          type="button"
          onClick={onToggleShow}
          disabled={disabled}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors disabled:opacity-50"
          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {hasError && (
        <p id={`${id}-error`} className="text-xs text-destructive animate-in fade-in slide-in-from-top-1 duration-200">
          {error}
        </p>
      )}

      {showStrength && value && !hasError && (
        <PasswordStrengthIndicator strength={strength} />
      )}
    </div>
  )
}

interface OtpSectionProps {
  value: string
  error?: string
  touched?: boolean
  onChange: (value: string) => void
  onBlur: () => void
  countdown: number
  onResend: () => void
  disabled: boolean
}

const OtpSection = ({
  value,
  error,
  touched,
  onChange,
  onBlur,
  countdown,
  onResend,
  disabled,
}: OtpSectionProps) => {
  const hasError = touched && error

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="p-4 bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-950/20 dark:to-blue-900/10 border border-blue-200/50 dark:border-blue-800/30 rounded-lg space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
            Código de verificação
          </p>
        </div>

        <p className="text-xs text-blue-600/70 dark:text-blue-400/70">
          Enviámos um código de 6 dígitos para o seu email. Insira-o abaixo.
        </p>

        <div className="relative">
          <Key
            className={cn(
              'absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors',
              hasError ? 'text-destructive/50' : 'text-blue-600/60'
            )}
            aria-hidden="true"
          />

          <Input
            type="text"
            inputMode="numeric"
            value={value}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '')
              if (val.length <= OTP_LENGTH) onChange(val)
            }}
            onBlur={onBlur}
            disabled={disabled}
            className={cn(
              'pl-10 h-12 text-center text-2xl tracking-[0.5em] font-semibold font-mono rounded-lg border',
              hasError
                ? 'border-destructive/50 bg-destructive/5'
                : 'border-blue-200/50 dark:border-blue-800/30 bg-background'
            )}
            placeholder="000000"
            maxLength={OTP_LENGTH}
            required
          />
        </div>

        {hasError && (
          <p className="text-xs text-destructive flex items-center gap-1 animate-in fade-in">
            <AlertCircle className="h-3 w-3" />
            {error}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {countdown > 0 ? (
            <span>Reenviar em <span className="font-semibold text-primary">{countdown}s</span></span>
          ) : (
            <span>Não recebeu o código?</span>
          )}
        </p>

        <button
          type="button"
          onClick={onResend}
          disabled={disabled || countdown > 0}
          className={cn(
            'text-xs font-semibold transition-all',
            countdown > 0
              ? 'text-muted-foreground/50 cursor-not-allowed'
              : 'text-primary hover:text-primary/80'
          )}
        >
          Reenviar
        </button>
      </div>
    </div>
  )
}

interface AdminKeyFieldProps {
  value: string
  error?: string
  touched?: boolean
  onChange: (value: string) => void
  onBlur: () => void
  disabled?: boolean
}

const AdminKeyField = ({
  value,
  error,
  touched,
  onChange,
  onBlur,
  disabled,
}: AdminKeyFieldProps) => {
  const hasError = touched && error

  return (
    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="p-4 bg-gradient-to-br from-amber-50/50 to-amber-100/30 dark:from-amber-950/30 dark:to-amber-900/20 border border-amber-200/50 dark:border-amber-800/40 rounded-lg space-y-2">
        <Label className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-2">
          <Shield className="h-3.5 w-3.5" />
          Chave de administrador
        </Label>

        <div className="relative group">
          <Key
            className={cn(
              'absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors pointer-events-none',
              hasError
                ? 'text-destructive/50'
                : 'text-amber-700/60 dark:text-amber-400/60 group-focus-within:text-amber-700 dark:group-focus-within:text-amber-400'
            )}
            aria-hidden="true"
          />

          <Input
            type="password"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            disabled={disabled}
            className={cn(
              'pl-10 h-11 rounded-lg border transition-all duration-200 bg-background',
              hasError
                ? 'border-destructive/50 focus:border-destructive focus:ring-destructive/20'
                : 'border-amber-200/50 dark:border-amber-800/40 focus:border-amber-600 dark:focus:border-amber-400 focus:ring-amber-600/20'
            )}
            placeholder="••••••••••"
            required
          />
        </div>

        {hasError && (
          <p className="text-xs text-destructive flex items-center gap-1 animate-in fade-in">
            <AlertCircle className="h-3 w-3" />
            {error}
          </p>
        )}
      </div>
    </div>
  )
}

interface SubmitButtonProps {
  authMode: AuthMode
  registrationStep: RegistrationStep
  loading: boolean
  disabled: boolean
  onSubmit: (e: React.FormEvent) => void
  onSendOtp: () => void
}

const SubmitButton = ({
  authMode,
  registrationStep,
  loading,
  disabled,
  onSubmit,
  onSendOtp,
}: SubmitButtonProps) => {
  const isRegisterCredentials = authMode === 'register' && registrationStep === 'credentials'
  const buttonText =
    authMode === 'login'
      ? 'Entrar'
      : registrationStep === 'credentials'
        ? 'Enviar código de verificação'
        : 'Criar conta'

  const loadingText =
    authMode === 'login'
      ? 'Entrando...'
      : registrationStep === 'credentials'
        ? 'Enviando...'
        : 'Criando conta...'

  return (
    <div className="pt-2 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
      <Button
        type={isRegisterCredentials ? 'button' : 'submit'}
        onClick={isRegisterCredentials ? onSendOtp : onSubmit}
        disabled={disabled}
        className={cn(
          'w-full h-12 rounded-lg font-semibold transition-all duration-200',
          'bg-gradient-to-r from-primary to-primary/90 hover:shadow-lg hover:shadow-primary/30',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          'motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0'
        )}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {loadingText}
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            {buttonText}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        )}
      </Button>
    </div>
  )
}

interface OAuthSectionProps {
  role: AuthRole
  loading: boolean
  onLoginGoogle: () => void
}

const OAuthSection = ({ role, loading, onLoginGoogle }: OAuthSectionProps) => (
  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
    <div className="relative my-7">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full h-px bg-gradient-to-r from-border via-border to-border" />
      </div>
      <div className="relative flex justify-center">
        <span className="px-3 text-xs font-semibold tracking-wider uppercase text-muted-foreground bg-card">
          Ou continue com
        </span>
      </div>
    </div>

    <Button
      type="button"
      variant="outline"
      onClick={onLoginGoogle}
      disabled={loading}
      className={cn(
        'w-full h-11 rounded-lg border border-border/60 transition-all duration-200',
        'hover:bg-muted hover:border-border',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      )}
    >
      <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      Continuar com Google
    </Button>
  </div>
)

interface AdminAccessToggleProps {
  showAdminAccess: boolean
  onToggle: () => void
  disabled: boolean
}

const AdminAccessToggle = ({ showAdminAccess, onToggle, disabled }: AdminAccessToggleProps) => (
  <div className="mt-8 text-center animate-in fade-in duration-500 delay-500">
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        'text-xs font-semibold tracking-wide transition-all duration-200',
        showAdminAccess
          ? 'text-amber-600 dark:text-amber-400 hover:text-amber-700'
          : 'text-muted-foreground/60 hover:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded px-2 py-1',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      )}
      aria-expanded={showAdminAccess}
    >
      {showAdminAccess ? '⊗ Ocultar acesso administrativo' : '⊕ Acesso administrativo'}
    </button>
  </div>
)

interface ModeToggleProps {
  authMode: AuthMode
  onToggle: () => void
  disabled: boolean
}

const ModeToggle = ({ authMode, onToggle, disabled }: ModeToggleProps) => (
  <div className="mt-6 text-center animate-in fade-in duration-500 delay-500">
    <p className="text-xs text-muted-foreground">
      {authMode === 'login' ? 'Não tem uma conta?' : 'Já tem uma conta?'}
    </p>
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        'mt-2 text-sm font-semibold text-primary hover:text-primary/80 transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-2 py-1',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      )}
    >
      {authMode === 'login' ? 'Criar conta' : 'Voltar para login'}
    </button>
  </div>
)

interface PasswordStrengthIndicatorProps {
  strength: 'weak' | 'fair' | 'good' | 'strong'
}

const PasswordStrengthIndicator = ({ strength }: PasswordStrengthIndicatorProps) => {
  const strengthConfig = {
    weak: { color: 'bg-destructive', label: 'Fraca', width: 'w-1/4' },
    fair: { color: 'bg-yellow-500', label: 'Razoável', width: 'w-2/4' },
    good: { color: 'bg-blue-500', label: 'Boa', width: 'w-3/4' },
    strong: { color: 'bg-green-500', label: 'Forte', width: 'w-full' },
  }

  const config = strengthConfig[strength]

  return (
    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-300">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Força da senha</span>
        <span className={cn('text-xs font-semibold', `text-${config.color.split('-')[1]}`)}>
          {config.label}
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full transition-all duration-300 rounded-full', config.color)}
          style={{ width: config.width }}
        />
      </div>
    </div>
  )
}

// ============================================================================
// UTILIDADES
// ============================================================================

const calculatePasswordStrength = (password: string): 'weak' | 'fair' | 'good' | 'strong' => {
  let score = 0

  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password)) score++
  if (/[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[@$!%*?&]/.test(password)) score++

  if (score <= 2) return 'weak'
  if (score <= 3) return 'fair'
  if (score <= 4) return 'good'
  return 'strong'
}

export default AuthPage
