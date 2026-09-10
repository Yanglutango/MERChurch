import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { exportToCSV, exportFinancialReport } from '../lib/reportExporter'
import {
  LayoutDashboard, Users, BookOpen, Calendar, Heart, DollarSign,
  TrendingUp, Activity, UserCheck, UserPlus, Zap,
  Clock, GraduationCap, ChevronRight, Download,
  FileSpreadsheet, Shield, MessageSquare, Circle,
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area,
} from 'recharts'
import { LoadingState } from '../components/shared/LoadingState'
import { EmptyState } from '../components/shared/EmptyState'
import { toast } from 'sonner'
import { useRealTime } from '../hooks/useRealTime'
import { getActivityLabel } from '../lib/activityLogger'

const PT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const PT_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const DashboardPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { activityFeed, version } = useRealTime()
  const [loading, setLoading] = useState(true)
  const [contributionData, setContributionData] = useState<{ name: string; value: number; color: string }[]>([])

  const [stats, setStats] = useState({
    totalUsers: 0, totalMembers: 0, totalGuests: 0, totalSermons: 0,
    totalEvents: 0, totalPrayers: 0, totalTransactions: 0, totalRevenue: 0,
    totalCourses: 0, totalGroups: 0, pendingCounseling: 0,
  })

  const [memberGrowthData, setMemberGrowthData] = useState<{ month: string; members: number }[]>([])
  const [eventParticipationData, setEventParticipationData] = useState<{ event: string; confirmed: number }[]>([])
  const [weeklyActivityData, setWeeklyActivityData] = useState<{ day: string; orações: number; mensagens: number }[]>([])

  useEffect(() => { loadStats() }, [version])

  const handleExportReport = async (period: 'month' | 'year') => {
    try { await exportToCSV(period); toast.success('Relatório exportado!') }
    catch { toast.error('Erro ao exportar relatório') }
  }

  const handleExportFinancial = async (period: 'month' | 'quarter' | 'year' | 'all') => {
    try { await exportFinancialReport(period); toast.success('Relatório financeiro exportado!') }
    catch { toast.error('Erro ao exportar') }
  }

  const loadStats = async () => {
    setLoading(true)
    try {
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
        supabase.from('user_profiles').select('created_at').gte('created_at', sixMonthsAgo.toISOString()),
        supabase.from('prayer_requests').select('created_at').gte('created_at', sevenDaysAgo.toISOString()),
        supabase.from('community_posts').select('created_at').gte('created_at', sevenDaysAgo.toISOString()),
        supabase.from('event_attendees').select('event_id, events(title)').limit(100),
      ])

      const completedTransactions = transactions.data?.filter(t => t.status === 'completed') || []
      const totalRevenue = completedTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0)
      const sumByType = (type: string) =>
        completedTransactions.filter(t => (t as any).type === type).reduce((s, t) => s + parseFloat(t.amount), 0)
      const grand = totalRevenue || 1
      const rawContributions = [
        { name: 'Dízimo', value: sumByType('tithe'),    color: '#0A2E4A' },
        { name: 'Oferta', value: sumByType('offering'), color: '#4A90A4' },
        { name: 'Doação', value: sumByType('donation'), color: '#D4A574' },
      ].map(item => ({ ...item, value: Math.round(item.value / grand * 100) }))

      const hasContributions = rawContributions.some(c => c.value > 0)
      setContributionData(hasContributions ? rawContributions : [])

      setStats({
        totalUsers: users.count || 0, totalMembers: members.count || 0, totalGuests: guests.count || 0,
        totalSermons: sermons.count || 0, totalEvents: events.count || 0, totalPrayers: prayers.count || 0,
        totalTransactions: transactions.data?.length || 0, totalRevenue,
        totalCourses: courses.count || 0, totalGroups: groups.count || 0,
        pendingCounseling: counseling.count || 0,
      })

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

      const eventMap: Record<string, number> = {}
      recentAttendees.data?.forEach((a: any) => {
        const title = (a.events?.title || 'Evento').slice(0, 14)
        eventMap[title] = (eventMap[title] || 0) + 1
      })
      setEventParticipationData(
        Object.entries(eventMap).slice(0, 5).map(([event, confirmed]) => ({ event, confirmed }))
      )

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

  // Ícones monocromáticos — sem cor por categoria
  const quickActions = [
    { icon: BookOpen,      label: 'Sermões',        href: '/sermons' },
    { icon: Calendar,      label: 'Eventos',        href: '/agenda' },
    { icon: Users,         label: 'Ministérios',    href: '/ministries' },
    { icon: GraduationCap, label: 'Academy',        href: '/academy' },
    { icon: Heart,         label: 'Oração',         href: '/prayer' },
    { icon: MessageSquare, label: 'Aconselhamento', href: '/counseling' },
  ]

  const allDataZero = (arr: any[], key: string) => !arr.length || arr.every(d => (d[key] ?? 0) === 0)

  if (loading) return (
    <Layout title="Dashboard Administrativo">
      <LoadingState fullScreen message="Carregando estatísticas..." />
    </Layout>
  )

  return (
    <Layout title="Dashboard Administrativo">
      <div className="max-w-6xl mx-auto p-4 lg:p-8 space-y-6">

        {/* Header — ícone sem caixa gradiente */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2.5">
              <LayoutDashboard className="h-5 w-5 text-primary" strokeWidth={1.75} />
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Visão geral da plataforma KAIRÓS · MER</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => handleExportReport('month')} variant="outline" size="sm" className="text-xs rounded-md">
              <Download className="h-3.5 w-3.5 mr-1.5" />Mensal
            </Button>
            <Button onClick={() => handleExportReport('year')} variant="outline" size="sm" className="text-xs rounded-md">
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />Anual
            </Button>
            <Button onClick={() => handleExportFinancial('month')} variant="outline" size="sm" className="text-xs rounded-md">
              <DollarSign className="h-3.5 w-3.5 mr-1.5" />Financeiro
            </Button>
            {/* Estado real do sistema — verde continua a ser sinal, não decoração */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-md">
              <Circle className="h-2 w-2 text-green-600 fill-green-600" />
              <span className="text-xs font-medium text-foreground">Ao vivo</span>
            </div>
          </div>
        </div>

        {/* Alerta de aconselhamento — âmbar mantido: é sinal real de acção pendente */}
        {stats.pendingCounseling > 0 && (
          <Card className="p-4 border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <MessageSquare className="h-4 w-4 text-amber-700 dark:text-amber-400 flex-shrink-0" strokeWidth={1.75} />
                <div className="min-w-0">
                  <p className="font-medium text-amber-900 dark:text-amber-200 text-sm">
                    {stats.pendingCounseling} {stats.pendingCounseling === 1 ? 'solicitação pendente' : 'solicitações pendentes'} de aconselhamento
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400">Responda para apoiar os membros</p>
                </div>
              </div>
              <Button onClick={() => navigate('/counseling')} size="sm" variant="outline" className="border-amber-400 text-amber-800 dark:text-amber-300 flex-shrink-0 rounded-md">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Métricas primárias — ícone monocromático, SEM tendências inventadas.
            As tendências ('+12%' etc.) eram strings fixas no código, nunca
            calculadas a partir de dados reais — um dashboard admin não deve
            mostrar métricas fabricadas. Removidas até haver cálculo real
            (ex: comparar com o período anterior via query). */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Users,      label: 'Total de Usuários', value: stats.totalUsers },
            { icon: UserCheck,  label: 'Membros Ativos',    value: stats.totalMembers },
            { icon: BookOpen,   label: 'Sermões',           value: stats.totalSermons },
            { icon: DollarSign, label: 'Receita Total',     value: `Kz ${(stats.totalRevenue / 1000).toFixed(1)}K` },
          ].map((metric, idx) => (
            <Card key={idx} className="border rounded-lg">
              <div className="p-4">
                <metric.icon className="h-4 w-4 text-muted-foreground mb-3" strokeWidth={1.75} />
                <div className="text-xl md:text-2xl font-semibold text-foreground tabular-nums">{metric.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{metric.label}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
              <h3 className="font-medium text-foreground text-sm">Crescimento de Membros</h3>
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
                  <Line type="monotone" dataKey="members" stroke="#4A90A4" strokeWidth={2} dot={{ fill: '#4A90A4', r: 3 }} name="Membros" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
              <h3 className="font-medium text-foreground text-sm">Participação em Eventos</h3>
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
          <Card className="lg:col-span-2 p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
              <h3 className="font-medium text-foreground text-sm">Atividade Semanal</h3>
            </div>
            {allDataZero(weeklyActivityData, 'orações') && allDataZero(weeklyActivityData, 'mensagens') ? (
              <EmptyState icon={Activity} title="Sem atividade recente" description="Orações e posts da última semana aparecerão aqui" />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={weeklyActivityData}>
                  <defs>
                    {/* Vermelho removido — não é um alerta, é só uma série de
                        dados. Navy + teal mantém a paleta consistente. */}
                    <linearGradient id="gPrayer" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#0A2E4A" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0A2E4A" stopOpacity={0} />
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
                  <Area type="monotone" dataKey="orações"  stroke="#0A2E4A" fill="url(#gPrayer)" strokeWidth={2} name="Orações" />
                  <Area type="monotone" dataKey="mensagens" stroke="#4A90A4" fill="url(#gMsg)"   strokeWidth={2} name="Mensagens" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Contribuições — as 3 cores da paleta usadas com significado real
              (3 categorias reais), único sítio onde o dourado aparece */}
          <Card className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
              <h3 className="font-medium text-foreground text-sm">Contribuições</h3>
            </div>
            <div className="space-y-4 mt-2">
              {contributionData.map(item => (
                <div key={item.name}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="font-medium text-foreground">{item.name}</span>
                    </div>
                    <span className="font-semibold text-foreground tabular-nums">{item.value}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${item.value}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              ))}
              {contributionData.length === 0 && (
                <p className="text-xs text-muted-foreground">Sem transações confirmadas ainda</p>
              )}
            </div>
          </Card>
        </div>

        {/* Actividade + Ações Rápidas */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="border p-4 rounded-lg">
            <h2 className="font-medium text-foreground mb-4 flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />Atividade Recente
            </h2>
            <div className="space-y-1">
              {activityFeed.length === 0 ? (
                <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
                  <Activity className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                  <div>
                    <div className="font-medium text-foreground text-sm">Aguardando atividade...</div>
                    <div className="text-xs text-muted-foreground">Ações aparecem aqui em tempo real</div>
                  </div>
                </div>
              ) : activityFeed.slice(0, 6).map(activity => (
                <div key={activity.id} className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
                  <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                    <Activity className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground text-xs truncate">{getActivityLabel(activity.type)}: {activity.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {activity.actorName && <span className="font-medium">{activity.actorName} · </span>}
                      {new Date(activity.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border p-4 rounded-lg">
            <h2 className="font-medium text-foreground mb-4 flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />Ações Rápidas
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => navigate(action.href)}
                  className="group flex items-center gap-2.5 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <action.icon className="h-4 w-4 text-foreground flex-shrink-0" strokeWidth={1.75} />
                  <span className="font-medium text-foreground text-xs flex-1">{action.label}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Métricas secundárias — uniformes, sem cor por categoria */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {[
            { icon: UserPlus,      label: 'Convidados',  value: stats.totalGuests },
            { icon: Calendar,      label: 'Eventos',     value: stats.totalEvents },
            { icon: Heart,         label: 'Orações',     value: stats.totalPrayers },
            { icon: GraduationCap, label: 'Cursos',      value: stats.totalCourses },
            { icon: Users,         label: 'Grupos',      value: stats.totalGroups },
            { icon: Shield,        label: 'Transações',  value: stats.totalTransactions },
          ].map((item, idx) => (
            <Card key={idx} className="p-3 border rounded-lg">
              <item.icon className="h-3.5 w-3.5 text-muted-foreground mb-2" strokeWidth={1.75} />
              <div className="text-lg font-semibold text-foreground tabular-nums">{item.value}</div>
              <div className="text-[11px] text-muted-foreground">{item.label}</div>
            </Card>
          ))}
        </div>

        {/* Rodapé de estado — sem métricas fabricadas (v1.0.0 / 99.9% uptime
            eram strings fixas no código, nunca medidas). Substituído por uma
            linha honesta com o momento real da última actualização. */}
        <div className="flex items-center gap-2 px-1 py-2 text-xs text-muted-foreground">
          <Circle className="h-1.5 w-1.5 text-green-600 fill-green-600" />
          Dados actualizados agora · {new Date().toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </Layout>
  )
}

export default DashboardPage
