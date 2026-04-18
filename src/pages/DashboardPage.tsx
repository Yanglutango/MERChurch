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
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area,
} from 'recharts'
import { LoadingState } from '../components/shared/LoadingState'
import { toast } from 'sonner'
import { useRealTime } from '../hooks/useRealTime'
import { getActivityLabel, getActivityColor } from '../lib/activityLogger'
const COLORS = ['#4A90A4', '#D4A574', '#0A2E4A', '#10B981', '#F59E0B', '#EF4444']

const DashboardPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { activityFeed, version } = useRealTime()
  const [loading, setLoading] = useState(true)
  const [recentActivity, setRecentActivity] = useState<any[]>([])
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
  })

  // Chart data
  const [memberGrowthData] = useState([
    { month: 'Nov', members: 312 },
    { month: 'Dez', members: 378 },
    { month: 'Jan', members: 421 },
    { month: 'Fev', members: 489 },
    { month: 'Mar', members: 534 },
    { month: 'Abr', members: 591 },
  ])

  const [eventParticipationData] = useState([
    { event: 'Culto Dom', confirmed: 145 },
    { event: 'Cel. Estudo', confirmed: 89 },
    { event: 'Conf. Jovens', confirmed: 120 },
    { event: 'Retiro', confirmed: 67 },
    { event: 'Escola Bíb.', confirmed: 93 },
  ])

  const [contributionData] = useState([
    { name: 'Dízimo', value: 60 },
    { name: 'Oferta', value: 25 },
    { name: 'Doação', value: 15 },
  ])

  const [weeklyActivityData] = useState([
    { day: 'Dom', orações: 34, sermões: 2, mensagens: 67 },
    { day: 'Seg', orações: 18, sermões: 0, mensagens: 43 },
    { day: 'Ter', orações: 22, sermões: 1, mensagens: 51 },
    { day: 'Qua', orações: 41, sermões: 0, mensagens: 89 },
    { day: 'Qui', orações: 29, sermões: 1, mensagens: 62 },
    { day: 'Sex', orações: 37, sermões: 0, mensagens: 78 },
    { day: 'Sáb', orações: 25, sermões: 2, mensagens: 55 },
  ])

  // Re-fetch stats whenever the real-time layer detects changes
  useEffect(() => {
    loadStats()
  }, [version])

  const handleExportReport = async (period: 'month' | 'year') => {
    try {
      await exportToCSV(period)
      toast.success('Relatório exportado com sucesso!')
    } catch (error) {
      toast.error('Erro ao exportar relatório')
    }
  }

  const loadStats = async () => {
    setLoading(true)
    try {
      const [users, members, guests, sermons, events, prayers, transactions, courses, groups, counseling, prayersRecent, sermonsRecent, eventsRecent] = await Promise.all([
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
        supabase.from('prayer_requests').select('title, created_at').order('created_at', { ascending: false }).limit(2),
        supabase.from('sermons').select('title, created_at').order('created_at', { ascending: false }).limit(2),
        supabase.from('events').select('title, created_at').order('created_at', { ascending: false }).limit(2),
      ])

      const completedTransactions = transactions.data?.filter((t) => t.status === 'completed') || []
      const totalRevenue = completedTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0)

      setStats({
        totalUsers: users.count || 0,
        totalMembers: members.count || 0,
        totalGuests: guests.count || 0,
        totalSermons: sermons.count || 0,
        totalEvents: events.count || 0,
        totalPrayers: prayers.count || 0,
        totalTransactions: transactions.data?.length || 0,
        totalRevenue,
        totalCourses: courses.count || 0,
        totalGroups: groups.count || 0,
        pendingCounseling: counseling.count || 0,
      })

      // Use platform_activity feed if available
      const activities: any[] = []
      setRecentActivity(activities)
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    { icon: BookOpen, label: 'Sermões', href: '/sermons', color: 'from-purple-500 to-pink-500' },
    { icon: Calendar, label: 'Eventos', href: '/agenda', color: 'from-blue-500 to-cyan-500' },
    { icon: Users, label: 'Ministérios', href: '/ministries', color: 'from-green-500 to-emerald-500' },
    { icon: GraduationCap, label: 'Academy', href: '/academy', color: 'from-orange-500 to-red-500' },
    { icon: Heart, label: 'Oração', href: '/prayer', color: 'from-rose-500 to-pink-500' },
    { icon: MessageSquare, label: 'Aconselhamento', href: '/counseling', color: 'from-teal-500 to-cyan-500' },
  ]

  if (loading) {
    return (
      <Layout title="Dashboard Administrativo">
        <LoadingState fullScreen message="Carregando estatísticas..." />
      </Layout>
    )
  }

  return (
    <Layout title="Dashboard Administrativo">
      <div className="space-y-6 md:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 md:pb-6 border-b-2 border-border">
          <div>
            <h1 className="text-2xl md:text-4xl font-black text-foreground tracking-tight mb-1 flex items-center gap-3">
              <div className="p-2.5 md:p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl md:rounded-2xl shadow-xl">
                <LayoutDashboard className="h-6 w-6 md:h-8 md:w-8 text-white" />
              </div>
              Dashboard
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">Visão geral da plataforma MER — Kairós</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => handleExportReport('month')} variant="outline" size="sm" className="border-2 text-xs md:text-sm">
              <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Exportar </span>Mensal
            </Button>
            <Button onClick={() => handleExportReport('year')} variant="outline" size="sm" className="border-2 text-xs md:text-sm">
              <FileSpreadsheet className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Exportar </span>Anual
            </Button>
            <div className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-green-100 dark:bg-green-900/30 border-2 border-green-300 dark:border-green-700 rounded-xl">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs md:text-sm font-bold text-green-700 dark:text-green-300">Ativo</span>
            </div>
          </div>
        </div>

        {/* Alert: Pending Counseling */}
        {stats.pendingCounseling > 0 && (
          <Card className="p-4 border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500 rounded-xl">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-amber-800 dark:text-amber-200">
                    {stats.pendingCounseling} {stats.pendingCounseling === 1 ? 'solicitação pendente' : 'solicitações pendentes'} de aconselhamento
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">Responda para apoiar os membros da comunidade</p>
                </div>
              </div>
              <Button onClick={() => navigate('/counseling')} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold flex-shrink-0">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Primary Metrics */}
        <div>
          <h2 className="text-lg md:text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Métricas Principais
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
            {[
              { icon: Users, label: 'Total de Usuários', value: stats.totalUsers, gradient: 'from-blue-500 to-cyan-500', trend: '+12%' },
              { icon: UserCheck, label: 'Membros Ativos', value: stats.totalMembers, gradient: 'from-green-500 to-emerald-500', trend: '+8%' },
              { icon: BookOpen, label: 'Sermões', value: stats.totalSermons, gradient: 'from-purple-500 to-pink-500', trend: '+5' },
              { icon: DollarSign, label: 'Receita Total', value: `Kz ${(stats.totalRevenue / 1000).toFixed(1)}K`, gradient: 'from-emerald-500 to-teal-500', trend: '+18%' },
            ].map((metric, idx) => (
              <Card key={idx} className="relative overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-xl group">
                <div className="p-4 md:p-6">
                  <div className="flex items-start justify-between mb-3 md:mb-4">
                    <div className={`p-2.5 md:p-3 bg-gradient-to-br ${metric.gradient} rounded-xl shadow-lg`}>
                      <metric.icon className="h-5 w-5 md:h-6 md:w-6 text-white" />
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                      <ArrowUpRight className="h-3 w-3 text-green-600 dark:text-green-400" />
                      <span className="text-xs font-bold text-green-600 dark:text-green-400">{metric.trend}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl md:text-3xl font-black text-foreground tracking-tight">{metric.value}</div>
                    <div className="text-xs md:text-sm font-medium text-muted-foreground">{metric.label}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Charts Row 1: Member Growth + Event Participation */}
        <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
          {/* Member Growth Line Chart */}
          <Card className="p-4 md:p-6 border-2 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div>
                <h3 className="text-base md:text-lg font-bold text-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  Crescimento de Membros
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground">Últimos 6 meses</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={memberGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '2px solid var(--border)', fontSize: '12px' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="members" stroke="#4A90A4" strokeWidth={3} dot={{ fill: '#4A90A4', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} name="Membros" />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Event Participation Bar Chart */}
          <Card className="p-4 md:p-6 border-2 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div>
                <h3 className="text-base md:text-lg font-bold text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />
                  Participação em Eventos
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground">Confirmações por evento</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={eventParticipationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                <XAxis dataKey="event" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '2px solid var(--border)', fontSize: '12px' }} />
                <Bar dataKey="confirmed" fill="#0A2E4A" radius={[6, 6, 0, 0]} name="Confirmados" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Charts Row 2: Weekly Activity (Area) + Contributions (Pie) */}
        <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
          {/* Weekly Activity Area Chart */}
          <Card className="lg:col-span-2 p-4 md:p-6 border-2 hover:shadow-xl transition-shadow">
            <div className="mb-4 md:mb-6">
              <h3 className="text-base md:text-lg font-bold text-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                Atividade Semanal da Plataforma
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground">Orações, sermões e mensagens por dia</p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={weeklyActivityData}>
                <defs>
                  <linearGradient id="colorPrayer" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4A90A4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4A90A4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '2px solid var(--border)', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area type="monotone" dataKey="orações" stroke="#EF4444" fill="url(#colorPrayer)" strokeWidth={2} name="Orações" />
                <Area type="monotone" dataKey="mensagens" stroke="#4A90A4" fill="url(#colorMessages)" strokeWidth={2} name="Mensagens" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Contributions Pie Chart */}
          <Card className="p-4 md:p-6 border-2 hover:shadow-xl transition-shadow">
            <div className="mb-4 md:mb-6">
              <h3 className="text-base md:text-lg font-bold text-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-emerald-600" />
                Contribuições
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground">Distribuição por tipo</p>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={contributionData} cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {contributionData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: '2px solid var(--border)', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {contributionData.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-bold text-foreground">{item.value}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Bottom Grid: Activity + Quick Actions */}
        <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
          {/* Recent Activity */}
          <Card className="border-2 p-4 md:p-6 hover:shadow-xl transition-shadow">
            <h2 className="text-base md:text-xl font-bold text-foreground mb-4 md:mb-6 flex items-center gap-2">
              <Clock className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              Atividade Recente
            </h2>
            <div className="space-y-3">
              {activityFeed.length === 0 ? (
                <div className="flex items-start gap-3 p-3 rounded-xl border-2 border-border">
                  <div className="p-2 bg-muted rounded-lg flex-shrink-0">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground text-sm">Aguardando atividade...</div>
                    <div className="text-xs text-muted-foreground">Ações da plataforma aparecem aqui em tempo real</div>
                  </div>
                </div>
              ) : activityFeed.slice(0, 6).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-xl border-2 border-border hover:border-primary/30 hover:bg-muted/50 transition-all">
                  <div className={`p-2 bg-muted rounded-lg flex-shrink-0 ${getActivityColor(activity.type)}`}>
                    <Activity className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground text-sm truncate">
                      {getActivityLabel(activity.type)}: {activity.title}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {activity.actorName && <span className="font-medium">{activity.actorName} •</span>}
                      {new Date(activity.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="border-2 p-4 md:p-6 hover:shadow-xl transition-shadow">
            <h2 className="text-base md:text-xl font-bold text-foreground mb-4 md:mb-6 flex items-center gap-2">
              <Zap className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              Ações Rápidas
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action, idx) => (
                <a key={idx} href={action.href} className="group relative overflow-hidden p-4 md:p-5 rounded-xl border-2 border-border hover:border-primary/50 transition-all hover:shadow-xl hover:-translate-y-0.5 transform">
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                  <div className="relative space-y-2 md:space-y-3">
                    <div className={`inline-flex p-2.5 bg-gradient-to-br ${action.color} rounded-xl shadow-lg group-hover:scale-110 transition-transform`}>
                      <action.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="font-bold text-foreground group-hover:text-primary transition-colors text-sm leading-tight">{action.label}</div>
                  </div>
                  <ChevronRight className="absolute top-3 right-3 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              ))}
            </div>
          </Card>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { icon: UserPlus, label: 'Convidados', value: stats.totalGuests, color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' },
            { icon: Calendar, label: 'Eventos', value: stats.totalEvents, color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' },
            { icon: Heart, label: 'Orações', value: stats.totalPrayers, color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' },
            { icon: GraduationCap, label: 'Cursos', value: stats.totalCourses, color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400' },
            { icon: Users, label: 'Grupos', value: stats.totalGroups, color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400' },
            { icon: Shield, label: 'Transações', value: stats.totalTransactions, color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400' },
          ].map((item, idx) => (
            <Card key={idx} className="p-4 border-2 hover:border-primary/30 transition-colors">
              <div className={`p-2 rounded-lg w-fit mb-2 ${item.color}`}>
                <item.icon className="h-4 w-4" />
              </div>
              <div className="text-xl md:text-2xl font-black text-foreground mb-1">{item.value}</div>
              <div className="text-xs text-muted-foreground font-medium">{item.label}</div>
            </Card>
          ))}
        </div>

        {/* System Status */}
        <Card className="border-2 p-4 md:p-6 bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/30 dark:via-emerald-950/30 dark:to-teal-950/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-500 rounded-xl shadow-lg">
                <CheckCircle2 className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              <div>
                <div className="font-bold text-foreground text-sm md:text-base">Sistema Operacional</div>
                <div className="text-xs md:text-sm text-muted-foreground">Todos os serviços funcionando normalmente</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              {[{ label: 'Versão', value: 'v1.0.0' }, { label: 'Uptime', value: '99.9%', green: true }, { label: 'Atualizado', value: new Date().toLocaleDateString('pt-BR') }].map(item => (
                <div key={item.label} className="px-3 py-2 bg-white dark:bg-gray-900 border-2 border-border rounded-xl">
                  <div className="text-xs text-muted-foreground mb-0.5">{item.label}</div>
                  <div className={`text-sm font-bold ${item.green ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}>{item.value}</div>
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
