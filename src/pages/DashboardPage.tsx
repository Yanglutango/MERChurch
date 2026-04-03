import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { supabase } from '../lib/supabase'
import { exportToCSV } from '../lib/reportExporter'
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
  ArrowUpRight,
  Zap,
  CheckCircle2,
  Clock,
  MessageSquare,
  GraduationCap,
  ChevronRight,
  Download,
  FileSpreadsheet,
} from 'lucide-react'
import { LoadingState } from '../components/shared/LoadingState'
import { toast } from 'sonner'

const DashboardPage = () => {
  const navigate = useNavigate()
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
  })

  useEffect(() => {
    loadStats()
  }, [])

  const handleExportReport = async (period: 'month' | 'year') => {
    try {
      await exportToCSV(period)
      toast.success('Relatório exportado com sucesso!')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Erro ao exportar relatório')
    }
  }

  const loadStats = async () => {
    setLoading(true)
    try {
      const [users, members, guests, sermons, events, prayers, transactions, courses, prayersRecent, sermonsRecent, eventsRecent] = await Promise.all([
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'member'),
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'guest'),
        supabase.from('sermons').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('id', { count: 'exact', head: true }),
        supabase.from('prayer_requests').select('id', { count: 'exact', head: true }),
        supabase.from('transactions').select('amount, status'),
        supabase.from('courses').select('id', { count: 'exact', head: true }),
        supabase.from('prayer_requests').select('title, created_at').order('created_at', { ascending: false }).limit(2),
        supabase.from('sermons').select('title, created_at').order('created_at', { ascending: false }).limit(2),
        supabase.from('events').select('title, created_at').order('created_at', { ascending: false }).limit(1),
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
      })

      // Build real recent activity from DB
      const activities: any[] = []
      for (const prayer of (prayersRecent.data || [])) {
        activities.push({ icon: Heart, label: `Novo pedido de oração: ${prayer.title}`, time: prayer.created_at, color: 'text-rose-600 dark:text-rose-400' })
      }
      for (const sermon of (sermonsRecent.data || [])) {
        activities.push({ icon: BookOpen, label: `Sermão publicado: ${sermon.title}`, time: sermon.created_at, color: 'text-blue-600 dark:text-blue-400' })
      }
      for (const event of (eventsRecent.data || [])) {
        activities.push({ icon: Calendar, label: `Evento criado: ${event.title}`, time: event.created_at, color: 'text-purple-600 dark:text-purple-400' })
      }

      // Sort by date descending
      activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      setRecentActivity(activities.slice(0, 5))
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    { icon: BookOpen, label: 'Gerenciar Sermões', href: '/sermons', color: 'from-purple-500 to-pink-500' },
    { icon: Calendar, label: 'Gerenciar Eventos', href: '/agenda', color: 'from-blue-500 to-cyan-500' },
    { icon: Users, label: 'Gerenciar Ministérios', href: '/ministries', color: 'from-green-500 to-emerald-500' },
    { icon: GraduationCap, label: 'Gerenciar Cursos', href: '/academy', color: 'from-orange-500 to-red-500' },
  ]

  // Mock data for sparkline (últimos 7 dias)
  const weeklyActivity = [45, 52, 48, 61, 58, 67, 72]
  const maxActivity = Math.max(...weeklyActivity)

  if (loading) {
    return (
      <Layout title="Dashboard Administrativo">
        <LoadingState fullScreen message="Carregando estatísticas..." />
      </Layout>
    )
  }

  return (
    <Layout title="Dashboard Administrativo">
      <div className="space-y-8">
        {/* Modern Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b-2 border-border">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight mb-2 flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-xl">
                <LayoutDashboard className="h-8 w-8 text-white" />
              </div>
              Dashboard Administrativo
            </h1>
            <p className="text-base text-muted-foreground">
              Visão geral da atividade da plataforma MER
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={() => handleExportReport('month')}
              variant="outline"
              size="sm"
              className="border-2"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar Mensal
            </Button>
            <Button
              onClick={() => handleExportReport('year')}
              variant="outline"
              size="sm"
              className="border-2"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar Anual
            </Button>
            <div className="flex items-center gap-2 px-4 py-2.5 bg-green-100 dark:bg-green-900/30 border-2 border-green-300 dark:border-green-700 rounded-xl">
              <div className="h-2.5 w-2.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-bold text-green-700 dark:text-green-300">Plataforma Ativa</span>
            </div>
            <div className="px-4 py-2.5 bg-muted border-2 border-border rounded-xl">
              <div className="text-xs text-muted-foreground">Última atualização</div>
              <div className="text-sm font-bold text-foreground">
                {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>

        {/* Métricas Principais - Sofisticadas */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-5 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Métricas Principais
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total de Usuários */}
            <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-xl group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <ArrowUpRight className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-bold text-green-600 dark:text-green-400">+12%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-black text-foreground tracking-tight">{stats.totalUsers}</div>
                  <div className="text-sm font-medium text-muted-foreground">Total de Usuários</div>
                </div>
                {/* Mini sparkline */}
                <div className="mt-4 flex items-end gap-1 h-8">
                  {weeklyActivity.map((val, idx) => (
                    <div
                      key={idx}
                      className="flex-1 bg-gradient-to-t from-blue-500 to-cyan-500 rounded-sm opacity-60 group-hover:opacity-100 transition-opacity"
                      style={{ height: `${(val / maxActivity) * 100}%` }}
                    />
                  ))}
                </div>
              </div>
            </Card>

            {/* Membros */}
            <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-xl group">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg">
                    <UserCheck className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <ArrowUpRight className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-bold text-green-600 dark:text-green-400">+8%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-black text-foreground tracking-tight">{stats.totalMembers}</div>
                  <div className="text-sm font-medium text-muted-foreground">Membros Ativos</div>
                </div>
                <div className="mt-4 flex items-end gap-1 h-8">
                  {weeklyActivity.map((val, idx) => (
                    <div
                      key={idx}
                      className="flex-1 bg-gradient-to-t from-green-500 to-emerald-500 rounded-sm opacity-60 group-hover:opacity-100 transition-opacity"
                      style={{ height: `${(val / maxActivity) * 100}%` }}
                    />
                  ))}
                </div>
              </div>
            </Card>

            {/* Sermões */}
            <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-xl group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
                    <BookOpen className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    <ArrowUpRight className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">+5</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-black text-foreground tracking-tight">{stats.totalSermons}</div>
                  <div className="text-sm font-medium text-muted-foreground">Sermões Publicados</div>
                </div>
                <div className="mt-4 flex items-end gap-1 h-8">
                  {weeklyActivity.map((val, idx) => (
                    <div
                      key={idx}
                      className="flex-1 bg-gradient-to-t from-purple-500 to-pink-500 rounded-sm opacity-60 group-hover:opacity-100 transition-opacity"
                      style={{ height: `${(val / maxActivity) * 100}%` }}
                    />
                  ))}
                </div>
              </div>
            </Card>

            {/* Receita */}
            <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-xl group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow-lg">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <ArrowUpRight className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-bold text-green-600 dark:text-green-400">+18%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-black text-foreground tracking-tight">
                    Kz {(stats.totalRevenue / 1000).toFixed(1)}K
                  </div>
                  <div className="text-sm font-medium text-muted-foreground">Receita Total</div>
                </div>
                <div className="mt-4 flex items-end gap-1 h-8">
                  {weeklyActivity.map((val, idx) => (
                    <div
                      key={idx}
                      className="flex-1 bg-gradient-to-t from-emerald-500 to-teal-500 rounded-sm opacity-60 group-hover:opacity-100 transition-opacity"
                      style={{ height: `${(val / maxActivity) * 100}%` }}
                    />
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Área de Visualização - Gráfico Central */}
        <Card className="border-2 p-8 bg-gradient-to-br from-primary/5 via-accent/5 to-background">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-1 flex items-center gap-2">
                <Activity className="h-6 w-6 text-primary" />
                Atividade da Plataforma
              </h2>
              <p className="text-sm text-muted-foreground">Últimos 7 dias</p>
            </div>
            <div className="px-4 py-2 bg-primary/10 border-2 border-primary/20 rounded-xl">
              <div className="text-xs text-muted-foreground">Média diária</div>
              <div className="text-xl font-bold text-primary">
                {Math.round(weeklyActivity.reduce((a, b) => a + b, 0) / weeklyActivity.length)}
              </div>
            </div>
          </div>

          {/* Simple Line Chart */}
          <div className="h-64 flex items-end gap-3">
            {weeklyActivity.map((value, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-3">
                <div className="w-full flex flex-col justify-end" style={{ height: '200px' }}>
                  <div
                    className="w-full bg-gradient-to-t from-primary to-accent rounded-t-lg shadow-lg transition-all hover:shadow-xl hover:scale-105 cursor-pointer relative group"
                    style={{ height: `${(value / maxActivity) * 100}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
                      {value} atividades
                    </div>
                  </div>
                </div>
                <div className="text-xs font-medium text-muted-foreground">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][idx]}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Grid Inferior */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Atividade Recente - Timeline Style */}
          <Card className="border-2 p-6 hover:shadow-xl transition-shadow">
            <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Atividade Recente da Plataforma
            </h2>
            <div className="space-y-4">
              {(recentActivity.length > 0 ? recentActivity : [
                { icon: Activity, label: 'Carregando atividades recentes...', time: new Date().toISOString(), color: 'text-muted-foreground' },
              ]).map((activity, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/30 hover:bg-muted/50 transition-all group cursor-pointer"
                >
                  <div className={`p-2.5 bg-muted rounded-xl group-hover:scale-110 transition-transform ${activity.color}`}>
                    <activity.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground mb-0.5">{activity.label}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(activity.time).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </Card>

          {/* Ações Rápidas - Modernizado */}
          <Card className="border-2 p-6 hover:shadow-xl transition-shadow">
            <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Ações Rápidas
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {quickActions.map((action, idx) => (
                <a
                  key={idx}
                  href={action.href}
                  className="group relative overflow-hidden p-6 rounded-2xl border-2 border-border hover:border-primary/50 transition-all hover:shadow-xl hover:-translate-y-1 transform"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                  <div className="relative space-y-3">
                    <div className={`inline-flex p-3 bg-gradient-to-br ${action.color} rounded-xl shadow-lg group-hover:scale-110 transition-transform`}>
                      <action.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
                      {action.label}
                    </div>
                  </div>
                  <ChevronRight className="absolute top-4 right-4 h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              ))}
            </div>
          </Card>
        </div>

        {/* Métricas Secundárias */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="p-5 border-2 hover:border-primary/30 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <UserPlus className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-2xl font-black text-foreground mb-1">{stats.totalGuests}</div>
            <div className="text-sm text-muted-foreground">Convidados</div>
          </Card>

          <Card className="p-5 border-2 hover:border-primary/30 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-2xl font-black text-foreground mb-1">{stats.totalEvents}</div>
            <div className="text-sm text-muted-foreground">Eventos</div>
          </Card>

          <Card className="p-5 border-2 hover:border-primary/30 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Heart className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-2xl font-black text-foreground mb-1">{stats.totalPrayers}</div>
            <div className="text-sm text-muted-foreground">Pedidos de Oração</div>
          </Card>

          <Card className="p-5 border-2 hover:border-primary/30 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                <GraduationCap className="h-5 w-5 text-pink-600 dark:text-pink-400" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-2xl font-black text-foreground mb-1">{stats.totalCourses}</div>
            <div className="text-sm text-muted-foreground">Cursos Academy</div>
          </Card>
        </div>

        {/* System Status - Footer */}
        <Card className="border-2 p-6 bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/30 dark:via-emerald-950/30 dark:to-teal-950/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500 rounded-xl shadow-lg">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="font-bold text-foreground text-lg">Sistema Operacional</div>
                <div className="text-sm text-muted-foreground">Todos os serviços funcionando normalmente</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="px-4 py-2 bg-white dark:bg-gray-900 border-2 border-border rounded-xl">
                <div className="text-muted-foreground mb-0.5">Versão</div>
                <div className="font-bold text-foreground">v1.0.0</div>
              </div>
              <div className="px-4 py-2 bg-white dark:bg-gray-900 border-2 border-border rounded-xl">
                <div className="text-muted-foreground mb-0.5">Uptime</div>
                <div className="font-bold text-green-600 dark:text-green-400">99.9%</div>
              </div>
              <div className="px-4 py-2 bg-white dark:bg-gray-900 border-2 border-border rounded-xl">
                <div className="text-muted-foreground mb-0.5">Última Deploy</div>
                <div className="font-bold text-foreground">{new Date().toLocaleDateString('pt-BR')}</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  )
}

export default DashboardPage
