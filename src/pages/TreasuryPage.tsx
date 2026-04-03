import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useAppStore } from '../stores/appStore'
import { DollarSign, CreditCard, QrCode, Building2, Filter, TrendingUp, UserPlus, Shield, PieChart, CheckCircle, Clock, Copy, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { Transaction } from '../types'
import { StatCard } from '../components/shared/StatCard'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { GuestPrompt } from '../components/shared/GuestPrompt'

const TreasuryPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useAppStore()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [paymentReference, setPaymentReference] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    dateFrom: '',
    dateTo: '',
  })
  const [newTransaction, setNewTransaction] = useState({
    amount: '',
    type: 'tithe' as 'tithe' | 'offering' | 'donation' | 'project',
    description: '',
  })

  const isGuest = user?.role === 'guest'
  const isMember = user?.role === 'member'
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    loadTransactions()
    
    // Poll for transaction updates every 30 seconds
    const interval = setInterval(() => {
      if (!isGuest) loadTransactions()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    applyFilters()
  }, [transactions, allTransactions, filters])

  const loadTransactions = async () => {
    setLoading(true)
    
    if (isAdmin) {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading all transactions:', error)
      } else {
        setAllTransactions(data)
      }
    }

    if (!isGuest) {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading user transactions:', error)
      } else {
        setTransactions(data)
      }
    }

    setLoading(false)
  }

  const applyFilters = () => {
    const source = isAdmin ? allTransactions : transactions
    let filtered = [...source]

    if (filters.type !== 'all') {
      filtered = filtered.filter((t) => t.type === filters.type)
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter((t) => t.status === filters.status)
    }

    if (filters.dateFrom) {
      filtered = filtered.filter((t) => new Date(t.createdAt) >= new Date(filters.dateFrom))
    }

    if (filters.dateTo) {
      filtered = filtered.filter((t) => new Date(t.createdAt) <= new Date(filters.dateTo))
    }

    setFilteredTransactions(filtered)
  }

  const generatePaymentReference = async () => {
    if (!newTransaction.amount || parseFloat(newTransaction.amount) <= 0) {
      toast.error('Valor inválido')
      return
    }

    setProcessingPayment(true)
    try {
      const { data, error } = await supabase.functions.invoke('multicaixa-payment', {
        body: {
          userId: user!.id,
          amount: parseFloat(newTransaction.amount),
          type: newTransaction.type,
          description: newTransaction.description,
        },
      })

      if (error) throw error

      setPaymentReference(data.reference)
      setIsDialogOpen(false)
      setIsPaymentDialogOpen(true)
      toast.success('Referência de pagamento gerada!')
      
      loadTransactions()
    } catch (error: any) {
      console.error('Payment generation error:', error)
      toast.error('Erro ao gerar referência de pagamento')
    } finally {
      setProcessingPayment(false)
    }
  }

  const copyReference = () => {
    if (paymentReference) {
      navigator.clipboard.writeText(paymentReference)
      toast.success('Referência copiada!')
    }
  }

  const totalAmount = filteredTransactions
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0)
  const totalTithes = filteredTransactions
    .filter(t => t.type === 'tithe' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0)
  const totalOfferings = filteredTransactions
    .filter(t => t.type === 'offering' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0)
  const totalDonations = filteredTransactions
    .filter(t => t.type === 'donation' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0)
  const pendingCount = filteredTransactions.filter(t => t.status === 'pending').length

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      tithe: 'Dízimo',
      offering: 'Oferta',
      donation: 'Doação',
      project: 'Projeto',
    }
    return labels[type] || type
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string; icon: any }> = {
      pending: { 
        color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', 
        label: 'Pendente',
        icon: Clock
      },
      completed: { 
        color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', 
        label: 'Confirmado',
        icon: CheckCircle
      },
      failed: { 
        color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', 
        label: 'Falhou',
        icon: AlertCircle
      },
    }
    return badges[status] || badges.pending
  }

  if (loading) {
    return (
      <Layout title="Tesouraria">
        <LoadingState fullScreen message="Carregando informações financeiras..." />
      </Layout>
    )
  }

  return (
    <Layout title="Tesouraria">
      <div className="space-y-6">
        {/* Hero Banner - Contextual por Papel */}
        <Card className="relative overflow-hidden border-0 shadow-2xl rounded-2xl elevation-3">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1920&h=600&fit=crop&q=80"
              alt="Treasury"
              className="w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-green-800/96 via-emerald-800/94 to-teal-800/92" />
          </div>
          
          <div className="relative z-10 p-6 md:p-10 lg:p-14 text-white">
            <div className="max-w-4xl space-y-5 md:space-y-7">
              <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-white/20 backdrop-blur-md rounded-full border border-white/30 shadow-lg">
                <DollarSign className="h-4 w-4 md:h-5 md:w-5" />
                <span className="text-sm md:text-base font-bold tracking-wide">
                  {isAdmin ? 'GESTÃO FINANCEIRA REAL' : isGuest ? 'TESOURARIA MER' : 'GENEROSIDADE'}
                </span>
              </div>

              <div className="space-y-4">
                {isGuest && (
                  <>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight">
                      Generosidade e{' '}
                      <span className="bg-gradient-to-r from-white via-yellow-200 to-white bg-clip-text text-transparent">
                        Transparência
                      </span>
                    </h1>
                    <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-medium leading-relaxed max-w-2xl">
                      A MER administra contribuições com integridade absoluta. Veja nossos números reais e faça parte da obra.
                    </p>
                  </>
                )}
                
                {isMember && (
                  <>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight">
                      Contribua com{' '}
                      <span className="bg-gradient-to-r from-white via-yellow-200 to-white bg-clip-text text-transparent">
                        Gratidão
                      </span>
                    </h1>
                    <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-medium leading-relaxed max-w-2xl">
                      Suas contribuições via Multicaixa Express sustentam a obra e transformam vidas. Seguro, rápido e confirmado automaticamente.
                    </p>
                  </>
                )}
                
                {isAdmin && (
                  <>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight flex items-center gap-3 md:gap-4 flex-wrap">
                      <Shield className="h-10 w-10 md:h-14 md:w-14 text-yellow-300" />
                      Dashboard Financeiro Real
                    </h1>
                    <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-medium leading-relaxed max-w-2xl">
                      Visão completa de entradas, confirmações automáticas e métricas atualizadas em tempo real. Governo com clareza e integridade.
                    </p>
                  </>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {!isGuest && (
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        size="lg"
                        className="bg-white text-green-800 hover:bg-white/95 font-bold px-7 py-6 rounded-full shadow-2xl transform hover:scale-105 transition-all"
                      >
                        <QrCode className="mr-2 h-5 w-5" />
                        Nova Contribuição (Multicaixa)
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                )}
                {isGuest && (
                  <Button
                    size="lg"
                    onClick={() => navigate('/auth')}
                    className="bg-white text-green-800 hover:bg-white/95 font-bold px-7 py-6 rounded-full shadow-2xl transform hover:scale-105 transition-all"
                  >
                    <UserPlus className="mr-2 h-5 w-5" />
                    Criar Conta para Contribuir
                  </Button>
                )}
              </div>

              {isGuest && (
                <div className="p-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl">
                  <p className="text-sm text-white/90">
                    ✓ Pagamentos processados via <strong>Multicaixa Express</strong> (oficial Angola)<br/>
                    ✓ Confirmação automática em tempo real<br/>
                    ✓ Transparência total com dados verificáveis
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-yellow-400/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-white/10 to-transparent rounded-full blur-3xl" />
        </Card>

        {/* Stats - Contextual por Papel */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          <StatCard
            icon={DollarSign}
            label={isAdmin ? "Total Confirmado" : isGuest ? "Total do Mês" : "Suas Contribuições"}
            value={`Kz ${totalAmount.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}`}
            gradient="from-green-600 to-emerald-600"
          />
          <StatCard
            icon={TrendingUp}
            label="Dízimos"
            value={`Kz ${totalTithes.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}`}
            gradient="from-blue-600 to-cyan-600"
          />
          <StatCard
            icon={PieChart}
            label="Ofertas"
            value={`Kz ${totalOfferings.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}`}
            gradient="from-purple-600 to-pink-600"
          />
          <StatCard
            icon={Building2}
            label={isGuest ? "Projetos Apoiados" : "Doações"}
            value={isGuest ? "3 Ativos" : `Kz ${totalDonations.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}`}
            gradient="from-orange-600 to-red-600"
          />
        </div>

        {/* Filters - Apenas para Member/Admin */}
        {!isGuest && (
          <Card className="p-6 border-2 elevation-1">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-foreground text-lg">Filtros</h3>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="tithe">Dízimo</SelectItem>
                    <SelectItem value="offering">Oferta</SelectItem>
                    <SelectItem value="donation">Doação</SelectItem>
                    <SelectItem value="project">Projeto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="completed">Confirmado</SelectItem>
                    <SelectItem value="failed">Falhou</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Data Inicial</Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                />
              </div>

              <div>
                <Label>Data Final</Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                />
              </div>
            </div>

            {pendingCount > 0 && (
              <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-700 dark:text-yellow-300" />
                <span className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">
                  {pendingCount} {pendingCount === 1 ? 'pagamento pendente' : 'pagamentos pendentes'} de confirmação
                </span>
              </div>
            )}
          </Card>
        )}

        {/* Transactions List - Apenas para Member/Admin */}
        {!isGuest && filteredTransactions.length > 0 && (
          <Card className="p-6 border-2 elevation-1">
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl shadow-md">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              {isAdmin ? 'Todas as Transações' : 'Seu Histórico'}
            </h3>

            <div className="space-y-3">
              {filteredTransactions.map((transaction) => {
                const badge = getStatusBadge(transaction.status)
                const StatusIcon = badge.icon
                
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors border-2 border-transparent hover:border-primary/20"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${
                        transaction.status === 'completed' 
                          ? 'bg-green-100 dark:bg-green-900/20' 
                          : transaction.status === 'pending'
                          ? 'bg-yellow-100 dark:bg-yellow-900/20'
                          : 'bg-red-100 dark:bg-red-900/20'
                      }`}>
                        <QrCode className={`h-5 w-5 ${
                          transaction.status === 'completed'
                            ? 'text-green-600 dark:text-green-400'
                            : transaction.status === 'pending'
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-red-600 dark:text-red-400'
                        }`} />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{getTypeLabel(transaction.type)}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(transaction.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        {transaction.description && (
                          <div className="text-xs text-muted-foreground mt-0.5">{transaction.description}</div>
                        )}
                        {transaction.paymentReference && (
                          <div className="text-xs text-muted-foreground mt-1 font-mono">
                            Ref: {transaction.paymentReference}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-lg text-green-600 dark:text-green-400">
                        Kz {transaction.amount.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full inline-flex items-center gap-1 ${badge.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {badge.label}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* Guest Prompt */}
        {isGuest && (
          <GuestPrompt
            title="Faça parte da obra"
            description="Membros podem contribuir com dízimos, ofertas e doações de forma segura via Multicaixa Express com confirmação automática."
            actionLabel="Criar Conta"
            onAction={() => navigate('/auth')}
          />
        )}

        {/* Empty State - Member/Admin sem transações */}
        {!isGuest && filteredTransactions.length === 0 && (
          <EmptyState
            icon={DollarSign}
            title="Nenhuma transação encontrada"
            description={filters.type !== 'all' || filters.dateFrom || filters.dateTo ? 'Tente ajustar os filtros' : 'Faça sua primeira contribuição'}
            action={
              <Button onClick={() => setIsDialogOpen(true)} className="gradient-primary text-white">
                <QrCode className="mr-2 h-4 w-4" />
                Nova Contribuição
              </Button>
            }
          />
        )}
      </div>

      {/* Transaction Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Contribuição via Multicaixa Express</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                💳 Pagamento seguro processado pela <strong>Multicaixa Express</strong> (Angola)
              </p>
            </div>

            <div>
              <Label htmlFor="amount">Valor (Kz) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={newTransaction.amount}
                onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                placeholder="5000.00"
              />
            </div>

            <div>
              <Label htmlFor="type">Tipo *</Label>
              <Select
                value={newTransaction.type}
                onValueChange={(value: any) => setNewTransaction({ ...newTransaction, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tithe">Dízimo</SelectItem>
                  <SelectItem value="offering">Oferta</SelectItem>
                  <SelectItem value="donation">Doação</SelectItem>
                  <SelectItem value="project">Projeto Especial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Descrição (Opcional)</Label>
              <Input
                id="description"
                value={newTransaction.description}
                onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                placeholder="Observações..."
              />
            </div>

            <Button 
              onClick={generatePaymentReference} 
              disabled={processingPayment}
              className="w-full gradient-primary text-white"
            >
              {processingPayment ? 'Gerando referência...' : 'Gerar Referência de Pagamento'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Reference Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Referência de Pagamento Gerada</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl">
              <div className="text-center space-y-3">
                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto" />
                <h3 className="text-xl font-bold text-green-700 dark:text-green-300">Referência Gerada!</h3>
                
                <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-xs text-muted-foreground mb-1">REFERÊNCIA MULTICAIXA</p>
                  <p className="text-2xl font-bold text-foreground font-mono tracking-wider">
                    {paymentReference}
                  </p>
                  <Button
                    onClick={copyReference}
                    variant="ghost"
                    size="sm"
                    className="mt-2 w-full"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Referência
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <h4 className="font-semibold text-foreground">Como Pagar:</h4>
              <ol className="list-decimal list-inside space-y-1">
                <li>Acesse sua app <strong>Multicaixa Express</strong></li>
                <li>Selecione <strong>Pagamentos</strong></li>
                <li>Insira a referência acima</li>
                <li>Confirme o pagamento</li>
              </ol>
              <p className="text-xs pt-2 text-green-600 dark:text-green-400">
                ✓ Sua contribuição será confirmada automaticamente após o pagamento
              </p>
            </div>

            <Button
              onClick={() => {
                setIsPaymentDialogOpen(false)
                setPaymentReference(null)
                setNewTransaction({ amount: '', type: 'tithe', description: '' })
              }}
              className="w-full"
            >
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}

export default TreasuryPage
