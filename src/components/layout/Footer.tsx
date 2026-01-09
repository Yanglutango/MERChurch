import { useState, useEffect } from 'react'
import { Heart, DollarSign, CreditCard, Building2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Card } from '../ui/card'
import { toast } from 'sonner'

type PaymentMethod = 'iban' | 'mcx'

const Footer = () => {
  const [isDevSupportOpen, setIsDevSupportOpen] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [loading, setLoading] = useState(false)

  const [supportForm, setSupportForm] = useState({
    name: '',
    email: '',
    amount: '',
    message: '',
    method: 'iban' as PaymentMethod,
  })

  useEffect(() => {
    // Reset form when dialog closes
    if (!isDevSupportOpen) {
      setShowContact(false)
      resetForm()
    }
  }, [isDevSupportOpen])

  const validateEmail = (email: string) => {
    return /\S+@\S+\.\S+/.test(email)
  }

  const handleSupport = () => {
    // Validações básicas
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
      toast.error('Informe um valor válido maior que zero')
      return
    }

    // Se tudo ok, mostra a tela de contato/resumo
    setShowContact(true)
  }

  const resetForm = () => {
    setSupportForm({
      name: '',
      email: '',
      amount: '',
      message: '',
      method: 'iban',
    })
  }

  const confirmSupport = async () => {
    setLoading(true)
    try {
      await new Promise((res) => setTimeout(res, 500))
      setIsDevSupportOpen(false)
      setShowContact(false)
      resetForm()
      toast.success('Obrigado pelo seu apoio! 🙏')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao processar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const devContact = {
    whatsapp: '+244 939 226 005',
    email: 'lutangoyanivo1234@gmail.com',
    iban: 'AO06 0055 0000 XXXX XXXX XXXX X', // Fictício para exemplo
    mcxNumber: '939 226 005',
  }

  return (
    <>
      <footer className="mt-12 border-t border-border/50 bg-muted/20">
        <div className="container-custom py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Left - Copyright */}
            <div className="text-center md:text-left space-y-1">
              <p className="text-sm font-medium text-foreground">
                © {new Date().getFullYear()}{' '}
                <span className="font-bold text-gradient">KAIRÓS</span>
                <span className="text-muted-foreground"> • MER</span>
              </p>
              <p className="text-xs text-muted-foreground/80">
                Desenvolvido com <Heart className="inline h-3 w-3 text-red-500 animate-pulse" /> para glorificar a Deus
              </p>
            </div>

            {/* Center/Right - Dev Support */}
            <div className="flex items-center gap-2">
              <Dialog open={isDevSupportOpen} onOpenChange={setIsDevSupportOpen}>
                <Button
                  onClick={() => setIsDevSupportOpen(true)}
                  variant="outline"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground hover:bg-primary/5 border-border/60"
                  aria-label="Apoiar desenvolvedor"
                >
                  <Heart className="h-4 w-4 mr-2" />
                  Apoiar Dev
                </Button>

                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                      <Heart className="h-5 w-5 text-primary" />
                      Apoiar o Desenvolvedor
                    </DialogTitle>
                  </DialogHeader>

                  {!showContact ? (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Sua contribuição ajuda a manter e melhorar esta plataforma. Obrigado pelo seu apoio! 🙏
                      </p>

                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="dev-name" className="text-sm">Nome *</Label>
                            <Input
                              id="dev-name"
                              value={supportForm.name}
                              onChange={(e) => setSupportForm({ ...supportForm, name: e.target.value })}
                              placeholder="Seu nome"
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
                            />
                          </div>
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
                          />
                        </div>

                        <div>
                          <Label htmlFor="dev-method" className="text-sm">Método de Pagamento *</Label>
                          <Select
                            value={supportForm.method}
                            onValueChange={(value: any) => setSupportForm({ ...supportForm, method: value })}
                          >
                            <SelectTrigger>
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
                          />
                        </div>

                        <Button
                          onClick={handleSupport}
                          className="w-full gradient-primary text-white font-medium"
                        >
                          Continuar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Card className="p-5 border-green-500/30 bg-green-500/5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-green-500 rounded-lg">
                            <Heart className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">Obrigado!</h3>
                            <p className="text-sm text-muted-foreground">
                              Kz {parseFloat(supportForm.amount || '0').toLocaleString('pt-AO', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>

                        <div className="text-sm text-muted-foreground space-y-1.5">
                          <p>
                            <span className="font-medium text-foreground">{supportForm.method === 'iban' ? 'IBAN' : 'MCX'}:</span>{' '}
                            {supportForm.method === 'iban' ? devContact.iban : devContact.mcxNumber}
                          </p>
                          <p>
                            <span className="font-medium text-foreground">Email:</span>{' '}
                            <a className="underline hover:text-foreground" href={`mailto:${devContact.email}`}>{devContact.email}</a>
                          </p>
                        </div>

                        <div className="flex gap-2 mt-4">
                          <Button
                            onClick={() => setShowContact(false)}
                            variant="outline"
                            className="flex-1"
                            size="sm"
                          >
                            Voltar
                          </Button>

                          <Button
                            onClick={confirmSupport}
                            className="flex-1 gradient-primary text-white"
                            disabled={loading}
                            size="sm"
                          >
                            {loading ? 'Processando...' : 'Concluir'}
                          </Button>
                        </div>
                      </Card>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}

export default Footer