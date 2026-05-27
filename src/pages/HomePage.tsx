import { useState, useEffect } from 'react'
import Layout from '../components/layout/Layout'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../stores/appStore'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import {
  Radio, BookOpen, Calendar, Sparkles, Users, GraduationCap,
  MessageCircle, Heart, Play, Shield, Bell, BarChart3, Flame, Clock, UserPlus,
} from 'lucide-react'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { AdminAction } from '../components/shared/AdminAction'

// ── Skeleton loader ────────────────────────────────────────────────────────
const StatSkeleton = () => (
  <div className="animate-pulse rounded-xl border p-4 bg-muted/40">
    <div className="h-3 w-16 bg-muted rounded mb-2" />
    <div className="h-6 w-10 bg-muted rounded" />
  </div>
)

const [nextSession, setNextSession] = useState<{ title: string; start_time: string } | null>(null)

const HomePage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useAppStore()
  const isGuest = user?.role === 'guest'
  const isMember = user?.role === 'member'
  const isAdmin = user?.role === 'admin'

  // Real stats from DB
  const [statsLoading, setStatsLoading] = useState(true)
  const [membersConnected, setMembersConnected] = useState(0)
  const [activeCells, setActiveCells] = useState(0)
  const [upcomingEvent, setUpcomingEvent] = useState<any>(null)
  const [recentSermon, setRecentSermon] = useState<any>(null)
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    const load = async () => {
      setStatsLoading(true)
      const [membersRes, cellsRes, eventRes, sermonRes, liveRes] = await Promise.all([
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'member'),
        supabase.from('small_groups').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('events').select('id, title, date, location').gte('date', new Date().toISOString()).order('date', { ascending: true }).limit(1).maybeSingle(),
        supabase.from('sermons').select('id, title, speaker, date, views').order('date', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('live_sessions').select('id').eq('is_active', true).limit(1),
        supabase.from('live_sessions')
  .select('title, start_time')
  .eq('is_active', false)
  .gte('start_time', new Date().toISOString())
  .order('start_time', { ascending: true })
  .limit(1)
  .maybeSingle(),
      ])
      setMembersConnected(membersRes.count || 0)
      setActiveCells(cellsRes.count || 0)
      if (eventRes.data) setUpcomingEvent(eventRes.data)
      if (sermonRes.data) setRecentSermon(sermonRes.data)
      if (liveRes.data && liveRes.data.length > 0) setIsLive(true)
      setStatsLoading(false)
      if (nextRes.data) setNextSession(nextRes.data)
    }
    load()
  }, [])

  // ── Quick actions: max 4 ─────────────────────────────────────────────────
  const quickActions = (() => {
    const live   = { icon: Radio,          label: 'Ao Vivo',     path: '/live',      color: 'from-red-600 to-rose-600' }
    const sermons= { icon: BookOpen,        label: 'Sermões',     path: '/sermons',   color: 'from-blue-600 to-cyan-600' }
    const agenda = { icon: Calendar,        label: 'Agenda',      path: '/agenda',    color: 'from-purple-600 to-pink-600' }
    const community={ icon: MessageCircle,  label: 'Comunidade',  path: '/community', color: 'from-pink-600 to-fuchsia-600' }
    const dash   = { icon: BarChart3,       label: 'Dashboard',   path: '/dashboard', color: 'from-amber-600 to-orange-600' }
    const prayer = { icon: Heart,           label: 'Oração',      path: '/prayer',    color: 'from-rose-600 to-pink-600' }
    const academy= { icon: GraduationCap,   label: 'Cursos',      path: '/academy',   color: 'from-indigo-600 to-purple-600' }
    const about  = { icon: Users,           label: 'Sobre a MER', path: '/about',     color: 'from-teal-600 to-green-600' }

    if (isAdmin)  return [dash, live, sermons, community]
    if (isGuest)  return [live, sermons, agenda, about]
    return [live, sermons, community, academy]
  })()

  // ── Stats grid: 2 real + fixed ──────────────────────────────────────────
  const statItems = isGuest
    ? [
        { label: 'Anos de história',  value: '25+',  icon: Flame },
        { label: 'Vidas impactadas',  value: '10k+', icon: Heart },
      ]
    : [
        { label: 'Membros conectados', value: statsLoading ? null : membersConnected.toLocaleString(), icon: Users },
        { label: 'Células ativas',     value: statsLoading ? null : activeCells.toString(),            icon: Users },
      ]

  return (
    <Layout title={t('nav.home')}>
      <div className="space-y-5">

        {/* ── 1. Hero Card ──────────────────────────────────────────────── */}
        <Card className="relative overflow-hidden border-0 shadow-xl rounded-2xl max-h-[220px] md:max-h-none">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?w=1920&h=500&fit=crop&q=80"
              alt="Worship"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#0A2E4A]/96 via-[#1a4d6d]/94 to-[#4A90A4]/92" />
          </div>

          <div className="relative z-10 p-5 md:p-10 lg:p-14 text-white overflow-hidden">
            <div className="max-w-2xl space-y-3 md:space-y-5">
              {/* Live badge */}
              {isLive ? (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/90 backdrop-blur-md rounded-full text-xs font-bold">
                  <div className="h-1.5 w-1.5 bg-white rounded-full animate-pulse" />
                  AO VIVO AGORA
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold">
  {nextSession
    ? `Próximo: ${new Date(nextSession.start_time).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })} · ${new Date(nextSession.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : 'Sem transmissão agendada'}
</div>
              )}

              {/* Contextual title */}
              <h1 className="text-xl md:text-3xl font-bold leading-tight">
                {isGuest  && 'Bem-vindo à Família MER'}
                {isMember && (user?.username ? `Olá, ${user.username}` : 'Bem-vindo de Volta')}
                {isAdmin  && <><Shield className="inline h-6 w-6 mr-2 text-[#D4A574]" />Visão Administrativa</>}
              </h1>

              <p className="text-sm md:text-base text-white/90 leading-relaxed hidden sm:block">
                {isGuest  && 'Um lugar de reconciliação, transformação e propósito divino.'}
                {isMember && 'Sua jornada espiritual continua. Conecte-se, cresça e impacte vidas.'}
                {isAdmin  && 'Dados ao vivo, ações rápidas e governo eficaz.'}
              </p>

              {/* Single primary CTA */}
              <div>
                {isGuest && (
                  <Button size="sm" onClick={() => navigate('/live')}
                    className="bg-white text-[#0A2E4A] hover:bg-white/95 font-bold rounded-full shadow-lg text-sm">
                    <Play className="mr-1.5 h-4 w-4 fill-current" />Assistir Culto
                  </Button>
                )}
                {isMember && (
                  <Button size="sm" onClick={() => navigate('/live')}
                    className="bg-white text-[#0A2E4A] hover:bg-white/95 font-bold rounded-full shadow-lg text-sm">
                    <Play className="mr-1.5 h-4 w-4 fill-current" />Ir para o Culto
                  </Button>
                )}
                {isAdmin && (
                  <Button size="sm" onClick={() => navigate('/dashboard')}
                    className="bg-white text-[#0A2E4A] hover:bg-white/95 font-bold rounded-full shadow-lg text-sm">
                    <BarChart3 className="mr-1.5 h-4 w-4" />Dashboard
                  </Button>
                )}
              </div>
            </div>

            {/* Decorative orbs */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#D4A574]/15 rounded-full blur-3xl pointer-events-none" />
          </div>
        </Card>

        {/* ── 2. Quick Actions: 2×2 on mobile ──────────────────────────── */}
        <div>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Acesso Rápido</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map(action => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className="group flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-primary/40 hover:shadow-md bg-card transition-all duration-200 focus-visible:outline-2 focus-visible:outline-primary"
              >
                <div className={`p-2.5 bg-gradient-to-br ${action.color} rounded-xl shadow-sm group-hover:scale-110 transition-transform`}>
                  <action.icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── 3. What's Happening ───────────────────────────────────────── */}
        <div>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">O que está acontecendo</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Upcoming event */}
            <Card className="p-4 border hover:border-primary/40 hover:shadow-md transition-all cursor-pointer group" onClick={() => navigate('/agenda')}>
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl shadow-sm flex-shrink-0">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Próximo Evento</p>
                  {upcomingEvent ? (
                    <>
                      <h3 className="font-bold text-foreground text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                        {upcomingEvent.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(upcomingEvent.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum evento agendado</p>
                  )}
                </div>
              </div>
              {/* Real stats */}
              <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
                {statsLoading
                  ? <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                  : <span className="text-muted-foreground">{membersConnected} membros · {activeCells} células</span>
                }
                <span className="text-primary font-semibold group-hover:underline">Ver agenda →</span>
              </div>
            </Card>

            {/* Recent sermon */}
            <Card className="p-4 border hover:border-primary/40 hover:shadow-md transition-all cursor-pointer group" onClick={() => navigate('/sermons')}>
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl shadow-sm flex-shrink-0">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Última Mensagem</p>
                  {recentSermon ? (
                    <>
                      <h3 className="font-bold text-foreground text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                        {recentSermon.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="font-medium">{recentSermon.speaker}</span>
                        <span>·</span>
                        <span>{new Date(recentSermon.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum sermão disponível</p>
                  )}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
                {recentSermon
                  ? <span className="text-muted-foreground flex items-center gap-1"><Play className="h-3 w-3" />{recentSermon.views || 0} visualizações</span>
                  : <span />
                }
                <span className="text-primary font-semibold group-hover:underline">Ver sermões →</span>
              </div>
            </Card>
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            {statsLoading
              ? [0, 1].map(i => <StatSkeleton key={i} />)
              : statItems.map(item => (
                <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                  <div className="p-1.5 bg-primary/10 rounded-lg flex-shrink-0">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-foreground leading-none">{item.value ?? '—'}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{item.label}</div>
                  </div>
                </div>
              ))
            }
          </div>

          {/* Guest prompt (compact) */}
          {isGuest && (
            <div className="mt-3 flex items-center justify-between gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <div>
                <p className="text-sm font-semibold text-foreground">Pronto para fazer parte?</p>
                <p className="text-xs text-muted-foreground">Membros têm acesso completo à plataforma.</p>
              </div>
              <Button size="sm" onClick={() => navigate('/about')} className="bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-bold flex-shrink-0">
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />Entrar
              </Button>
            </div>
          )}

          {/* Admin quick admin action */}
          {isAdmin && (
            <div className="mt-3 flex items-center justify-between gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Painel Administrativo</p>
                <p className="text-xs text-amber-700 dark:text-amber-300">Métricas ao vivo, relatórios e gestão.</p>
              </div>
              <AdminAction label="" onClick={() => navigate('/dashboard')} size="sm">
                <Button size="sm" onClick={() => navigate('/dashboard')} className="bg-amber-600 hover:bg-amber-700 text-white font-bold flex-shrink-0">
                  <BarChart3 className="h-3.5 w-3.5 mr-1.5" />Dashboard
                </Button>
              </AdminAction>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default HomePage
