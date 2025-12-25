import { useState } from 'react'
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

const Footer = () => {
  const { t } = useAppStore()
  const [isDevSupportOpen, setIsDevSupportOpen] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [supportForm, setSupportForm] = useState({
    name: '',
    email: '',
    phone: '',
    amount: '',
    message: '',
    method: 'iban' as 'iban' | 'mcx',
  })

  const handleSupport = () => {
    if (!supportForm.name || !supportForm.email || !supportForm.amount) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    setShowContact(true)
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
                © {new Date().getFullYear()} <span className="font-semibold text-foreground">KAIRÓS</span> - MER
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Desenvolvido com <Heart className="inline h-3 w-3 text-red-900" /> para glorificar a Deus
              </p>
            </div>

            {/* Center/Right - Dev Support */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Gostou da app?
              </span>
              <Dialog open={isDevSupportOpen} onOpenChange={setIsDevSupportOpen}>
                <Button
                  onClick={() => setIsDevSupportOpen(true)}
                  variant="outline"
                  size="sm"
                  className="group border-2 hover:border-accent hover:bg-accent/10 transition-all font-semibold"
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
                              value={supportForm.phone}
                              onChange={(e) => setSupportForm({ ...supportForm, phone: e.target.value })}
                              placeholder="(244) 999-999-999"
                            />
                          </div>

                          <div>
                            <Label htmlFor="dev-amount">Valor (Kz) *</Label>
                            <Input
                              id="dev-amount"
                              type="number"
                              step="0.01"
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
                            <SelectTrigger>
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
                              Valor: <span className="font-bold text-green-600">Kz {parseFloat(supportForm.amount || '0').toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</span>
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="p-4 bg-card rounded-xl border-2 border-border">
                            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                              <Mail className="h-4 w-4 text-primary" />
                              Contato do Desenvolvedor
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-green-500" />
                                <span className="text-muted-foreground">WhatsApp:</span>
                                <a
                                  href={`https://wa.me/${devContact.whatsapp.replace(/\s/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary font-semibold hover:underline"
                                >
                                  {devContact.whatsapp}
                                </a>
                              </div>
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-blue-500" />
                                <span className="text-muted-foreground">Email:</span>
                                <a
                                  href={`mailto:${devContact.email}`}
                                  className="text-primary font-semibold hover:underline"
                                >
                                  {devContact.email}
                                </a>
                              </div>
                            </div>
                          </div>

                          {supportForm.method === 'iban' && (
                            <div className="p-4 bg-card rounded-xl border-2 border-border">
                              <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-primary" />
                                Dados Bancários (IBAN)
                              </h4>
                              <div className="space-y-2">
                                <div>
                                  <p className="text-xs text-muted-foreground">Conta Bancária:</p>
                                  <p className="font-mono text-sm font-semibold text-foreground bg-muted px-3 py-2 rounded-lg">
                                    {devContact.iban}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Titular:</p>
                                  <p className="text-sm font-semibold text-foreground">Yanivo Lutango</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Banco:</p>
                                  <p className="text-sm font-semibold text-foreground">Millenium Atlântico</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {supportForm.method === 'mcx' && (
                            <div className="p-4 bg-card rounded-xl border-2 border-border">
                              <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-primary" />
                                Multicaixa Express (MCX)
                              </h4>
                              <div className="space-y-2">
                                <div>
                                  <p className="text-xs text-muted-foreground">Número MCX:</p>
                                  <p className="font-mono text-2xl font-bold text-foreground bg-muted px-4 py-3 rounded-lg text-center">
                                    {devContact.mcxNumber}
                                  </p>
                                </div>
                                <div className="text-center">
                                  <p className="text-xs text-muted-foreground">Nome:</p>
                                  <p className="text-sm font-semibold text-foreground">Garcia Yanivo Lutango</p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="p-4 bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl border-2 border-primary/10">
                            <p className="text-sm text-muted-foreground text-center">
                              Após realizar a transferência, entre em contato via WhatsApp ou Email com o comprovante para confirmação. 
                              Muito obrigado pelo seu apoio! 🙏✨
                            </p>
                          </div>
                        </div>
                      </Card>

                      <div className="flex gap-3">
                        <Button
                          onClick={() => setShowContact(false)}
                          variant="outline"
                          className="flex-1"
                        >
                          Voltar
                        </Button>
                        <Button
                          onClick={() => {
                            setIsDevSupportOpen(false)
                            setShowContact(false)
                            setSupportForm({
                              name: '',
                              email: '',
                              phone: '',
                              amount: '',
                              message: '',
                              method: 'iban',
                            })
                            toast.success('Obrigado pelo seu apoio! 🙏')
                          }}
                          className="flex-1 bg-gradient-to-r from-primary to-accent text-white"
                        >
                          Concluir
                        </Button>
                      </div>
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
