import { useState, useEffect } from 'react'
import Layout from '../components/layout/Layout'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../stores/appStore'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import {
  Radio, BookOpen, Calendar, Users, GraduationCap,
  MessageCircle, Heart, Shield, BarChart3, Clock,
  ChevronRight, ArrowUpRight, Circle,
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { AdminAction } from '../components/shared/AdminAction'

// ── Skeleton — discreto, sem cor decorativa ────────────────────────────────
const RowSkeleton = () => (
  <div className="flex items-center gap-3 py-3 animate-pulse">
    <div className="h-9 w-9 rounded-lg bg-muted flex-shrink-0" />
    <div className="flex-1 space-y-1.5">
      <div className="h-3 w-2/3 bg-muted rounded" />
      <div className="h-2.5 w-1/3 bg-muted rounded" />
    </div>
  </div>
)

interface UpcomingEventPreview {
  id: string
  title: string
  date: string
  location: string | null
}

interface RecentSermonPreview {
  id: string
  title: string
  speaker: string
  date: string
  views: number | null
}

const HomePage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useAppStore()
  const isGuest = user?.role === 'guest'
  const isMember = user?.role === 'member'
  const isAdmin = user?.role === 'admin'

  const [statsLoading, setStatsLoading] = useState(true)
  const [membersConnected, setMembersConnected] = useState(0)
  const [activeCells, setActiveCells] = useState(0)
  const [upcomingEvent, setUpcomingEvent] = useState<UpcomingEventPreview | null>(null)
  const [recentSermon, setRecentSermon] = useState<RecentSermonPreview | null>(null)
  const [isLive, setIsLive] = useState(false)
  const [nextSession, setNextSession] = useState<{ title: string; start_time: string } | null>(null)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      setStatsLoading(true)
      try {
        const [membersRes, cellsRes, liveRes, sermonRes, eventRes, nextRes] = await Promise.all([
          supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'member'),
          supabase.from('small_groups').select('id', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('events').select('id, title, date, location').gte('date', new Date().toISOString()).order('date', { ascending: true }).limit(1).maybeSingle(),
          supabase.from('sermons').select('id, title, speaker, date, views').order('date', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('live_sessions').select('*').eq('is_active', true).maybeSingle(),
          supabase.from('live_sessions')
            .select('title, start_time')
            .eq('is_active', false)
            .gte('start_time', new Date().toISOString())
            .order('start_time', { ascending: true })
            .limit(1)
            .maybeSingle(),
        ])

        if (!mounted) return

        if (nextRes.data) setNextSession(nextRes.data)
        setMembersConnected(membersRes.count || 0)
        setActiveCells(cellsRes.count || 0)
        if (eventRes.data) setUpcomingEvent(eventRes.data)
        if (sermonRes.data) setRecentSermon(sermonRes.data)
        if (liveRes.data) setIsLive(true)
      } catch (err) {
        console.error('Erro ao carregar estatísticas da home:', err)
      } finally {
        if (mounted) setStatsLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [])

  // Ícones monocromáticos — a cor deixou de ser decoração por item e passou
  // a ser herdada do texto (foreground/muted), consistente em toda a grelha.
  const quickActions = (() => {
    const live      = { icon: Radio,          label: 'Ao Vivo',     path: '/live' }
    const sermons   = { icon: BookOpen,       label: 'Sermões',     path: '/sermons' }
    const agenda    = { icon: Calendar,       label: 'Agenda',      path: '/agenda' }
    const community = { icon: MessageCircle,  label: 'Comunidade',  path: '/community' }
    const dash      = { icon: BarChart3,      label: 'Dashboard',   path: '/dashboard' }
    const prayer    = { icon: Heart,          label: 'Oração',      path: '/prayer' }
    const academy   = { icon: GraduationCap,  label: 'Cursos',      path: '/academy' }
    const about     = { icon: Users,          label: 'Sobre a MER', path: '/about' }

    if (isAdmin) return [dash, live, sermons, community]
    if (isGuest) return [live, sermons, agenda, about]
    return [live, sermons, community, academy]
  })()

  const statItems = isGuest
    ? [
        { label: 'Anos de história', value: '25+' },
        { label: 'Vidas impactadas', value: '10k+' },
      ]
    : [
        { label: 'Membros conectados', value: statsLoading ? null : membersConnected.toLocaleString() },
        { label: 'Células ativas',     value: statsLoading ? null : activeCells.toString() },
      ]

  const greeting = isGuest
    ? 'Bem-vindo à Família MER'
    : isMember
      ? (user?.username ? `Olá, ${user.username}` : 'Bem-vindo de volta')
      : 'Visão administrativa'

  const subtitle = isGuest
    ? 'Um lugar de reconciliação, transformação e propósito.'
    : isMember
      ? 'Sua jornada espiritual continua.'
      : 'Dados ao vivo e gestão da plataforma.'

  return (
    <Layout title={t('nav.home')}>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">

        {/* ── Cabeçalho: sem foto, sem gradiente — texto e estado real ─────── */}
        <header className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
                {isAdmin && <Shield className="h-5 w-5 text-primary" strokeWidth={2} />}
                {greeting}
              </h1>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>

          {/* Estado de transmissão — a cor aqui é sinal (ao vivo = vermelho é
              estado real do sistema), não decoração */}
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {isLive ? (
                <span className="relative flex h-2 w-2 flex-shrink-0">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
              ) : (
                <Circle className="h-2 w-2 flex-shrink-0 text-muted-foreground fill-muted-foreground" />
              )}
              <span className="text-sm text-foreground truncate">
                {isLive
                  ? 'Ao vivo agora'
                  : nextSession
                    ? `Próxima transmissão · ${new Date(nextSession.start_time).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}, ${new Date(nextSession.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                    : 'Sem transmissão agendada'}
              </span>
            </div>
            <Button
              size="sm"
              onClick={() => navigate(isAdmin ? '/dashboard' : '/live')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md flex-shrink-0"
            >
              {isAdmin ? 'Dashboard' : isLive ? 'Assistir' : 'Ver agenda'}
            </Button>
          </div>
        </header>

        {/* ── Acesso rápido ────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Acesso rápido
          </h2>
          <div className="grid grid-cols-4 gap-2">
            {quickActions.map(action => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className="flex flex-col items-center gap-2 py-3.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-primary"
              >
                <action.icon className="h-5 w-5 text-foreground" strokeWidth={1.75} />
                <span className="text-[11px] font-medium text-foreground text-center leading-tight px-1">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Conteúdo recente — lista, não cards de marketing ──────────────── */}
        <section>
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Acompanhe
          </h2>
          <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
            {statsLoading ? (
              <div className="px-4">
                <RowSkeleton />
                <RowSkeleton />
              </div>
            ) : (
              <>
                <button
                  onClick={() => navigate('/agenda')}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-4 w-4 text-foreground" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-muted-foreground">Próximo evento</p>
                    {upcomingEvent ? (
                      <>
                        <p className="text-sm font-medium text-foreground truncate">{upcomingEvent.title}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" />
                          {new Date(upcomingEvent.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum evento agendado</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>

                <button
                  onClick={() => navigate('/sermons')}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <BookOpen className="h-4 w-4 text-foreground" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-muted-foreground">Última mensagem</p>
                    {recentSermon ? (
                      <>
                        <p className="text-sm font-medium text-foreground truncate">{recentSermon.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {recentSermon.speaker} · {new Date(recentSermon.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum sermão disponível</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
              </>
            )}
          </div>
        </section>

        {/* ── Estatísticas — números como dados, sem cartão colorido cada ──── */}
        <section className="flex items-center rounded-lg border border-border divide-x divide-border overflow-hidden">
          {statsLoading ? (
            <div className="flex-1 grid grid-cols-2 divide-x divide-border">
              {[0, 1].map(i => (
                <div key={i} className="p-4 space-y-2 animate-pulse">
                  <div className="h-5 w-10 bg-muted rounded" />
                  <div className="h-2.5 w-16 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : (
            statItems.map(item => (
              <div key={item.label} className="flex-1 p-4">
                <div className="text-lg font-semibold text-foreground leading-none tabular-nums">
                  {item.value ?? '—'}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">{item.label}</div>
              </div>
            ))
          )}
        </section>

        {/* ── Chamada contextual — mesmo tratamento visual para guest e admin,
             sem âmbar decorativo: âmbar é sinal de aviso, não de "aqui está
             o teu painel" ─────────────────────────────────────────────────── */}
        {isGuest && (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 px-4 py-3.5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Pronto para fazer parte?</p>
              <p className="text-xs text-muted-foreground">Membros têm acesso completo à plataforma.</p>
            </div>
            <Button
              size="sm"
              onClick={() => navigate('/about')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md flex-shrink-0"
            >
              Entrar
            </Button>
          </div>
        )}

        {isAdmin && (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 px-4 py-3.5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Painel administrativo</p>
              <p className="text-xs text-muted-foreground">Métricas ao vivo, relatórios e gestão.</p>
            </div>
            <AdminAction>
              <Button
                size="sm"
                onClick={() => navigate('/dashboard')}
                variant="outline"
                className="rounded-md flex-shrink-0 group"
              >
                Abrir
                <ArrowUpRight className="h-3.5 w-3.5 ml-1 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Button>
            </AdminAction>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default HomePage
