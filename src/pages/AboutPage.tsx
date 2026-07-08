import { useState, useEffect, useCallback } from 'react'
import Layout from '../components/layout/Layout'
import { useTranslation } from '../hooks/useTranslation'
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

// Platform feature cards mapped with translation keys for absolute reactivity
const PLATFORM_FEATURES = [
  {
    icon: Radio,
    labelKey: 'nav.live',
    descKey: 'about.features.liveDesc',
    path: '/live',
    color: 'from-red-500 to-rose-600',
    badgeKey: 'about.features.badgeLive',
  },
  {
    icon: BookOpen,
    labelKey: 'nav.sermons',
    descKey: 'about.features.sermonsDesc',
    path: '/sermons',
    color: 'from-blue-600 to-cyan-600',
    badgeKey: null,
  },
  {
    icon: GraduationCap,
    labelKey: 'nav.academy',
    descKey: 'about.features.academyDesc',
    path: '/academy',
    color: 'from-indigo-600 to-purple-600',
    badgeKey: 'about.features.badgeNew',
  },
  {
    icon: Sparkles,
    labelKey: 'nav.ai',
    descKey: 'about.features.aiDesc',
    path: '/ai',
    color: 'from-amber-500 to-orange-500',
    badgeKey: 'about.features.badgeAI',
  },
  {
    icon: MessageCircle,
    labelKey: 'nav.community',
    descKey: 'about.features.communityDesc',
    path: '/community',
    color: 'from-pink-500 to-fuchsia-600',
    badgeKey: null,
  },
  {
    icon: Users,
    labelKey: 'nav.ministries',
    descKey: 'about.features.ministriesDesc',
    path: '/ministries',
    color: 'from-teal-500 to-emerald-600',
    badgeKey: null,
  },
]

const STATS = [
  { labelKey: 'about.stats.years', value: '25+', icon: Star },
  { labelKey: 'about.stats.features', value: '15+', icon: Zap },
  { labelKey: 'about.stats.languages', value: '4', icon: Globe },
  { labelKey: 'about.stats.availability', value: '24/7', icon: CheckCircle2 },
]

const AboutPage = () => {
  const { t } = useTranslation()
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

  const startEdit = (section: ContentSection) => {
    setEditingSection(section)
    setEditContent({ title: section.title || '', content: section.content })
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

    if (error) { 
      toast.error(t('about.toastSaveError' as any))
      setSaving(false)
      return 
    }
    toast.success(t('about.toastSaveSuccess' as any))
    setEditingSection(null)
    loadContent()
    setSaving(false)
  }

  const getContent = (section: string, fallback: string) => contentMap[section]?.content || fallback
  const getTitle = (section: string, fallback: string) => contentMap[section]?.title || fallback

  const submitContact = async () => {
    if (!contactForm.name || !contactForm.email || !contactForm.subject || !contactForm.message) {
      toast.error(t('about.toastFillFields' as any))
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
    toast.success(t('about.toastContactSuccess' as any))
    setIsContactOpen(false)
    setContactForm({ name: user?.username || '', email: user?.email || '', subject: '', messageType: 'inquiry', message: '' })
    setLoading(false)
  }

  const schedules = [
    { day: getTitle('schedule_sunday', t('about.sunday')), time: getContent('schedule_sunday', 'Culto de Celebração: 09:00 e 18:00') },
    { day: getTitle('schedule_tuesday', t('about.tuesday')), time: getContent('schedule_tuesday', 'Culto de Adoração: 17:00') },
    { day: getTitle('schedule_wednesday', t('about.wednesday')), time: getContent('schedule_wednesday', 'Culto de Palavra: 16:30') },
    { day: getTitle('schedule_thursday', t('about.thursday')), time: getContent('schedule_thursday', 'Culto de Oração: 16:30') },
    { day: getTitle('schedule_friday', t('about.friday')), time: getContent('schedule_friday', 'Culto de Palavra: 16:30') },
    { day: getTitle('schedule_saturday', t('about.saturday')), time: getContent('schedule_saturday', 'Culto de Jovens: 15:00') },
  ]

  if (pageLoading) {
    return (
      <Layout title={t('nav.about')}>
        <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">{t('common.loading')}</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={t('nav.about')}>
      <div className="space-y-0 max-w-7xl mx-auto">

        {/* ── 1. HERO — Imersivo, com gradiente profundo ── */}
        <div className="relative overflow-hidden min-h-[320px] md:min-h-[420px] flex items-end">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1438032005730-c779502df39b?w=1920&h=600&fit=crop&q=80"
              alt="MER Church"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020d1a] via-[#0A2E4A]/85 to-[#0A2E4A]/40" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#020d1a]/60 to-transparent" />
          </div>

          <div className="relative z-10 p-6 md:p-12 lg:p-16 w-full">
            <div className="max-w-3xl space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-[11px] font-bold tracking-widest uppercase text-[#D4A574]">
                <Logo size="sm" showText={false} />
                {t('about.platformDigital' as any)}
              </div>

              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
                {t('about.heroTitleStart' as any)}<br className="hidden md:block" />
                <span className="text-[#4A90A4]"> {t('about.heroTitleEnd' as any)}</span>
              </h1>

              <p className="text-base md:text-lg text-white/80 leading-relaxed max-w-xl">
                {getContent('hero_tagline', t('about.heroTaglineFallback' as any))}
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  onClick={() => navigate('/live')}
                  className="bg-white text-[#0A2E4A] hover:bg-white/95 font-bold shadow-lg rounded-full px-5"
                >
                  <Radio className="mr-2 h-4 w-4 fill-current text-red-500" />
                  {t('home.watchLive')}
                </Button>
                <Button
                  onClick={() => setIsContactOpen(true)}
                  variant="outline"
                  className="border-white/30 text-white bg-white/10 hover:bg-white/20 font-bold rounded-full px-5 backdrop-blur-sm"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {t('about.speakWithUs' as any)}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-8 lg:p-10 space-y-10">

          {/* ── Admin Banner ── */}
          {isAdmin && (
            <Card className="p-4 border-2 border-dashed border-amber-400 dark:border-amber-700 bg-amber-500/[0.04]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500 rounded-xl shadow-sm">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-amber-800 dark:text-amber-200 text-sm">{t('about.adminMode' as any)}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">{t('about.adminDescription' as any)}</p>
                </div>
              </div>
            </Card>
          )}

          {/* ── 2. STATS ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map(s => (
              <Card key={s.labelKey} className="p-5 border hover:border-primary/30 hover:shadow-md transition-all text-center group">
                <div className="flex justify-center mb-3">
                  <div className="p-2.5 bg-[#0A2E4A]/8 dark:bg-[#4A90A4]/10 rounded-xl group-hover:scale-110 transition-transform">
                    <s.icon className="h-5 w-5 text-[#0A2E4A] dark:text-[#4A90A4]" />
                  </div>
                </div>
                <div className="text-2xl font-black text-foreground">{s.value}</div>
                <div className="text-xs text-muted-foreground font-medium mt-0.5">{t(s.labelKey as any)}</div>
              </Card>
            ))}
          </div>

          {/* ── 3. HISTÓRIA ── */}
          <Card className="overflow-hidden border-2 hover:shadow-lg transition-all rounded-2xl">
            <div className="grid md:grid-cols-5">
              <div className="md:col-span-2 relative min-h-[220px] md:min-h-0">
                <img
                  src="https://images.unsplash.com/photo-1507692049790-de58290a4334?w=800&h=600&fit=crop&q=80"
                  alt="Congregação"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent md:bg-gradient-to-r" />
              </div>

              <div className="md:col-span-3 p-6 md:p-8 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-[#0A2E4A] to-[#4A90A4] rounded-xl shadow-sm">
                      <BookOpen className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-xl font-black text-foreground tracking-tight">{t('about.ourHistory')}</h2>
                  </div>
                  {isAdmin && (
                    <Button size="sm" variant="outline" onClick={() => startEdit({ id: '', section: 'history', title: t('about.ourHistory'), content: getContent('history', ''), updated_at: '' })} className="font-bold rounded-xl">
                      <Edit2 className="h-3.5 w-3.5 mr-1.5 text-primary" />{t('common.edit')}
                    </Button>
                  )}
                </div>

                <div className="space-y-4 text-muted-foreground leading-relaxed text-sm md:text-base">
                  {getContent('history', t('about.historyFallback' as any)).split('\n\n').map((para, i) => {
                    const parts = para.split(/(\*\*.*?\*\*|\*.*?\*)/g)
                    return (
                      <p key={i}>
                        {parts.map((part, j) => {
                          if (part.startsWith('**') && part.endsWith('**'))
                            return <strong key={j} className="text-foreground font-bold">{part.slice(2, -2)}</strong>
                          if (part.startsWith('*') && part.endsWith('*'))
                            return <em key={j} className="text-[#4A90A4] font-semibold not-italic">{part.slice(1, -1)}</em>
                          return part
                        })}
                      </p>
                    )
                  })}
                </div>

                <div className="flex items-start gap-3 p-4 bg-[#0A2E4A]/5 dark:bg-[#4A90A4]/10 rounded-xl border border-[#0A2E4A]/10">
                  <Quote className="h-5 w-5 text-[#0A2E4A] dark:text-[#4A90A4] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-foreground italic leading-relaxed">
                      {t('about.verseText' as any)}
                    </p>
                    <p className="text-xs text-muted-foreground font-bold mt-1">— {t('brand.verse')}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* ── 4. MISSÃO + VISÃO ── */}
          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                section: 'mission',
                titleKey: 'about.ourMission',
                icon: Globe,
                gradient: 'from-blue-500 to-cyan-500',
                fallbackKey: 'about.missionFallback',
              },
              {
                section: 'vision',
                titleKey: 'about.ourVision',
                icon: Heart,
                gradient: 'from-purple-500 to-pink-500',
                fallbackKey: 'about.visionFallback',
              },
            ].map(item => (
              <Card key={item.section} className="p-6 border-2 hover:shadow-lg transition-all rounded-2xl group">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 bg-gradient-to-br ${item.gradient} rounded-xl shadow-sm group-hover:scale-110 transition-transform`}>
                      <item.icon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-lg font-black text-foreground">{t(item.titleKey as any)}</h3>
                  </div>
                  {isAdmin && (
                    <Button size="sm" variant="ghost" onClick={() => startEdit({ id: '', section: item.section, title: t(item.titleKey as any), content: getContent(item.section, ''), updated_at: '' })} className="h-8 w-8 p-0 hover:bg-muted rounded-lg">
                      <Edit2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
                <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                  {getContent(item.section, t(item.fallbackKey as any))}
                </p>
              </Card>
            ))}
          </div>

          {/* ── 5. VALORES ── */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow-sm">
                <Heart className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-black text-foreground">{t('about.ourValues')}</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Heart,    titleKey: 'about.values.loveTitle',       section: 'value_love',      gradient: 'from-rose-500 to-red-500',      fallbackKey: 'about.values.loveDesc' },
                { icon: Users,    titleKey: 'about.values.communityTitle',  section: 'value_community', gradient: 'from-blue-500 to-cyan-500',     fallbackKey: 'about.values.communityDesc' },
                { icon: Globe,    titleKey: 'about.values.missionTitle',    section: 'value_mission',   gradient: 'from-green-500 to-emerald-500', fallbackKey: 'about.values.missionDesc' },
                { icon: BookOpen, titleKey: 'about.values.wordTitle',       section: 'value_word',      gradient: 'from-purple-500 to-indigo-500', fallbackKey: 'about.values.wordDesc' },
              ].map(v => (
                <Card key={v.titleKey} className="p-5 border-2 hover:border-primary/30 hover:shadow-lg hover:-translate-y-0.5 transition-all group rounded-2xl">
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${v.gradient} mb-4 shadow-sm group-hover:scale-110 transition-transform`}>
                    <v.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-bold text-foreground mb-1.5">{t(v.titleKey as any)}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{getContent(v.section, t(v.fallbackKey as any))}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* ── 6. PLATAFORMA KAIRÓS ── */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-gradient-to-br from-[#0A2E4A] to-[#4A90A4] rounded-xl shadow-sm">
                <Smartphone className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-foreground">{t('about.platformTitle' as any)}</h2>
                <p className="text-xs text-muted-foreground">{t('about.platformSubtitle' as any)}</p>
              </div>
            </div>

            <Card className="p-4 mb-5 border bg-gradient-to-r from-[#0A2E4A]/5 to-[#4A90A4]/5 rounded-2xl">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('about.platformDescription' as any)}
              </p>
            </Card>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {PLATFORM_FEATURES.map(feat => (
                <button
                  key={feat.labelKey}
                  onClick={() => navigate(feat.path)}
                  className="group text-left p-5 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2.5 bg-gradient-to-br ${feat.color} rounded-xl shadow-sm group-hover:scale-110 transition-transform`}>
                      <feat.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {feat.badgeKey && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-[#0A2E4A] text-white rounded-full">
                          {t(feat.badgeKey as any)}
                        </span>
                      )}
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                    </div>
                  </div>
                  <h3 className="font-bold text-foreground text-sm mb-1 group-hover:text-primary transition-colors">{t(feat.labelKey as any)}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t(feat.descKey as any)}</p>
                </button>
              ))}
            </div>
          </div>

          {/* ── 7. HORÁRIOS + CONTATO ── */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-6 border-2 rounded-2xl">
              <div className="flex items-center justify-between mb-5 pb-3 border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-[#0A2E4A] to-[#4A90A4] rounded-xl shadow-sm">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-lg font-black text-foreground">{t('about.schedules')}</h2>
                </div>
                {isAdmin && (
                  <Button size="sm" variant="ghost" onClick={() => startEdit({ id: '', section: 'schedules_note', title: t('about.schedules'), content: getContent('schedules_note', ''), updated_at: '' })} className="h-8 w-8 p-0">
                    <Edit2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                {schedules.map(s => (
                  <div key={s.day} className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/60 hover:border-primary/30 transition-colors">
                    <div className="p-1.5 bg-[#0A2E4A]/10 rounded-lg flex-shrink-0">
                      <Clock className="h-3.5 w-3.5 text-[#0A2E4A] dark:text-[#4A90A4]" />
                    </div>
                    <div>
                      <div className="font-bold text-foreground text-sm">{s.day}</div>
                      <div className="text-muted-foreground text-xs mt-0.5">{s.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 border-2 rounded-2xl flex flex-col">
              <div className="flex items-center gap-3 mb-5 pb-3 border-b">
                <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-sm">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-lg font-black text-foreground">{t('about.contact')}</h2>
              </div>

              <div className="space-y-4 flex-1">
                {[
                  { Icon: MapPin, gradient: 'from-[#0A2E4A] to-[#4A90A4]', title: t('about.address'), content: t('about.addressContent' as any) },
                  { Icon: Phone,  gradient: 'from-blue-500 to-cyan-500',    title: t('about.phone'),   content: '(+244) XXX-XXX-XXX' },
                  { Icon: Mail,   gradient: 'from-purple-500 to-pink-500',  title: t('about.email'),   content: 'mmerlubango@gmail.com' },
                ].map(({ Icon, gradient, title, content }) => (
                  <div key={title} className="flex items-start gap-3 group/item">
                    <div className={`p-2.5 bg-gradient-to-br ${gradient} rounded-xl shadow-sm flex-shrink-0 group-hover/item:scale-105 transition-transform`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-foreground text-sm">{title}</div>
                      <div className="text-muted-foreground text-xs mt-0.5 leading-relaxed">{content}</div>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => setIsContactOpen(true)}
                className="w-full mt-6 bg-[#0A2E4A] hover:bg-[#0A2E4A]/90 text-white font-bold rounded-xl shadow-sm"
              >
                <Send className="h-4 w-4 mr-2" />
                {t('about.sendMessage')}
              </Button>
            </Card>
          </div>

        </div>
      </div>

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editingSection} onOpenChange={(open) => !open && setEditingSection(null)}>
        <DialogContent className="max-w-2xl rounded-2xl border-2 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2 border-b pb-3">
              <Edit2 className="h-5 w-5 text-primary" />
              {t('common.edit')}: {editingSection?.title || editingSection?.section}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="font-bold text-sm">{t('about.titleOptional' as any)}</Label>
              <Input value={editContent.title} onChange={e => setEditContent({ ...editContent, title: e.target.value })} placeholder={t('about.titlePlaceholder' as any)} className="h-11 border-2 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="font-bold text-sm">{t('about.contentRequired' as any)}</Label>
              <Textarea value={editContent.content} onChange={e => setEditContent({ ...editContent, content: e.target.value })} placeholder={t('about.contentPlaceholder' as any)} rows={8} className="resize-none border-2 rounded-xl font-medium text-sm leading-relaxed" />
              <p className="text-[11px] text-muted-foreground">{t('about.formattingHint' as any)}</p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={saveSection} disabled={saving} className="flex-1 h-11 bg-[#0A2E4A] text-white font-bold rounded-xl">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {saving ? t('about.saving' as any) : t('common.save')}
              </Button>
              <Button onClick={() => setEditingSection(null)} variant="outline" className="h-11 border-2 font-bold rounded-xl">
                <X className="h-4 w-4 mr-2" />{t('common.cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Contact Dialog ── */}
      <Dialog open={isContactOpen} onOpenChange={setIsContactOpen}>
        <DialogContent className="max-w-2xl rounded-2xl border-2 shadow-2xl">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-xl font-black">{t('about.sendMessage')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-3">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="font-bold text-sm">{t('about.fullName')} *</Label>
                <Input value={contactForm.name} onChange={e => setContactForm({ ...contactForm, name: e.target.value })} placeholder={t('about.yourNamePlaceholder' as any)} className="h-11 border-2 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-bold text-sm">{t('auth.email')} *</Label>
                <Input type="email" value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} placeholder={t('about.emailPlaceholder' as any)} className="h-11 border-2 rounded-xl" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="font-bold text-sm">{t('about.subject')} *</Label>
                <Input value={contactForm.subject} onChange={e => setContactForm({ ...contactForm, subject: e.target.value })} placeholder={t('about.subjectPlaceholder' as any)} className="h-11 border-2 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-bold text-sm">{t('about.messageTypeLabel' as any)}</Label>
                <Select value={contactForm.messageType} onValueChange={v => setContactForm({ ...contactForm, messageType: v })}>
                  <SelectTrigger className="h-11 border-2 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="inquiry">{t('about.inquiry')}</SelectItem>
                    <SelectItem value="support">{t('about.support')}</SelectItem>
                    <SelectItem value="feedback">{t('about.feedback')}</SelectItem>
                    <SelectItem value="prayer">{t('about.prayerRequest' as any)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="font-bold text-sm">{t('about.message')} *</Label>
              <Textarea value={contactForm.message} onChange={e => setContactForm({ ...contactForm, message: e.target.value })} placeholder={t('about.messagePlaceholder' as any)} rows={5} className="resize-none border-2 rounded-xl text-sm leading-relaxed" />
            </div>
            <Button onClick={submitContact} disabled={loading} className="w-full h-11 bg-[#0A2E4A] hover:bg-[#0A2E4A]/90 text-white font-bold rounded-xl shadow-sm">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              {loading ? t('about.sending' as any) : t('about.sendMessage')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}

export default AboutPage
