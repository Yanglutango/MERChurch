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
  UserCheck,
  UserPlus,
} from 'lucide-react'
import { PageHeader } from '../components/shared/PageHeader'
import { StatCard } from '../components/shared/StatCard'
import { LoadingState } from '../components/shared/LoadingState'

const DashboardPage = () => {
  const [loading, setLoading] = useState(true)
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

  const loadStats = async () => {
    setLoading(true)
    try {
      const [users, members, guests, sermons, events, prayers, transactions, courses] = await Promise.all([
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'member'),
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'guest'),
        supabase.from('sermons').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('id', { count: 'exact', head: true }),
        supabase.from('prayer_requests').select('id', { count: 'exact', head: true }),
        supabase.from('transactions').select('amount, status'),
        supabase.from('courses').select('id', { count: 'exact', head: true }),
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
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const statsCards = [
    {
      icon: Users,
      label: 'Total de Usuários',
      value: stats.totalUsers,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: UserCheck,
      label: 'Membros',
      value: stats.totalMembers,
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: UserPlus,
      label: 'Convidados',
      value: stats.totalGuests,
      color: 'from-yellow-500 to-orange-500',
    },
    {
      icon: BookOpen,
      label: 'Sermões',
      value: stats.totalSermons,
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: Calendar,
      label: 'Eventos',
      value: stats.totalEvents,
      color: 'from-indigo-500 to-purple-500',
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
      value: `Kz ${stats.totalRevenue.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}`,
      color: 'from-green-500 to-teal-500',
    },
    {
      icon: Activity,
      label: 'Cursos',
      value: stats.totalCourses,
      color: 'from-pink-500 to-rose-500',
    },
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
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Dashboard Administrativo"
          description="Visão geral da plataforma KAIRÓS - MER"
          icon={LayoutDashboard}
          gradient="from-amber-500 via-orange-500 to-red-500"
        />

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.map((stat, index) => (
            <StatCard
              key={index}
              icon={stat.icon}
              label={stat.label}
              value={stat.value}
              gradient={stat.color}
            />
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 border-2">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Ações Rápidas
            </h2>
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
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Atividades Recentes
            </h2>
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
              <div className="font-semibold text-foreground">{new Date().toLocaleDateString('pt-BR')}</div>
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
