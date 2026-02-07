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
import { DollarSign, CreditCard, QrCode, Building2, Filter, TrendingUp, UserPlus, Shield, PieChart } from 'lucide-react'
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
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    type: 'all',
    dateFrom: '',
    dateTo: '',
  })
  const [newTransaction, setNewTransaction] = useState({
    amount: '',
    type: 'tithe' as 'tithe' | 'offering' | 'donation' | 'project',
    method: 'pix' as 'credit_card' | 'debit_card' | 'pix' | 'transfer',
    description: '',
  })

  const isGuest = user?.role === 'guest'
  const isMember = user?.role === 'member'
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    loadTransactions()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [transactions, allTransactions, filters])

  const loadTransactions = async () => {
    setLoading(true)
    
    if (isAdmin) {
      // Admin vê TODAS as transações
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
      // Member/Admin vê suas próprias transações
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

    if (filters.dateFrom) {
      filtered = filtered.filter((t) => new Date(t.createdAt) >= new Date(filters.dateFrom))
    }

    if (filters.dateTo) {
      filtered = filtered.filter((t) => new Date(t.createdAt) <= new Date(filters.dateTo))
    }

    setFilteredTransactions(filtered)
  }

  const createTransaction = async () => {
    if (!newTransaction.amount || parseFloat(newTransaction.amount) <= 0) {
      toast.error('Valor inválido')
      return
    }

    const { error } = await supabase.from('transactions').insert({
      user_id: user!.id,
      amount: parseFloat(newTransaction.amount),
      type: newTransaction.type,
      method: newTransaction.method,
      status: 'completed',
      description: newTransaction.description,
    })

    if (error) {
      toast.error('Erro ao processar contribuição')
      return
    }

    toast.success('Contribuição registrada com sucesso!')
    setIsDialogOpen(false)
    setNewTransaction({
      amount: '',
      type: 'tithe',
      method: 'pix',
      description: '',
    })
    loadTransactions()
  }

  const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0)
  const totalTithes = filteredTransactions.filter(t => t.type === 'tithe').reduce((sum, t) => sum + t.amount, 0)
  const totalOfferings = filteredTransactions.filter(t => t.type === 'offering').reduce((sum, t) => sum + t.amount, 0)
  const totalDonations = filteredTransactions.filter(t => t.type === 'donation').reduce((sum, t) => sum + t.amount, 0)

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      tithe: 'Dízimo',
      offering: 'Oferta',
      donation: 'Doação',
      project: 'Projeto',
    }
    return labels[type] || type
  }

  const getMethodIcon = (method: string) => {
    const icons: Record<string, any> = {
      credit_card: CreditCard,
      debit_card: CreditCard,
      pix: QrCode,
      transfer: Building2,
    }
    return icons[method] || DollarSign
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
                  {isAdmin ? 'GESTÃO FINANCEIRA' : isGuest ? 'TESOURARIA MER' : 'GENEROSIDADE'}
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
                      A MER administra contribuições com integridade e transparência. Faça parte da obra.
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
                      Suas contribuições sustentam a obra e transformam vidas. Doe com responsabilidade e fé.
                    </p>
                  </>
                )}
                
                {isAdmin && (
                  <>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight flex items-center gap-3 md:gap-4 flex-wrap">
                      <Shield className="h-10 w-10 md:h-14 md:w-14 text-yellow-300" />
                      Dashboard Financeiro
                    </h1>
                    <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-medium leading-relaxed max-w-2xl">
                      Visão completa de entradas, distribuição e métricas em tempo real. Governo com clareza e integridade.
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
                        <DollarSign className="mr-2 h-5 w-5" />
                        Nova Contribuição
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
            </div>
          </div>

          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-yellow-400/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-white/10 to-transparent rounded-full blur-3xl" />
        </Card>

        {/* Stats - Contextual por Papel */}
        {!isGuest && (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            <StatCard
              icon={DollarSign}
              label={isAdmin ? "Total Geral" : "Suas Contribuições"}
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
              label="Doações"
              value={`Kz ${totalDonations.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}`}
              gradient="from-orange-600 to-red-600"
            />
          </div>
        )}

        {/* Filters - Apenas para Member/Admin */}
        {!isGuest && (
          <Card className="p-6 border-2 elevation-1">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-foreground text-lg">Filtros</h3>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
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
                const MethodIcon = getMethodIcon(transaction.method)
                
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors border-2 border-transparent hover:border-primary/20"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-xl">
                        <MethodIcon className="h-5 w-5 text-primary" />
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
                          <div className="text-xs text-muted-foreground">{transaction.description}</div>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-lg text-green-600 dark:text-green-400">
                        Kz {transaction.amount.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full inline-block ${
                        transaction.status === 'completed'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : transaction.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {transaction.status === 'completed' ? 'Concluído' : transaction.status === 'pending' ? 'Pendente' : 'Falhou'}
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
            description="Membros podem contribuir com dízimos, ofertas e doações de forma segura e transparente."
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
                <DollarSign className="mr-2 h-4 w-4" />
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
            <DialogTitle>Nova Contribuição</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Valor (Kz) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={newTransaction.amount}
                onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                placeholder="0,00"
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
              <Label htmlFor="method">Forma de Pagamento *</Label>
              <Select
                value={newTransaction.method}
                onValueChange={(value: any) => setNewTransaction({ ...newTransaction, method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                  <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                  <SelectItem value="transfer">Transferência</SelectItem>
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

            <Button onClick={createTransaction} className="w-full gradient-primary text-white">
              Confirmar Contribuição
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}

export default TreasuryPage
