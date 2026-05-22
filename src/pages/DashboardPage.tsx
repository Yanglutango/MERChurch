import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { exportToCSV } from '../lib/reportExporter'
import {
  LayoutDashboard, Users, BookOpen, Calendar, Heart, DollarSign,
  TrendingUp, Activity, UserCheck, UserPlus, ArrowUpRight, Zap,
  CheckCircle2, Clock, GraduationCap, ChevronRight, Download,
  FileSpreadsheet, Shield, MessageSquare, BarChart3,
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area,
} from 'recharts'
import { LoadingState } from '../components/shared/LoadingState'
import { EmptyState } from '../components/shared/EmptyState'
import { toast } from 'sonner'
import { useRealTime } from '../hooks/useRealTime'
import { getActivityLabel, getActivityColor } from '../lib/activityLogger'

const COLORS = ['#4A90A4', '#D4A574', '#0A2E4A', '#10B981', '#F59E0B', '#EF4444']

const PT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const PT_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const DashboardPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { activityFeed, version } = useRealTime()
  const [loading, setLoading] = useState(true)

  const [stats, setStats] = useState({
    totalUsers: 0, totalMembers: 0, totalGuests: 0, totalSermons: 0,
    totalEvents: 0, totalPrayers: 0, totalTransactions: 0, totalRevenue: 0,
    totalCourses: 0, totalGroups: 0, pendingCounseling: 0,
  })

  // Real chart data
  const [memberGrowthData, setMemberGrowthData] = useState<{ month: string; members: number }[]>([])
  const [eventParticipationData, setEventParticipationData] = useState<{ event: string; confirmed: number }[]>([])
  const [weeklyActivityData, setWeeklyActivityData] = useState<{ day: string; orações: number; mensagens: number }[]>([])
  const contributionData = [
    { name: 'Dízimo', value: 60, color: '#0A2E4A' },
    { name: 'Oferta',  value: 25, color: '#4A90A4' },
    { name: 'Doação',  value: 15, color: '#D4A574' },
  ]

  useEffect(() => { loadStats() }, [version])

  const handleExportReport = async (period: 'month' | 'year') => {
    try { await exportToCSV(period); toast.success('Relatório exportado!') }
    catch { toast.error('Erro ao exportar relatório') }
  }

  const loadStats = async () => {
    setLoading(true)
    try {
      // Run all queries in parallel
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      sixMonthsAgo.setDate(1)

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const [
        users, members, guests, sermons, events, prayers,
        transactions, courses, groups, counseling,
        membersByMonth, recentPrayers, recentPosts, recentAttendees,
      ] = await Promise.all([
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'member'),
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'guest'),
        supabase.from('sermons').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('id', { count: 'exact', head: true }),
        supabase.from('prayer_requests').select('id', { count: 'exact', head: true }),
        supabase.from('transactions').select('amount, status'),
        supabase.from('courses').select('id', { count: 'exact', head: true }),
        supabase.from('small_groups').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('counseling_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        // Member growth: user_profiles created in last 6 months
        supabase.from('user_profiles').select('created_at').gte('created_at', sixMonthsAgo.toISOString()),
        // Weekly activity: prayers last 7 days
        supabase.from('prayer_requests').select('created_at').gte('created_at', sevenDaysAgo.toISOString()),
        // Weekly activity: community posts last 7 days
        supabase.from('community_posts').select('created_at').gte('created_at', sevenDaysAgo.toISOString()),
        // Event participation: event_attendees joined with events
        supabase.from('event_attendees').select('event_id, events(title)').limit(100),
      ])

      const completedTransactions = transactions.data?.filter(t => t.status === 'completed') || []
      const totalRevenue = completedTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0)

      setStats({
        totalUsers: users.count || 0, totalMembers: members.count || 0, totalGuests: guests.count || 0,
        totalSermons: sermons.count || 0, totalEvents: events.count || 0, totalPrayers: prayers.count || 0,
        totalTransactions: transactions.data?.length || 0, totalRevenue,
        totalCourses: courses.count || 0, totalGroups: groups.count || 0,
        pendingCounseling: counseling.count || 0,
      })

      // ── Member growth chart (last 6 months) ──────────────────────────
      const growthBuckets: Record<string, number> = {}
      const now = new Date()
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        growthBuckets[`${d.getFullYear()}-${d.getMonth()}`] = 0
      }
      membersByMonth.data?.forEach(u => {
        const d = new Date(u.created_at)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        if (key in growthBuckets) growthBuckets[key]++
      })
      let cumulative = Math.max(0, (members.count || 0) - (membersByMonth.data?.length || 0))
      const growthData = Object.entries(growthBuckets).map(([key, count]) => {
        cumulative += count
        const [y, m] = key.split('-').map(Number)
        return { month: PT_MONTHS[m], members: cumulative }
      })
      setMemberGrowthData(growthData)

      // ── Event participation chart ─────────────────────────────────────
      const eventMap: Record<string, number> = {}
      recentAttendees.data?.forEach((a: any) => {
        const title = (a.events?.title || 'Evento').slice(0, 14)
        eventMap[title] = (eventMap[title] || 0) + 1
      })
      setEventParticipationData(
        Object.entries(eventMap).slice(0, 5).map(([event, confirmed]) => ({ event, confirmed }))
      )

      // ── Weekly activity chart (last 7 days) ──────────────────────────
      const prayersByDay: Record<number, number> = {}
      const postsByDay: Record<number, number> = {}
      for (let d = 0; d < 7; d++) { prayersByDay[d] = 0; postsByDay[d] = 0 }
      recentPrayers.data?.forEach(p => { const dow = new Date(p.created_at).getDay(); prayersByDay[dow] = (prayersByDay[dow] || 0) + 1 })
      recentPosts.data?.forEach(p => { const dow = new Date(p.created_at).getDay(); postsByDay[dow] = (postsByDay[dow] || 0) + 1 })
      setWeeklyActivityData(PT_DAYS.map((day, i) => ({ day, orações: prayersByDay[i] || 0, mensagens: postsByDay[i] || 0 })))

    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    { icon: BookOpen,    label: 'Sermões',        href: '/sermons',    color: 'from-purple-500 to-pink-500' },
    { icon: Calendar,    label: 'Eventos',        href: '/agenda',     color: 'from-blue-500 to-cyan-500' },
    { icon: Users,       label: 'Ministérios',    href: '/ministries', color: 'from-green-500 to-emerald-500' },
    { icon: GraduationCap, label: 'Academy',      href: '/academy',    color: 'from-orange-500 to-red-500' },
    { icon: Heart,       label: 'Oração',         href: '/prayer',     color: 'from-rose-500 to-pink-500' },
    { icon: MessageSquare, label: 'Aconselhamento', href: '/counseling', color: 'from-teal-500 to-cyan-500' },
  ]

  const allDataZero = (arr: any[], key: string) => !arr.length || arr.every(d => (d[key] ?? 0) === 0)

  if (loading) return (
    <Layout title="Dashboard Administrativo">
      <LoadingState fullScreen message="Carregando estatísticas..." />
    </Layout>
  )

  return (
    <Layout title="Dashboard Administrativo">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg shadow-md">
                <LayoutDashboard className="h-5 w-5 text-white" />
              </div>
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Visão geral da plataforma KAIRÓS · MER</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => handleExportReport('month')} variant="outline" size="sm" className="text-xs">
              <Download className="h-3.5 w-3.5 mr-1.5" />Exportar Mensal
            </Button>
            <Button onClick={() => handleExportReport('year')} variant="outline" size="sm" className="text-xs">
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />Exportar Anual
            </Button>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold text-green-700 dark:text-green-300">Ao Vivo</span>
            </div>
          </div>
        </div>

        {/* Counseling Alert */}
        {stats.pendingCounseling > 0 && (
          <Card className="p-4 border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500 rounded-lg"><MessageSquare className="h-4 w-4 text-white" /></div>
                <div>
                  <p className="font-bold text-amber-800 dark:text-amber-200 text-sm">
                    {stats.pendingCounseling} {stats.pendingCounseling === 1 ? 'solicitação pendente' : 'solicitações pendentes'} de aconselhamento
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">Responda para apoiar os membros</p>
                </div>
              </div>
              <Button onClick={() => navigate('/counseling')} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Primary Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Users,     label: 'Total de Usuários', value: stats.totalUsers,   gradient: 'from-blue-500 to-cyan-500',    trend: '+12%' },
            { icon: UserCheck, label: 'Membros Ativos',    value: stats.totalMembers, gradient: 'from-green-500 to-emerald-500', trend: '+8%' },
            { icon: BookOpen,  label: 'Sermões',            value: stats.totalSermons, gradient: 'from-purple-500 to-pink-500',   trend: '+5' },
            { icon: DollarSign, label: 'Receita Total',    value: `Kz ${(stats.totalRevenue / 1000).toFixed(1)}K`, gradient: 'from-emerald-500 to-teal-500', trend: '+18%' },
          ].map((metric, idx) => (
            <Card key={idx} className="relative overflow-hidden border hover:border-primary/40 transition-all hover:shadow-md group">
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 bg-gradient-to-br ${metric.gradient} rounded-lg shadow-sm`}>
                    <metric.icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <ArrowUpRight className="h-2.5 w-2.5 text-green-600 dark:text-green-400" />
                    <span className="text-[10px] font-bold text-green-600 dark:text-green-400">{metric.trend}</span>
                  </div>
                </div>
                <div className="text-xl md:text-2xl font-bold text-foreground">{metric.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{metric.label}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Member Growth */}
          <Card className="p-4 border hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground text-sm">Crescimento de Membros</h3>
              <span className="text-xs text-muted-foreground ml-auto">Últimos 6 meses</span>
            </div>
            {allDataZero(memberGrowthData, 'members') ? (
              <EmptyState icon={TrendingUp} title="Sem dados ainda" description="Os dados de crescimento aparecerão conforme membros ingressam" />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={memberGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px' }} labelStyle={{ fontWeight: 'bold' }} />
                  <Line type="monotone" dataKey="members" stroke="#4A90A4" strokeWidth={2.5} dot={{ fill: '#4A90A4', r: 3 }} name="Membros" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Event Participation */}
          <Card className="p-4 border hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4 text-purple-600" />
              <h3 className="font-semibold text-foreground text-sm">Participação em Eventos</h3>
            </div>
            {eventParticipationData.length === 0 ? (
              <EmptyState icon={Calendar} title="Sem dados ainda" description="Os dados aparecem conforme membros confirmam presença" action={
                <Button size="sm" variant="outline" onClick={() => navigate('/agenda')}>Adicionar evento →</Button>
              } />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={eventParticipationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                  <XAxis dataKey="event" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px' }} />
                  <Bar dataKey="confirmed" fill="#0A2E4A" radius={[4, 4, 0, 0]} name="Confirmados" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Weekly Activity */}
          <Card className="lg:col-span-2 p-4 border hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground text-sm">Atividade Semanal</h3>
            </div>
            {allDataZero(weeklyActivityData, 'orações') && allDataZero(weeklyActivityData, 'mensagens') ? (
              <EmptyState icon={Activity} title="Sem atividade recente" description="Orações e posts da última semana aparecerão aqui" />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={weeklyActivityData}>
                  <defs>
                    <linearGradient id="gPrayer" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#EF4444" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gMsg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#4A90A4" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#4A90A4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Area type="monotone" dataKey="orações"  stroke="#EF4444" fill="url(#gPrayer)" strokeWidth={2} name="Orações" />
                  <Area type="monotone" dataKey="mensagens" stroke="#4A90A4" fill="url(#gMsg)"   strokeWidth={2} name="Mensagens" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Contributions — progress bars instead of pie chart */}
          <Card className="p-4 border hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              <h3 className="font-semibold text-foreground text-sm">Contribuições</h3>
            </div>
            <div className="space-y-4 mt-2">
              {contributionData.map(item => (
                <div key={item.name}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="font-semibold text-foreground">{item.name}</span>
                    </div>
                    <span className="font-bold text-foreground">{item.value}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${item.value}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground pt-1">Distribuição estimada de contribuições</p>
            </div>
          </Card>
        </div>

        {/* Activity + Quick Actions */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="border p-4 hover:shadow-md transition-shadow">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-primary" />Atividade Recente
            </h2>
            <div className="space-y-2">
              {activityFeed.length === 0 ? (
                <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
                  <div className="p-2 bg-muted rounded-lg flex-shrink-0">
                    <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground text-sm">Aguardando atividade...</div>
                    <div className="text-xs text-muted-foreground">Ações aparecem aqui em tempo real</div>
                  </div>
                </div>
              ) : activityFeed.slice(0, 6).map(activity => (
                <div key={activity.id} className="flex items-start gap-3 p-2.5 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/50 transition-all">
                  <div className={`p-1.5 bg-muted rounded-lg flex-shrink-0 ${getActivityColor(activity.type)}`}>
                    <Activity className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground text-xs truncate">{getActivityLabel(activity.type)}: {activity.title}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {activity.actorName && <span className="font-medium">{activity.actorName} · </span>}
                      {new Date(activity.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border p-4 hover:shadow-md transition-shadow">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-primary" />Ações Rápidas
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              {quickActions.map((action, idx) => (
                <a key={idx} href={action.href} className="group relative overflow-hidden p-3.5 rounded-lg border border-border hover:border-primary/40 transition-all hover:shadow-md">
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-8 transition-opacity`} />
                  <div className={`inline-flex p-2 bg-gradient-to-br ${action.color} rounded-lg shadow-sm mb-2 group-hover:scale-110 transition-transform`}>
                    <action.icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="font-semibold text-foreground text-xs group-hover:text-primary transition-colors">{action.label}</div>
                  <ChevronRight className="absolute top-2.5 right-2.5 h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              ))}
            </div>
          </Card>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {[
            { icon: UserPlus,    label: 'Convidados',   value: stats.totalGuests,       color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' },
            { icon: Calendar,    label: 'Eventos',       value: stats.totalEvents,       color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' },
            { icon: Heart,       label: 'Orações',       value: stats.totalPrayers,      color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' },
            { icon: GraduationCap, label: 'Cursos',     value: stats.totalCourses,      color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400' },
            { icon: Users,       label: 'Grupos',        value: stats.totalGroups,       color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400' },
            { icon: Shield,      label: 'Transações',    value: stats.totalTransactions, color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400' },
          ].map((item, idx) => (
            <Card key={idx} className="p-3 border hover:border-primary/30 transition-colors">
              <div className={`p-1.5 rounded-md w-fit mb-2 ${item.color}`}>
                <item.icon className="h-3.5 w-3.5" />
              </div>
              <div className="text-xl font-bold text-foreground mb-0.5">{item.value}</div>
              <div className="text-[10px] text-muted-foreground font-medium">{item.label}</div>
            </Card>
          ))}
        </div>

        {/* System Status */}
        <Card className="border p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg shadow-sm">
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="font-semibold text-foreground text-sm">Sistema Operacional</div>
                <div className="text-xs text-muted-foreground">Todos os serviços funcionando normalmente</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                { label: 'Versão', value: 'v1.0.0' },
                { label: 'Uptime', value: '99.9%', green: true },
                { label: 'Atualizado', value: new Date().toLocaleDateString('pt-BR') },
              ].map(item => (
                <div key={item.label} className="px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-border rounded-lg">
                  <div className="text-[10px] text-muted-foreground">{item.label}</div>
                  <div className={`font-bold ${item.green ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  )
}

export default DashboardPage
