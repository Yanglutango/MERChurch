import { useState, useEffect } from 'react'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { DollarSign, CreditCard, QrCode, Building2, Filter, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import type { Transaction } from '../types'

const TreasuryPage = () => {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [filters, setFilters] = useState({
    type: 'all',
    dateFrom: '',
    dateTo: '',
    minAmount: '',
    maxAmount: '',
  })
  const [newTransaction, setNewTransaction] = useState({
    amount: '',
    type: 'tithe' as 'tithe' | 'offering' | 'donation' | 'project',
    method: 'pix' as 'credit_card' | 'debit_card' | 'pix' | 'transfer',
    description: '',
  })

  useEffect(() => {
    loadTransactions()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [transactions, filters])

  const loadTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading transactions:', error)
      return
    }

    setTransactions(data)
  }

  const applyFilters = () => {
    let filtered = [...transactions]

    if (filters.type !== 'all') {
      filtered = filtered.filter((t) => t.type === filters.type)
    }

    if (filters.dateFrom) {
      filtered = filtered.filter((t) => new Date(t.createdAt) >= new Date(filters.dateFrom))
    }

    if (filters.dateTo) {
      filtered = filtered.filter((t) => new Date(t.createdAt) <= new Date(filters.dateTo))
    }

    if (filters.minAmount) {
      filtered = filtered.filter((t) => t.amount >= parseFloat(filters.minAmount))
    }

    if (filters.maxAmount) {
      filtered = filtered.filter((t) => t.amount <= parseFloat(filters.maxAmount))
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
      toast.error('Erro ao processar transação')
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

  return (
    <Layout title="Tesouraria">
      <div className="space-y-6">
        {/* Header & Stats */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-6 border-2 bg-gradient-to-br from-green-500 to-emerald-500 text-white">
            <DollarSign className="h-8 w-8 mb-2" />
            <div className="text-3xl font-bold mb-1">
              R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-white/80">Total Contribuído</div>
          </Card>

          <Card className="p-6 border-2">
            <div className="text-3xl font-bold text-primary mb-1">{filteredTransactions.length}</div>
            <div className="text-sm text-muted-foreground">Transações</div>
          </Card>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="h-full">
                <DollarSign className="h-5 w-5 mr-2" />
                Nova Contribuição
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Contribuição</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="amount">Valor (R$)</Label>
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
                  <Label htmlFor="type">Tipo</Label>
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
                  <Label htmlFor="method">Forma de Pagamento</Label>
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

                <Button onClick={createTransaction} className="w-full">
                  Confirmar Contribuição
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card className="p-6 border-2">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-foreground">Filtros</h3>
          </div>

          <div className="grid md:grid-cols-5 gap-4">
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

            <div>
              <Label>Valor Mínimo</Label>
              <Input
                type="number"
                step="0.01"
                value={filters.minAmount}
                onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                placeholder="R$ 0,00"
              />
            </div>

            <div>
              <Label>Valor Máximo</Label>
              <Input
                type="number"
                step="0.01"
                value={filters.maxAmount}
                onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                placeholder="R$ 0,00"
              />
            </div>
          </div>
        </Card>

        {/* Transactions List */}
        <Card className="p-6 border-2">
          <h3 className="text-xl font-bold text-foreground mb-4">Histórico de Transações</h3>

          <div className="space-y-3">
            {filteredTransactions.map((transaction) => {
              const MethodIcon = getMethodIcon(transaction.method)
              
              return (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
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
                    <div className="font-bold text-lg text-green-600">
                      R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full inline-block ${
                      transaction.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : transaction.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {transaction.status === 'completed' ? 'Concluído' : transaction.status === 'pending' ? 'Pendente' : 'Falhou'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Nenhuma transação encontrada
            </div>
          )}
        </Card>
      </div>
    </Layout>
  )
}

export default TreasuryPage
