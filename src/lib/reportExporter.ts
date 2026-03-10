import { supabase } from '../lib/supabase'

export interface ReportData {
  totalUsers: number
  totalMembers: number
  totalGuests: number
  totalSermons: number
  totalEvents: number
  totalPrayers: number
  totalTransactions: number
  totalRevenue: number
  totalCourses: number
  generatedAt: string
}

export const exportToCSV = async (period: 'month' | 'year' = 'month'): Promise<void> => {
  try {
    const now = new Date()
    const startDate = new Date(now.getFullYear(), period === 'month' ? now.getMonth() : 0, 1)

    // Fetch all data
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

    const reportData: ReportData = {
      totalUsers: users.count || 0,
      totalMembers: members.count || 0,
      totalGuests: guests.count || 0,
      totalSermons: sermons.count || 0,
      totalEvents: events.count || 0,
      totalPrayers: prayers.count || 0,
      totalTransactions: transactions.data?.length || 0,
      totalRevenue,
      totalCourses: courses.count || 0,
      generatedAt: now.toISOString(),
    }

    // Create CSV content
    const csvRows = [
      ['Relatório MER - Estatísticas da Plataforma'],
      [`Período: ${period === 'month' ? 'Mensal' : 'Anual'}`],
      [`Gerado em: ${now.toLocaleString('pt-BR')}`],
      [],
      ['Métrica', 'Valor'],
      ['Total de Usuários', reportData.totalUsers.toString()],
      ['Membros Ativos', reportData.totalMembers.toString()],
      ['Convidados', reportData.totalGuests.toString()],
      ['Sermões Publicados', reportData.totalSermons.toString()],
      ['Eventos Programados', reportData.totalEvents.toString()],
      ['Pedidos de Oração', reportData.totalPrayers.toString()],
      ['Transações', reportData.totalTransactions.toString()],
      ['Receita Total (Kz)', reportData.totalRevenue.toFixed(2)],
      ['Cursos na Academy', reportData.totalCourses.toString()],
    ]

    const csvContent = csvRows.map((row) => row.join(',')).join('\n')

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `relatorio-mer-${period}-${now.toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    console.error('Error exporting report:', error)
    throw error
  }
}
