import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { exportToCSV, exportFinancialReport } from '../lib/reportExporter'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Calendar,
  Heart,
  DollarSign,
  TrendingUp,
  Activity,
  UserCheck,
  UserPlus,
  Zap,
  Clock,
  GraduationCap,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Shield,
  MessageSquare,
  Circle,
  ArrowRight,
  Wallet,
  BellRing,
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from 'recharts'
import { LoadingState } from '../components/shared/LoadingState'
import { EmptyState } from '../components/shared/EmptyState'
import { toast } from 'sonner'
import { useRealTime } from '../hooks/useRealTime'
import { getActivityLabel } from '../lib/activityLogger'

const PT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const PT_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const formatCurrency = (value: number) =>
  `Kz ${new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 0,
  }).format(value)}`

const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)

const parseNumber = (value: unknown) => {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

const DashboardPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { activityFeed, version, liveMetrics } = useRealTime()
  const [loading, setLoading] = useState(true)
  const [contributionData, setContributionData] = useState<{ name: string; value: number; color: string; amount: number }[]>([])

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalMembers: 0,
    totalGuests: 0,
    totalSermons: 0,
    totalEvents: 0,
    totalPrayers: 0,
    totalTransactions: 0,
    totalRevenue: 0,
    totalCourses: 0,
    totalGroups: 0,
    pendingCounseling: 0,
    newMembersThisMonth: 0,
  })

  const [memberGrowthData, setMemberGrowthData] = useState<{ month: string; members: number }[]>([])
  const [eventParticipationData, setEventParticipationData] = useState<{ event: string; confirmed: number }[]>([])
  const [weeklyActivityData, setWeeklyActivityData] = useState<{ day: string; orações: number; mensagens: number }[]>([])
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>('')

  useEffect(() => {
    void loadStats()
  }, [version])

  const handleExportReport = async (period: 'month' | 'year') => {
    try {
      await exportToCSV(period)
      toast.success('Relatório exportado com sucesso.')
    } catch {
      toast.error('Erro ao exportar relatório')
    }
  }

  const handleExportFinancial = async (period: 'month' | 'quarter' | 'year' | 'all') => {
    try {
      await exportFinancialReport(period)
      toast.success('Relatório financeiro exportado com sucesso.')
    } catch {
      toast.error('Erro ao exportar relatório financeiro')
    }
  }

  const loadStats = async () => {
    setLoading(true)

    try {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
      sixMonthsAgo.setDate(1)
      sixMonthsAgo.setHours(0, 0, 0, 0)

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
      sevenDaysAgo.setHours(0, 0, 0, 0)

      const currentMonthStart = new Date()
      currentMonthStart.setDate(1)
      currentMonthStart.setHours(0, 0, 0, 0)

      const [
        usersRes,
        membersRes,
        guestsRes,
        sermonsRes,
        eventsRes,
        prayersRes,
        transactionsRes,
        coursesRes,
        groupsRes,
        counselingRes,
        membersByMonthRes,
        recentPrayersRes,
        recentPostsRes,
        recentAttendeesRes,
      ] = await Promise.all([
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'member'),
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'guest'),
        supabase.from('sermons').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('id', { count: 'exact', head: true }),
        supabase.from('prayer_requests').select('id', { count: 'exact', head: true }),
        supabase.from('transactions').select('amount, status, type, category'),
        supabase.from('courses').select('id', { count: 'exact', head: true }),
        supabase.from('small_groups').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('counseling_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('user_profiles').select('created_at').gte('created_at', sixMonthsAgo.toISOString()),
        supabase.from('prayer_requests').select('created_at').gte('created_at', sevenDaysAgo.toISOString()),
        supabase.from('community_posts').select('created_at').gte('created_at', sevenDaysAgo.toISOString()),
        supabase.from('event_attendees').select('event_id, events(title)').limit(150),
      ])

      const completedTransactions =
        (transactionsRes.data ?? []).filter(
          (item: { status?: string | null }) => String(item.status ?? '').toLowerCase() === 'completed',
        ) ?? []

      const totalRevenue = completedTransactions.reduce(
        (sum, item) => sum + parseNumber(item.amount),
        0,
      )

      const typeMap: Record<string, number> = {
        tithe: 0,
        offering: 0,
        donation: 0,
      }

      completedTransactions.forEach((item: { type?: string | null; category?: string | null; amount?: number | string | null }) => {
        const rawType = String(item.type ?? item.category ?? '').toLowerCase()
        const key = rawType.includes('tithe') ? 'tithe' : rawType.includes('offering') ? 'offering' : rawType.includes('donation') ? 'donation' : ''

        if (key) {
          typeMap[key] += parseNumber(item.amount)
        }
      })

      const contributionEntries = [
        { name: 'Dízimo', value: typeMap.tithe, color: '#0A2E4A' },
        { name: 'Oferta', value: typeMap.offering, color: '#4A90A4' },
        { name: 'Doação', value: typeMap.donation, color: '#D4A574' },
      ].filter((entry) => entry.value > 0)

      const financialTotal = contributionEntries.reduce((sum, item) => sum + item.value, 0) || 1

      const normalizedContributions = contributionEntries.map((entry) => ({
        ...entry,
        value: Math.round((entry.value / financialTotal) * 100),
        amount: entry.value,
      }))

      setContributionData(normalizedContributions)

      const growthBuckets: Record<string, number> = {}
      const now = new Date()

      for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
        const d = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        growthBuckets[key] = 0
      }

      ;(membersByMonthRes.data ?? []).forEach((member: { created_at: string }) => {
        const date = new Date(member.created_at)
        if (Number.isNaN(date.getTime())) return

        const key = `${date.getFullYear()}-${date.getMonth()}`
        if (Object.prototype.hasOwnProperty.call(growthBuckets, key)) {
          growthBuckets[key] += 1
        }
      })

      let runningTotal = 0
      const growthData = Object.entries(growthBuckets).map(([key, value]) => {
        runningTotal += value
        const [year, month] = key.split('-').map(Number)
        return {
          month: PT_MONTHS[month],
          members: runningTotal,
        }
      })

      setMemberGrowthData(growthData)

      const eventMap: Record<string, number> = {}
      ;(recentAttendeesRes.data ?? []).forEach((entry: any) => {
        const title = String(entry?.events?.title || 'Evento')
        const shortTitle = title.length > 18 ? `${title.slice(0, 18)}…` : title
        eventMap[shortTitle] = (eventMap[shortTitle] || 0) + 1
      })

      setEventParticipationData(
        Object.entries(eventMap)
          .slice(0, 5)
          .map(([event, confirmed]) => ({ event, confirmed })),
      )

      const prayersByDay: Record<number, number> = {}
      const postsByDay: Record<number, number> = {}

      for (let day = 0; day < 7; day++) {
        prayersByDay[day] = 0
        postsByDay[day] = 0
      }

      ;(recentPrayersRes.data ?? []).forEach((item: { created_at: string }) => {
        const date = new Date(item.created_at)
        if (Number.isNaN(date.getTime())) return
        const dayIndex = date.getDay()
        prayersByDay[dayIndex] = (prayersByDay[dayIndex] || 0) + 1
      })

      ;(recentPostsRes.data ?? []).forEach((item: { created_at: string }) => {
        const date = new Date(item.created_at)
        if (Number.isNaN(date.getTime())) return
        const dayIndex = date.getDay()
        postsByDay[dayIndex] = (postsByDay[dayIndex] || 0) + 1
      })

      setWeeklyActivityData(
        PT_DAYS.map((day, index) => ({
          day,
          orações: prayersByDay[index] || 0,
          mensagens: postsByDay[index] || 0,
        })),
      )

      const membersThisMonth = (membersByMonthRes.data ?? []).filter((member: { created_at: string }) => {
        const createdAt = new Date(member.created_at)
        return !Number.isNaN(createdAt.getTime()) && createdAt >= currentMonthStart
      }).length

      setStats({
        totalUsers: usersRes.count || 0,
        totalMembers: membersRes.count || 0,
        totalGuests: guestsRes.count || 0,
        totalSermons: sermonsRes.count || 0,
        totalEvents: eventsRes.count || 0,
        totalPrayers: prayersRes.count || 0,
        totalTransactions: transactionsRes.data?.length || 0,
        totalRevenue,
        totalCourses: coursesRes.count || 0,
        totalGroups: groupsRes.count || 0,
        pendingCounseling: counselingRes.count || 0,
        newMembersThisMonth: membersThisMonth,
      })

      setLastUpdatedAt(new Date().toLocaleString('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }))
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
      toast.error('Não foi possível carregar o dashboard.')
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    { icon: BookOpen, label: 'Sermões', href: '/sermons' },
    { icon: Calendar, label: 'Agenda', href: '/agenda' },
    { icon: Users, label: 'Ministérios', href: '/ministries' },
    { icon: GraduationCap, label: 'Academy', href: '/academy' },
    { icon: Heart, label: 'Oração', href: '/prayer' },
    { icon: MessageSquare, label: 'Aconselhamento', href: '/counseling' },
  ]

  const allDataZero = (arr: Array<Record<string, number>>, key: string) =>
    !arr.length || arr.every((item) => (item[key] ?? 0) === 0)

  const overviewCards = [
    {
      label: 'Membros',
      value: stats.totalMembers,
      icon: Users,
      accent: 'text-sky-500',
      caption: `${stats.newMembersThisMonth} neste mês`,
    },
    {
      label: 'Usuários',
      value: stats.totalUsers,
      icon: UserCheck,
      accent: 'text-emerald-500',
      caption: `${stats.totalGuests} visitantes`,
    },
    {
      label: 'Pedidos de oração',
      value: stats.totalPrayers,
      icon: Heart,
      accent: 'text-rose-500',
      caption: 'Ações de intercessão',
    },
    {
      label: 'Receita',
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      accent: 'text-amber-500',
      caption: `${stats.totalTransactions} transações`,
    },
  ]

  if (loading) {
    return (
      <Layout title="Dashboard Administrativo">
        <LoadingState fullScreen message="Carregando dashboard..." />
      </Layout>
    )
  }

  return (
    <Layout title="Dashboard Administrativo">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-8">
        <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-neutral-950 to-neutral-950 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.18)] lg:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5">
                <LayoutDashboard className="h-5 w-5 text-amber-300" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-amber-300/80">
                  MER Church
                </p>
                <h1 className="truncate text-xl font-semibold text-white md:text-2xl">
                  Dashboard administrativo
                </h1>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5">
                <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />
                <span className="text-xs font-medium text-emerald-200">
                  {liveMetrics.onlineEstimate || 0} ativos agora
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={() => handleExportReport('month')} variant="outline" size="sm" className="rounded-md">
                  <Download className="mr-1.5 h-3.5 w-3.5" />Mensal
                </Button>
                <Button onClick={() => handleExportReport('year')} variant="outline" size="sm" className="rounded-md">
                  <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />Anual
                </Button>
                <Button onClick={() => handleExportFinancial('month')} variant="outline" size="sm" className="rounded-md">
                  <Wallet className="mr-1.5 h-3.5 w-3.5" />Financeiro
                </Button>
              </div>
            </div>
          </div>
        </div>

        {stats.pendingCounseling > 0 && (
          <Card className="rounded-2xl border border-amber-300/50 bg-amber-500/10 p-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <div className="rounded-lg bg-amber-500/15 p-2">
                  <MessageSquare className="h-4 w-4 text-amber-300" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-amber-100">
                    {stats.pendingCounseling} {stats.pendingCounseling === 1 ? 'solicitação pendente' : 'solicitações pendentes'} de aconselhamento
                  </p>
                  <p className="text-xs text-amber-200/80">Ações prontas para reencaminhamento.</p>
                </div>
              </div>

              <Button onClick={() => navigate('/counseling')} size="sm" variant="outline" className="border-amber-400/50 text-amber-100 hover:bg-amber-400/10">
                Ver fila <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {overviewCards.map((card) => (
            <Card key={card.label} className="rounded-2xl border border-white/10 bg-neutral-950/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    {card.label}
                  </p>
                  <div className="mt-2 text-2xl font-semibold text-white tabular-nums">
                    {card.value}
                  </div>
                </div>
                <div className={`rounded-xl border border-white/10 bg-white/5 p-2.5 ${card.accent}`}>
                  <card.icon className="h-4 w-4" strokeWidth={1.75} />
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{card.caption}</p>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
          <Card className="rounded-2xl border border-white/10 bg-neutral-950/80 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                <h3 className="text-sm font-medium text-foreground">Crescimento de membros</h3>
              </div>
              <span className="text-xs text-muted-foreground">Últimos 6 meses</span>
            </div>

            {memberGrowthData.length === 0 || memberGrowthData.every((item) => item.members === 0) ? (
              <EmptyState
                icon={TrendingUp}
                title="Sem crescimento registrado"
                description="Os dados aparecerão quando houver novas entradas no sistema."
              />
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={memberGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="rgba(255,255,255,0.5)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="rgba(255,255,255,0.5)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#f8fafc',
                    }}
                  />
                  <Line type="monotone" dataKey="members" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3, fill: '#f59e0b' }} name="Membros" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card className="rounded-2xl border border-white/10 bg-neutral-950/80 p-4">
            <div className="mb-4 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
              <h3 className="text-sm font-medium text-foreground">Contribuições</h3>
            </div>

            {contributionData.length === 0 ? (
              <EmptyState
                icon={DollarSign}
                title="Sem contribuições confirmadas"
                description="Transações concluídas aparecerão aqui quando forem registradas."
              />
            ) : (
              <div className="space-y-4 pt-2">
                {contributionData.map((item) => (
                  <div key={item.name}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="font-medium text-foreground">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-foreground">
                        <span className="tabular-nums">{item.value}%</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="tabular-nums text-muted-foreground">{formatCompactNumber(item.amount)}</span>
                      </div>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${item.value}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="rounded-2xl border border-white/10 bg-neutral-950/80 p-4">
            <div className="mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
              <h3 className="text-sm font-medium text-foreground">Atividade semanal</h3>
            </div>

            {allDataZero(weeklyActivityData, 'orações') && allDataZero(weeklyActivityData, 'mensagens') ? (
              <EmptyState
                icon={Activity}
                title="Sem atividade recente"
                description="Orações e posts dos últimos 7 dias aparecerão aqui."
              />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={weeklyActivityData}>
                  <defs>
                    <linearGradient id="oracoesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="mensagensGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="rgba(255,255,255,0.5)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="rgba(255,255,255,0.5)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#f8fafc',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Area type="monotone" dataKey="orações" stroke="#f59e0b" fill="url(#oracoesGradient)" strokeWidth={2.2} name="Orações" />
                  <Area type="monotone" dataKey="mensagens" stroke="#38bdf8" fill="url(#mensagensGradient)" strokeWidth={2.2} name="Mensagens" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card className="rounded-2xl border border-white/10 bg-neutral-950/80 p-4">
            <div className="mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
              <h3 className="text-sm font-medium text-foreground">Participação em eventos</h3>
            </div>

            {eventParticipationData.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="Sem presença registrada"
                description="Quando houver confirmação em eventos, o gráfico será preenchido."
                action={
                  <Button size="sm" variant="outline" onClick={() => navigate('/agenda')}>
                    Criar evento <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                }
              />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={eventParticipationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                  <XAxis dataKey="event" tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.5)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="rgba(255,255,255,0.5)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#f8fafc',
                    }}
                  />
                  <Bar dataKey="confirmed" fill="#0f766e" radius={[6, 6, 0, 0]} name="Confirmados" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-2xl border border-white/10 bg-neutral-950/80 p-4">
            <div className="mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
              <h3 className="text-sm font-medium text-foreground">Atividade recente</h3>
            </div>

            <div className="space-y-2">
              {activityFeed.length === 0 ? (
                <div className="rounded-xl border border-border bg-white/5 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-md bg-white/5 p-2">
                      <Activity className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Nenhuma atividade recente</p>
                      <p className="text-xs text-muted-foreground">Ações da plataforma aparecerão aqui em tempo real.</p>
                    </div>
                  </div>
                </div>
              ) : (
                activityFeed.slice(0, 6).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 rounded-xl border border-border bg-white/5 p-3">
                    <div className="mt-0.5 rounded-md bg-white/5 p-2">
                      <Activity className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">
                        {getActivityLabel(activity.type)} · {activity.title}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {activity.actorName && <span className="font-medium text-white">{activity.actorName}</span>}
                        {activity.actorName ? ' · ' : ''}
                        {new Date(activity.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="rounded-2xl border border-white/10 bg-neutral-950/80 p-4">
            <div className="mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
              <h3 className="text-sm font-medium text-foreground">Ações rápidas</h3>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => navigate(action.href)}
                  className="group flex items-center gap-2.5 rounded-xl border border-border bg-white/5 p-3 text-left transition-colors hover:bg-white/10"
                >
                  <div className="rounded-md border border-white/10 bg-white/5 p-2">
                    <action.icon className="h-4 w-4 text-white" strokeWidth={1.75} />
                  </div>
                  <span className="flex-1 text-xs font-medium text-foreground">{action.label}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[
            { icon: UserPlus, label: 'Convidados', value: stats.totalGuests },
            { icon: Calendar, label: 'Eventos', value: stats.totalEvents },
            { icon: Heart, label: 'Orações', value: stats.totalPrayers },
            { icon: GraduationCap, label: 'Cursos', value: stats.totalCourses },
            { icon: Users, label: 'Grupos', value: stats.totalGroups },
            { icon: Shield, label: 'Transações', value: stats.totalTransactions },
          ].map((item, index) => (
            <Card key={index} className="rounded-2xl border border-white/10 bg-neutral-950/80 p-3">
              <item.icon className="mb-2 h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
              <div className="text-lg font-semibold text-white tabular-nums">{item.value}</div>
              <div className="text-[11px] text-muted-foreground">{item.label}</div>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Circle className="h-1.5 w-1.5 fill-emerald-500 text-emerald-500" />
            Última atualização: {lastUpdatedAt || 'agora'}
          </div>

          <div className="flex items-center gap-2">
            <BellRing className="h-3.5 w-3.5" />
            <span>{activityFeed.length} eventos recentes</span>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default DashboardPage
