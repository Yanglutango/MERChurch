import { useState, useEffect, useMemo } from 'react'
import { Heart, Mail, Phone, Send, DollarSign, CreditCard, Building2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Card } from '../ui/card'
import { useAppStore } from '../../stores/appStore'
import { toast } from 'sonner'

type PaymentMethod = 'iban' | 'mcx'

const Footer = () => {
  const { t } = useAppStore()
  const [isDevSupportOpen, setIsDevSupportOpen] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [loading, setLoading] = useState(false)

  const [supportForm, setSupportForm] = useState({
    name: '',
    email: '',
    phone: '',
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
      phone: '',
      amount: '',
      message: '',
      method: 'iban',
    })
  }

  const confirmSupport = async () => {
    setLoading(true)
    try {
      // Aqui você integraria com o gateway de pagamento ou backend.
      // Simulação de delay:
      await new Promise((res) => setTimeout(res, 700))

      setIsDevSupportOpen(false)
      setShowContact(false)
      resetForm()
      toast.success('Obrigado pelo seu apoio! 🙏')
    } catch (err) {
      console.error(err)
      toast.error('Ocorreu um erro ao processar seu apoio. Tente novamente.')
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
      <footer className="relative mt-5 border-t border-border/30 bg-background/50 backdrop-blur-sm">
        <div className="container-custom py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Left - Copyright */}
            <div className="text-center md:text-left">
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()}{' '}
                <span className="font-semibold text-foreground">KAIRÓS</span> - MER
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Desenvolvido com <Heart className="inline h-3 w-3 text-red-900" /> para glorificar a Deus
              </p>
            </div>

            {/* Center/Right - Dev Support */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden sm:inline">Gostou da app?</span>

              <Dialog open={isDevSupportOpen} onOpenChange={setIsDevSupportOpen}>
                <Button
                  onClick={() => setIsDevSupportOpen(true)}
                  variant="outline"
                  size="sm"
                  className="group border-2 hover:border-accent hover:bg-accent/10 transition-all font-semibold"
                  aria-haspopup="dialog"
                  aria-expanded={isDevSupportOpen}
                >
                  <Heart className="h-4 w-4 mr-2 text-accent group-hover:scale-110 transition-transform" />
                  Apoie o Dev
                </Button>

                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl flex items-center gap-2">
                      <Heart className="h-6 w-6 text-accent" />
                      Apoiar o Desenvolvedor
                    </DialogTitle>
                  </DialogHeader>

                  {!showContact ? (
                    <div className="space-y-6">
                      <div className="p-6 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-2xl border-2 border-primary/20 text-center">
                        <p className="text-muted-foreground leading-relaxed">
                          Sua contribuição ajuda a manter e melhorar esta plataforma, permitindo que continuemos a servir a
                          comunidade MER com excelência. Obrigado pelo seu apoio! 🙏
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="dev-name">Nome Completo *</Label>
                            <Input
                              id="dev-name"
                              aria-label="Nome completo"
                              value={supportForm.name}
                              onChange={(e) => setSupportForm({ ...supportForm, name: e.target.value })}
                              placeholder="Seu nome"
                            />
                          </div>

                          <div>
                            <Label htmlFor="dev-email">Email *</Label>
                            <Input
                              id="dev-email"
                              type="email"
                              aria-label="Email para contato"
                              value={supportForm.email}
                              onChange={(e) => setSupportForm({ ...supportForm, email: e.target.value })}
                              placeholder="seu@email.com"
                            />
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="dev-phone">Telefone</Label>
                            <Input
                              id="dev-phone"
                              type="tel"
                              aria-label="Telefone"
                              value={supportForm.phone}
                              onChange={(e) => setSupportForm({ ...supportForm, phone: e.target.value })}
                              placeholder="(244) 999-999-999"
                            />
                          </div>

                          <div>
                            <Label htmlFor="dev-amount">Valor (Kz) *</Label>
                            <Input
                              id="dev-amount"
                              type="text"
                              inputMode="decimal"
                              aria-label="Valor em kwanzas"
                              value={supportForm.amount}
                              onChange={(e) => setSupportForm({ ...supportForm, amount: e.target.value })}
                              placeholder="5000.00"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="dev-method">Método de Pagamento *</Label>
                          <Select
                            value={supportForm.method}
                            onValueChange={(value: any) => setSupportForm({ ...supportForm, method: value })}
                          >
                            <SelectTrigger aria-label="Selecionar método de pagamento">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="iban">
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4" />
                                  Transferência Bancária (IBAN)
                                </div>
                              </SelectItem>
                              <SelectItem value="mcx">
                                <div className="flex items-center gap-2">
                                  <CreditCard className="h-4 w-4" />
                                  Multicaixa Express (MCX)
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="dev-message">Mensagem (Opcional)</Label>
                          <Textarea
                            id="dev-message"
                            aria-label="Mensagem de apoio"
                            value={supportForm.message}
                            onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                            placeholder="Deixe uma mensagem de apoio..."
                            rows={4}
                          />
                        </div>

                        <Button
                          onClick={handleSupport}
                          className="w-full bg-gradient-to-r from-primary via-accent to-primary text-white font-semibold text-lg py-6 shadow-lg hover:shadow-xl transition-shadow"
                          size="lg"
                          aria-label="Continuar para pagamento"
                        >
                          <DollarSign className="h-5 w-5 mr-2" />
                          Continuar para Pagamento
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <Card className="p-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-2 border-green-500/20">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-3 bg-green-500 rounded-full">
                            <Heart className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-foreground">Obrigado pelo seu apoio!</h3>
                            <p className="text-sm text-muted-foreground">
                              Valor:{' '}
                              <span className="font-bold text-green-600">
                                Kz {parseFloat(supportForm.amount || '0').toLocaleString('pt-AO', { minimumFractionDigits: 2 })}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="text-sm text-muted-foreground space-y-2 mb-4">
                          <p>
                            Método: <span className="font-medium text-foreground">{supportForm.method === 'iban' ? 'IBAN' : 'MCX'}</span>
                          </p>
                          {supportForm.method === 'iban' ? (
                            <p>
                              IBAN: <span className="font-mono text-sm">{devContact.iban}</span>
                            </p>
                          ) : (
                            <p>
                              Número MCX: <span className="font-mono text-sm">{devContact.mcxNumber}</span>
                            </p>
                          )}
                          <p>
                            Contato: <a className="underline" href={`mailto:${devContact.email}`}>{devContact.email}</a>
                          </p>
                        </div>

                        <div className="flex gap-3">
                          {/* Botão Voltar */}
                          <Button
                            onClick={() => setShowContact(false)}
                            variant="outline"
                            className="flex-1"
                            aria-label="Voltar para o formulário"
                          >
                            Voltar
                          </Button>

                          {/* Botão Concluir */}
                          <Button
                            onClick={confirmSupport}
                            className="flex-1 bg-gradient-to-r from-primary to-accent text-white font-semibold hover:opacity-90 transition-opacity"
                            aria-label="Concluir apoio"
                            disabled={loading}
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