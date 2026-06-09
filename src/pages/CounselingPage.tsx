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
import { HeadphonesIcon, Send, CheckCircle, Shield, UserPlus, Clock, MessageSquare, Lock, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import type { CounselingRequest } from '../types'
import { StatCard } from '../components/shared/StatCard'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { GuestPrompt } from '../components/shared/GuestPrompt'

const CATEGORIES = [
  { value: 'espiritual', label: '🕊️ Espiritual', desc: 'Crescimento na fé, dúvidas doutrinárias' },
  { value: 'familiar', label: '👨‍👩‍👧 Familiar', desc: 'Relacionamentos familiares, criação dos filhos' },
  { value: 'emocional', label: '💙 Emocional', desc: 'Ansiedade, tristeza, luto' },
  { value: 'relacionamento', label: '❤️ Relacionamento', desc: 'Namoro, casamento, divórcio' },
  { value: 'financeiro', label: '💰 Financeiro', desc: 'Dívidas, mordomia cristã' },
  { value: 'outro', label: '💬 Outro', desc: 'Outros tópicos pastorais' },
]

const CounselingPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [requests, setRequests] = useState<CounselingRequest[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: user?.username || '', email: user?.email || '', phone: '', subject: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [adminView, setAdminView] = useState(false)
  const [adminRequests, setAdminRequests] = useState<any[]>([])
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [responseText, setResponseText] = useState('')

  const isGuest = user?.role === 'guest'
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (!isGuest) {
      loadRequests()
      if (isAdmin) loadAdminRequests()
    } else {
      setLoadingRequests(false)
    }
  }, [])

  const loadRequests = async () => {
    setLoadingRequests(true)
    const { data } = await supabase.from('counseling_requests').select('*').eq('user_id', user!.id).order('created_at', { ascending: false })
    setRequests(data || [])
    setLoadingRequests(false)
  }

  const loadAdminRequests = async () => {
    const { data } = await supabase.from('counseling_requests').select('*, user:user_profiles(username, email)').order('created_at', { ascending: false })
    setAdminRequests(data || [])
  }

  const submitRequest = async () => {
    if (!formData.name || !formData.email || !formData.subject || !formData.message) { toast.error('Preencha todos os campos obrigatórios'); return }
    setLoading(true)
    const { error } = await supabase.from('counseling_requests').insert({
      user_id: user!.id, name: formData.name, email: formData.email, phone: formData.phone, subject: formData.subject, message: formData.message,
    })
    if (error) { toast.error(error.message || 'Erro ao enviar'); setLoading(false); return }
    toast.success('Solicitação enviada! Em breve nossa equipe pastoral entrará em contato.')
    setFormData({ name: user?.username || '', email: user?.email || '', phone: '', subject: '', message: '' })
    loadRequests()
    setLoading(false)
  }

  const sendResponse = async (requestId: string) => {
    if (!responseText.trim()) { toast.error('Digite uma resposta'); return }
    const { error } = await supabase.from('counseling_requests').update({ admin_response: responseText, status: 'in_progress' }).eq('id', requestId)
    if (error) { toast.error('Erro ao responder'); return }
    toast.success('Resposta enviada com sucesso!')
    setRespondingId(null)
    setResponseText('')
    loadAdminRequests()
  }

  const markResolved = async (requestId: string) => {
    const { error } = await supabase.from('counseling_requests').update({ status: 'resolved' }).eq('id', requestId)
    if (error) { toast.error('Erro'); return }
    toast.success('Solicitação marcada como resolvida')
    loadAdminRequests()
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, { color: string; label: string }> = {
      pending: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800', label: '⏳ Pendente' },
      in_progress: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800', label: '💬 Em Andamento' },
      resolved: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800', label: '✅ Resolvido' },
    }
    return map[status] || map.pending
  }

  if (loadingRequests && !isGuest) return <Layout title="Aconselhamento"><LoadingState fullScreen message="Carregando solicitações..." /></Layout>

  return (
    <Layout title="Aconselhamento Pastoral">
      <div className="p-4 md:p-6">
        {/* Hero */}
        <Card className="relative overflow-hidden border-0 shadow-2xl rounded-2xl">
          <div className="absolute inset-0">
            <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1920&h=600&fit=crop&q=80" alt="Counseling" className="w-full h-full object-cover opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-700/96 via-teal-700/94 to-blue-700/92" />
          </div>
          <div className="relative z-10 p-6 md:p-10 lg:p-14 text-white">
            <div className="max-w-4xl space-y-5">
              <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-white/20 backdrop-blur-md rounded-full border border-white/30 shadow-lg">
                <HeadphonesIcon className="h-4 w-4 md:h-5 md:w-5" />
                <span className="text-sm md:text-base font-bold tracking-wide">CUIDADO PASTORAL CONFIDENCIAL</span>
              </div>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight">
                {isAdmin ? 'Gestão de ' : ''}Aconselhamento{' '}
                <span className="bg-gradient-to-r from-white via-yellow-200 to-white bg-clip-text text-transparent">Pastoral</span>
              </h1>
              <p className="text-base md:text-xl text-white/90 font-medium leading-relaxed max-w-2xl">
                {isGuest ? 'Canal privado de apoio pastoral. Crie uma conta para solicitar acompanhamento.' : isAdmin ? 'Acompanhe as solicitações, responda com sabedoria e cuide dos membros da comunidade.' : 'Um espaço seguro e confidencial para receber orientação bíblica e suporte pastoral.'}
              </p>
              <div className="p-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl max-w-lg">
                <div className="flex items-start gap-3">
                  <Lock className="h-4 w-4 text-white/80 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-white/90 leading-relaxed">
                    <strong>Confidencialidade garantida.</strong> Suas informações são tratadas com total sigilo pastoral. Não substitui terapia profissional ou tratamento médico.
                  </p>
                </div>
              </div>
              {isGuest && (
                <Button size="lg" onClick={() => navigate('/auth')} className="bg-white text-cyan-700 hover:bg-white/95 font-bold px-7 py-6 rounded-full shadow-2xl">
                  <UserPlus className="mr-2 h-5 w-5" />Criar Conta para Solicitar
                </Button>
              )}
            </div>
          </div>
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-yellow-400/20 to-transparent rounded-full blur-3xl" />
        </Card>

        {/* Stats */}
        {!isGuest && (
          <div className="grid grid-cols-2 gap-4">
            <StatCard icon={Clock} label="Solicitações Pendentes" value={requests.filter(r => r.status === 'pending').length} gradient="from-yellow-600 to-orange-600" />
            <StatCard icon={CheckCircle} label="Resolvidas" value={requests.filter(r => r.status === 'resolved').length} gradient="from-green-600 to-emerald-600" />
          </div>
        )}

        {/* Admin View Toggle */}
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant={!adminView ? 'default' : 'outline'} onClick={() => setAdminView(false)} className="border-2 font-semibold">
              <MessageSquare className="h-4 w-4 mr-2" />Minha Solicitação
            </Button>
            <Button variant={adminView ? 'default' : 'outline'} onClick={() => setAdminView(true)} className="border-2 font-semibold">
              <Shield className="h-4 w-4 mr-2" />Ver Todas ({adminRequests.length})
            </Button>
          </div>
        )}

        {/* Admin: All Requests View */}
        {isAdmin && adminView && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-5 w-5 text-cyan-600" />Todas as Solicitações
            </h2>
            {adminRequests.length === 0 ? (
              <EmptyState icon={HeadphonesIcon} title="Nenhuma solicitação" description="Quando membros solicitarem aconselhamento, aparecerão aqui" />
            ) : (
              adminRequests.map(req => {
                const badge = getStatusBadge(req.status)
                const isExpanded = expandedId === req.id
                return (
                  <Card key={req.id} className="border-2 overflow-hidden">
                    <div className="p-4 md:p-5">
                      <div className="flex flex-wrap justify-between items-start gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-bold text-foreground capitalize">{req.subject}</h3>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${badge.color}`}>{badge.label}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {req.name} • {req.email} • {new Date(req.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {req.status !== 'resolved' && (
                            <Button size="sm" variant="outline" onClick={() => markResolved(req.id)} className="text-xs font-bold h-8 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400">
                              <CheckCircle className="h-3 w-3 mr-1" />Resolver
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => setExpandedId(isExpanded ? null : req.id)} className="h-8 w-8 p-0">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="space-y-3 pt-3 border-t border-border">
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-sm text-foreground leading-relaxed">{req.message}</p>
                          </div>
                          {req.admin_response && (
                            <div className="p-3 bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <Shield className="h-3.5 w-3.5 text-cyan-600" />
                                <span className="text-xs font-bold text-cyan-700 dark:text-cyan-300">Resposta Pastoral</span>
                              </div>
                              <p className="text-sm text-foreground leading-relaxed">{req.admin_response}</p>
                            </div>
                          )}
                          {respondingId === req.id ? (
                            <div className="space-y-2">
                              <Textarea value={responseText} onChange={e => setResponseText(e.target.value)} placeholder="Escreva sua resposta pastoral com sabedoria e cuidado..." rows={4} className="resize-none border-2" />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => sendResponse(req.id)} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold">
                                  <Send className="h-3.5 w-3.5 mr-1.5" />Enviar Resposta
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => { setRespondingId(null); setResponseText('') }}>Cancelar</Button>
                              </div>
                            </div>
                          ) : (
                            <Button size="sm" onClick={() => { setRespondingId(req.id); setResponseText(req.admin_response || '') }} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold">
                              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />{req.admin_response ? 'Editar Resposta' : 'Responder'}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                )
              })
            )}
          </div>
        )}

        {/* Request Form */}
        {!isGuest && (!isAdmin || !adminView) && (
          <Card className="p-5 md:p-8 border-2 shadow-lg">
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-5 flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-cyan-600 to-teal-600 rounded-xl shadow-md">
                <Send className="h-5 w-5 text-white" />
              </div>
              Nova Solicitação de Aconselhamento
            </h2>

            {/* Category Selection */}
            <div className="mb-5">
              <Label className="font-semibold mb-3 block">Área de Aconselhamento *</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CATEGORIES.map(cat => (
                  <button key={cat.value} onClick={() => setFormData({ ...formData, subject: cat.value })}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${formData.subject === cat.value ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30' : 'border-border hover:border-cyan-300'}`}>
                    <div className="font-semibold text-foreground text-sm">{cat.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{cat.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <Label className="font-semibold mb-1 block">Nome Completo *</Label>
                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Seu nome" className="h-11 border-2" />
              </div>
              <div>
                <Label className="font-semibold mb-1 block">Email *</Label>
                <Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="seu@email.com" className="h-11 border-2" />
              </div>
            </div>

            <div className="mb-4">
              <Label className="font-semibold mb-1 block">Telefone (opcional)</Label>
              <Input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="(244) 999-999-999" className="h-11 border-2" />
            </div>

            <div className="mb-4">
              <Label className="font-semibold mb-1 block">Sua Mensagem *</Label>
              <Textarea value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })}
                placeholder="Compartilhe sua situação com confiança. Suas informações são tratadas com total confidencialidade pastoral..." rows={6} className="resize-none border-2" />
            </div>

            <div className="p-4 bg-cyan-50 dark:bg-cyan-950/30 rounded-xl border border-cyan-200 dark:border-cyan-800 mb-5">
              <div className="flex items-start gap-3">
                <Lock className="h-4 w-4 text-cyan-600 dark:text-cyan-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-cyan-700 dark:text-cyan-300 leading-relaxed">
                  <strong>🔒 Confidencialidade garantida</strong> — Suas informações são tratadas com sigilo pastoral. Nossa equipe entrará em contato em até 48 horas.
                </p>
              </div>
            </div>

            <Button onClick={submitRequest} disabled={loading} className="w-full h-11 md:h-12 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white font-bold text-base" size="lg">
              {loading ? 'Enviando...' : 'Enviar Solicitação'}
              <Send className="h-4 w-4 ml-2" />
            </Button>
          </Card>
        )}

        {/* My Requests */}
        {!isGuest && requests.length > 0 && (!isAdmin || !adminView) && (
          <Card className="p-5 md:p-8 border-2">
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-5 flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-md">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              Minhas Solicitações
            </h2>
            <div className="space-y-4">
              {requests.map(req => {
                const badge = getStatusBadge(req.status)
                const isExpanded = expandedId === req.id
                return (
                  <div key={req.id} className="rounded-xl border-2 border-border overflow-hidden hover:border-primary/30 transition-colors">
                    <button className="w-full p-4 text-left flex justify-between items-center gap-3" onClick={() => setExpandedId(isExpanded ? null : req.id)}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-bold text-foreground capitalize text-sm">{req.subject}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${badge.color}`}>{badge.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{new Date(req.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                      </div>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3 border-t border-border">
                        <div className="pt-3 p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm text-foreground leading-relaxed">{req.message}</p>
                        </div>
                        {req.adminResponse && (
                          <div className="p-4 bg-cyan-50 dark:bg-cyan-950/30 border-l-4 border-cyan-500 rounded-r-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <HeadphonesIcon className="h-4 w-4 text-cyan-600" />
                              <span className="font-bold text-foreground text-sm">Resposta da Equipe Pastoral:</span>
                            </div>
                            <p className="text-sm text-foreground leading-relaxed">{req.adminResponse}</p>
                          </div>
                        )}
                        {!req.adminResponse && <p className="text-sm text-muted-foreground italic text-center py-2">Aguardando resposta da equipe pastoral...</p>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {isGuest && (
          <GuestPrompt title="Receba cuidado pastoral" description="Membros podem solicitar aconselhamento confidencial e receber orientação bíblica da equipe pastoral." actionLabel="Criar Conta" onAction={() => navigate('/auth')} />
        )}

        {!isGuest && requests.length === 0 && (!isAdmin || !adminView) && (
          <EmptyState icon={HeadphonesIcon} title="Nenhuma solicitação ainda" description="Quando precisar de orientação pastoral, preencha o formulário acima com segurança." />
        )}
      </div>
    </Layout>
  )
}

export default CounselingPage
