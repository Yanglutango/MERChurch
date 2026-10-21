import { useState, useEffect } from 'react'
import Layout from '../components/layout/Layout'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../stores/appStore'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import {
  Radio,
  BookOpen,
  Calendar,
  Users,
  GraduationCap,
  MessageCircle,
  Heart,
  Shield,
  BarChart3,
  Clock,
  ChevronRight,
  ArrowUpRight,
  Circle,
  Sparkles,
  MapPin,
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { AdminAction } from '../components/shared/AdminAction'

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
        const [
          membersRes,
          cellsRes,
          nextEventRes,
          sermonRes,
          activeLiveRes,
          nextSessionRes,
        ] = await Promise.all([
          supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'member'),
          supabase.from('small_groups').select('id', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('events').select('id, title, date, location').gte('date', new Date().toISOString()).order('date', { ascending: true }).limit(1).maybeSingle(),
          supabase.from('sermons').select('id, title, speaker, date, views').order('date', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('events').select('id, title, date, location').eq('is_live', true).limit(1).maybeSingle(),
          supabase.from('live_sessions')
            .select('title, start_time')
            .eq('is_active', false)
            .gte('start_time', new Date().toISOString())
            .order('start_time', { ascending: true })
            .limit(1)
            .maybeSingle(),
        ])

        if (!mounted) return

        if (nextEventRes.data) setUpcomingEvent(nextEventRes.data)
        if (sermonRes.data) setRecentSermon(sermonRes.data)
        if (activeLiveRes.data) setIsLive(true)
        if (nextSessionRes.data) setNextSession(nextSessionRes.data)

        setMembersConnected(membersRes.count ?? 0)
        setActiveCells(cellsRes.count ?? 0)
      } catch (error) {
        console.error('Erro ao carregar estatísticas da home:', error)
      } finally {
        if (mounted) setStatsLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  const quickActions = (() => {
    const live = { icon: Radio, label: 'Ao Vivo', path: '/live' }
    const sermons = { icon: BookOpen, label: 'Sermões', path: '/sermons' }
    const agenda = { icon: Calendar, label: 'Agenda', path: '/agenda' }
    const community = { icon: MessageCircle, label: 'Comunidade', path: '/community' }
    const dashboard = { icon: BarChart3, label: 'Dashboard', path: '/dashboard' }
    const prayer = { icon: Heart, label: 'Oração', path: '/prayer' }
    const academy = { icon: GraduationCap, label: 'Cursos', path: '/academy' }
    const about = { icon: Users, label: 'Sobre a MER', path: '/about' }

    if (isAdmin) return [dashboard, live, sermons, community]
    if (isGuest) return [live, sermons, agenda, about]
    return [live, sermons, community, academy]
  })()

  const statItems = isGuest
    ? [
        { label: 'Anos de história', value: '25+' },
        { label: 'Vidas impactadas', value: '10k+' },
      ]
    : [
        { label: 'Membros conectados', value: statsLoading ? '—' : membersConnected.toLocaleString() },
        { label: 'Células ativas', value: statsLoading ? '—' : activeCells.toString() },
      ]

  const greeting = isGuest
    ? 'Bem-vindo à Família MER'
    : isMember
      ? user?.username
        ? `Olá, ${user.username}`
        : 'Bem-vindo de volta'
      : 'Visão administrativa'

  const subtitle = isGuest
    ? 'Um lugar de reconciliação, transformação e propósito.'
    : isMember
      ? 'Sua jornada espiritual continua.'
      : 'Dados ao vivo e gestão da plataforma.'

  const statusLabel = isLive
    ? 'Ao vivo agora'
    : nextSession
      ? 'Próxima transmissão'
      : 'Sem transmissão agendada'

  const statusMeta = isLive
    ? 'Estamos em culto agora'
    : nextSession
      ? new Date(nextSession.start_time).toLocaleDateString('pt-BR', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
        }) + ' • ' + new Date(nextSession.start_time).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Acompanhe a agenda da semana'

  return (
    <Layout title={t('nav.home')}>
      <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-10">
        <header className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">MER Church</p>
              <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-[-0.03em] text-foreground lg:text-3xl">
                {isAdmin && <Shield className="h-5 w-5 text-primary" strokeWidth={2} />}
                {greeting}
              </h1>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-border bg-card p-4 shadow-[0_20px_50px_rgba(15,23,42,0.03)] lg:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{subtitle}</p>
                <div className="flex items-center gap-2.5">
                  {isLive ? (
                    <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                    </span>
                  ) : (
                    <Circle className="h-2.5 w-2.5 flex-shrink-0 fill-muted-foreground text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium text-foreground">{statusLabel}</span>
                  <span className="text-xs text-muted-foreground">{statusMeta}</span>
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => navigate(isAdmin ? '/dashboard' : '/live')}
                className="w-full rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 lg:w-auto"
              >
                {isAdmin ? 'Dashboard' : isLive ? 'Assistir ao vivo' : 'Ver agenda'}
              </Button>
            </div>
          </div>
        </header>

        <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start">
          <main className="flex-1 space-y-8">
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Acesso rápido</h2>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {quickActions.map((action) => (
                  <button
                    key={action.path}
                    onClick={() => navigate(action.path)}
                    className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-3 py-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-foreground transition-colors group-hover:bg-primary/5 group-hover:text-primary">
                      <action.icon className="h-4 w-4" strokeWidth={1.8} />
                    </div>
                    <span className="text-[11px] font-medium leading-tight text-foreground">{action.label}</span>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Acompanhe</h2>
              </div>

              <div className="overflow-hidden rounded-[1.35rem] border border-border bg-card">
                {statsLoading ? (
                  <div className="px-4">
                    <RowSkeleton />
                    <RowSkeleton />
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    <button
                      onClick={() => navigate('/agenda')}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-foreground">
                        <Calendar className="h-4 w-4" strokeWidth={1.8} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-muted-foreground">Próximo evento</p>
                        {upcomingEvent ? (
                          <>
                            <p className="truncate text-sm font-medium text-foreground">{upcomingEvent.title}</p>
                            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {new Date(upcomingEvent.date).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">Nenhum evento agendado</p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>

                    <button
                      onClick={() => navigate('/sermons')}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-foreground">
                        <BookOpen className="h-4 w-4" strokeWidth={1.8} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-muted-foreground">Última mensagem</p>
                        {recentSermon ? (
                          <>
                            <p className="truncate text-sm font-medium text-foreground">{recentSermon.title}</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {recentSermon.speaker} · {new Date(recentSermon.date).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'short',
                              })}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">Nenhum sermão disponível</p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                )}
              </div>
            </section>
          </main>

          <aside className="w-full space-y-6 lg:w-80 lg:flex-shrink-0 lg:sticky lg:top-20">
            <section className="overflow-hidden rounded-[1.35rem] border border-border bg-card">
              <div className="grid divide-x divide-border lg:grid-cols-1 lg:divide-x-0 lg:divide-y">
                {statsLoading ? (
                  <div className="grid divide-x divide-border lg:grid-cols-1 lg:divide-x-0 lg:divide-y">
                    {[0, 1].map((item) => (
                      <div key={item} className="space-y-2 p-4 animate-pulse">
                        <div className="h-5 w-10 rounded bg-muted" />
                        <div className="h-2.5 w-16 rounded bg-muted" />
                      </div>
                    ))}
                  </div>
                ) : (
                  statItems.map((item) => (
                    <div key={item.label} className="p-4">
                      <div className="text-xl font-semibold tracking-[-0.03em] text-foreground tabular-nums">{item.value}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">{item.label}</div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[1.35rem] border border-border bg-card p-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/5 text-primary">
                  <Sparkles className="h-4 w-4" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Vida da comunidade</p>
                  <p className="text-[11px] text-muted-foreground">Em movimento</p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
                  <Users className="h-4 w-4 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-muted-foreground">Células ativas</p>
                    <p className="text-sm font-medium text-foreground">{statsLoading ? 'Carregando...' : `${activeCells}`}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
                  <MapPin className="h-4 w-4 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-muted-foreground">Próximo evento</p>
                    <p className="text-sm font-medium text-foreground truncate">
                      {upcomingEvent ? upcomingEvent.title : 'A definir'}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {isGuest && (
              <div className="rounded-[1.35rem] border border-border bg-muted/40 p-4">
                <p className="text-sm font-medium text-foreground">Pronto para fazer parte?</p>
                <p className="mt-1 text-xs text-muted-foreground">Membros têm acesso completo à plataforma.</p>
                <Button
                  size="sm"
                  onClick={() => navigate('/about')}
                  className="mt-4 w-full rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Entrar
                </Button>
              </div>
            )}

            {isAdmin && (
              <div className="rounded-[1.35rem] border border-border bg-muted/40 p-4">
                <p className="text-sm font-medium text-foreground">Painel administrativo</p>
                <p className="mt-1 text-xs text-muted-foreground">Métricas ao vivo, relatórios e gestão.</p>
                <AdminAction>
                  <Button
                    size="sm"
                    onClick={() => navigate('/dashboard')}
                    variant="outline"
                    className="mt-4 w-full rounded-md group"
                  >
                    Abrir
                    <ArrowUpRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Button>
                </AdminAction>
              </div>
            )}
          </aside>
        </div>
      </div>
    </Layout>
  )
}

export default HomePage
