import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useAppStore } from '../stores/appStore'
import { HeadphonesIcon, Send, CheckCircle, Shield, UserPlus, Clock, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import type { CounselingRequest } from '../types'
import { StatCard } from '../components/shared/StatCard'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { GuestPrompt } from '../components/shared/GuestPrompt'

const CounselingPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useAppStore()
  const [requests, setRequests] = useState<CounselingRequest[]>([])
  const [formData, setFormData] = useState({
    name: user?.username || '',
    email: user?.email || '',
    phone: '',
    subject: '',
    message: '',
  })
  const [loading, setLoading] = useState(false)
  const [loadingRequests, setLoadingRequests] = useState(true)

  const isGuest = user?.role === 'guest'
  const isMember = user?.role === 'member'
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (!isGuest) {
      loadRequests()
    } else {
      setLoadingRequests(false)
    }
  }, [])

  const loadRequests = async () => {
    setLoadingRequests(true)
    const { data, error } = await supabase
      .from('counseling_requests')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading counseling requests:', error)
      setLoadingRequests(false)
      return
    }

    setRequests(data)
    setLoadingRequests(false)
  }

  const submitRequest = async () => {
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.from('counseling_requests').insert({
        user_id: user!.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        subject: formData.subject,
        message: formData.message,
      })

      if (error) throw error

      toast.success('Solicitação enviada! Em breve entraremos em contato.')
      setFormData({
        name: user?.username || '',
        email: user?.email || '',
        phone: '',
        subject: '',
        message: '',
      })
      loadRequests()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar solicitação')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      pending: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', label: 'Pendente' },
      in_progress: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', label: 'Em Andamento' },
      resolved: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', label: 'Resolvido' },
    }
    return badges[status] || badges.pending
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length
  const resolvedCount = requests.filter(r => r.status === 'resolved').length

  if (loadingRequests && !isGuest) {
    return (
      <Layout title="Aconselhamento">
        <LoadingState fullScreen message="Carregando solicitações..." />
      </Layout>
    )
  }

  return (
    <Layout title="Aconselhamento Pastoral">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Hero Banner - Contextual por Papel */}
        <Card className="relative overflow-hidden border-0 shadow-2xl rounded-2xl elevation-3">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1920&h=600&fit=crop&q=80"
              alt="Counseling"
              className="w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-700/96 via-teal-700/94 to-blue-700/92" />
          </div>
          
          <div className="relative z-10 p-6 md:p-10 lg:p-14 text-white">
            <div className="max-w-4xl space-y-5 md:space-y-7">
              <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-white/20 backdrop-blur-md rounded-full border border-white/30 shadow-lg">
                <HeadphonesIcon className="h-4 w-4 md:h-5 md:w-5" />
                <span className="text-sm md:text-base font-bold tracking-wide">
                  {isAdmin ? 'GESTÃO DE ACONSELHAMENTO' : isGuest ? 'ACONSELHAMENTO PASTORAL' : 'CUIDADO PASTORAL'}
                </span>
              </div>

              <div className="space-y-4">
                {isGuest && (
                  <>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight">
                      Cuidado e{' '}
                      <span className="bg-gradient-to-r from-white via-yellow-200 to-white bg-clip-text text-transparent">
                        Acolhimento
                      </span>
                    </h1>
                    <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-medium leading-relaxed max-w-2xl">
                      Receba orientação pastoral em momentos difíceis. Crie uma conta para solicitar acompanhamento.
                    </p>
                  </>
                )}
                
                {isMember && (
                  <>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight">
                      Estamos Aqui{' '}
                      <span className="bg-gradient-to-r from-white via-yellow-200 to-white bg-clip-text text-transparent">
                        Para Ouvir
                      </span>
                    </h1>
                    <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-medium leading-relaxed max-w-2xl">
                      Compartilhe suas necessidades com segurança. Comunicação privada e orientação bíblica responsável.
                    </p>
                  </>
                )}
                
                {isAdmin && (
                  <>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight flex items-center gap-3 md:gap-4 flex-wrap">
                      <Shield className="h-10 w-10 md:h-14 md:w-14 text-yellow-300" />
                      Gerir Aconselhamento
                    </h1>
                    <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-medium leading-relaxed max-w-2xl">
                      Organize solicitações e designe conselheiros. Governo pastoral cuidadoso e ético.
                    </p>
                  </>
                )}
              </div>

              <div className="p-5 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl">
                <p className="text-sm md:text-base text-white/90 leading-relaxed">
                  ℹ️ <strong>Limites Claros:</strong> Aconselhamento pastoral não substitui terapia profissional ou tratamento médico. 
                  Orientação bíblica com responsabilidade e confidencialidade.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {isGuest && (
                  <Button
                    size="lg"
                    onClick={() => navigate('/auth')}
                    className="bg-white text-cyan-700 hover:bg-white/95 font-bold px-7 py-6 rounded-full shadow-2xl transform hover:scale-105 transition-all"
                  >
                    <UserPlus className="mr-2 h-5 w-5" />
                    Criar Conta para Solicitar
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-yellow-400/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-white/10 to-transparent rounded-full blur-3xl" />
        </Card>

        {/* Stats - Apenas para Member/Admin */}
        {!isGuest && (
          <div className="grid grid-cols-2 gap-4 md:gap-5">
            <StatCard
              icon={Clock}
              label="Solicitações Pendentes"
              value={pendingCount}
              gradient="from-yellow-600 to-orange-600"
            />
            <StatCard
              icon={CheckCircle}
              label="Resolvidas"
              value={resolvedCount}
              gradient="from-green-600 to-emerald-600"
            />
          </div>
        )}

        {/* Request Form - Apenas para Member/Admin */}
        {!isGuest && (
          <Card className="p-6 md:p-8 border-2 elevation-1">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-cyan-600 to-teal-600 rounded-xl shadow-md">
                <Send className="h-6 w-6 text-white" />
              </div>
              Nova Solicitação
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Seu nome"
                />
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(244) 999-999-999"
                />
              </div>

              <div>
                <Label htmlFor="subject">Área *</Label>
                <Select value={formData.subject} onValueChange={(value) => setFormData({ ...formData, subject: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a área" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="espiritual">Espiritual</SelectItem>
                    <SelectItem value="familiar">Familiar</SelectItem>
                    <SelectItem value="emocional">Emocional</SelectItem>
                    <SelectItem value="relacionamento">Relacionamento</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="message">Mensagem *</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Descreva sua situação com confiança. Suas informações são tratadas com total confidencialidade..."
                  rows={6}
                />
              </div>
            </div>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg border-2 border-border">
              <p className="text-sm text-muted-foreground leading-relaxed">
                🔒 <strong>Confidencialidade Garantida:</strong> Todas as informações são tratadas com sigilo pastoral. 
                Nossa equipe entrará em contato em até 48 horas.
              </p>
            </div>

            <Button onClick={submitRequest} disabled={loading} className="w-full mt-6 gradient-primary text-white font-semibold" size="lg">
              {loading ? 'Enviando...' : 'Enviar Solicitação'}
              <Send className="h-5 w-5 ml-2" />
            </Button>
          </Card>
        )}

        {/* My Requests - Apenas para Member/Admin */}
        {!isGuest && requests.length > 0 && (
          <Card className="p-6 md:p-8 border-2 elevation-1">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-md">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              Minhas Solicitações
            </h2>

            <div className="space-y-4">
              {requests.map((request) => {
                const badge = getStatusBadge(request.status)

                return (
                  <div key={request.id} className="p-5 rounded-xl border-2 border-border hover:border-primary/30 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-foreground capitalize text-lg">{request.subject}</h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(request.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
                        {badge.label}
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{request.message}</p>

                    {request.adminResponse && (
                      <div className="mt-4 p-4 bg-primary/10 rounded-lg border-l-4 border-primary">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-primary" />
                          <span className="font-semibold text-foreground">Resposta da Equipe Pastoral:</span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{request.adminResponse}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* Guest Prompt */}
        {isGuest && (
          <GuestPrompt
            title="Receba cuidado pastoral"
            description="Membros podem solicitar aconselhamento confidencial e receber orientação bíblica responsável da equipe pastoral."
            actionLabel="Criar Conta"
            onAction={() => navigate('/auth')}
          />
        )}

        {/* Empty State - Member/Admin sem solicitações */}
        {!isGuest && requests.length === 0 && (
          <EmptyState
            icon={HeadphonesIcon}
            title="Nenhuma solicitação ainda"
            description="Quando precisar de orientação pastoral, preencha o formulário acima com segurança."
          />
        )}
      </div>
    </Layout>
  )
}

export default CounselingPage
