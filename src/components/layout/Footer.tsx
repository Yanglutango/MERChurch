import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Mail, Building2, CreditCard } from 'lucide-react'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Logo } from '../ui/logo'
import { useAppStore } from '../../stores/appStore'
import { toast } from 'sonner'

type PaymentMethod = 'iban' | 'mcx'

const Footer = () => {
  const navigate = useNavigate()
  const { t } = useAppStore()
  const [isDevSupportOpen, setIsDevSupportOpen] = useState(false)
  const [step, setStep] = useState<'form' | 'details'>('form')
  const [loading, setLoading] = useState(false)

  const [supportForm, setSupportForm] = useState({
    name: '',
    email: '',
    amount: '',
    message: '',
    method: 'iban' as PaymentMethod,
  })

  const validateEmail = (email: string) => /\S+@\S+\.\S+/.test(email)

  const handleContinue = () => {
    if (!supportForm.name.trim() || !supportForm.email.trim() || !supportForm.amount.trim()) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    if (!validateEmail(supportForm.email)) {
      toast.error('Email inválido')
      return
    }

    const amount = parseFloat(supportForm.amount.replace(',', '.'))
    if (isNaN(amount) || amount <= 0) {
      toast.error('Informe um valor válido')
      return
    }

    setStep('details')
  }

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await new Promise((res) => setTimeout(res, 800))
      setIsDevSupportOpen(false)
      setStep('form')
      setSupportForm({ name: '', email: '', amount: '', message: '', method: 'iban' })
      toast.success('Obrigado pelo seu apoio! 🙏')
    } catch {
      toast.error('Erro ao processar')
    } finally {
      setLoading(false)
    }
  }

  const devContact = {
    whatsapp: '+244 939 226 005',
    email: 'lutangoyanivo1234@gmail.com',
    iban: 'AO06 0055 0000 XXXX XXXX XXXX X',
    mcxNumber: '939 226 005',
  }

  return (
    <>
      <footer className="mt-20 border-t border-border/60 bg-muted/20">
        <div className="container-custom py-12">
          {/* Top Section */}
          <div className="grid md:grid-cols-4 gap-8 mb-10 pb-10 border-b border-border/50">
            {/* Logo & Mission */}
            <div className="md:col-span-2 space-y-4">
              <Logo size="md" showText={true} />
              <p className="text-sm text-muted-foreground leading-relaxed italic max-w-md">
                "Somos o Povo da Fé e a Geração dos Poderosos"
              </p>
              <p className="text-xs text-muted-foreground/70 leading-relaxed max-w-md">
                Missão Evangélica da Reconciliação — Transformando vidas através de Cristo desde 1989.
              </p>
            </div>

            {/* Links Grid */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-foreground/80 tracking-wider uppercase">Institucional</h4>
              <nav className="flex flex-col gap-2">
                <button onClick={() => navigate('/about')} className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left">
                  Sobre a MER
                </button>
                <button onClick={() => navigate('/ministries')} className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left">
                  Ministérios
                </button>
                <button onClick={() => navigate('/agenda')} className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left">
                  Agenda
                </button>
              </nav>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-foreground/80 tracking-wider uppercase">Espiritual</h4>
              <nav className="flex flex-col gap-2">
                <button onClick={() => navigate('/live')} className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left">
                  Ao Vivo
                </button>
                <button onClick={() => navigate('/sermons')} className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left">
                  Sermões
                </button>
                <button onClick={() => navigate('/prayer')} className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left">
                  Oração
                </button>
              </nav>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Copyright */}
            <div className="text-center sm:text-left">
              <p className="text-sm text-foreground/80">
                © {new Date().getFullYear()}{' '}
                <span className="font-bold text-gradient">KAIRÓS</span>
                <span className="text-muted-foreground"> • MER</span>
              </p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                Desenvolvido com <Heart className="inline h-3 w-3 text-red-500" /> para glorificar a Deus
              </p>
            </div>

            {/* Developer Support */}
            <Button
              onClick={() => setIsDevSupportOpen(true)}
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <Heart className="h-3.5 w-3.5 mr-1.5" />
              Apoiar Desenvolvedor
            </Button>
          </div>
        </div>
      </footer>

      {/* Developer Support Dialog */}
      <Dialog open={isDevSupportOpen} onOpenChange={(open) => {
        setIsDevSupportOpen(open)
        if (!open) {
          setStep('form')
          setSupportForm({ name: '', email: '', amount: '', message: '', method: 'iban' })
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              Apoiar o Desenvolvedor
            </DialogTitle>
          </DialogHeader>

          {step === 'form' ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Sua contribuição ajuda a manter e melhorar esta plataforma. Obrigado! 🙏
              </p>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="dev-name" className="text-sm">Nome *</Label>
                  <Input
                    id="dev-name"
                    value={supportForm.name}
                    onChange={(e) => setSupportForm({ ...supportForm, name: e.target.value })}
                    placeholder="Seu nome"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="dev-email" className="text-sm">Email *</Label>
                  <Input
                    id="dev-email"
                    type="email"
                    value={supportForm.email}
                    onChange={(e) => setSupportForm({ ...supportForm, email: e.target.value })}
                    placeholder="seu@email.com"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="dev-amount" className="text-sm">Valor (Kz) *</Label>
                  <Input
                    id="dev-amount"
                    type="text"
                    inputMode="decimal"
                    value={supportForm.amount}
                    onChange={(e) => setSupportForm({ ...supportForm, amount: e.target.value })}
                    placeholder="5000.00"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="dev-method" className="text-sm">Método de Pagamento *</Label>
                  <Select
                    value={supportForm.method}
                    onValueChange={(value: any) => setSupportForm({ ...supportForm, method: value })}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iban">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          IBAN
                        </div>
                      </SelectItem>
                      <SelectItem value="mcx">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          MCX
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="dev-message" className="text-sm">Mensagem (Opcional)</Label>
                  <Textarea
                    id="dev-message"
                    value={supportForm.message}
                    onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                    placeholder="Deixe uma mensagem..."
                    rows={3}
                    className="mt-1.5 resize-none"
                  />
                </div>

                <Button onClick={handleContinue} className="w-full gradient-primary text-white font-medium">
                  Continuar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 border border-primary/30 bg-primary/5 rounded-xl space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary rounded-lg">
                    <Heart className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Obrigado, {supportForm.name}!</h3>
                    <p className="text-sm text-muted-foreground">
                      Kz {parseFloat(supportForm.amount || '0').toLocaleString('pt-AO', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground space-y-2 pt-2 border-t border-border/50">
                  <p>
                    <span className="font-medium text-foreground">{supportForm.method === 'iban' ? 'IBAN' : 'MCX'}:</span>{' '}
                    <span className="font-mono text-xs">{supportForm.method === 'iban' ? devContact.iban : devContact.mcxNumber}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    <a className="underline hover:text-foreground text-xs" href={`mailto:${devContact.email}`}>
                      {devContact.email}
                    </a>
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setStep('form')} variant="outline" className="flex-1" size="sm">
                  Voltar
                </Button>
                <Button onClick={handleConfirm} className="flex-1 gradient-primary text-white" disabled={loading} size="sm">
                  {loading ? 'Processando...' : 'Concluir'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default Footer
