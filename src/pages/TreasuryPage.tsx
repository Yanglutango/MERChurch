import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useAppStore } from '../stores/appStore'
import {
  DollarSign, QrCode, Building2, Filter, TrendingUp, UserPlus, Shield,
  PieChart, CheckCircle, Clock, Copy, AlertCircle, RefreshCw, Smartphone,
  ArrowRight, Trash2, Download, FileSpreadsheet, BarChart3, ArrowUpRight,
  TrendingDown, Wifi, WifiOff, Sparkles, Landmark,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Transaction } from '../types'
import { StatCard } from '../components/shared/StatCard'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { GuestPrompt } from '../components/shared/GuestPrompt'
import { useRealTime } from '../hooks/useRealTime'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { exportFinancialReport } from '../lib/reportExporter'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

// ── Types ────────────────────────────────────────────────────────────────────
type PaymentStep = 'form' | 'reference' | 'confirming' | 'success' | 'failed'

interface PaymentState {
  step: PaymentStep
  reference: string | null
  transactionId: string | null
  amount: number
  type: string
  expiresAt: string | null
  isSimulation?: boolean
}

const TYPE_LABELS: Record<string, string> = {
  tithe: 'Dízimo', offering: 'Oferta', donation: 'Doação', project: 'Projeto Especial',
}

const STATUS_BADGE: Record<string, { color: string; label: string; icon: any }> = {
  pending:   { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', label: 'Pendente', icon: Clock },
  completed: { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', label: 'Confirmado', icon: CheckCircle },
  failed:    { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', label: 'Falhou', icon: AlertCircle },
}

const PT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const money = (value: number) =>
  `Kz ${value.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// ── Component ────────────────────────────────────────────────────────────────
const TreasuryPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useAppStore()
  const { version } = useRealTime()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [monthlyChartData, setMonthlyChartData] = useState<any[]>([])
  const [typeBreakdown, setTypeBreakdown] = useState<any[]>([])

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [paymentState, setPaymentState] = useState<PaymentState>({
    step: 'form', reference: null, transactionId: null, amount: 0, type: 'tithe', expiresAt: null,
  })

  const [newTx, setNewTx] = useState({ amount: '', type: 'tithe' as const, description: '' })
  const [filters, setFilters] = useState({ type: 'all', status: 'all', dateFrom: '', dateTo: '' })

  const isGuest = user?.role === 'guest'
  const isAdmin = user?.role === 'admin'
  const isMember = user?.role === 'member'

  useEffect(() => { if (!isGuest) loadTransactions() }, [version])
  useEffect(() => { applyFilters() }, [transactions, allTransactions, filters])
  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current) }, [])

  const loadTransactions = async () => {
    setLoading(true)
    if (isAdmin) {
      const { data } = await supabase.from('transactions').select('*').order('created_at', { ascending: false })
      const all = data || []
      setAllTransactions(all)
      buildCharts(all)
    }
    const { data } = await supabase.from('transactions').select('*').eq('user_id', user!.id).order('created_at', { ascending: false })
    setTransactions(data || [])
    setLoading(false)
  }

  const buildCharts = (txs: any[]) => {
    const completed = txs.filter(t => t.status === 'completed')

    const now = new Date()
    const buckets: Record<string, number> = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      buckets[`${d.getFullYear()}-${d.getMonth()}`] = 0
    }
    completed.forEach(tx => {
      const d = new Date(tx.created_at)
      const k = `${d.getFullYear()}-${d.getMonth()}`
      if (k in buckets) buckets[k] += parseFloat(tx.amount)
    })
    const monthlyData = Object.entries(buckets).map(([k, val]) => {
      const [, m] = k.split('-').map(Number)
      return { month: PT_MONTHS[m], value: Math.round(val) }
    })
    setMonthlyChartData(monthlyData)

    const types = ['tithe', 'offering', 'donation', 'project']
    const breakdown = types.map(type => ({
      name: TYPE_LABELS[type],
      value: completed.filter(t => t.type === type).reduce((s, t) => s + parseFloat(t.amount), 0),
    })).filter(t => t.value > 0)
    setTypeBreakdown(breakdown)
  }

  const applyFilters = () => {
    const source = isAdmin ? allTransactions : transactions
    let f = [...source]
    if (filters.type !== 'all') f = f.filter(t => t.type === filters.type)
    if (filters.status !== 'all') f = f.filter(t => t.status === filters.status)
    if (filters.dateFrom) f = f.filter(t => new Date((t as any).created_at) >= new Date(filters.dateFrom))
    if (filters.dateTo) f = f.filter(t => new Date((t as any).created_at) <= new Date(filters.dateTo + 'T23:59:59'))
    setFilteredTransactions(f)
  }

  const generateReference = async () => {
    const amount = parseFloat(newTx.amount)
    if (!amount || amount <= 0) { toast.error('Insira um valor válido'); return }
    if (amount < 100) { toast.error('O valor mínimo é Kz 100,00'); return }

    setProcessingPayment(true)
    const { data, error } = await supabase.functions.invoke('multicaixa-payment', {
      body: { action: 'generate', userId: user!.id, amount, type: newTx.type, description: newTx.description },
    })

    if (error) {
      let msg = error.message
      if (error instanceof FunctionsHttpError) {
        try { msg = await error.context?.text() || msg } catch { /* ignore */ }
      }
      toast.error(msg || 'Erro ao gerar referência')
      setProcessingPayment(false)
      return
    }

    setPaymentState({
      step: 'reference',
      reference: data.reference,
      transactionId: data.transactionId,
      amount,
      type: newTx.type,
      expiresAt: data.expiresAt || null,
      isSimulation: data.simulation,
    })

    toast.success('Referência gerada! Efetue o pagamento na app Multicaixa.')
    startPolling(data.transactionId)
    setProcessingPayment(false)
  }

  const startPolling = (txId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    let attempts = 0
    const maxAttempts = 60

    pollingRef.current = setInterval(async () => {
      attempts++
      if (attempts > maxAttempts) {
        clearInterval(pollingRef.current!)
        pollingRef.current = null
        return
      }
      const { data } = await supabase.from('transactions').select('status').eq('id', txId).single()
      if (data?.status === 'completed') {
        clearInterval(pollingRef.current!)
        pollingRef.current = null
        setPaymentState(prev => ({ ...prev, step: 'success' }))
        loadTransactions()
        toast.success('Pagamento confirmado! Obrigado pela sua contribuição! 🙏')
      } else if (data?.status === 'failed') {
        clearInterval(pollingRef.current!)
        pollingRef.current = null
        setPaymentState(prev => ({ ...prev, step: 'failed' }))
        toast.error('Pagamento não confirmado.')
      }
    }, 10_000)
  }

  const checkStatusManually = async () => {
    if (!paymentState.transactionId) return
    setCheckingStatus(true)
    const { data } = await supabase.from('transactions').select('status').eq('id', paymentState.transactionId).single()
    if (data?.status === 'completed') {
      setPaymentState(prev => ({ ...prev, step: 'success' }))
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
      loadTransactions()
      toast.success('Pagamento confirmado! 🙏')
    } else if (data?.status === 'failed') {
      setPaymentState(prev => ({ ...prev, step: 'failed' }))
      toast.error('Pagamento não confirmado.')
    } else {
      toast.info('Pagamento ainda pendente.')
    }
    setCheckingStatus(false)
  }

  const resetDialog = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
    setPaymentState({ step: 'form', reference: null, transactionId: null, amount: 0, type: 'tithe', expiresAt: null })
    setNewTx({ amount: '', type: 'tithe', description: '' })
    setDialogOpen(false)
  }

  const copyReference = (ref: string) => { navigator.clipboard.writeText(ref); toast.success('Referência copiada!') }

  const deleteTransaction = async (id: string) => {
    const { data, error } = await supabase.from('transactions').delete().eq('id', id).select('id')
    if (error || !data?.length) { toast.error('Sem permissão para remover'); return }
    toast.success('Transação removida')
    loadTransactions()
  }

  const handleExportFinancial = async (period: 'month' | 'quarter' | 'year' | 'all') => {
    try { await exportFinancialReport(period); toast.success('Relatório financeiro exportado!') }
    catch { toast.error('Erro ao exportar') }
  }

  const source = isAdmin ? allTransactions : transactions
  const completed = source.filter(t => t.status === 'completed')
  const totalAmount = completed.reduce((s, t) => s + t.amount, 0)
  const totalTithes = completed.filter(t => t.type === 'tithe').reduce((s, t) => s + t.amount, 0)
  const totalOfferings = completed.filter(t => t.type === 'offering').reduce((s, t) => s + t.amount, 0)
  const totalDonations = completed.filter(t => t.type === 'donation').reduce((s, t) => s + t.amount, 0)
  const pendingCount = source.filter(t => t.status === 'pending').length

  const thisMonthTx = completed.filter(t => {
    const d = new Date((t as any).created_at)
    const n = new Date()
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
  })
  const lastMonthTx = completed.filter(t => {
    const d = new Date((t as any).created_at)
    const n = new Date()
    const prev = new Date(n.getFullYear(), n.getMonth() - 1, 1)
    return d.getMonth() === prev.getMonth() && d.getFullYear() === prev.getFullYear()
  })
  const thisMonthTotal = thisMonthTx.reduce((s, t) => s + t.amount, 0)
  const lastMonthTotal = lastMonthTx.reduce((s, t) => s + t.amount, 0)
  const monthDelta = lastMonthTotal > 0 ? Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100) : null

  if (loading) return <Layout title="Tesouraria"><LoadingState fullScreen message="Carregando informações financeiras..." /></Layout>

  return (
    <Layout title="Tesouraria">
      <div className="min-h-screen bg-[#f3f5f7] text-slate-900 dark:bg-[#07111c] dark:text-slate-50">
        <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
          <Card className="relative overflow-hidden border-0 rounded-[28px] bg-slate-950 shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
            <div className="absolute inset-0">
              <img
                src="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1920&h=600&fit=crop&q=80"
                alt="Treasury"
                className="h-full w-full object-cover opacity-35"
              />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,165,116,0.28),transparent_30%),linear-gradient(120deg,rgba(8,15,27,0.96),rgba(13,34,52,0.94),rgba(19,58,78,0.92))]" />
            </div>

            <div className="relative z-10 p-6 md:p-8 lg:p-12">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl space-y-5">
                  <div className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/8 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-100 backdrop-blur-sm">
                    <Landmark className="h-4 w-4 text-[#d8b07a]" />
                    {isAdmin ? 'Gestão financeira' : isGuest ? 'Tesouraria MER' : 'Generosidade'}
                  </div>

                  <div className="space-y-3">
                    <h1 className="text-3xl font-black tracking-[-0.06em] text-white md:text-5xl">
                      {isGuest && <>
                        Generosidade com <span className="text-[#d9b57d]">transparência</span>
                      </>}
                      {isMember && <>
                        Contribua com <span className="text-[#d9b57d]">gratidão</span>
                      </>}
                      {isAdmin && <>
                        <Shield className="mr-3 inline-flex h-8 w-8 text-[#d9b57d] align-middle" />
                        Dashboard financeiro
                      </>}
                    </h1>
                    <p className="max-w-2xl text-base text-slate-200 md:text-lg">
                      {isGuest && 'A MER administra contribuições com excelência, clareza e responsabilidade financeira.'}
                      {isMember && 'Contribuições seguras via Multicaixa Express com confirmação automática e acompanhamento em tempo real.'}
                      {isAdmin && 'Acompanhe entradas, tendências mensais e relatórios financeiros com uma visão clara da saúde da obra.'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {!isGuest && (
                    <Button
                      size="lg"
                      onClick={() => { setPaymentState(p => ({ ...p, step: 'form' })); setDialogOpen(true) }}
                      className="h-12 rounded-full bg-[#d8b07a] px-6 text-sm font-bold text-slate-900 shadow-[0_16px_30px_rgba(216,176,122,0.35)] hover:bg-[#e3c28d]"
                    >
                      <QrCode className="mr-2 h-4 w-4" />
                      Nova contribuição
                    </Button>
                  )}

                  {isAdmin && (
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => handleExportFinancial('month')}
                      className="h-12 rounded-full border-white/25 bg-white/5 px-6 text-sm font-semibold text-white hover:bg-white/12"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Exportar relatório
                    </Button>
                  )}

                  {isGuest && (
                    <Button
                      size="lg"
                      onClick={() => navigate('/auth')}
                      className="h-12 rounded-full bg-white px-6 text-sm font-bold text-slate-900 hover:bg-slate-100"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Criar conta para contribuir
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                {monthDelta !== null && (
                  <div className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${monthDelta >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                    {monthDelta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(monthDelta)}%
                  </div>
                )}
              </div>
              <div className="text-2xl font-black tracking-[-0.05em] text-slate-900 dark:text-white">{money(totalAmount)}</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{isAdmin ? 'Total confirmado' : 'Minhas contribuições'}</div>
            </Card>

            <StatCard icon={TrendingUp} label="Dízimos" value={money(totalTithes)} gradient="from-sky-600 to-cyan-600" />
            <StatCard icon={PieChart} label="Ofertas" value={money(totalOfferings)} gradient="from-violet-600 to-fuchsia-600" />
            <StatCard icon={Building2} label="Doações" value={money(totalDonations)} gradient="from-amber-500 to-orange-600" />
          </div>

          {isAdmin && (
            <>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2.5 text-slate-900 dark:text-slate-50">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg font-bold tracking-[-0.04em]">Análise financeira</h2>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(['month', 'quarter', 'year', 'all'] as const).map(p => (
                    <Button key={p} size="sm" variant="outline" onClick={() => handleExportFinancial(p)} className="h-8 rounded-full border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                      {{ month: 'Mensal', quarter: 'Trimestral', year: 'Anual', all: 'Total' }[p]}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-4 flex items-center gap-2.5 text-slate-900 dark:text-white">
                    <TrendingUp className="h-4 w-4 text-sky-600" />
                    <h3 className="text-sm font-bold tracking-[-0.02em]">Receita mensal (6 meses)</h3>
                  </div>

                  {monthlyChartData.every(d => d.value === 0) ? (
                    <div className="flex h-40 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                      Nenhuma transação confirmada ainda
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={170}>
                      <AreaChart data={monthlyChartData}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0f172a" stopOpacity={0.22} />
                            <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                        <Tooltip
                          formatter={(val: number) => [`${money(Number(val))}`, 'Receita']}
                          contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid rgba(148, 163, 184, 0.25)' }}
                        />
                        <Area type="monotone" dataKey="value" stroke="#0f172a" fill="url(#colorRevenue)" strokeWidth={2.5} name="Receita" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </Card>

                <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-4 flex items-center gap-2.5 text-slate-900 dark:text-white">
                    <PieChart className="h-4 w-4 text-violet-600" />
                    <h3 className="text-sm font-bold tracking-[-0.02em]">Distribuição por tipo</h3>
                  </div>

                  {typeBreakdown.length === 0 ? (
                    <div className="flex h-40 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                      Nenhuma transação confirmada ainda
                    </div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={150}>
                        <BarChart data={typeBreakdown} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                          <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                          <Tooltip formatter={(val: number) => [`${money(Number(val))}`, 'Total']} contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid rgba(148, 163, 184, 0.25)' }} />
                          <Bar dataKey="value" fill="#4A90A4" radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ResponsiveContainer>

                      <div className="mt-4 space-y-2">
                        {typeBreakdown.map(item => {
                          const pct = Math.round((item.value / (totalAmount || 1)) * 100)
                          return (
                            <div key={item.name} className="flex items-center gap-2 text-xs">
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                <div className="h-full rounded-full bg-gradient-to-r from-[#4A90A4] to-[#7bbdd4]" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="w-24 text-right font-medium text-slate-600 dark:text-slate-300">{item.name} {pct}%</span>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}
                </Card>
              </div>
            </>
          )}

          {!isGuest && (
            <Card className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <Filter className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Filtros</h3>
                {pendingCount > 0 && (
                  <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    <Clock className="h-3 w-3" />
                    {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <Select value={filters.type} onValueChange={v => setFilters(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50 text-sm dark:border-slate-700 dark:bg-slate-800"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="tithe">Dízimo</SelectItem>
                    <SelectItem value="offering">Oferta</SelectItem>
                    <SelectItem value="donation">Doação</SelectItem>
                    <SelectItem value="project">Projeto</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.status} onValueChange={v => setFilters(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50 text-sm dark:border-slate-700 dark:bg-slate-800"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os estados</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="completed">Confirmado</SelectItem>
                    <SelectItem value="failed">Falhou</SelectItem>
                  </SelectContent>
                </Select>

                <Input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} className="h-11 rounded-xl border-slate-200 bg-slate-50 text-sm dark:border-slate-700 dark:bg-slate-800" />
                <Input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} className="h-11 rounded-xl border-slate-200 bg-slate-50 text-sm dark:border-slate-700 dark:bg-slate-800" />
              </div>
            </Card>
          )}

          {!isGuest && filteredTransactions.length > 0 && (
            <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2.5 border-b border-slate-200 px-4 py-4 dark:border-slate-800">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{isAdmin ? 'Todas as transações' : 'Meu histórico'}</h3>
                <span className="ml-auto text-xs font-medium text-slate-500 dark:text-slate-400">{filteredTransactions.length} transações</span>
              </div>

              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredTransactions.map(tx => {
                  const badge = STATUS_BADGE[tx.status] || STATUS_BADGE.pending
                  const StatusIcon = badge.icon
                  const createdAt = (tx as any).created_at || tx.createdAt

                  return (
                    <div key={tx.id} className="flex flex-col gap-3 p-4 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/60 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tx.status === 'completed' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300' : tx.status === 'pending' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300'}`}>
                          <QrCode className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-900 dark:text-white">{TYPE_LABELS[tx.type] || tx.type}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {createdAt ? new Date(createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </div>
                          {tx.description && <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{tx.description}</div>}
                          {tx.paymentReference && <div className="mt-0.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">Ref: {tx.paymentReference}</div>}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 md:justify-end">
                        <div className="text-right">
                          <div className="text-sm font-black tracking-[-0.04em] text-emerald-600 dark:text-emerald-400">{money(Number(tx.amount))}</div>
                          <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.color}`}>
                            <StatusIcon className="h-2.5 w-2.5" />
                            {badge.label}
                          </span>
                        </div>

                        {(isAdmin || (tx as any).user_id === user?.id) && (
                          <button
                            onClick={() => deleteTransaction(tx.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-red-900/60 dark:hover:bg-red-950/20 dark:hover:text-red-300"
                            aria-label="Remover transação"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {isGuest && (
            <GuestPrompt title="Faça parte da obra" description="Membros podem contribuir com dízimos, ofertas e doações via Multicaixa Express com confirmação automática." actionLabel="Criar conta" onAction={() => navigate('/auth')} />
          )}

          {!isGuest && filteredTransactions.length === 0 && (
            <EmptyState
              icon={DollarSign}
              title="Nenhuma transação encontrada"
              description={filters.type !== 'all' || filters.dateFrom || filters.dateTo ? 'Ajuste os filtros' : 'Faça sua primeira contribuição'}
              action={
                <Button onClick={() => setDialogOpen(true)} className="h-11 rounded-full bg-[#0A2E4A] text-white hover:bg-[#0d3a5c]">
                  <QrCode className="mr-2 h-4 w-4" />
                  Nova contribuição
                </Button>
              }
            />
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) resetDialog() }}>
        <DialogContent className="max-w-md rounded-3xl border border-slate-200 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-slate-900 dark:text-white">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                  <QrCode className="h-4 w-4" />
                </div>
                {paymentState.step === 'form' && 'Nova contribuição'}
                {paymentState.step === 'reference' && 'Referência de pagamento'}
                {paymentState.step === 'success' && 'Pagamento confirmado'}
                {paymentState.step === 'failed' && 'Pagamento não confirmado'}
              </DialogTitle>
            </DialogHeader>
          </div>

          {paymentState.step === 'form' && (
            <div className="space-y-5 p-6">
              <div className="flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-3 dark:border-sky-900/60 dark:bg-sky-950/20">
                <Smartphone className="h-4 w-4 text-sky-700 dark:text-sky-300" />
                <p className="text-sm font-medium text-sky-700 dark:text-sky-300">
                  Pagamento seguro via <strong>Multicaixa Express</strong> (Angola)
                </p>
              </div>

              <div>
                <Label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Tipo de contribuição *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['tithe', 'offering', 'donation', 'project'] as const).map(tp => (
                    <button
                      key={tp}
                      onClick={() => setNewTx(n => ({ ...n, type: tp }))}
                      className={`rounded-2xl border-2 p-3 text-left text-sm font-semibold transition-all ${newTx.type === tp ? 'border-[#0A2E4A] bg-[#0A2E4A]/8 text-[#0A2E4A] dark:border-[#7bbdd4] dark:bg-[#4A90A4]/10 dark:text-[#7bbdd4]' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800'}`}
                    >
                      {TYPE_LABELS[tp]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Valor (Kz) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">Kz</span>
                  <Input
                    type="number"
                    step="100"
                    min="100"
                    value={newTx.amount}
                    onChange={e => setNewTx(n => ({ ...n, amount: e.target.value }))}
                    placeholder="5.000,00"
                    className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-10 text-base font-semibold dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Valor mínimo: Kz 100,00</p>
              </div>

              <div>
                <Label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Observação (opcional)</Label>
                <Input
                  value={newTx.description}
                  onChange={e => setNewTx(n => ({ ...n, description: e.target.value }))}
                  placeholder="Ex: Dízimo de Junho 2026"
                  className="h-11 rounded-xl border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              {newTx.amount && parseFloat(newTx.amount) >= 100 && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                    {TYPE_LABELS[newTx.type]} · <span className="text-base">{money(parseFloat(newTx.amount))}</span>
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button variant="outline" onClick={resetDialog} className="flex-1 rounded-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">Cancelar</Button>
                <Button
                  onClick={generateReference}
                  disabled={processingPayment || !newTx.amount || parseFloat(newTx.amount) < 100}
                  className="flex-1 rounded-full bg-[#0A2E4A] text-white hover:bg-[#0d3a5c]"
                >
                  {processingPayment ? (
                    <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />A gerar...</>
                  ) : (
                    <><ArrowRight className="mr-2 h-4 w-4" />Gerar referência</>
                  )}
                </Button>
              </div>
            </div>
          )}

          {paymentState.step === 'reference' && (
            <div className="space-y-5 p-6">
              {paymentState.isSimulation && (
                <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/20">
                  <WifiOff className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                  <p className="text-xs text-amber-700 dark:text-amber-300"><strong>Modo simulação</strong> — confirmação automática em ~30 segundos. Configure <code className="rounded bg-amber-100 px-1 py-0.5 text-[10px] dark:bg-amber-900/40">MULTICAIXA_API_KEY</code> para modo real.</p>
                </div>
              )}
              {!paymentState.isSimulation && (
                <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                  <Wifi className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Modo de pagamento real ativado</p>
                </div>
              )}

              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                <span className="text-sm text-slate-500 dark:text-slate-400">{TYPE_LABELS[paymentState.type]}</span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{money(paymentState.amount)}</span>
              </div>

              <div className="rounded-[24px] border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 text-center shadow-sm dark:border-emerald-900/60 dark:from-emerald-950/20 dark:to-teal-950/20">
                <CheckCircle className="mx-auto mb-3 h-9 w-9 text-emerald-600 dark:text-emerald-400" />
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Referência Multicaixa</p>
                <p className="text-2xl font-black tracking-[0.18em] text-slate-900 dark:text-white">{paymentState.reference}</p>
                <Button variant="outline" onClick={() => copyReference(paymentState.reference!)} className="mt-4 w-full rounded-full border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-slate-800">
                  <Copy className="mr-2 h-4 w-4" />Copiar referência
                </Button>
              </div>

              <ol className="space-y-2.5">
                {[
                  'Abra a app Multicaixa Express',
                  'Toque em "Pagamentos" → "Referência"',
                  `Insira a referência: ${paymentState.reference}`,
                  `Confirme o valor: ${money(paymentState.amount)}`,
                  'Autorize com o seu PIN',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white dark:bg-slate-100 dark:text-slate-900">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>

              <div className="flex items-center gap-2.5 rounded-2xl border border-sky-200 bg-sky-50 p-3 dark:border-sky-900/70 dark:bg-sky-950/20">
                <RefreshCw className="h-4 w-4 animate-spin text-sky-600 dark:text-sky-300" />
                <p className="text-xs text-sky-700 dark:text-sky-300">A verificar pagamento automaticamente a cada 10 segundos...</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={resetDialog} className="flex-1 rounded-full border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">Fechar</Button>
                <Button onClick={checkStatusManually} disabled={checkingStatus} className="flex-1 rounded-full bg-[#0A2E4A] text-white hover:bg-[#0d3a5c]">
                  {checkingStatus ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Verificando...</> : <><RefreshCw className="mr-2 h-4 w-4" />Verificar agora</>}
                </Button>
              </div>
            </div>
          )}

          {paymentState.step === 'success' && (
            <div className="space-y-5 p-6 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
              </div>

              <div>
                <h3 className="text-2xl font-black tracking-[-0.05em] text-slate-900 dark:text-white">Obrigado!</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Contribuição confirmada com sucesso.</p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                  {TYPE_LABELS[paymentState.type]} · {money(paymentState.amount)}
                </p>
              </div>

              <p className="text-xs italic text-slate-500 dark:text-slate-400">"Cada um contribua segundo propôs no seu coração..." — 2 Cor 9:7</p>

              <Button onClick={resetDialog} className="w-full rounded-full bg-[#0A2E4A] text-white hover:bg-[#0d3a5c]">Fechar</Button>
            </div>
          )}

          {paymentState.step === 'failed' && (
            <div className="space-y-5 p-6 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
              </div>

              <div>
                <h3 className="text-2xl font-black tracking-[-0.05em] text-slate-900 dark:text-white">Pagamento não confirmado</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">O pagamento não foi completado dentro do prazo.</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={resetDialog} className="flex-1 rounded-full border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">Fechar</Button>
                <Button onClick={() => setPaymentState(p => ({ ...p, step: 'form' }))} className="flex-1 rounded-full bg-[#0A2E4A] text-white hover:bg-[#0d3a5c]">Tentar novamente</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  )
}

export default TreasuryPage
