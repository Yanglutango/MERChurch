import { useState, useEffect } from 'react'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { supabase } from '../lib/supabase'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Calendar,
  Heart,
  DollarSign,
  TrendingUp,
  Activity,
} from 'lucide-react'

const DashboardPage = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSermons: 0,
    totalEvents: 0,
    totalPrayers: 0,
    totalTransactions: 0,
    totalRevenue: 0,
    totalMinistries: 0,
    totalCourses: 0,
  })

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const [users, sermons, events, prayers, transactions, ministries, courses] = await Promise.all([
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('sermons').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('id', { count: 'exact', head: true }),
        supabase.from('prayer_requests').select('id', { count: 'exact', head: true }),
        supabase.from('transactions').select('amount, status'),
        supabase.from('ministries').select('id', { count: 'exact', head: true }),
        supabase.from('courses').select('id', { count: 'exact', head: true }),
      ])

      const completedTransactions = transactions.data?.filter((t) => t.status === 'completed') || []
      const totalRevenue = completedTransactions.reduce((sum, t) => sum + t.amount, 0)

      setStats({
        totalUsers: users.count || 0,
        totalSermons: sermons.count || 0,
        totalEvents: events.count || 0,
        totalPrayers: prayers.count || 0,
        totalTransactions: transactions.data?.length || 0,
        totalRevenue,
        totalMinistries: ministries.count || 0,
        totalCourses: courses.count || 0,
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const statsCards = [
    {
      icon: Users,
      label: 'Total de Membros',
      value: stats.totalUsers,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: BookOpen,
      label: 'Sermões Publicados',
      value: stats.totalSermons,
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: Calendar,
      label: 'Eventos Programados',
      value: stats.totalEvents,
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: Heart,
      label: 'Pedidos de Oração',
      value: stats.totalPrayers,
      color: 'from-red-500 to-rose-500',
    },
    {
      icon: DollarSign,
      label: 'Receita Total',
      value: `R$ ${stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: TrendingUp,
      label: 'Transações',
      value: stats.totalTransactions,
      color: 'from-yellow-500 to-orange-500',
    },
    {
      icon: Users,
      label: 'Ministérios Ativos',
      value: stats.totalMinistries,
      color: 'from-indigo-500 to-purple-500',
    },
    {
      icon: Activity,
      label: 'Cursos Disponíveis',
      value: stats.totalCourses,
      color: 'from-pink-500 to-rose-500',
    },
  ]

  return (
    <Layout title="Dashboard Administrativo">
      <div className="space-y-6">
        {/* Header */}
        <Card className="p-8 border-2 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
              <LayoutDashboard className="h-12 w-12" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-1">Dashboard Administrativo</h1>
              <p className="text-white/90">Visão geral da plataforma MER</p>
            </div>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.map((stat, index) => (
            <Card
              key={index}
              className="p-6 border-2 hover:border-primary/50 transition-all hover:shadow-xl"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 border-2">
            <h2 className="text-xl font-bold text-foreground mb-4">Ações Rápidas</h2>
            <div className="space-y-3">
              <a
                href="/sermons"
                className="block p-4 bg-muted/50 hover:bg-muted rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <div className="font-semibold text-foreground">Gerenciar Sermões</div>
                </div>
              </a>
              <a
                href="/agenda"
                className="block p-4 bg-muted/50 hover:bg-muted rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div className="font-semibold text-foreground">Gerenciar Eventos</div>
                </div>
              </a>
              <a
                href="/ministries"
                className="block p-4 bg-muted/50 hover:bg-muted rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <div className="font-semibold text-foreground">Gerenciar Ministérios</div>
                </div>
              </a>
              <a
                href="/academy"
                className="block p-4 bg-muted/50 hover:bg-muted rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-primary" />
                  <div className="font-semibold text-foreground">Gerenciar Cursos</div>
                </div>
              </a>
            </div>
          </Card>

          <Card className="p-6 border-2">
            <h2 className="text-xl font-bold text-foreground mb-4">Atividades Recentes</h2>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="font-semibold text-foreground">Novo membro cadastrado</div>
                <div className="text-muted-foreground">Há 2 horas</div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="font-semibold text-foreground">Sermão publicado</div>
                <div className="text-muted-foreground">Há 5 horas</div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="font-semibold text-foreground">Evento criado</div>
                <div className="text-muted-foreground">Há 1 dia</div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="font-semibold text-foreground">Doação recebida</div>
                <div className="text-muted-foreground">Há 2 dias</div>
              </div>
            </div>
          </Card>
        </div>

        {/* System Info */}
        <Card className="p-6 border-2 bg-primary/5">
          <h2 className="text-xl font-bold text-foreground mb-4">Informações do Sistema</h2>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground mb-1">Versão da Plataforma</div>
              <div className="font-semibold text-foreground">1.0.0</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Última Atualização</div>
              <div className="font-semibold text-foreground">22/12/2024</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Status do Sistema</div>
              <div className="font-semibold text-green-600">✓ Operacional</div>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  )
}

export default DashboardPage
