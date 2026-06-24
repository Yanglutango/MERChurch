import { useState, useEffect, useCallback } from 'react'
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
import { MapPin, Phone, Mail, Send, Heart, Users, Globe, BookOpen, Shield, Edit2, Save, X, Clock, Loader2 } from 'lucide-react'
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
  const [pageLoading, setPageLoading] = useState(true)
  const [contentMap, setContentMap] = useState<Record<string, ContentSection>>({})

  const loadContent = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('about_page_content').select('*')
      if (error) throw error
      if (data) {
        const map: Record<string, ContentSection> = {}
        data.forEach(item => { map[item.section] = item })
        setContentMap(map)
      }
    } catch (error) {
      console.error('Erro ao carregar conteúdo:', error)
    } finally {
      setPageLoading(false)
    }
  }, [])

  useEffect(() => {
    loadContent()
  }, [loadContent])

  const startEdit = (section: ContentSection) => {
    setEditingSection(section)
    setEditContent({ title: section.title || '', content: section.content })
  }

  const saveSection = async () => {
    if (!editingSection) return
    setSaving(true)
    const { error } = await supabase.from('about_page_content')
      .upsert({ 
        section: editingSection.section, 
        title: editContent.title || null, 
        content: editContent.content, 
        updated_by: user!.id, 
        updated_at: new Date().toISOString() 
      }, { onConflict: 'section' })
      
    if (error) { 
      toast.error('Erro ao salvar')
      setSaving(false)
      return 
    }
    toast.success('Conteúdo atualizado com sucesso!')
    setEditingSection(null)
    loadContent()
    setSaving(false)
  }

  const getContent = (section: string, fallback: string) => contentMap[section]?.content || fallback
  const getTitle = (section: string, fallback: string) => contentMap[section]?.title || fallback

  const submitContact = async () => {
    if (!contactForm.name || !contactForm.email || !contactForm.subject || !contactForm.message) { 
      toast.error('Preencha todos os campos')
      return 
    }
    setLoading(true)
    const { error } = await supabase.from('contact_messages').insert({
      name: contactForm.name, 
      email: contactForm.email, 
      subject: contactForm.subject, 
      message_type: contactForm.messageType, 
      message: contactForm.message,
    })
    if (error) { 
      toast.error(error.message)
      setLoading(false)
      return 
    }
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

  if (pageLoading) {
    return (
      <Layout title={t('nav.about')}>
        <div className="flex h-[60vh] flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Sincronizando conteúdos institucionais...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={t('nav.about')}>
      <div className="p-4 space-y-6 md:space-y-8 max-w-7xl mx-auto animate-in fade-in duration-300">
        {/* Hero */}
        <Card className="relative overflow-hidden border-0 shadow-2xl rounded-2xl group">
          <div className="absolute inset-0">
            <img src="https://images.unsplash.com/photo-1438032005730-c779502df39b?w=1920&h=600&fit=crop&q=80" alt="MER Church" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-blue-900/90 to-indigo-900/95" />
          </div>
          <div className="relative z-10 p-8 md:p-14 text-white text-center">
            <div className="flex justify-center mb-4 transform transition-transform group-hover:scale-110 duration-300"><Logo size="lg" showText={false} /></div>
            <h1 className="text-2xl md:text-4xl font-bold mb-3 tracking-tight">Missão Evangélica da Reconciliação</h1>
            <p className="text-sm md:text-lg text-blue-100 italic max-w-3xl mx-auto leading-relaxed font-medium">
              "{t('brand.verse')}"
            </p>
          </div>
        </Card>

        {/* Admin Banner */}
        {isAdmin && (
          <Card className="p-4 border-2 border-dashed border-amber-400 dark:border-amber-700 bg-amber-500/[0.04] animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 rounded-xl shadow-md shadow-amber-500/20">
                <Shield className="h-5 w-5 text-white stroke-[2.5]" />
              </div>
              <div>
                <p className="font-bold text-amber-800 dark:text-amber-200 text-sm">Modo de Edição Ativo</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Clique no botão de edição em cada seção para modificar os dados dinâmicos de forma segura.</p>
              </div>
            </div>
          </Card>
        )}

        {/* Nossa História */}
        <Card className="p-6 md:p-10 border-2 hover:shadow-xl transition-all duration-300 rounded-2xl bg-card">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 md:p-4 bg-gradient-to-br from-primary to-accent rounded-2xl shadow-lg shadow-primary/10">
                <BookOpen className="h-6 w-6 md:h-7 md:w-7 text-white" />
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">{t('about.ourHistory')}</h2>
            </div>
            {isAdmin && (
              <Button size="sm" variant="outline" onClick={() => startEdit({ id: '', section: 'history', title: 'Nossa História', content: getContent('history', ''), updated_at: '' })} className="border-2 font-bold flex-shrink-0 rounded-xl hover:bg-muted transition-colors">
                <Edit2 className="h-3.5 w-3.5 mr-1.5 text-primary" />Editar
              </Button>
            )}
          </div>
          
          <div className="space-y-5 text-muted-foreground leading-relaxed text-base md:text-lg">
            {getContent('history', `A **Missão Evangélica da Reconciliação (MER)** nasceu em Angola...`).split('\n\n').map((para, i) => {
              const parts = para.split(/(\*\*.*?\*\*|\*.*?\*)/g)
              return (
                <p key={i}>
                  {parts.map((part, j) => {
                    if (part.startsWith('**') && part.endsWith('**'))
                      return <strong key={j} className="text-foreground font-bold">{part.slice(2, -2)}</strong>
                    if (part.startsWith('*') && part.endsWith('*'))
                      return <em key={j} className="text-primary font-bold not-italic bg-primary/5 px-1 rounded">{part.slice(1, -1)}</em>
                    return part
                  })}
                </p>
              )
            })}
            <div className="p-5 bg-gradient-to-r from-primary/[0.03] via-accent/[0.03] to-primary/[0.03] rounded-2xl border-2 border-primary/10 mt-6 shadow-inner">
              <p className="text-foreground font-semibold text-center text-base md:text-lg italic text-primary">"{t('brand.verse')}"</p>
            </div>
          </div>
        </Card>

        {/* Nossos Valores */}
        <div className="space-y-4">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl shadow-lg shadow-emerald-500/10">
              <Heart className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">{t('about.ourValues')}</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {values.map(value => (
              <Card key={value.title} className="p-5 md:p-6 border-2 hover:border-primary/40 transition-all hover:shadow-xl hover:-translate-y-1 transform duration-300 group rounded-2xl bg-card">
                <div className={`inline-flex p-3 rounded-2xl bg-gradient-to-br ${value.color} mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  <value.icon className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">{value.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-medium">{value.description}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Missão e Visão */}
        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          <Card className="p-6 md:p-8 border-2 hover:shadow-xl transition-all duration-300 rounded-2xl bg-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-md">
                    <Globe className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground tracking-tight">Nossa Missão</h3>
                </div>
                {isAdmin && (
                  <Button size="sm" variant="ghost" onClick={() => startEdit({ id: '', section: 'mission', title: 'Nossa Missão', content: getContent('mission', ''), updated_at: '' })} className="h-8 w-8 p-0 hover:bg-muted rounded-lg">
                    <Edit2 className="h-4 w-4 text-muted-foreground hover:text-primary" />
                  </Button>
                )}
              </div>
              <p className="text-muted-foreground leading-relaxed text-sm md:text-base font-medium">
                {getContent('mission', 'Reconciliar pessoas com Deus e uns com os outros através do evangelho de Jesus Cristo, transformando vidas, famílias e comunidades para a glória do Senhor.')}
              </p>
            </div>
          </Card>
          
          <Card className="p-6 md:p-8 border-2 hover:shadow-xl transition-all duration-300 rounded-2xl bg-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-md">
                    <Heart className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground tracking-tight">Nossa Visão</h3>
                </div>
                {isAdmin && (
                  <Button size="sm" variant="ghost" onClick={() => startEdit({ id: '', section: 'vision', title: 'Nossa Visão', content: getContent('vision', ''), updated_at: '' })} className="h-8 w-8 p-0 hover:bg-muted rounded-lg">
                    <Edit2 className="h-4 w-4 text-muted-foreground hover:text-primary" />
                  </Button>
                )}
              </div>
              <p className="text-muted-foreground leading-relaxed text-sm md:text-base font-medium">
                {getContent('vision', 'Ser uma igreja que transforma Angola e o mundo através do poder do evangelho, criando uma comunidade onde todos crescem espiritualmente e descobrem seu propósito divino.')}
              </p>
            </div>
          </Card>
        </div>

        {/* Contato + Horários */}
        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          <Card className="p-6 md:p-8 border-2 hover:shadow-xl transition-all duration-300 rounded-2xl bg-card flex flex-col justify-between">
            <div className="space-y-5">
              <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight border-b pb-2">{t('about.contact')}</h2>
              <div className="space-y-4">
                {[
                  { Icon: MapPin, gradient: 'from-primary to-accent', title: t('about.address'), content: 'Bairro Tchioco - defronte a paragem da Huíla, Lubango' },
                  { Icon: Phone, gradient: 'from-blue-500 to-cyan-500', title: t('about.phone'), content: '(+244) xxx-xxx-xxx\n(+244) xxx-xxx-xxx (WhatsApp)'},
                  { Icon: Mail, gradient: 'from-purple-500 to-pink-500', title: t('about.email'), content: 'mmerlubango@gmail.com'},
                ].map(({ Icon, gradient, title, content }) => (
                  <div key={title} className="flex items-start gap-3.5 group/item">
                    <div className={`p-2.5 bg-gradient-to-br ${gradient} rounded-xl shadow-md flex-shrink-0 transform transition-transform group-hover/item:scale-105`}>
                      <Icon className="h-4 w-4 md:h-5 md:w-5 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-foreground text-sm md:text-base mb-0.5">{title}</div>
                      <div className="text-muted-foreground text-sm font-medium whitespace-pre-line leading-relaxed">{content}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Button onClick={() => setIsContactOpen(true)} className="w-full mt-6 bg-gradient-to-r from-primary to-accent text-white font-bold text-sm md:text-base py-5 md:py-6 shadow-lg rounded-xl shadow-primary/10 hover:shadow-primary/20 transition-all hover:opacity-95" size="lg">
              <Send className="h-4 w-4 mr-2 stroke-[2.5]" />
              {t('about.sendMessage')}
            </Button>
          </Card>

          <Card className="p-6 md:p-8 border-2 bg-gradient-to-br from-primary/[0.02] via-accent/[0.02] to-primary/[0.02] hover:shadow-xl transition-all duration-300 rounded-2xl">
            <div className="flex items-center justify-between gap-3 mb-5 border-b pb-2">
              <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight">{t('about.schedules')}</h2>
              {isAdmin && (
                <Button size="sm" variant="ghost" onClick={() => startEdit({ id: '', section: 'schedules_note', title: 'Horários', content: getContent('schedules_note', ''), updated_at: '' })} className="h-8 w-8 p-0 hover:bg-muted rounded-lg">
                  <Edit2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </div>
            <div className="space-y-3">
              {schedules.map(s => (
                <div key={s.day} className="p-4 bg-card rounded-xl border-2 border-primary/10 hover:border-primary/30 transition-all shadow-sm flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-primary stroke-[2.5]" />
                    <div className="font-bold text-foreground text-sm md:text-base tracking-tight">{s.day}</div>
                  </div>
                  <div className="text-muted-foreground text-sm font-medium pl-6">{s.time}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingSection} onOpenChange={(open) => !open && setEditingSection(null)}>
        <DialogContent className="max-w-2xl rounded-2xl border-2 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2 border-b pb-2">
              <Edit2 className="h-5 w-5 text-primary" />
              Editar: {editingSection?.title || editingSection?.section}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="font-bold text-sm text-foreground">Título da Seção (opcional)</Label>
              <Input value={editContent.title} onChange={e => setEditContent({ ...editContent, title: e.target.value })} placeholder="Título customizado..." className="h-11 border-2 rounded-xl focus-visible:ring-primary/20" />
            </div>
            <div className="space-y-1.5">
              <Label className="font-bold text-sm text-foreground">Conteúdo Textual *</Label>
              <Textarea value={editContent.content} onChange={e => setEditContent({ ...editContent, content: e.target.value })} placeholder="Digite o corpo do texto estrutural..." rows={8} className="resize-none border-2 rounded-xl focus-visible:ring-primary/20 font-medium text-sm leading-relaxed" />
              <p className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
                ⚠️ Dica: Use **texto** para gerar termos em negrito e *texto* para gerar itálicos.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={saveSection} disabled={saving} className="flex-1 h-11 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl shadow-md">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {saving ? 'Gravando dados...' : 'Salvar Alterações'}
              </Button>
              <Button onClick={() => setEditingSection(null)} variant="outline" className="h-11 border-2 font-bold rounded-xl hover:bg-muted">
                <X className="h-4 w-4 mr-2" />Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact Dialog */}
      <Dialog open={isContactOpen} onOpenChange={setIsContactOpen}>
        <DialogContent className="max-w-2xl rounded-2xl border-2 shadow-2xl">
          <DialogHeader className="border-b pb-2">
            <DialogTitle className="text-xl font-black tracking-tight">{t('about.sendMessage')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="font-bold text-sm text-foreground">{t('about.fullName')} *</Label>
                <Input value={contactForm.name} onChange={e => setContactForm({ ...contactForm, name: e.target.value })} placeholder="Seu nome" className="h-11 border-2 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-bold text-sm text-foreground">Endereço de E-mail *</Label>
                <Input type="email" value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} placeholder="seu@email.com" className="h-11 border-2 rounded-xl" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="font-bold text-sm text-foreground">Assunto Central *</Label>
                <Input value={contactForm.subject} onChange={e => setContactForm({ ...contactForm, subject: e.target.value })} placeholder="Assunto da mensagem" className="h-11 border-2 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-bold text-sm text-foreground">Classificação do Contato</Label>
                <Select value={contactForm.messageType} onValueChange={v => setContactForm({ ...contactForm, messageType: v })}>
                  <SelectTrigger className="h-11 border-2 rounded-xl font-medium"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="inquiry">Dúvida / Consulta</SelectItem>
                    <SelectItem value="support">Suporte</SelectItem>
                    <SelectItem value="feedback">Feedback</SelectItem>
                    <SelectItem value="prayer">Pedido de Oração</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="font-bold text-sm text-foreground">Mensagem Descritiva *</Label>
              <Textarea value={contactForm.message} onChange={e => setContactForm({ ...contactForm, message: e.target.value })} placeholder="Digite sua mensagem detalhada..." rows={5} className="resize-none border-2 rounded-xl leading-relaxed font-medium text-sm" />
            </div>
            <Button onClick={submitContact} disabled={loading} className="w-full h-11 mt-2 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl shadow-lg transition-transform">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              {loading ? 'Transmitindo mensagem...' : 'Enviar Mensagem'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}

export default AboutPage
