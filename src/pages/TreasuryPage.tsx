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
  TrendingDown, Wifi, WifiOff,
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
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
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
  pending:   { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', label: 'Pendente',   icon: Clock        },
  completed: { color: 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-300',  label: 'Confirmado', icon: CheckCircle  },
  failed:    { color: 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-300',    label: 'Falhou',     icon: AlertCircle  },
}

const PT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// ── Component ────────────────────────────────────────────────────────────────
const TreasuryPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useAppStore()
  const { version } = useRealTime()

  const [transactions, setTransactions]           = useState<Transaction[]>([])
  const [allTransactions, setAllTransactions]     = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [loading, setLoading]                     = useState(true)
  const [dialogOpen, setDialogOpen]               = useState(false)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [checkingStatus, setCheckingStatus]       = useState(false)
  const [monthlyChartData, setMonthlyChartData]   = useState<any[]>([])
  const [typeBreakdown, setTypeBreakdown]         = useState<any[]>([])

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [paymentState, setPaymentState] = useState<PaymentState>({
    step: 'form', reference: null, transactionId: null, amount: 0, type: 'tithe', expiresAt: null,
  })

  const [newTx, setNewTx] = useState({ amount: '', type: 'tithe' as const, description: '' })
  const [filters, setFilters] = useState({ type: 'all', status: 'all', dateFrom: '', dateTo: '' })

  const isGuest  = user?.role === 'guest'
  const isAdmin  = user?.role === 'admin'
  const isMember = user?.role === 'member'

  useEffect(() => { if (!isGuest) loadTransactions() }, [version])
  useEffect(() => { applyFilters() }, [transactions, allTransactions, filters])
  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current) }, [])

  // ── Data loading ─────────────────────────────────────────────────────────
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

    // Monthly revenue last 6 months
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

    // Type breakdown
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
    if (filters.type !== 'all')   f = f.filter(t => t.type === filters.type)
    if (filters.status !== 'all') f = f.filter(t => t.status === filters.status)
    if (filters.dateFrom) f = f.filter(t => new Date((t as any).created_at) >= new Date(filters.dateFrom))
    if (filters.dateTo)   f = f.filter(t => new Date((t as any).created_at) <= new Date(filters.dateTo + 'T23:59:59'))
    setFilteredTransactions(f)
  }

  // ── Generate Reference ────────────────────────────────────────────────────
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

    toast.success('Referência gerada! Efectue o pagamento na app Multicaixa.')
    startPolling(data.transactionId)
    setProcessingPayment(false)
  }

  // ── Polling ───────────────────────────────────────────────────────────────
  const startPolling = (txId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    let attempts = 0
    const maxAttempts = 60 // 10 min at 10s intervals

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
    toast.success('Transacção removida')
    loadTransactions()
  }

  const handleExportFinancial = async (period: 'month' | 'quarter' | 'year' | 'all') => {
    try { await exportFinancialReport(period); toast.success('Relatório financeiro exportado!') }
    catch { toast.error('Erro ao exportar') }
  }

  // ── Computed stats ────────────────────────────────────────────────────────
  const source = isAdmin ? allTransactions : transactions
  const completed     = source.filter(t => t.status === 'completed')
  const totalAmount   = completed.reduce((s, t) => s + t.amount, 0)
  const totalTithes   = completed.filter(t => t.type === 'tithe').reduce((s, t) => s + t.amount, 0)
  const totalOfferings= completed.filter(t => t.type === 'offering').reduce((s, t) => s + t.amount, 0)
  const totalDonations= completed.filter(t => t.type === 'donation').reduce((s, t) => s + t.amount, 0)
  const pendingCount  = source.filter(t => t.status === 'pending').length

  // Month-over-month delta
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
      <div className="space-y-6">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <Card className="relative overflow-hidden border-0 shadow-2xl rounded-2xl">
          <div className="absolute inset-0">
            <img src="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1920&h=600&fit=crop&q=80" alt="Treasury" className="w-full h-full object-cover opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#0A2E4A]/96 via-[#1a4d6d]/94 to-[#4A90A4]/92" />
          </div>
          <div className="relative z-10 p-6 md:p-10 lg:p-14 text-white">
            <div className="max-w-4xl space-y-4">
              <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-white/20 backdrop-blur-md rounded-full border border-white/30">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm font-bold tracking-wide">
                  {isAdmin ? 'GESTÃO FINANCEIRA' : isGuest ? 'TESOURARIA MER' : 'GENEROSIDADE'}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black leading-tight">
                {isGuest  && <>Generosidade e <span className="text-[#D4A574]">Transparência</span></>}
                {isMember && <>Contribua com <span className="text-[#D4A574]">Gratidão</span></>}
                {isAdmin  && <><Shield className="inline h-8 w-8 text-[#D4A574] mr-2" />Dashboard Financeiro</>}
              </h1>
              <p className="text-base md:text-lg text-white/90 max-w-2xl">
                {isGuest  && 'A MER administra contribuições com integridade. Veja os dados reais.'}
                {isMember && 'Contribuições seguras via Multicaixa Express com confirmação automática.'}
                {isAdmin  && 'Visão completa das entradas, métricas mensais e relatórios exportáveis.'}
              </p>
              <div className="flex flex-wrap gap-3">
                {!isGuest && (
                  <Button size="lg" onClick={() => { setPaymentState(p => ({ ...p, step: 'form' })); setDialogOpen(true) }}
                    className="bg-white text-[#0A2E4A] hover:bg-white/90 font-bold px-7 rounded-full shadow-lg">
                    <QrCode className="mr-2 h-5 w-5" />Nova Contribuição (Multicaixa)
                  </Button>
                )}
                {isAdmin && (
                  <Button size="lg" variant="outline"
                    onClick={() => handleExportFinancial('month')}
                    className="border-white/70 text-white hover:bg-white/10 font-bold px-6 rounded-full backdrop-blur-sm">
                    <Download className="mr-2 h-5 w-5" />Exportar Relatório
                  </Button>
                )}
                {isGuest && (
                  <Button size="lg" onClick={() => navigate('/auth')} className="bg-white text-[#0A2E4A] hover:bg-white/90 font-bold px-7 rounded-full shadow-lg">
                    <UserPlus className="mr-2 h-5 w-5" />Criar Conta para Contribuir
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-yellow-400/20 to-transparent rounded-full blur-3xl" />
        </Card>

        {/* ── Stats ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 border hover:border-primary/40 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-2">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-sm">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
              {monthDelta !== null && (
                <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${monthDelta >= 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-red-100 dark:bg-red-900/30 text-red-600'}`}>
                  {monthDelta >= 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                  {Math.abs(monthDelta)}%
                </div>
              )}
            </div>
            <div className="text-lg font-bold text-foreground">Kz {totalAmount.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{isAdmin ? 'Total Confirmado' : 'Minhas Contribuições'}</div>
          </Card>
          <StatCard icon={TrendingUp}  label="Dízimos"    value={`Kz ${totalTithes.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}`}    gradient="from-blue-600 to-cyan-600" />
          <StatCard icon={PieChart}    label="Ofertas"    value={`Kz ${totalOfferings.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}`}  gradient="from-purple-600 to-pink-600" />
          <StatCard icon={Building2}   label="Doações"    value={`Kz ${totalDonations.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}`}  gradient="from-orange-600 to-red-600" />
        </div>

        {/* ── Admin: Financial Charts ───────────────────────────────────────── */}
        {isAdmin && (
          <>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Análise Financeira
              </h2>
              <div className="flex gap-1.5">
                {(['month', 'quarter', 'year', 'all'] as const).map(p => (
                  <Button key={p} size="sm" variant="outline" onClick={() => handleExportFinancial(p)} className="text-xs h-7 px-2">
                    <FileSpreadsheet className="h-3 w-3 mr-1" />
                    {{ month: 'Mensal', quarter: 'Trimestral', year: 'Anual', all: 'Total' }[p]}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              {/* Monthly Revenue Chart */}
              <Card className="p-5 border hover:shadow-md transition-shadow">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Receita Mensal (6 meses)
                </h3>
                {monthlyChartData.every(d => d.value === 0) ? (
                  <div className="flex items-center justify-center h-36 text-muted-foreground text-sm">
                    Nenhuma transação confirmada ainda
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={monthlyChartData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0A2E4A" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#0A2E4A" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                      <Tooltip
                        formatter={(val: number) => [`Kz ${val.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}`, 'Receita']}
                        contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Area type="monotone" dataKey="value" stroke="#0A2E4A" fill="url(#colorRevenue)" strokeWidth={2.5} name="Receita" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </Card>

              {/* Type Breakdown */}
              <Card className="p-5 border hover:shadow-md transition-shadow">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-primary" />
                  Distribuição por Tipo
                </h3>
                {typeBreakdown.length === 0 ? (
                  <div className="flex items-center justify-center h-36 text-muted-foreground text-sm">
                    Nenhuma transação confirmada ainda
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={typeBreakdown} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                        <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={75} />
                        <Tooltip formatter={(val: number) => [`Kz ${val.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}`, 'Total']} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                        <Bar dataKey="value" fill="#4A90A4" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-3 space-y-1.5">
                      {typeBreakdown.map(item => {
                        const pct = Math.round((item.value / (totalAmount || 1)) * 100)
                        return (
                          <div key={item.name} className="flex items-center gap-2 text-xs">
                            <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-[#4A90A4] rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="w-20 text-right text-muted-foreground font-medium">{item.name} {pct}%</span>
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

        {/* ── Filters ──────────────────────────────────────────────────────── */}
        {!isGuest && (
          <Card className="p-4 border">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm text-foreground">Filtros</h3>
              {pendingCount > 0 && (
                <span className="ml-auto flex items-center gap-1.5 px-2.5 py-1 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-full text-xs font-semibold text-yellow-700 dark:text-yellow-300">
                  <Clock className="h-3 w-3" />{pendingCount} pendente{pendingCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="grid sm:grid-cols-4 gap-3">
              <Select value={filters.type} onValueChange={v => setFilters(f => ({ ...f, type: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="tithe">Dízimo</SelectItem>
                  <SelectItem value="offering">Oferta</SelectItem>
                  <SelectItem value="donation">Doação</SelectItem>
                  <SelectItem value="project">Projeto</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.status} onValueChange={v => setFilters(f => ({ ...f, status: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os estados</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="completed">Confirmado</SelectItem>
                  <SelectItem value="failed">Falhou</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} className="h-9 text-sm" />
              <Input type="date" value={filters.dateTo}   onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}   className="h-9 text-sm" />
            </div>
          </Card>
        )}

        {/* ── Transaction List ─────────────────────────────────────────────── */}
        {!isGuest && filteredTransactions.length > 0 && (
          <Card className="border overflow-hidden">
            <div className="p-4 border-b border-border flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg shadow-sm">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <h3 className="font-bold text-sm text-foreground">{isAdmin ? 'Todas as Transações' : 'Meu Histórico'}</h3>
              <span className="text-xs text-muted-foreground ml-auto">{filteredTransactions.length} transações</span>
            </div>
            <div className="divide-y divide-border">
              {filteredTransactions.map(tx => {
                const badge = STATUS_BADGE[tx.status] || STATUS_BADGE.pending
                const StatusIcon = badge.icon
                const createdAt = (tx as any).created_at || tx.createdAt
                return (
                  <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${tx.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30' : tx.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                        <QrCode className={`h-4 w-4 ${tx.status === 'completed' ? 'text-green-600' : tx.status === 'pending' ? 'text-yellow-600' : 'text-red-600'}`} />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground text-sm">{TYPE_LABELS[tx.type] || tx.type}</div>
                        <div className="text-xs text-muted-foreground">
                          {createdAt ? new Date(createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </div>
                        {tx.description && <div className="text-xs text-muted-foreground mt-0.5">{tx.description}</div>}
                        {tx.paymentReference && <div className="text-xs font-mono text-muted-foreground mt-0.5">Ref: {tx.paymentReference}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <div className="font-bold text-green-600 dark:text-green-400 text-sm">Kz {tx.amount.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 mt-0.5 ${badge.color}`}>
                          <StatusIcon className="h-2.5 w-2.5" />{badge.label}
                        </span>
                      </div>
                      {(isAdmin || (tx as any).user_id === user?.id) && (
                        <button onClick={() => deleteTransaction(tx.id)} className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-950/20 text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all">
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

        {/* ── Guest / Empty ─────────────────────────────────────────────────── */}
        {isGuest && (
          <GuestPrompt title="Faça parte da obra" description="Membros podem contribuir com dízimos, ofertas e doações via Multicaixa Express com confirmação automática." actionLabel="Criar Conta" onAction={() => navigate('/auth')} />
        )}

        {!isGuest && filteredTransactions.length === 0 && (
          <EmptyState icon={DollarSign} title="Nenhuma transação encontrada"
            description={filters.type !== 'all' || filters.dateFrom || filters.dateTo ? 'Ajuste os filtros' : 'Faça sua primeira contribuição'}
            action={<Button onClick={() => setDialogOpen(true)} className="bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white"><QrCode className="mr-2 h-4 w-4" />Nova Contribuição</Button>} />
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          PAYMENT DIALOG — Multi-step
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) resetDialog() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <div className="p-1.5 bg-[#0A2E4A] rounded-lg flex-shrink-0">
                <QrCode className="h-4 w-4 text-white" />
              </div>
              {paymentState.step === 'form'      && 'Nova Contribuição'}
              {paymentState.step === 'reference' && 'Referência de Pagamento'}
              {paymentState.step === 'success'   && 'Pagamento Confirmado!'}
              {paymentState.step === 'failed'    && 'Pagamento Não Confirmado'}
            </DialogTitle>
          </DialogHeader>

          {/* ── STEP 1: Form ──────────────────────────────────────────────── */}
          {paymentState.step === 'form' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                  Pagamento seguro via <strong>Multicaixa Express</strong> (Angola)
                </p>
              </div>

              <div>
                <Label className="font-semibold mb-2 block text-sm">Tipo de Contribuição *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['tithe', 'offering', 'donation', 'project'] as const).map(tp => (
                    <button key={tp} onClick={() => setNewTx(n => ({ ...n, type: tp }))}
                      className={`p-3 rounded-xl border-2 text-left text-sm font-semibold transition-all ${newTx.type === tp ? 'border-[#0A2E4A] bg-[#0A2E4A]/8 dark:bg-[#4A90A4]/10 text-[#0A2E4A] dark:text-[#7bbdd4]' : 'border-border hover:border-primary/40 text-muted-foreground'}`}>
                      {TYPE_LABELS[tp]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="font-semibold mb-1.5 block text-sm">Valor (Kz) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground font-semibold text-sm">Kz</span>
                  <Input type="number" step="100" min="100" value={newTx.amount}
                    onChange={e => setNewTx(n => ({ ...n, amount: e.target.value }))}
                    placeholder="5.000,00" className="pl-10 h-10 text-base font-semibold" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Valor mínimo: Kz 100,00</p>
              </div>

              <div>
                <Label className="font-semibold mb-1.5 block text-sm">Observação (opcional)</Label>
                <Input value={newTx.description} onChange={e => setNewTx(n => ({ ...n, description: e.target.value }))}
                  placeholder="Ex: Dízimo de Junho 2026" className="h-10" />
              </div>

              {newTx.amount && parseFloat(newTx.amount) >= 100 && (
                <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl">
                  <p className="text-sm text-green-700 dark:text-green-300 font-semibold">
                    {TYPE_LABELS[newTx.type]} · <span className="text-base">Kz {parseFloat(newTx.amount).toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</span>
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button variant="outline" onClick={resetDialog} className="flex-1 h-10">Cancelar</Button>
                <Button onClick={generateReference} disabled={processingPayment || !newTx.amount || parseFloat(newTx.amount) < 100}
                  className="flex-1 h-10 bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-bold">
                  {processingPayment
                    ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />A gerar...</>
                    : <><ArrowRight className="h-4 w-4 mr-2" />Gerar Referência</>}
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Reference ─────────────────────────────────────────── */}
          {paymentState.step === 'reference' && (
            <div className="space-y-4">
              {/* Simulation badge */}
              {paymentState.isSimulation && (
                <div className="flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <WifiOff className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    <strong>Modo simulação</strong> — confirmação automática em ~30 segundos. Configure <code className="text-[10px] bg-amber-100 dark:bg-amber-900/40 px-1 rounded">MULTICAIXA_API_KEY</code> para modo real.
                  </p>
                </div>
              )}
              {!paymentState.isSimulation && (
                <div className="flex items-center gap-2 p-2.5 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <Wifi className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <p className="text-xs text-green-700 dark:text-green-300 font-medium">Modo de pagamento real activado</p>
                </div>
              )}

              {/* Summary */}
              <div className="p-3 bg-muted/40 rounded-xl border flex justify-between text-sm">
                <span className="text-muted-foreground">{TYPE_LABELS[paymentState.type]}</span>
                <span className="font-bold text-green-600">Kz {paymentState.amount.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</span>
              </div>

              {/* Reference box */}
              <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20 border-2 border-green-300 dark:border-green-700 rounded-2xl text-center space-y-3">
                <CheckCircle className="h-9 w-9 text-green-600 mx-auto" />
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Referência Multicaixa</p>
                  <p className="text-2xl font-black text-foreground font-mono tracking-widest">{paymentState.reference}</p>
                </div>
                <Button variant="outline" onClick={() => copyReference(paymentState.reference!)} className="w-full border-green-300 text-green-700 dark:text-green-300 hover:bg-green-50 text-sm">
                  <Copy className="h-4 w-4 mr-2" />Copiar Referência
                </Button>
              </div>

              {/* Instructions */}
              <ol className="space-y-1.5">
                {[
                  'Abra a app Multicaixa Express',
                  'Toque em "Pagamentos" → "Referência"',
                  `Insira a referência: ${paymentState.reference}`,
                  `Confirme o valor: Kz ${paymentState.amount.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}`,
                  'Autorize com o seu PIN',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <span className="flex-shrink-0 h-5 w-5 bg-[#0A2E4A] text-white text-xs font-bold rounded-full flex items-center justify-center mt-0.5">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-blue-500 animate-spin flex-shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-300">A verificar pagamento automaticamente a cada 10 seg...</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={resetDialog} className="flex-1 h-10">Fechar</Button>
                <Button onClick={checkStatusManually} disabled={checkingStatus} className="flex-1 h-10 bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-bold">
                  {checkingStatus
                    ? <><RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />Verificando...</>
                    : <><RefreshCw className="h-4 w-4 mr-1.5" />Verificar Agora</>}
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Success ───────────────────────────────────────────── */}
          {paymentState.step === 'success' && (
            <div className="text-center space-y-4 py-3">
              <div className="inline-flex p-5 bg-green-100 dark:bg-green-900/30 rounded-full">
                <CheckCircle className="h-14 w-14 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-foreground">Obrigado!</h3>
                <p className="text-muted-foreground text-sm mt-1">Contribuição confirmada com sucesso.</p>
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200 dark:border-green-800">
                  <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                    {TYPE_LABELS[paymentState.type]} · Kz {paymentState.amount.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic">"Cada um contribua segundo propôs no seu coração..." — 2 Cor 9:7</p>
              <Button onClick={resetDialog} className="w-full h-10 bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-bold">Fechar</Button>
            </div>
          )}

          {/* ── STEP 4: Failed ────────────────────────────────────────────── */}
          {paymentState.step === 'failed' && (
            <div className="text-center space-y-4 py-3">
              <div className="inline-flex p-5 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertCircle className="h-14 w-14 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Pagamento não confirmado</h3>
                <p className="text-muted-foreground text-sm mt-1">O pagamento não foi completado dentro do prazo.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetDialog} className="flex-1">Fechar</Button>
                <Button onClick={() => setPaymentState(p => ({ ...p, step: 'form' }))} className="flex-1 bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-bold">
                  Tentar Novamente
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  )
}

export default TreasuryPage
