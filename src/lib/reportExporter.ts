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

/** Generic platform report (Dashboard export) */
export const exportToCSV = async (period: 'month' | 'year' = 'month'): Promise<void> => {
  const now = new Date()

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

  const csvRows = [
    ['Relatório MER - Estatísticas da Plataforma'],
    [`Período: ${period === 'month' ? 'Mensal' : 'Anual'}`],
    [`Gerado em: ${now.toLocaleString('pt-BR')}`],
    [],
    ['Métrica', 'Valor'],
    ['Total de Usuários', (users.count || 0).toString()],
    ['Membros Ativos', (members.count || 0).toString()],
    ['Convidados', (guests.count || 0).toString()],
    ['Sermões Publicados', (sermons.count || 0).toString()],
    ['Eventos Programados', (events.count || 0).toString()],
    ['Pedidos de Oração', (prayers.count || 0).toString()],
    ['Transações', (transactions.data?.length || 0).toString()],
    ['Receita Total (Kz)', totalRevenue.toFixed(2)],
    ['Cursos na Academy', (courses.count || 0).toString()],
  ]

  downloadCSV(csvRows, `relatorio-mer-${period}-${now.toISOString().split('T')[0]}.csv`)
}

/**
 * Financial-specific report: exports full transaction list with breakdown
 * by type, status, and monthly totals
 */
export const exportFinancialReport = async (
  period: 'month' | 'quarter' | 'year' | 'all' = 'month'
): Promise<void> => {
  const now = new Date()
  let startDate: Date

  if (period === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  } else if (period === 'quarter') {
    const q = Math.floor(now.getMonth() / 3)
    startDate = new Date(now.getFullYear(), q * 3, 1)
  } else if (period === 'year') {
    startDate = new Date(now.getFullYear(), 0, 1)
  } else {
    startDate = new Date(2000, 0, 1)
  }

  // Fetch all transactions in the period with user info
  const { data: txs } = await supabase
    .from('transactions')
    .select('id, amount, type, method, status, description, payment_reference, created_at, user_id')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false })

  const rows = txs || []
  const completed = rows.filter(t => t.status === 'completed')
  const pending = rows.filter(t => t.status === 'pending')
  const failed = rows.filter(t => t.status === 'failed')

  const sumByType = (type: string) =>
    completed.filter(t => t.type === type).reduce((s, t) => s + parseFloat(t.amount), 0)

  const totalRevenue = completed.reduce((s, t) => s + parseFloat(t.amount), 0)

  const periodLabel = {
    month: `${now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}`,
    quarter: `T${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`,
    year: now.getFullYear().toString(),
    all: 'Todo o período',
  }[period]

  const TYPE_LABELS: Record<string, string> = {
    tithe: 'Dízimo',
    offering: 'Oferta',
    donation: 'Doação',
    project: 'Projeto Especial',
  }
  const STATUS_LABELS: Record<string, string> = {
    completed: 'Confirmado',
    pending: 'Pendente',
    failed: 'Falhou',
  }

  const csvRows: string[][] = [
    ['KAIRÓS MER — Relatório Financeiro'],
    [`Período: ${periodLabel}`],
    [`Gerado em: ${now.toLocaleString('pt-BR')}`],
    [],
    ['=== RESUMO ==='],
    ['Métrica', 'Valor (Kz)'],
    ['Receita Total Confirmada', totalRevenue.toFixed(2)],
    ['  · Dízimos', sumByType('tithe').toFixed(2)],
    ['  · Ofertas', sumByType('offering').toFixed(2)],
    ['  · Doações', sumByType('donation').toFixed(2)],
    ['  · Projetos Especiais', sumByType('project').toFixed(2)],
    ['Total de Transações', rows.length.toString()],
    ['  · Confirmadas', completed.length.toString()],
    ['  · Pendentes', pending.length.toString()],
    ['  · Falhadas', failed.length.toString()],
    [],
    ['=== DETALHES DAS TRANSAÇÕES ==='],
    ['Data', 'Tipo', 'Valor (Kz)', 'Método', 'Estado', 'Referência', 'Descrição'],
    ...rows.map(t => [
      new Date(t.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      TYPE_LABELS[t.type] || t.type,
      parseFloat(t.amount).toFixed(2),
      t.method === 'multicaixa' ? 'Multicaixa Express' : t.method,
      STATUS_LABELS[t.status] || t.status,
      t.payment_reference || '—',
      t.description || '—',
    ]),
  ]

  const filename = `financeiro-mer-${period}-${now.toISOString().split('T')[0]}.csv`
  downloadCSV(csvRows, filename)
}

// ── Internal helper ─────────────────────────────────────────────────────────
function downloadCSV(rows: string[][], filename: string): void {
  // BOM for Excel to handle UTF-8 properly
  const BOM = '\uFEFF'
  const content = BOM + rows.map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n')

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
