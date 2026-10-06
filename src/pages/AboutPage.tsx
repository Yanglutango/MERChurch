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
import {
  MapPin, Phone, Mail, Send, Heart, Users, Globe, BookOpen,
  Shield, Edit2, Save, X, Clock, Loader2, Sparkles, Radio,
  GraduationCap, MessageCircle, Smartphone, ExternalLink,
  CheckCircle2, Quote, Star, Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

interface ContentSection {
  id: string
  section: string
  title: string | null
  content: string
  updated_at: string
}

// Ícones monocromáticos — sem gradiente por item. A cor deixou de ser
// decoração aleatória e passou a herdar do texto, consistente com todas
// as outras páginas já revistas.
const PLATFORM_FEATURES = [
  { icon: Radio,          label: 'Ao Vivo',     description: 'Cultos transmitidos em tempo real com chat interativo da comunidade', path: '/live',        badge: 'Ao vivo' },
  { icon: BookOpen,       label: 'Sermões',     description: 'Biblioteca completa de mensagens com áudio, vídeo e transcrições',      path: '/sermons',     badge: null },
  { icon: GraduationCap,  label: 'MER Academy', description: 'Cursos teológicos com certificação, quizzes e progresso individual',     path: '/academy',     badge: 'Novo' },
  { icon: Sparkles,       label: 'Logos AI',    description: 'Assistente bíblico inteligente treinado exclusivamente nas Escrituras',  path: '/ai',          badge: 'IA' },
  { icon: MessageCircle,  label: 'Comunidade',  description: 'Feed de partilha, testemunhos, grupos de célula e pedidos de oração',    path: '/community',   badge: null },
  { icon: Users,          label: 'Ministérios', description: 'Inscrição em áreas de atuação e gestão de equipes ministeriais',          path: '/ministries',  badge: null },
]

const STATS = [
  { label: 'Anos de história',      value: '25+', icon: Star },
  { label: 'Funcionalidades',       value: '15+', icon: Zap },
  { label: 'Idiomas suportados',    value: '4',   icon: Globe },
  { label: 'Disponibilidade',       value: '24/7', icon: CheckCircle2 },
]

const SCHEDULE_DAYS = [
  { key: 'schedule_sunday',    dayFallback: 'Domingo',       timeFallback: 'Culto de Celebração: 09:00 e 18:00' },
  { key: 'schedule_tuesday',   dayFallback: 'Terça-feira',   timeFallback: 'Culto de Adoração: 17:00' },
  { key: 'schedule_wednesday', dayFallback: 'Quarta-feira',  timeFallback: 'Culto de Palavra: 16:30' },
  { key: 'schedule_thursday',  dayFallback: 'Quinta-feira',  timeFallback: 'Culto de Oração: 16:30' },
  { key: 'schedule_friday',    dayFallback: 'Sexta-feira',   timeFallback: 'Culto de Palavra: 16:30' },
  { key: 'schedule_saturday',  dayFallback: 'Sábado',        timeFallback: 'Culto de Jovens: 15:00' },
]

// Parser de ênfase simples (**negrito**, *itálico*) — só usado na secção
// "Nossa História", que é a única com texto corrido longo o suficiente
// para precisar de ênfase. Extraído como função pura em vez de IIFE
// inline no JSX, para ficar legível.
function renderEmphasis(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g)
  return parts.map((part, j) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={j} className="text-foreground font-semibold">{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={j} className="text-primary font-medium not-italic">{part.slice(1, -1)}</em>
    return part
  })
}

const AboutPage = () => {
  const { t } = useAppStore()
  const { user } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'

  const [isContactOpen, setIsContactOpen] = useState(false)
  const [editingSection, setEditingSection] = useState<ContentSection | null>(null)
  const [editContent, setEditContent] = useState({ title: '', content: '' })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [contentMap, setContentMap] = useState<Record<string, ContentSection>>({})
  const [contactForm, setContactForm] = useState({
    name: user?.username || '',
    email: user?.email || '',
    subject: '',
    messageType: 'inquiry',
    message: '',
  })

  const loadContent = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('about_page_content').select('*')
      if (error) throw error
      if (data) {
        const map: Record<string, ContentSection> = {}
        data.forEach(item => { map[item.section] = item })
        setContentMap(map)
      }
    } catch (err) {
      console.error('Erro ao carregar conteúdo:', err)
    } finally {
      setPageLoading(false)
    }
  }, [])

  useEffect(() => { loadContent() }, [loadContent])

  const startEdit = (section: string, title: string, fallback: string) => {
    setEditingSection({ id: '', section, title, content: getContent(section, fallback), updated_at: '' })
    setEditContent({ title, content: getContent(section, fallback) })
  }

  const saveSection = async () => {
    if (!editingSection) return
    setSaving(true)
    const { error } = await supabase.from('about_page_content').upsert({
      section: editingSection.section,
      title: editContent.title || null,
      content: editContent.content,
      updated_by: user!.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'section' })

    if (error) { toast.error('Erro ao salvar'); setSaving(false); return }
    toast.success('Conteúdo atualizado')
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
    if (error) { toast.error(error.message); setLoading(false); return }
    toast.success('Mensagem enviada! Entraremos em contato em breve.')
    setIsContactOpen(false)
    setContactForm({ name: user?.username || '', email: user?.email || '', subject: '', messageType: 'inquiry', message: '' })
    setLoading(false)
  }

  if (pageLoading) {
    return (
      <Layout title={t('nav.about')}>
        <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Carregando...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={t('nav.about')}>
      <div className="space-y-0 max-w-7xl mx-auto">

        {/* ── Hero — mantido aqui de propósito: "Sobre" é uma página
            institucional, consultada raramente, não um ecrã de uso diário
            (ao contrário da Home). O tratamento diferencia-se das páginas
            de app por isso mesmo, mas disciplinado: um único overlay, sem
            gradientes hex empilhados, e botões a usar as variantes reais
            do Button em vez de cores brancas codificadas à mão. ── */}
        <div className="relative overflow-hidden min-h-[300px] md:min-h-[400px] flex items-end">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1438032005730-c779502df39b?w=1920&h=600&fit=crop&q=80"
              alt="Congregação da MER reunida em culto"
              width={1920}
              height={600}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/30" />
          </div>

          <div className="relative z-10 p-6 md:p-12 lg:p-16 w-full">
            <div className="max-w-3xl space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-card/80 backdrop-blur-sm rounded-full border border-border text-[11px] font-medium tracking-wide uppercase text-foreground">
                <Logo size="sm" showText={false} />
                Plataforma digital da MER
              </div>

              <h1 className="text-3xl md:text-5xl font-semibold text-foreground tracking-tight leading-tight">
                Missão Evangélica<br className="hidden md:block" />
                <span className="text-primary"> da Reconciliação</span>
              </h1>

              <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl">
                {getContent('hero_tagline', 'Uma comunidade de fé, reconciliação e propósito divino — agora com uma plataforma digital completa para conectar, crescer e impactar.')}
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button onClick={() => navigate('/live')} className="rounded-md">
                  <Radio className="mr-2 h-4 w-4" />Assistir ao vivo
                </Button>
                <Button onClick={() => setIsContactOpen(true)} variant="outline" className="rounded-md">
                  <Send className="mr-2 h-4 w-4" />Falar connosco
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-8 lg:p-10 space-y-10">

          {/* Banner de admin — mesmo tratamento já validado no alerta de
              aconselhamento do Dashboard, que sabemos funcionar bem nos
              dois modos (o anterior, com borda tracejada e opacidade de
              marca, ficava lavado no light mode). */}
          {isAdmin && (
            <Card className="p-4 border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-amber-700 dark:text-amber-400 flex-shrink-0" strokeWidth={1.75} />
                <div>
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Modo de edição ativo</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400">Clique em "Editar" em qualquer secção para atualizar o conteúdo.</p>
                </div>
              </div>
            </Card>
          )}

          {/* Estatísticas — ícone monocromático, fundo neutro */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {STATS.map(s => (
              <Card key={s.label} className="p-4 border rounded-lg text-center">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center mx-auto mb-3">
                  <s.icon className="h-4 w-4 text-foreground" strokeWidth={1.75} />
                </div>
                <div className="text-xl font-semibold text-foreground tabular-nums">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </Card>
            ))}
          </div>

          {/* História */}
          <Card className="overflow-hidden border rounded-lg">
            <div className="grid md:grid-cols-5">
              <div className="md:col-span-2 relative min-h-[200px] md:min-h-0">
                <img
                  src="https://images.unsplash.com/photo-1507692049790-de58290a4334?w=800&h=600&fit=crop&q=80"
                  alt="Membros da congregação"
                  width={800}
                  height={600}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="md:col-span-3 p-6 md:p-8 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2.5">
                    <BookOpen className="h-4 w-4 text-primary" strokeWidth={1.75} />
                    {t('about.ourHistory')}
                  </h2>
                  {isAdmin && (
                    <Button
                      size="sm" variant="outline"
                      onClick={() => startEdit('history', 'Nossa História', 'A **Missão Evangélica da Reconciliação (MER)** nasceu em Angola com o propósito de levar o amor de Deus a todas as pessoas.\n\nHoje somos uma comunidade vibrante e acolhedora, comprometida em fazer a diferença em nossa cidade, no país e além-fronteiras.\n\nA nossa plataforma digital *KAIRÓS* é o reflexo dessa missão no mundo digital — um ecossistema completo para crescimento espiritual, comunhão e serviço.')}
                      className="rounded-md"
                    >
                      <Edit2 className="h-3.5 w-3.5 mr-1.5" />Editar
                    </Button>
                  )}
                </div>

                <div className="space-y-3.5 text-muted-foreground leading-relaxed text-sm">
                  {getContent('history', 'A **Missão Evangélica da Reconciliação (MER)** nasceu em Angola com o propósito de levar o amor de Deus a todas as pessoas.\n\nHoje somos uma comunidade vibrante e acolhedora, comprometida em fazer a diferença em nossa cidade, no país e além-fronteiras.\n\nA nossa plataforma digital *KAIRÓS* é o reflexo dessa missão no mundo digital — um ecossistema completo para crescimento espiritual, comunhão e serviço.')
                    .split('\n\n')
                    .map((para, i) => <p key={i}>{renderEmphasis(para)}</p>)}
                </div>

                <div className="flex items-start gap-3 p-4 bg-muted/40 rounded-lg border-l-2 border-primary">
                  <Quote className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                  <div>
                    <p className="text-sm font-medium text-foreground italic leading-relaxed">
                      "Tudo isso vem de Deus, que nos reconciliou consigo mesmo por meio de Cristo..."
                    </p>
                    <p className="text-xs text-muted-foreground font-medium mt-1">— {t('brand.verse')}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Missão + Visão */}
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { section: 'mission', title: 'Nossa Missão', icon: Globe, fallback: 'Reconciliar pessoas com Deus e uns com os outros através do evangelho de Jesus Cristo, transformando vidas, famílias e comunidades para a glória do Senhor.' },
              { section: 'vision',  title: 'Nossa Visão',  icon: Heart, fallback: 'Ser uma igreja que transforma Angola e o mundo através do poder do evangelho, criando uma comunidade onde todos crescem espiritualmente e descobrem seu propósito divino.' },
            ].map(item => (
              <Card key={item.section} className="p-5 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2.5">
                    <item.icon className="h-4 w-4 text-primary" strokeWidth={1.75} />
                    {item.title}
                  </h3>
                  {isAdmin && (
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => startEdit(item.section, item.title, item.fallback)}
                      className="h-8 w-8 p-0 rounded-md"
                      aria-label={`Editar ${item.title}`}
                    >
                      <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  )}
                </div>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  {getContent(item.section, item.fallback)}
                </p>
              </Card>
            ))}
          </div>

          {/* Valores — monocromático, sem arco-íris por cartão */}
          <div>
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2.5 mb-4">
              <Heart className="h-4 w-4 text-primary" strokeWidth={1.75} />
              {t('about.ourValues')}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { icon: Heart,    title: 'Amor',       section: 'value_love',      fallback: 'Demonstramos o amor de Cristo em tudo que fazemos' },
                { icon: Users,    title: 'Comunidade', section: 'value_community', fallback: 'Somos uma família unida pela fé e companheirismo' },
                { icon: Globe,    title: 'Missão',     section: 'value_mission',   fallback: 'Levamos esperança e transformação ao mundo' },
                { icon: BookOpen, title: 'Palavra',    section: 'value_word',      fallback: 'A Bíblia é nossa fonte de verdade e direção' },
              ].map(v => (
                <Card key={v.title} className="p-4 border rounded-lg">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center mb-3">
                    <v.icon className="h-4 w-4 text-foreground" strokeWidth={1.75} />
                  </div>
                  <h3 className="font-medium text-foreground text-sm mb-1">{v.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{getContent(v.section, v.fallback)}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Plataforma KAIRÓS — maior ofensor de arco-íris da página,
              agora monocromático */}
          <div>
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2.5 mb-1">
              <Smartphone className="h-4 w-4 text-primary" strokeWidth={1.75} />
              Plataforma KAIRÓS
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Ecossistema digital completo da MER</p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PLATFORM_FEATURES.map(feat => (
                <button
                  key={feat.label}
                  onClick={() => navigate(feat.path)}
                  className="group text-left p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <div className="flex items-start justify-between mb-3">
                    <feat.icon className="h-4 w-4 text-foreground" strokeWidth={1.75} />
                    <div className="flex items-center gap-1.5">
                      {feat.badge && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 border border-border rounded-md text-muted-foreground">
                          {feat.badge}
                        </span>
                      )}
                      <ExternalLink className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors" />
                    </div>
                  </div>
                  <h3 className="font-medium text-foreground text-sm mb-1">{feat.label}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{feat.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Horários + Contacto */}
          <div className="grid md:grid-cols-2 gap-4">

            {/* Horários — CORRIGIDO: cada dia agora tem o seu próprio botão
                de editar, ligado ao campo real (schedule_sunday, etc.).
                Antes havia um único botão no cabeçalho que editava
                'schedules_note', um campo nunca lido em lado nenhum —
                como admin, era impossível mudar os horários reais pela
                interface. */}
            <Card className="p-5 border rounded-lg">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2.5 mb-4 pb-3 border-b border-border">
                <Clock className="h-4 w-4 text-primary" strokeWidth={1.75} />
                {t('about.schedules')}
              </h2>
              <div className="space-y-2">
                {SCHEDULE_DAYS.map(s => (
                  <div key={s.key} className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/40 border border-border/60">
                    <div className="min-w-0">
                      <div className="font-medium text-foreground text-sm">{getTitle(s.key, s.dayFallback)}</div>
                      <div className="text-muted-foreground text-xs mt-0.5">{getContent(s.key, s.timeFallback)}</div>
                    </div>
                    {isAdmin && (
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => startEdit(s.key, s.dayFallback, s.timeFallback)}
                        className="h-7 w-7 p-0 rounded-md flex-shrink-0"
                        aria-label={`Editar horário de ${s.dayFallback}`}
                      >
                        <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Contacto */}
            <Card className="p-5 border rounded-lg flex flex-col">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2.5 mb-4 pb-3 border-b border-border">
                <MapPin className="h-4 w-4 text-primary" strokeWidth={1.75} />
                {t('about.contact')}
              </h2>

              <div className="space-y-4 flex-1">
                {[
                  { Icon: MapPin, title: t('about.address'), content: 'Bairro Tchioco — defronte à paragem da Huíla, Lubango, Angola' },
                  { Icon: Phone,  title: t('about.phone'),   content: '(+244) XXX-XXX-XXX' },
                  { Icon: Mail,   title: t('about.email'),   content: 'mmerlubango@gmail.com' },
                ].map(({ Icon, title, content }) => (
                  <div key={title} className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Icon className="h-3.5 w-3.5 text-foreground" strokeWidth={1.75} />
                    </div>
                    <div>
                      <div className="font-medium text-foreground text-sm">{title}</div>
                      <div className="text-muted-foreground text-xs mt-0.5 leading-relaxed">{content}</div>
                    </div>
                  </div>
                ))}
              </div>

              <Button onClick={() => setIsContactOpen(true)} className="w-full mt-5 rounded-md">
                <Send className="h-4 w-4 mr-2" />
                {t('about.sendMessage')}
              </Button>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialog de edição */}
      <Dialog open={!!editingSection} onOpenChange={(open) => !open && setEditingSection(null)}>
        <DialogContent className="max-w-2xl rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2 border-b border-border pb-3">
              <Edit2 className="h-4 w-4 text-primary" />
              Editar: {editingSection?.title || editingSection?.section}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="font-medium text-sm">Título (opcional)</Label>
              <Input value={editContent.title} onChange={e => setEditContent({ ...editContent, title: e.target.value })} placeholder="Título da seção..." className="h-10 rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Label className="font-medium text-sm">Conteúdo *</Label>
              <Textarea value={editContent.content} onChange={e => setEditContent({ ...editContent, content: e.target.value })} placeholder="Digite o texto..." rows={8} className="resize-none rounded-md text-sm leading-relaxed" />
              <p className="text-[11px] text-muted-foreground">Use **texto** para negrito e *texto* para itálico.</p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={saveSection} disabled={saving} className="flex-1 rounded-md">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {saving ? 'Gravando...' : 'Salvar'}
              </Button>
              <Button onClick={() => setEditingSection(null)} variant="outline" className="rounded-md">
                <X className="h-4 w-4 mr-2" />Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de contacto */}
      <Dialog open={isContactOpen} onOpenChange={setIsContactOpen}>
        <DialogContent className="max-w-2xl rounded-lg">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-lg font-semibold">{t('about.sendMessage')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-3">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="font-medium text-sm">{t('about.fullName')} *</Label>
                <Input value={contactForm.name} onChange={e => setContactForm({ ...contactForm, name: e.target.value })} placeholder="Seu nome" className="h-10 rounded-md" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-medium text-sm">Email *</Label>
                <Input type="email" value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} placeholder="seu@email.com" className="h-10 rounded-md" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="font-medium text-sm">Assunto *</Label>
                <Input value={contactForm.subject} onChange={e => setContactForm({ ...contactForm, subject: e.target.value })} placeholder="Assunto da mensagem" className="h-10 rounded-md" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-medium text-sm">Tipo de Contato</Label>
                <Select value={contactForm.messageType} onValueChange={v => setContactForm({ ...contactForm, messageType: v })}>
                  <SelectTrigger className="h-10 rounded-md"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-md">
                    <SelectItem value="inquiry">Dúvida / Consulta</SelectItem>
                    <SelectItem value="support">Suporte</SelectItem>
                    <SelectItem value="feedback">Feedback</SelectItem>
                    <SelectItem value="prayer">Pedido de Oração</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="font-medium text-sm">Mensagem *</Label>
              <Textarea value={contactForm.message} onChange={e => setContactForm({ ...contactForm, message: e.target.value })} placeholder="Digite sua mensagem..." rows={5} className="resize-none rounded-md text-sm leading-relaxed" />
            </div>
            <Button onClick={submitContact} disabled={loading} className="w-full rounded-md">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              {loading ? 'Enviando...' : 'Enviar Mensagem'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}

export default AboutPage
