import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { 
  HeadphonesIcon, Send, CheckCircle, Shield, UserPlus, Clock, 
  MessageSquare, Lock, ChevronDown, ChevronUp, Loader2 
} from 'lucide-react'
import { toast } from 'sonner'
import type { CounselingRequest } from '../types'
import { StatCard } from '../components/shared/StatCard'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { GuestPrompt } from '../components/shared/GuestPrompt'

const CATEGORIES = [
  { value: 'espiritual', label: '🕊️ Espiritual', desc: 'Crescimento na fé e doutrina' },
  { value: 'familiar', label: '👨‍👩‍👧 Familiar', desc: 'Relacionamentos e criação de filhos' },
  { value: 'emocional', label: '💙 Emocional', desc: 'Ansiedade, tristeza e luto' },
  { value: 'relacionamento', label: '❤️ Relacionamento', desc: 'Namoro, casamento e corte' },
  { value: 'financeiro', label: '💰 Financeiro', desc: 'Dívidas e mordomia cristã' },
  { value: 'outro', label: '💬 Outro', desc: 'Outros tópicos pastorais' },
]

const CounselingPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  // States
  const [requests, setRequests] = useState<CounselingRequest[]>([])
  const [adminRequests, setAdminRequests] = useState<any[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ 
    name: user?.username || '', 
    email: user?.email || '', 
    phone: '', 
    subject: '', 
    message: '' 
  })
  
  // Loading States
  const [submitting, setSubmitting] = useState(false)
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  
  // Admin View Controller
  const [adminView, setAdminView] = useState(false)
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [responseText, setResponseText] = useState('')

  const isGuest = user?.role === 'guest'
  const isAdmin = user?.role === 'admin'

  // Fetching Functions wrap in useCallback
  const loadRequests = useCallback(async () => {
    if (!user?.id) return
    try {
      const { data, error } = await supabase
        .from('counseling_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setRequests(data || [])
    } catch (err: any) {
      toast.error('Erro ao carregar seu histórico: ' + err.message)
    } finally {
      setLoadingRequests(false)
    }
  }, [user?.id])

  const loadAdminRequests = useCallback(async () => {
  try {
    // Adicionada a exclamação e o nome da coluna fk exata: !user_id
    const { data, error } = await supabase
      .from('counseling_requests')
      .select('*, user:user_profiles!user_id(username, email)')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    setAdminRequests(data || [])
  } catch (err: any) {
    toast.error('Erro ao carregar painel administrativo: ' + err.message)
  }
}, [])

  useEffect(() => {
    if (!isGuest && user?.id) {
      loadRequests()
      if (isAdmin) loadAdminRequests()
    } else {
      setLoadingRequests(false)
    }
  }, [user?.id, isGuest, isAdmin, loadRequests, loadAdminRequests])

  // Form Submissions
  const submitRequest = async () => {
    if (!formData.subject) { toast.error('Selecione uma área de aconselhamento'); return }
    if (!formData.name || !formData.email || !formData.message) { toast.error('Preencha todos os campos obrigatórios'); return }
    
    setSubmitting(true)
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
      
      toast.success('Solicitação enviada de forma segura à equipe pastoral.')
      setFormData(prev => ({ ...prev, phone: '', subject: '', message: '' }))
      await loadRequests()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar envio')
    } finally {
      setSubmitting(false)
    }
  }

  const sendResponse = async (requestId: string) => {
    if (!responseText.trim()) { toast.error('Escreva uma resposta antes de enviar'); return }
    
    setActionLoadingId(requestId)
    try {
      const { error } = await supabase
        .from('counseling_requests')
        .update({ admin_response: responseText, status: 'in_progress' })
        .eq('id', requestId)
      
      if (error) throw error
      
      toast.success('Resposta pastoral registrada com sucesso!')
      setRespondingId(null)
      setResponseText('')
      await loadAdminRequests()
    } catch (err: any) {
      toast.error('Não foi possível salvar a resposta: ' + err.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  const markResolved = async (requestId: string) => {
    setActionLoadingId(requestId)
    try {
      const { error } = await supabase
        .from('counseling_requests')
        .update({ status: 'resolved' })
        .eq('id', requestId)
      
      if (error) throw error
      
      toast.success('Solicitação movida para resolvida.')
      await loadAdminRequests()
    } catch (err: any) {
      toast.error('Erro ao atualizar status: ' + err.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, { color: string; label: string }> = {
      pending: { color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50', label: '⏳ Pendente' },
      in_progress: { color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50', label: '💬 Em Andamento' },
      resolved: { color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50', label: '✅ Resolvido' },
    }
    return map[status] || map.pending
  }

  if (loadingRequests && !isGuest) {
    return (
      <Layout title="Aconselhamento">
        <LoadingState fullScreen message="Sincronizando dados confidenciais..." />
      </Layout>
    )
  }

  // Contagem para estatísticas dinâmicas
  const displayedRequests = isAdmin && adminView ? adminRequests : requests
  const pendingCount = displayedRequests.filter(r => r.status === 'pending').length
  const resolvedCount = displayedRequests.filter(r => r.status === 'resolved').length

  return (
    <Layout title="Aconselhamento Pastoral">
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        
        {/* ── HERO BANNER ── */}
        <Card className="relative overflow-hidden border-0 shadow-xl rounded-2xl bg-gradient-to-br from-cyan-800 via-teal-800 to-slate-900">
          <div className="absolute inset-0 z-0 opacity-20 mix-blend-overlay">
            <img 
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1200&q=80" 
              alt="Background" 
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="relative z-10 p-6 md:p-10 lg:p-12 text-white space-y-4 max-w-4xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-xs md:text-sm font-semibold tracking-wide">
              <HeadphonesIcon className="h-4 w-4 text-cyan-300" />
              <span>GABINETE DE APOIO INTEGRAL</span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              {isAdmin && adminView ? 'Gestão de ' : ''}Aconselhamento{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-amber-200">
                Pastoral
              </span>
            </h1>
            
            <p className="text-sm md:text-lg text-slate-200/90 max-w-2xl font-medium leading-relaxed">
              {isGuest 
                ? 'Canal privado para suporte espiritual e aconselhamento. Faça login ou crie uma conta para registrar sua solicitação de forma anônima e segura.' 
                : isAdmin && adminView 
                  ? 'Central pastoral. Revise os relatos de cuidado da sua comunidade, envie direcionamentos baseados na palavra e mude status de atendimento.' 
                  : 'Um porto seguro para compartilhar suas lutas, angústias ou conquistas. Obtenha acompanhamento baseado em princípios e acolhimento mútuo.'
              }
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <div className="flex items-center gap-2 text-xs text-slate-300 bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                <Lock className="h-3.5 w-3.5 text-teal-400" />
                <span>Criptografia de ponta e sigilo eclesiástico.</span>
              </div>
            </div>

            {isGuest && (
              <Button 
                size="lg" 
                onClick={() => navigate('/auth')} 
                className="bg-white text-teal-900 hover:bg-slate-100 font-bold px-6 shadow-md rounded-xl mt-2"
              >
                <UserPlus className="mr-2 h-4 w-4" /> Criar Conta de Acesso
              </Button>
            )}
          </div>
        </Card>

        {/* ── VISÃO GUEST CONTROLLER ── */}
        {isGuest && (
          <GuestPrompt 
            title="Precisa conversar ou receber oração?" 
            description="Crie seu perfil em nossa plataforma de forma rápida para abrir chamados diretos ao conselho e acompanhar o andamento das respostas." 
            actionLabel="Acessar / Cadastrar" 
            onAction={() => navigate('/auth')} 
          />
        )}

        {/* ── CONTEÚDO PRINCIPAL (Membros & Admins) ── */}
        {!isGuest && (
          <div className="space-y-6">
            
            {/* Barra de Ferramentas / Métricas */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/30 p-3 rounded-xl border border-border">
              <div className="grid grid-cols-2 gap-3 w-full sm:w-auto sm:flex sm:items-center">
                <StatCard icon={Clock} label="Pendentes" value={pendingCount} gradient="from-amber-500 to-orange-600" />
                <StatCard icon={CheckCircle} label="Resolvidos" value={resolvedCount} gradient="from-emerald-500 to-teal-600" />
              </div>

              {isAdmin && (
                <div className="flex gap-1.5 bg-background p-1 rounded-lg border border-border self-end sm:self-center">
                  <Button 
                    size="sm"
                    variant={!adminView ? 'default' : 'ghost'} 
                    onClick={() => { setAdminView(false); setExpandedId(null); }} 
                    className="font-medium text-xs"
                  >
                    <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Meu Espaço
                  </Button>
                  <Button 
                    size="sm"
                    variant={adminView ? 'default' : 'ghost'} 
                    onClick={() => { setAdminView(true); setExpandedId(null); }} 
                    className="font-medium text-xs"
                  >
                    <Shield className="h-3.5 w-3.5 mr-1.5" /> Triagem Geral ({adminRequests.length})
                  </Button>
                </div>
              )}
            </div>

            {/* Layout em Duas Colunas para Solicitação + Histórico no painel do Membro */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* COLUNA ESQUERDA: Formulário de Envio (Ocultado se adminView estiver ativa) */}
              {(!isAdmin || !adminView) && (
                <div className="lg:col-span-5 space-y-4">
                  <Card className="p-5 border border-border shadow-sm space-y-4">
                    <div>
                      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Send className="h-4 w-4 text-cyan-600" />
                        Nova Intenção de Conversa
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Selecione o segmento e relate seu caso.</p>
                    </div>

                    {/* Grade de Categorias Interativas */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">Área de Aflição ou Interesse *</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {CATEGORIES.map(cat => (
                          <button 
                            key={cat.value} 
                            type="button"
                            onClick={() => setFormData({ ...formData, subject: cat.value })}
                            className={`p-2.5 text-left rounded-xl border transition-all flex flex-col justify-between ${
                              formData.subject === cat.value 
                                ? 'border-cyan-600 bg-cyan-50/50 dark:bg-cyan-950/20 shadow-sm ring-1 ring-cyan-600' 
                                : 'border-border bg-card hover:border-muted-foreground/30'
                            }`}
                          >
                            <span className="font-bold text-foreground text-xs">{cat.label}</span>
                            <span className="text-[11px] text-muted-foreground truncate mt-0.5 w-full">{cat.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Nome Completo</Label>
                          <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="h-10 text-xs" placeholder="Nome" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Endereço de E-mail</Label>
                          <Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="h-10 text-xs" placeholder="exemplo@igreja.com" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Telefone de Contacto (Opcional)</Label>
                        <Input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="h-10 text-xs" placeholder="Ex: 9xx xxx xxx" />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Sua Mensagem / Desabafo *</Label>
                        <Textarea 
                          value={formData.message} 
                          onChange={e => setFormData({ ...formData, message: e.target.value })}
                          placeholder="Fique à vontade para relatar suas dores ou dúvidas..." 
                          rows={4} 
                          className="resize-none text-xs" 
                        />
                      </div>
                    </div>

                    <Button 
                      onClick={submitRequest} 
                      disabled={submitting} 
                      className="w-full h-10 bg-gradient-to-r from-cyan-700 to-teal-700 text-white font-bold text-xs rounded-xl shadow-sm"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Processando Envio...
                        </>
                      ) : (
                        <>
                          Registrar Solicitação <Send className="h-3.5 w-3.5 ml-1.5" />
                        </>
                      )}
                    </Button>
                  </Card>
                </div>
              )}

              {/* COLUNA DIREITA: Listagens (Ocupa largura total se adminView for True) */}
              <div className={`${isAdmin && adminView ? 'lg:col-span-12' : 'lg:col-span-7'} space-y-4`}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    {isAdmin && adminView ? (
                      <>
                        <Shield className="h-4 w-4 text-cyan-600" /> Painel de Triagem Eclesiástica
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-4 w-4 text-cyan-600" /> Meu Histórico de Acompanhamentos
                      </>
                    )}
                  </h2>
                </div>

                {displayedRequests.length === 0 ? (
                  <EmptyState 
                    icon={HeadphonesIcon} 
                    title={isAdmin && adminView ? "Nenhum caso pendente" : "Nenhum atendimento em andamento"} 
                    description={isAdmin && adminView ? "Excelente! Todos os membros ativos estão assistidos de forma plena." : "Caso precise conversar sobre qualquer área da vida, abra uma chamada ao lado."} 
                  />
                ) : (
                  <div className="space-y-3">
                    {displayedRequests.map(req => {
                      const badge = getStatusBadge(req.status)
                      const isExpanded = expandedId === req.id
                      const isActionLoading = actionLoadingId === req.id
                      
                      // Correção de propriedades dinâmicas do banco (snake_case)
                      const dbResponse = req.admin_response || req.adminResponse
                      const dbDate = req.created_at || req.createdAt

                      return (
                        <Card key={req.id} className="border border-border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                          
                          {/* Cabeçalho do Card clicável */}
                          <div 
                            className="p-4 flex items-start justify-between gap-3 cursor-pointer select-none hover:bg-muted/20 transition-colors"
                            onClick={() => setExpandedId(isExpanded ? null : req.id)}
                          >
                            <div className="space-y-1.5 min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-bold text-foreground text-sm capitalize truncate max-w-[240px]">
                                  {req.subject}
                                </h3>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.color}`}>
                                  {badge.label}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2 gap-y-0.5 items-center">
                                {isAdmin && adminView && <span className="font-semibold text-foreground">{req.name} •</span>}
                                <span>{new Date(dbDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                {req.phone && <span>• Tel: {req.phone}</span>}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                              {isAdmin && adminView && req.status !== 'resolved' && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  disabled={isActionLoading}
                                  onClick={() => markResolved(req.id)} 
                                  className="text-[11px] font-bold h-7 px-2.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-400"
                                >
                                  {isActionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                                  Concluir
                                </Button>
                              )}
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => setExpandedId(isExpanded ? null : req.id)} 
                                className="h-7 w-7 p-0 text-muted-foreground"
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>

                          {/* Seção Interna Expandida */}
                          {isExpanded && (
                            <div className="px-4 pb-4 pt-1 space-y-3 bg-muted/10 border-t border-border/60">
                              <div className="p-3 bg-muted/40 rounded-xl border border-border/40">
                                <span className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase tracking-wider">Relato do Membro:</span>
                                <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">{req.message}</p>
                              </div>

                              {/* Exibição de Resposta */}
                              {dbResponse && (
                                <div className="p-3 bg-cyan-50/40 dark:bg-cyan-950/20 border-l-4 border-cyan-600 rounded-r-xl">
                                  <div className="flex items-center gap-1.5 mb-1.5">
                                    <Shield className="h-3.5 w-3.5 text-cyan-700 dark:text-cyan-400" />
                                    <span className="text-xs font-bold text-cyan-800 dark:text-cyan-300">Direcionamento Pastoral Compartilhado</span>
                                  </div>
                                  <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">{dbResponse}</p>
                                </div>
                              )}

                              {/* Modo de Edição / Criação de Resposta (Apenas Admin) */}
                              {isAdmin && adminView && (
                                <div className="pt-2 border-t border-border/40">
                                  {respondingId === req.id ? (
                                    <div className="space-y-2">
                                      <Textarea 
                                        value={responseText} 
                                        onChange={e => setResponseText(e.target.value)} 
                                        placeholder="Digite aqui o aconselhamento pastoral..." 
                                        rows={3} 
                                        className="resize-none text-xs" 
                                      />
                                      <div className="flex gap-2 justify-end">
                                        <Button 
                                          size="sm" 
                                          variant="outline" 
                                          onClick={() => { setRespondingId(null); setResponseText(''); }} 
                                          className="text-xs h-8"
                                        >
                                          Recusar
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          disabled={isActionLoading}
                                          onClick={() => sendResponse(req.id)} 
                                          className="bg-cyan-700 hover:bg-cyan-800 text-white text-xs h-8"
                                        >
                                          {isActionLoading && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
                                          Formalizar Retorno
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <Button 
                                      size="sm" 
                                      onClick={() => { setRespondingId(req.id); setResponseText(dbResponse || ''); }} 
                                      className="bg-cyan-700 hover:bg-cyan-800 text-white text-xs h-8"
                                    >
                                      <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                                      {dbResponse ? 'Retificar Resposta' : 'Escrever Devolutiva'}
                                    </Button>
                                  )}
                                </div>
                              )}

                              {/* Aviso de Espera para o Membro */}
                              {!isAdmin && !dbResponse && (
                                <p className="text-xs text-muted-foreground/70 italic text-center py-1">
                                  🛡️ Seu caso foi encaminhado para a mesa pastoral. Aguarde o retorno com sigilo.
                                </p>
                              )}
                            </div>
                          )}
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default CounselingPage
