import { useState } from 'react'
import Layout from '../components/layout/Layout'
import { useAppStore } from '../stores/appStore'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { supabase } from '../lib/supabase'
import { Church, MapPin, Phone, Mail, Send, Heart, Users, Globe, BookOpen, Cross } from 'lucide-react'
import { toast } from 'sonner'

const AboutPage = () => {
  const { t } = useAppStore()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    messageType: 'inquiry',
    message: '',
  })
  const [loading, setLoading] = useState(false)

  const values = [
    {
      icon: Heart,
      title: 'Amor',
      description: 'Demonstramos o amor de Cristo em tudo que fazemos',
      color: 'from-red-500 to-rose-500',
    },
    {
      icon: Users,
      title: 'Comunidade',
      description: 'Somos uma família unida pela fé e companheirismo',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Globe,
      title: 'Missão',
      description: 'Levamos esperança e transformação ao mundo',
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: BookOpen,
      title: 'Palavra',
      description: 'A Bíblia é nossa fonte de verdade e direção',
      color: 'from-purple-500 to-indigo-500',
    },
    {
      icon: Cross,
      title: 'Santidade',
      description: 'Vivemos em santidade e consagração a Deus',
      color: 'from-yellow-500 to-orange-500',
    },
  ]

  const submitContact = async () => {
    if (!contactForm.name || !contactForm.email || !contactForm.subject || !contactForm.message) {
      toast.error(t('treasury.fillAllFields'))
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.from('contact_messages').insert({
        name: contactForm.name,
        email: contactForm.email,
        subject: contactForm.subject,
        message_type: contactForm.messageType,
        message: contactForm.message,
      })

      if (error) throw error

      toast.success(t('about.messageSent'))
      setIsDialogOpen(false)
      setContactForm({
        name: '',
        email: '',
        subject: '',
        messageType: 'inquiry',
        message: '',
      })
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar mensagem')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout title={t('nav.about')}>
      <div className="space-y-8">
        {/* Hero */}
        <Card className="relative overflow-hidden border-0 shadow-2xl rounded-2xl">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1438032005730-c779502df39b?w=1920&h=600&fit=crop&q=80"
              alt="MER Church"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-blue-900/90 to-indigo-900/95" />
          </div>

          <div className="relative z-10 p-12 md:p-16 text-white text-center">
            <div className="inline-flex p-6 bg-white/20 backdrop-blur-sm rounded-3xl mb-6">
              <Church className="h-20 w-20" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-4">{t('brand.fullName')}</h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto mb-4">
              {t('brand.tagline')}
            </p>
            <p className="text-lg text-white/80 italic">
              {t('brand.verse')}
            </p>
          </div>
        </Card>

        {/* Nossa História */}
        <Card className="p-8 md:p-12 border-2 hover:shadow-xl transition-shadow">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 bg-gradient-to-br from-primary to-accent rounded-2xl shadow-lg">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-foreground">{t('about.ourHistory')}</h2>
          </div>
          
          <div className="space-y-6 text-muted-foreground leading-relaxed text-lg">
            <p>
              A <strong className="text-foreground">Missão Evangélica da Reconciliação (MER)</strong> nasceu em Angola, 
              foi fundada em <strong className="text-foreground">Março de 1989</strong> pelo <strong className="text-foreground">Apóstolo Mawete Viticilo</strong> (que continua vivasso e de boa saúde), 
              tem sua sede internacional na capital do país, Luanda, no bairro do Rocha Pinto (pois a MER agora está em muitos países do mundo), 
              e com 36 anos, continuamos crescendo cada vez mais.
            </p>
            
            <p>
              Nosso ministério nasceu de <strong className="text-foreground">2 Coríntios 5:18</strong> e nosso lema é{' '}
              <span className="text-primary font-semibold italic">"Somos o Povo da Fé e a Geração dos Poderosos"</span>. 
              Estamos em todo o país e esta plataforma é criação da MER no Lubango, capital da província da Huíla e sede regional sul do país.
            </p>
            
            <p>
              A <strong className="text-foreground">MER-Lubango</strong> foi fundada em <strong className="text-foreground">Fevereiro de 2000</strong> pelo{' '}
              <strong className="text-foreground">Pastor Garcia Doki Lutango</strong>, hoje com 25 anos, continuamos crescendo mais e mais e, 
              no âmbito da evolução e inovação da igreja, criou-se essa startup, para assim, inserir a MER no mundo digital e poder salvar almas também por meio dela.
            </p>

            <div className="p-6 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-2xl border-2 border-primary/20 mt-8">
              <p className="text-foreground font-semibold text-center text-xl italic">
                "{t('brand.verse')}"
              </p>
            </div>

            <p>
              Nossa visão é ser uma igreja que transforma vidas através do poder do evangelho, criando um ambiente onde todos podem 
              crescer espiritualmente, desenvolver relacionamentos significativos e descobrir seu propósito em Deus. Acreditamos que 
              cada pessoa tem um chamado único e trabalhamos para equipar e capacitar nossos membros para cumprir esse chamado.
            </p>
            
            <p>
              Hoje, operamos com mais de 50 células ativas em todo o país, oferecemos programas de discipulado, ministérios 
              especializados para todas as idades, uma escola bíblica completa e diversos projetos sociais que impactam nossa comunidade. 
              Com mais de 5000 membros ativos, continuamos crescendo e expandindo o Reino de Deus através da plataforma digital <strong className="text-foreground">KAIRÓS</strong>.
            </p>
          </div>
        </Card>

        {/* Nossos Valores */}
        <div>
          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl shadow-lg">
              <Heart className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-foreground">{t('about.ourValues')}</h2>
          </div>
          
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
            {values.map((value) => (
              <Card key={value.title} className="p-6 border-2 hover:border-primary/50 transition-all hover:shadow-2xl hover:-translate-y-2 transform duration-300 group">
                <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${value.color} mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  <value.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">{value.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{value.description}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Contato */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-8 border-2 hover:shadow-xl transition-shadow">
            <h2 className="text-3xl font-bold text-foreground mb-6">{t('about.contact')}</h2>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-primary to-accent rounded-xl shadow-md">
                  <MapPin className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-foreground mb-1 text-lg">{t('about.address')}</div>
                  <div className="text-muted-foreground">
                    Bairro Rocha Pinto<br />
                    Luanda, Angola (Sede Internacional)<br />
                    Lubango, Huíla (Sede Regional Sul)
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-md">
                  <Phone className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-foreground mb-1 text-lg">{t('about.phone')}</div>
                  <div className="text-muted-foreground">
                    (+244) 999-999-999<br />
                    (+244) 998-888-777 (WhatsApp)
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-md">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-foreground mb-1 text-lg">{t('about.email')}</div>
                  <div className="text-muted-foreground">
                    contato@mer.co.ao<br />
                    pastoral@mer.co.ao
                  </div>
                </div>
              </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full mt-8 bg-gradient-to-r from-primary to-accent text-white font-semibold text-lg py-6" size="lg">
                  <Send className="h-5 w-5 mr-2" />
                  {t('about.sendMessage')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl">{t('about.sendMessage')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">{t('about.fullName')} *</Label>
                      <Input
                        id="name"
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        placeholder="Seu nome"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">{t('about.email')} *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="subject">{t('about.subject')} *</Label>
                      <Input
                        id="subject"
                        value={contactForm.subject}
                        onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                        placeholder="Assunto da mensagem"
                      />
                    </div>

                    <div>
                      <Label htmlFor="messageType">{t('about.messageType')} *</Label>
                      <Select
                        value={contactForm.messageType}
                        onValueChange={(value) => setContactForm({ ...contactForm, messageType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inquiry">{t('about.inquiry')}</SelectItem>
                          <SelectItem value="support">{t('about.support')}</SelectItem>
                          <SelectItem value="feedback">{t('about.feedback')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="message">{t('about.message')} *</Label>
                    <Textarea
                      id="message"
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      placeholder="Digite sua mensagem..."
                      rows={6}
                    />
                  </div>

                  <Button onClick={submitContact} disabled={loading} className="w-full bg-gradient-to-r from-primary to-accent text-white">
                    {loading ? t('common.loading') : t('common.send')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </Card>

          {/* Horários */}
          <Card className="p-8 border-2 bg-gradient-to-br from-primary/10 via-accent/10 to-primary/10 hover:shadow-xl transition-shadow">
            <h2 className="text-3xl font-bold text-foreground mb-6">{t('about.schedules')}</h2>

            <div className="space-y-4">
              <div className="p-5 bg-card rounded-xl border-2 border-primary/20 hover:border-primary/40 transition-colors shadow-md">
                <div className="font-bold text-foreground mb-1 text-lg">{t('about.sunday')}</div>
                <div className="text-muted-foreground">
                  Culto de Celebração: 09:00 e 18:00
                </div>
              </div>

              <div className="p-5 bg-card rounded-xl border-2 border-primary/20 hover:border-primary/40 transition-colors shadow-md">
                <div className="font-bold text-foreground mb-1 text-lg">{t('about.wednesday')}</div>
                <div className="text-muted-foreground">
                  Reunião de Oração: 19:30
                </div>
              </div>

              <div className="p-5 bg-card rounded-xl border-2 border-primary/20 hover:border-primary/40 transition-colors shadow-md">
                <div className="font-bold text-foreground mb-1 text-lg">{t('about.friday')}</div>
                <div className="text-muted-foreground">
                  Culto de Jovens: 20:00
                </div>
              </div>

              <div className="p-5 bg-card rounded-xl border-2 border-primary/20 hover:border-primary/40 transition-colors shadow-md">
                <div className="font-bold text-foreground mb-1 text-lg">{t('about.saturday')}</div>
                <div className="text-muted-foreground">
                  Escola Bíblica: 15:00
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  )
}

export default AboutPage
