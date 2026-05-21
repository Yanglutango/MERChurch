import { useState, useEffect } from 'react'
import Layout from '../components/layout/Layout'
import { useAppStore } from '../stores/appStore'
import { useAuth } from '../hooks/useAuth'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Logo } from '../components/ui/logo'
import { supabase } from '../lib/supabase'
import { MapPin, Phone, Mail, Send, Heart, Users, Globe, BookOpen, Shield, Edit2, Plus, Save, X, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface ContentSection {
  id: string
  section: string
  title: string | null
  content: string
  updated_at: string
}

const AboutPage = () => {
  const { t } = useAppStore()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [isContactOpen, setIsContactOpen] = useState(false)
  const [editingSection, setEditingSection] = useState<ContentSection | null>(null)
  const [editContent, setEditContent] = useState({ title: '', content: '' })
  const [saving, setSaving] = useState(false)
  const [contactForm, setContactForm] = useState({ name: user?.username || '', email: user?.email || '', subject: '', messageType: 'inquiry', message: '' })
  const [loading, setLoading] = useState(false)
  const [contentMap, setContentMap] = useState<Record<string, ContentSection>>({})

  useEffect(() => {
    loadContent()
  }, [])

  const loadContent = async () => {
    const { data } = await supabase.from('about_page_content').select('*')
    if (data) {
      const map: Record<string, ContentSection> = {}
      data.forEach(item => { map[item.section] = item })
      setContentMap(map)
    }
  }

  const startEdit = (section: ContentSection) => {
    setEditingSection(section)
    setEditContent({ title: section.title || '', content: section.content })
  }

  const saveSection = async () => {
    if (!editingSection) return
    setSaving(true)
    const { error } = await supabase.from('about_page_content')
      .upsert({ section: editingSection.section, title: editContent.title || null, content: editContent.content, updated_by: user!.id, updated_at: new Date().toISOString() }, { onConflict: 'section' })
    if (error) { toast.error('Erro ao salvar'); setSaving(false); return }
    toast.success('Conteúdo atualizado com sucesso!')
    setEditingSection(null)
    loadContent()
    setSaving(false)
  }

  const getContent = (section: string, fallback: string) => contentMap[section]?.content || fallback
  const getTitle = (section: string, fallback: string) => contentMap[section]?.title || fallback

  const submitContact = async () => {
    if (!contactForm.name || !contactForm.email || !contactForm.subject || !contactForm.message) { toast.error('Preencha todos os campos'); return }
    setLoading(true)
    const { error } = await supabase.from('contact_messages').insert({
      name: contactForm.name, email: contactForm.email, subject: contactForm.subject, message_type: contactForm.messageType, message: contactForm.message,
    })
    if (error) { toast.error(error.message); setLoading(false); return }
    toast.success('Mensagem enviada com sucesso! Entraremos em contato em breve.')
    setIsContactOpen(false)
    setContactForm({ name: user?.username || '', email: user?.email || '', subject: '', messageType: 'inquiry', message: '' })
    setLoading(false)
  }

  const values = [
    { icon: Heart, title: 'Amor', description: getContent('value_love', 'Demonstramos o amor de Cristo em tudo que fazemos'), color: 'from-red-500 to-rose-500' },
    { icon: Users, title: 'Comunidade', description: getContent('value_community', 'Somos uma família unida pela fé e companheirismo'), color: 'from-blue-500 to-cyan-500' },
    { icon: Globe, title: 'Missão', description: getContent('value_mission', 'Levamos esperança e transformação ao mundo'), color: 'from-green-500 to-emerald-500' },
    { icon: BookOpen, title: 'Palavra', description: getContent('value_word', 'A Bíblia é nossa fonte de verdade e direção'), color: 'from-purple-500 to-indigo-500' },
  ]

  const schedules = [
    { day: getTitle('schedule_sunday', 'Domingo'), time: getContent('schedule_sunday', 'Culto de Celebração: 09:00 e 18:00') },
    { day: getTitle('schedule_wednesday', 'Quarta-feira'), time: getContent('schedule_wednesday', 'Reunião de Oração: 19:30') },
    { day: getTitle('schedule_friday', 'Sexta-feira'), time: getContent('schedule_friday', 'Culto de Jovens: 20:00') },
    { day: getTitle('schedule_saturday', 'Sábado'), time: getContent('schedule_saturday', 'Escola Bíblica: 15:00') },
  ]

  return (
    <Layout title={t('nav.about')}>
      <div className="space-y-6 md:space-y-8">
        {/* Hero */}
        <Card className="relative overflow-hidden border-0 shadow-2xl rounded-2xl">
          <div className="absolute inset-0">
            <img src="https://images.unsplash.com/photo-1438032005730-c779502df39b?w=1920&h=600&fit=crop&q=80" alt="MER Church" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-blue-900/90 to-indigo-900/95" />
          </div>
          <div className="relative z-10 p-8 md:p-14 text-white text-center">
            <div className="flex justify-center mb-4"><Logo size="lg" showText={false} /></div>
            <h1 className="text-2xl md:text-4xl font-bold mb-3">Missão Evangélica da Reconciliação</h1>
            <p className="text-sm md:text-lg text-white italic max-w-3xl mx-auto leading-relaxed">
              {t('brand.verse')}
            </p>
          </div>
        </Card>

        {/* Admin Banner */}
        {isAdmin && (
          <Card className="p-4 border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 rounded-xl">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-amber-800 dark:text-amber-200 text-sm">Modo de Edição Ativo</p>
                <p className="text-xs text-amber-700 dark:text-amber-300">Clique no botão ✏️ em cada seção para editar o conteúdo da página</p>
              </div>
            </div>
          </Card>
        )}

        {/* Nossa História */}
        <Card className="p-6 md:p-10 border-2 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 md:p-4 bg-gradient-to-br from-primary to-accent rounded-2xl shadow-lg">
                <BookOpen className="h-6 w-6 md:h-8 md:w-8 text-white" />
              </div>
              <h2 className="text-2xl md:text-4xl font-bold text-foreground">{t('about.ourHistory')}</h2>
            </div>
            {isAdmin && (
              <Button size="sm" variant="outline" onClick={() => startEdit({ id: '', section: 'history', title: 'Nossa História', content: getContent('history', ''), updated_at: '' })} className="border-2 font-semibold flex-shrink-0">
                <Edit2 className="h-4 w-4 mr-1.5" />Editar
              </Button>
            )}
          </div>
          <div className="space-y-5 text-muted-foreground leading-relaxed text-base md:text-lg">
            {getContent('history', `A **Missão Evangélica da Reconciliação (MER)** nasceu em Angola, foi fundada em **Março de 1989** pelo **Apóstolo Mawete Viticilo**, tem sua sede internacional na capital do país, Luanda, no bairro do Rocha Pinto, e com 36 anos, continuamos crescendo cada vez mais.

Nosso ministério nasceu de **2 Coríntios 5:18** e nosso lema é *"Somos o Povo da Fé e a Geração dos Poderosos"*. Estamos em todo o país e esta plataforma é criação da MER no Lubango.

A **MER-Lubango** foi fundada em **Fevereiro de 2000** pelo **Pastor Garcia Doki Lutango**, hoje com 25 anos, continuamos crescendo e, no âmbito da inovação, criou-se essa plataforma digital KAIRÓS.`).split('\n\n').filter(Boolean).map((para, i) => (
              <p key={i} dangerouslySetInnerHTML={{
                __html: para.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>').replace(/\*(.*?)\*/g, '<em class="text-primary font-semibold">$1</em>')
              }} />
            ))}
            <div className="p-5 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-2xl border-2 border-primary/20 mt-6">
              <p className="text-foreground font-semibold text-center text-lg italic">"{t('brand.verse')}"</p>
            </div>
          </div>
        </Card>

        {/* Nossos Valores */}
        <div>
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 md:p-4 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl shadow-lg">
              <Heart className="h-6 w-6 md:h-8 md:w-8 text-white" />
            </div>
            <h2 className="text-2xl md:text-4xl font-bold text-foreground">{t('about.ourValues')}</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {values.map(value => (
              <Card key={value.title} className="p-5 md:p-6 border-2 hover:border-primary/50 transition-all hover:shadow-xl hover:-translate-y-1 transform duration-300 group">
                <div className={`inline-flex p-3 md:p-4 rounded-2xl bg-gradient-to-br ${value.color} mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  <value.icon className="h-6 w-6 md:h-8 md:w-8 text-white" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">{value.title}</h3>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{value.description}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Missão e Visão */}
        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          <Card className="p-5 md:p-8 border-2 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
                  <Globe className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-foreground">Nossa Missão</h3>
              </div>
              {isAdmin && (
                <Button size="sm" variant="ghost" onClick={() => startEdit({ id: '', section: 'mission', title: 'Nossa Missão', content: getContent('mission', ''), updated_at: '' })} className="h-8 w-8 p-0">
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
              {getContent('mission', 'Reconciliar pessoas com Deus e uns com os outros através do evangelho de Jesus Cristo, transformando vidas, famílias e comunidades para a glória do Senhor.')}
            </p>
          </Card>
          <Card className="p-5 md:p-8 border-2 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
                  <Heart className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-foreground">Nossa Visão</h3>
              </div>
              {isAdmin && (
                <Button size="sm" variant="ghost" onClick={() => startEdit({ id: '', section: 'vision', title: 'Nossa Visão', content: getContent('vision', ''), updated_at: '' })} className="h-8 w-8 p-0">
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
              {getContent('vision', 'Ser uma igreja que transforma Angola e o mundo através do poder do evangelho, criando uma comunidade onde todos crescem espiritualmente e descobrem seu propósito divino.')}
            </p>
          </Card>
        </div>

        {/* Contato + Horários */}
        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          <Card className="p-5 md:p-8 border-2 hover:shadow-xl transition-shadow">
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-5">{t('about.contact')}</h2>
            <div className="space-y-4">
              {[
                { Icon: MapPin, gradient: 'from-primary to-accent', title: t('about.address'), content: 'Bairro Rocha Pinto, Luanda (Sede Internacional)\nLubango, Huíla (Sede Regional Sul)' },
                { Icon: Phone, gradient: 'from-blue-500 to-cyan-500', title: t('about.phone'), content: '(+244) 999-999-999\n(+244) 998-888-777 (WhatsApp)' },
                { Icon: Mail, gradient: 'from-purple-500 to-pink-500', title: t('about.email'), content: 'contato@mer.co.ao\npastoral@mer.co.ao' },
              ].map(({ Icon, gradient, title, content }) => (
                <div key={title} className="flex items-start gap-3">
                  <div className={`p-2.5 bg-gradient-to-br ${gradient} rounded-xl shadow-md flex-shrink-0`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground mb-1 text-sm md:text-base">{title}</div>
                    <div className="text-muted-foreground text-sm whitespace-pre-line">{content}</div>
                  </div>
                </div>
              ))}
            </div>
            <Button onClick={() => setIsContactOpen(true)} className="w-full mt-6 bg-gradient-to-r from-primary to-accent text-white font-semibold text-sm md:text-base py-5 md:py-6" size="lg">
              <Send className="h-4 w-4 md:h-5 md:w-5 mr-2" />
              {t('about.sendMessage')}
            </Button>
          </Card>

          <Card className="p-5 md:p-8 border-2 bg-gradient-to-br from-primary/10 via-accent/10 to-primary/10 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between gap-3 mb-5">
              <h2 className="text-xl md:text-2xl font-bold text-foreground">{t('about.schedules')}</h2>
              {isAdmin && (
                <Button size="sm" variant="ghost" onClick={() => startEdit({ id: '', section: 'schedules_note', title: 'Horários', content: getContent('schedules_note', 'Todos são bem-vindos!'), updated_at: '' })} className="h-8 w-8 p-0">
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="space-y-3">
              {schedules.map(s => (
                <div key={s.day} className="p-4 bg-card rounded-xl border-2 border-primary/20 hover:border-primary/40 transition-colors shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-primary" />
                    <div className="font-bold text-foreground text-sm md:text-base">{s.day}</div>
                  </div>
                  <div className="text-muted-foreground text-sm">{s.time}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingSection} onOpenChange={(open) => !open && setEditingSection(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-primary" />
              Editar: {editingSection?.title || editingSection?.section}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-semibold mb-1 block">Título (opcional)</Label>
              <Input value={editContent.title} onChange={e => setEditContent({ ...editContent, title: e.target.value })} placeholder="Título da seção..." className="h-11 border-2" />
            </div>
            <div>
              <Label className="font-semibold mb-1 block">Conteúdo *</Label>
              <Textarea value={editContent.content} onChange={e => setEditContent({ ...editContent, content: e.target.value })} placeholder="Conteúdo da seção..." rows={8} className="resize-none border-2" />
              <p className="text-xs text-muted-foreground mt-1">Use **texto** para negrito e *texto* para itálico</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={saveSection} disabled={saving} className="flex-1 h-11 bg-gradient-to-r from-primary to-accent text-white font-bold">
                <Save className="h-4 w-4 mr-2" />{saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
              <Button onClick={() => setEditingSection(null)} variant="outline" className="h-11 border-2">
                <X className="h-4 w-4 mr-2" />Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact Dialog */}
      <Dialog open={isContactOpen} onOpenChange={setIsContactOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{t('about.sendMessage')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="font-semibold mb-1 block">{t('about.fullName')} *</Label>
                <Input value={contactForm.name} onChange={e => setContactForm({ ...contactForm, name: e.target.value })} placeholder="Seu nome" className="h-11 border-2" />
              </div>
              <div>
                <Label className="font-semibold mb-1 block">Email *</Label>
                <Input type="email" value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} placeholder="seu@email.com" className="h-11 border-2" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="font-semibold mb-1 block">Assunto *</Label>
                <Input value={contactForm.subject} onChange={e => setContactForm({ ...contactForm, subject: e.target.value })} placeholder="Assunto da mensagem" className="h-11 border-2" />
              </div>
              <div>
                <Label className="font-semibold mb-1 block">Tipo</Label>
                <Select value={contactForm.messageType} onValueChange={v => setContactForm({ ...contactForm, messageType: v })}>
                  <SelectTrigger className="h-11 border-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inquiry">Dúvida / Consulta</SelectItem>
                    <SelectItem value="support">Suporte</SelectItem>
                    <SelectItem value="feedback">Feedback</SelectItem>
                    <SelectItem value="prayer">Pedido de Oração</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="font-semibold mb-1 block">Mensagem *</Label>
              <Textarea value={contactForm.message} onChange={e => setContactForm({ ...contactForm, message: e.target.value })} placeholder="Digite sua mensagem..." rows={5} className="resize-none border-2" />
            </div>
            <Button onClick={submitContact} disabled={loading} className="w-full h-11 bg-gradient-to-r from-primary to-accent text-white font-bold">
              {loading ? 'Enviando...' : 'Enviar Mensagem'}
              <Send className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}

export default AboutPage
