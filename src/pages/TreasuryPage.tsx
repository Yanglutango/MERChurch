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
  ArrowRight, Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Transaction } from '../types'
import { StatCard } from '../components/shared/StatCard'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { GuestPrompt } from '../components/shared/GuestPrompt'
import { useRealTime } from '../hooks/useRealTime'
import { FunctionsHttpError } from '@supabase/supabase-js'

// ── Payment steps ─────────────────────────────────────────────────────────
type PaymentStep = 'form' | 'reference' | 'confirming' | 'success' | 'failed'

interface PaymentState {
  step: PaymentStep
  reference: string | null
  transactionId: string | null
  amount: number
  type: string
  expiresAt: string | null
}

const TYPE_LABELS: Record<string, string> = {
  tithe: 'Dízimo', offering: 'Oferta', donation: 'Doação', project: 'Projeto Especial',
}

const STATUS_BADGE: Record<string, { color: string; label: string; icon: any }> = {
  pending:   { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', label: 'Pendente',   icon: Clock        },
  completed: { color: 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-300',  label: 'Confirmado', icon: CheckCircle  },
  failed:    { color: 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-300',    label: 'Falhou',     icon: AlertCircle  },
}

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
  const [pollingInterval, setPollingInterval]     = useState<ReturnType<typeof setInterval> | null>(null)

  const [paymentState, setPaymentState] = useState<PaymentState>({
    step: 'form', reference: null, transactionId: null, amount: 0, type: 'tithe', expiresAt: null,
  })

  const [newTx, setNewTx] = useState({ amount: '', type: 'tithe' as const, description: '' })
  const [filters, setFilters] = useState({ type: 'all', status: 'all', dateFrom: '', dateTo: '' })

  const isGuest  = user?.role === 'guest'
  const isMember = user?.role === 'member'
  const isAdmin  = user?.role === 'admin'

  // ── Load ────────────────────────────────────────────────────────────────
  useEffect(() => { if (!isGuest) loadTransactions() }, [version])
  useEffect(() => { applyFilters() }, [transactions, allTransactions, filters])

  // Stop polling on unmount
  useEffect(() => () => { if (pollingInterval) clearInterval(pollingInterval) }, [pollingInterval])

  const loadTransactions = async () => {
    setLoading(true)
    if (isAdmin) {
      const { data } = await supabase.from('transactions').select('*').order('created_at', { ascending: false })
      setAllTransactions(data || [])
    }
    const { data } = await supabase.from('transactions').select('*').eq('user_id', user!.id).order('created_at', { ascending: false })
    setTransactions(data || [])
    setLoading(false)
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

  // ── Generate Reference ──────────────────────────────────────────────────
  const generateReference = async () => {
    const amount = parseFloat(newTx.amount)
    if (!amount || amount <= 0) { toast.error('Insira um valor válido'); return }
    if (amount < 100) { toast.error('O valor mínimo é Kz 100,00'); return }

    setProcessingPayment(true)
    try {
      const { data, error } = await supabase.functions.invoke('multicaixa-payment', {
        body: { action: 'generate', userId: user!.id, amount, type: newTx.type, description: newTx.description },
      })

      if (error) {
        let msg = error.message
        if (error instanceof FunctionsHttpError) {
          try { msg = await error.context?.text() || msg } catch { /* ignore */ }
        }
        throw new Error(msg)
      }

      setPaymentState({
        step: 'reference',
        reference: data.reference,
        transactionId: data.transactionId,
        amount,
        type: newTx.type,
        expiresAt: data.expiresAt || null,
      })

      toast.success('Referência gerada! Efectue o pagamento na app Multicaixa.')
      startPolling(data.transactionId)
    } catch (err: any) {
      console.error('[Treasury] Generate error:', err)
      toast.error(err.message || 'Erro ao gerar referência. Tente novamente.')
    } finally {
      setProcessingPayment(false)
    }
  }

  // ── Polling — check payment status every 10s for 10 min ─────────────────
  const startPolling = (txId: string) => {
    if (pollingInterval) clearInterval(pollingInterval)
    const maxAttempts = 60 // 10 min
    let attempts = 0

    const interval = setInterval(async () => {
      attempts++
      if (attempts > maxAttempts) {
        clearInterval(interval)
        setPollingInterval(null)
        return
      }
      const { data } = await supabase.from('transactions').select('status').eq('id', txId).single()
      if (data?.status === 'completed') {
        clearInterval(interval)
        setPollingInterval(null)
        setPaymentState(prev => ({ ...prev, step: 'success' }))
        loadTransactions()
        toast.success('Pagamento confirmado! Obrigado pela sua contribuição! 🙏')
      } else if (data?.status === 'failed') {
        clearInterval(interval)
        setPollingInterval(null)
        setPaymentState(prev => ({ ...prev, step: 'failed' }))
        toast.error('Pagamento não confirmado. Tente novamente.')
      }
    }, 10_000)

    setPollingInterval(interval)
  }

  // ── Manual status check ─────────────────────────────────────────────────
  const checkStatusManually = async () => {
    if (!paymentState.transactionId) return
    setCheckingStatus(true)
    const { data } = await supabase.from('transactions').select('status').eq('id', paymentState.transactionId).single()
    if (data?.status === 'completed') {
      setPaymentState(prev => ({ ...prev, step: 'success' }))
      if (pollingInterval) { clearInterval(pollingInterval); setPollingInterval(null) }
      loadTransactions()
      toast.success('Pagamento confirmado! 🙏')
    } else if (data?.status === 'failed') {
      setPaymentState(prev => ({ ...prev, step: 'failed' }))
      toast.error('Pagamento não confirmado.')
    } else {
      toast.info('Pagamento ainda pendente. Continue aguardando.')
    }
    setCheckingStatus(false)
  }

  const resetDialog = () => {
    if (pollingInterval) { clearInterval(pollingInterval); setPollingInterval(null) }
    setPaymentState({ step: 'form', reference: null, transactionId: null, amount: 0, type: 'tithe', expiresAt: null })
    setNewTx({ amount: '', type: 'tithe', description: '' })
    setDialogOpen(false)
  }

  const copyReference = (ref: string) => {
    navigator.clipboard.writeText(ref)
    toast.success('Referência copiada!')
  }

  const deleteTransaction = async (id: string) => {
    const { data, error } = await supabase.from('transactions').delete().eq('id', id).select('id')
    if (error || !data?.length) { toast.error('Sem permissão para remover'); return }
    toast.success('Transacção removida')
    loadTransactions()
  }

  // ── Computed stats ───────────────────────────────────────────────────────
  const completed = filteredTransactions.filter(t => t.status === 'completed')
  const totalAmount   = completed.reduce((s, t) => s + t.amount, 0)
  const totalTithes   = completed.filter(t => t.type === 'tithe').reduce((s, t) => s + t.amount, 0)
  const totalOfferings= completed.filter(t => t.type === 'offering').reduce((s, t) => s + t.amount, 0)
  const totalDonations= completed.filter(t => t.type === 'donation').reduce((s, t) => s + t.amount, 0)
  const pendingCount  = filteredTransactions.filter(t => t.status === 'pending').length

  if (loading) return <Layout title="Tesouraria"><LoadingState fullScreen message="Carregando informações financeiras..." /></Layout>

  return (
    <Layout title="Tesouraria">
      <div className="space-y-6">

        {/* ── Hero Banner ─────────────────────────────────────────────────── */}
        <Card className="relative overflow-hidden border-0 shadow-2xl rounded-2xl">
          <div className="absolute inset-0">
            <img src="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1920&h=600&fit=crop&q=80" alt="Treasury" className="w-full h-full object-cover opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#0A2E4A]/96 via-[#1a4d6d]/94 to-[#4A90A4]/92" />
          </div>
          <div className="relative z-10 p-6 md:p-10 lg:p-14 text-white">
            <div className="max-w-4xl space-y-5">
              <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-white/20 backdrop-blur-md rounded-full border border-white/30">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm font-bold tracking-wide">
                  {isAdmin ? 'GESTÃO FINANCEIRA' : isGuest ? 'TESOURARIA MER' : 'GENEROSIDADE'}
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black leading-tight">
                {isGuest  && <>Generosidade e <span className="bg-gradient-to-r from-white via-yellow-200 to-white bg-clip-text text-transparent">Transparência</span></>}
                {isMember && <>Contribua com <span className="bg-gradient-to-r from-white via-yellow-200 to-white bg-clip-text text-transparent">Gratidão</span></>}
                {isAdmin  && <><Shield className="inline h-10 w-10 text-yellow-300 mr-3" />Dashboard Financeiro</>}
              </h1>
              <p className="text-lg text-white/90 max-w-2xl">
                {isGuest  && 'A MER administra contribuições com integridade. Veja os dados reais e faça parte da obra.'}
                {isMember && 'Contribuições seguras via Multicaixa Express. Confirmação automática e transparente.'}
                {isAdmin  && 'Visão completa das entradas, confirmações automáticas e métricas em tempo real.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                {!isGuest && (
                  <Button size="lg" onClick={() => { setPaymentState(p => ({ ...p, step: 'form' })); setDialogOpen(true) }}
                    className="bg-white text-[#0A2E4A] hover:bg-white/90 font-bold px-7 py-6 rounded-full shadow-lg">
                    <QrCode className="mr-2 h-5 w-5" />Nova Contribuição (Multicaixa)
                  </Button>
                )}
                {isGuest && (
                  <Button size="lg" onClick={() => navigate('/auth')} className="bg-white text-[#0A2E4A] hover:bg-white/90 font-bold px-7 py-6 rounded-full shadow-lg">
                    <UserPlus className="mr-2 h-5 w-5" />Criar Conta para Contribuir
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-yellow-400/20 to-transparent rounded-full blur-3xl" />
        </Card>

        {/* ── Stats ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={DollarSign}  label={isAdmin ? 'Total Confirmado' : 'Minhas Contribuições'} value={`Kz ${totalAmount.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}`}    gradient="from-green-600 to-emerald-600" />
          <StatCard icon={TrendingUp}  label="Dízimos"    value={`Kz ${totalTithes.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}`}    gradient="from-blue-600 to-cyan-600" />
          <StatCard icon={PieChart}    label="Ofertas"    value={`Kz ${totalOfferings.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}`}  gradient="from-purple-600 to-pink-600" />
          <StatCard icon={Building2}   label="Doações"    value={`Kz ${totalDonations.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}`}  gradient="from-orange-600 to-red-600" />
        </div>

        {/* ── Filters ─────────────────────────────────────────────────────── */}
        {!isGuest && (
          <Card className="p-5 border">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-foreground">Filtros</h3>
              {pendingCount > 0 && (
                <span className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-full text-xs font-semibold text-yellow-700 dark:text-yellow-300">
                  <Clock className="h-3.5 w-3.5" />{pendingCount} pendente{pendingCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="grid sm:grid-cols-4 gap-3">
              <Select value={filters.type} onValueChange={v => setFilters(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="tithe">Dízimo</SelectItem>
                  <SelectItem value="offering">Oferta</SelectItem>
                  <SelectItem value="donation">Doação</SelectItem>
                  <SelectItem value="project">Projeto</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.status} onValueChange={v => setFilters(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os estados</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="completed">Confirmado</SelectItem>
                  <SelectItem value="failed">Falhou</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} className="h-10" />
              <Input type="date" value={filters.dateTo}   onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}   className="h-10" />
            </div>
          </Card>
        )}

        {/* ── Transactions List ────────────────────────────────────────────── */}
        {!isGuest && filteredTransactions.length > 0 && (
          <Card className="border overflow-hidden">
            <div className="p-4 border-b border-border flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg shadow-sm">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <h3 className="font-bold text-foreground">{isAdmin ? 'Todas as Transações' : 'Meu Histórico'}</h3>
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
                      <div className={`p-2.5 rounded-xl ${tx.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30' : tx.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                        <QrCode className={`h-4 w-4 ${tx.status === 'completed' ? 'text-green-600' : tx.status === 'pending' ? 'text-yellow-600' : 'text-red-600'}`} />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground text-sm">{TYPE_LABELS[tx.type] || tx.type}</div>
                        <div className="text-xs text-muted-foreground">
                          {createdAt ? new Date(createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </div>
                        {tx.description && <div className="text-xs text-muted-foreground mt-0.5">{tx.description}</div>}
                        {tx.paymentReference && <div className="text-xs text-muted-foreground font-mono mt-0.5">Ref: {tx.paymentReference}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <div className="font-bold text-green-600 dark:text-green-400">Kz {tx.amount.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</div>
                        <span className={`text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 mt-0.5 ${badge.color}`}>
                          <StatusIcon className="h-3 w-3" />{badge.label}
                        </span>
                      </div>
                      {(isAdmin || tx.userId === user?.id) && (
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

        {/* ── Guest Prompt ─────────────────────────────────────────────────── */}
        {isGuest && (
          <GuestPrompt title="Faça parte da obra" description="Membros podem contribuir com dízimos, ofertas e doações via Multicaixa Express com confirmação automática." actionLabel="Criar Conta" onAction={() => navigate('/auth')} />
        )}

        {!isGuest && filteredTransactions.length === 0 && (
          <EmptyState icon={DollarSign} title="Nenhuma transação encontrada"
            description={filters.type !== 'all' || filters.dateFrom || filters.dateTo ? 'Tente ajustar os filtros' : 'Faça sua primeira contribuição'}
            action={<Button onClick={() => setDialogOpen(true)} className="gradient-primary text-white"><QrCode className="mr-2 h-4 w-4" />Nova Contribuição</Button>} />
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          PAYMENT DIALOG — Multi-step
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) resetDialog() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="p-1.5 bg-[#0A2E4A] rounded-lg">
                <QrCode className="h-4 w-4 text-white" />
              </div>
              {paymentState.step === 'form'       && 'Nova Contribuição'}
              {paymentState.step === 'reference'  && 'Referência de Pagamento'}
              {paymentState.step === 'confirming' && 'A verificar...'}
              {paymentState.step === 'success'    && 'Pagamento Confirmado!'}
              {paymentState.step === 'failed'     && 'Pagamento Não Confirmado'}
            </DialogTitle>
          </DialogHeader>

          {/* ── STEP 1: Form ────────────────────────────────────────────── */}
          {paymentState.step === 'form' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-blue-600" />
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                    Pagamento seguro via <strong>Multicaixa Express</strong> (Angola)
                  </p>
                </div>
              </div>

              <div>
                <Label className="font-semibold mb-1.5 block">Tipo de Contribuição *</Label>
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
                <Label className="font-semibold mb-1.5 block">Valor (Kz) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-muted-foreground font-semibold text-sm">Kz</span>
                  <Input type="number" step="100" min="100" value={newTx.amount}
                    onChange={e => setNewTx(n => ({ ...n, amount: e.target.value }))}
                    placeholder="5.000,00" className="pl-10 h-11 text-base font-semibold" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Valor mínimo: Kz 100,00</p>
              </div>

              <div>
                <Label className="font-semibold mb-1.5 block">Observação (opcional)</Label>
                <Input value={newTx.description} onChange={e => setNewTx(n => ({ ...n, description: e.target.value }))}
                  placeholder="Ex: Dízimo de Maio 2026" className="h-11" />
              </div>

              {newTx.amount && parseFloat(newTx.amount) >= 100 && (
                <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl">
                  <p className="text-sm text-green-700 dark:text-green-300 font-semibold">
                    Resumo: {TYPE_LABELS[newTx.type]} de{' '}
                    <span className="text-lg">Kz {parseFloat(newTx.amount).toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</span>
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button variant="outline" onClick={resetDialog} className="flex-1 h-11">Cancelar</Button>
                <Button onClick={generateReference} disabled={processingPayment || !newTx.amount || parseFloat(newTx.amount) < 100}
                  className="flex-1 h-11 bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-bold">
                  {processingPayment ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />A gerar...</> : <><ArrowRight className="h-4 w-4 mr-2" />Gerar Referência</>}
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Reference ───────────────────────────────────────── */}
          {paymentState.step === 'reference' && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="p-4 bg-muted/40 rounded-xl border">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Tipo</span>
                  <span className="font-semibold text-foreground">{TYPE_LABELS[paymentState.type]}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor</span>
                  <span className="font-bold text-green-600 text-base">Kz {paymentState.amount.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Reference box */}
              <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20 border-2 border-green-300 dark:border-green-700 rounded-2xl text-center space-y-3">
                <CheckCircle className="h-10 w-10 text-green-600 mx-auto" />
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Referência Multicaixa</p>
                  <p className="text-3xl font-black text-foreground font-mono tracking-widest">{paymentState.reference}</p>
                </div>
                <Button variant="outline" onClick={() => copyReference(paymentState.reference!)} className="w-full border-green-300 text-green-700 dark:text-green-300 hover:bg-green-50">
                  <Copy className="h-4 w-4 mr-2" />Copiar Referência
                </Button>
              </div>

              {/* Instructions */}
              <div className="space-y-2">
                <p className="text-sm font-bold text-foreground">Como pagar:</p>
                <ol className="space-y-1.5">
                  {['Abra a app Multicaixa Express no seu telemóvel', 'Toque em "Pagamentos" → "Referência"', `Insira a referência: ${paymentState.reference}`, `Confirme o valor: Kz ${paymentState.amount.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}`, 'Autorize com o seu PIN'].map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <span className="flex-shrink-0 h-5 w-5 bg-[#0A2E4A] text-white text-xs font-bold rounded-full flex items-center justify-center mt-0.5">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Polling indicator */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                <p className="text-xs text-blue-700 dark:text-blue-300">A verificar pagamento automaticamente a cada 10 segundos...</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={resetDialog} className="flex-1">Fechar</Button>
                <Button onClick={checkStatusManually} disabled={checkingStatus} className="flex-1 bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-bold">
                  {checkingStatus ? <><RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />A verificar...</> : <><RefreshCw className="h-4 w-4 mr-1.5" />Verificar Agora</>}
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Success ─────────────────────────────────────────── */}
          {paymentState.step === 'success' && (
            <div className="text-center space-y-5 py-4">
              <div className="inline-flex p-5 bg-green-100 dark:bg-green-900/30 rounded-full">
                <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-foreground">Obrigado!</h3>
                <p className="text-muted-foreground mt-1">Sua contribuição foi confirmada com sucesso.</p>
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200 dark:border-green-800">
                  <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                    {TYPE_LABELS[paymentState.type]} · Kz {paymentState.amount.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic">"Cada um contribua segundo propôs no seu coração..." — 2 Coríntios 9:7</p>
              <Button onClick={resetDialog} className="w-full h-11 bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-bold">Fechar</Button>
            </div>
          )}

          {/* ── STEP 4: Failed ──────────────────────────────────────────── */}
          {paymentState.step === 'failed' && (
            <div className="text-center space-y-5 py-4">
              <div className="inline-flex p-5 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertCircle className="h-16 w-16 text-red-600 dark:text-red-400" />
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
