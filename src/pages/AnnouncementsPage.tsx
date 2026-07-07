import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useAppStore } from '../stores/appStore'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '../components/ui/dropdown-menu'
import { 
  Megaphone, Pin, Trash2, Edit2, Plus, CheckCircle2, 
  Circle, Flame, Clock, User, Share2, AlertTriangle,
  Sparkles, ShieldCheck
} from 'lucide-react'
import { toast } from 'sonner'
import type { Announcement } from '../types'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { AnnouncementEditor } from '../components/admin/AnnouncementEditor'
import { GuestPrompt } from '../components/shared/GuestPrompt'

const categoryStyles = {
  urgent: 'bg-red-50 text-red-700 border-red-200/60 dark:bg-red-500/10 dark:text-red-400 dark:border-transparent',
  spiritual: 'bg-indigo-50 text-indigo-700 border-indigo-200/60 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-transparent',
  event: 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-500/10 dark:text-amber-400 dark:border-transparent',
  institutional: 'bg-slate-50 text-slate-700 border-slate-200/60 dark:bg-slate-500/10 dark:text-slate-400 dark:border-transparent',
}

const AnnouncementsPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useAppStore()
  
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'urgent' | 'spiritual' | 'event' | 'institutional'>('all')
  
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  
  const isGuest = user?.role === 'guest'
  const isAdmin = user?.role === 'admin' || user?.role === 'chief_admin'
  const isChiefAdmin = user?.role === 'chief_admin'

  // Carregamento inicial de dados via Callback estável
  const loadAnnouncements = useCallback(async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading announcements:', error)
      toast.error('Não foi possível carregar os anúncios oficiais')
      return
    }
    setAnnouncements(data || [])
  }, [])

  // Inicialização e subscrição Realtime com ciclo de vida blindado contra Memory Leaks
  useEffect(() => {
    let isMounted = true

    const initPage = async () => {
      setLoading(true)
      await loadAnnouncements()
      if (isMounted) setLoading(false)
    }

    initPage()

    const channel = supabase
      .channel('public:announcements')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        (payload) => {
          if (!isMounted) return

          setAnnouncements((current) => {
            switch (payload.eventType) {
              case 'INSERT':
                return [payload.new as Announcement, ...current]
              case 'UPDATE':
                return current.map((item) => item.id === payload.new.id ? (payload.new as Announcement) : item)
              case 'DELETE':
                return current.filter((item) => item.id !== payload.old.id)
              default:
                return current
            }
          })
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [loadAnnouncements])

  const handleEditorSuccess = () => {
    loadAnnouncements()
    setEditingAnnouncement(null)
    setEditorOpen(false)
  }

  const handleEdit = (announcement: Announcement, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isChiefAdmin) {
      toast.error('Acesso negado: Apenas o Administrador-Chefe pode editar anúncios.')
      return
    }
    setEditingAnnouncement(announcement)
    setEditorOpen(true)
  }

  const handleTogglePin = async (announcement: Announcement, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isChiefAdmin) {
      toast.error('Acesso negado: Apenas o Administrador-Chefe pode fixar comunicados.')
      return
    }

    setSubmittingId(announcement.id)
    const { error } = await supabase
      .from('announcements')
      .update({ is_pinned: !announcement.is_pinned })
      .eq('id', announcement.id)

    if (error) {
      toast.error('Erro ao alterar destaque do anúncio')
    } else {
      toast.success(announcement.is_pinned ? 'Anúncio desafixado' : 'Anúncio fixado no topo!')
    }
    setSubmittingId(null)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isChiefAdmin) {
      toast.error('Acesso negado: Ação exclusiva do Administrador-Chefe.')
      return
    }
    
    toast('Excluir anúncio permanentemente?', {
      description: 'Esta ação removerá o comunicado de todo o ecossistema.',
      action: {
        label: 'Excluir',
        onClick: async () => {
          const { error } = await supabase.from('announcements').delete().eq('id', id)
          if (error) {
            toast.error('Erro ao excluir anúncio do servidor')
            return
          }
          toast.success('Comunicado removido com sucesso!')
        },
      },
    })
  }

  if (loading) {
    return (
      <Layout title="Anúncios">
        <LoadingState fullScreen message="Sincronizando mural de comunicações..." />
      </Layout>
    )
  }

  // Ordenação determinística: Pinned (Fixados) sempre acima, depois cronológico decrescente
  const sortedAnnouncements = [...announcements].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1
    if (!a.is_pinned && b.is_pinned) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  // Destaque Imediato: O primeiro fixado cronológico ou o comunicado mais recente
  const pinnedAnnouncement = sortedAnnouncements.find(a => a.is_pinned) || sortedAnnouncements[0]
  
  const displayedAnnouncements = activeTab === 'all'
    ? (pinnedAnnouncement ? sortedAnnouncements.filter(a => a.id !== pinnedAnnouncement.id) : sortedAnnouncements)
    : sortedAnnouncements.filter(a => a.category === activeTab)

  return (
    <Layout title="Anúncios">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-8">
        
        {/* Header Principal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">Mural de Anúncios</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {announcements.length} {announcements.length === 1 ? 'comunicado ativo' : 'comunicados ativos'} · {announcements.filter(a => a.is_pinned).length} fixados
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button size="default" onClick={() => { setEditingAnnouncement(null); setEditorOpen(true) }} className="w-full sm:w-auto bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-medium shadow-sm transition-all">
                <Plus className="h-4 w-4 mr-2" />Criar Anúncio
              </Button>
            )}
            {isGuest && (
              <Button size="default" onClick={() => navigate('/about')} className="w-full sm:w-auto bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-medium shadow-sm transition-all">
                <User className="h-4 w-4 mr-2" />Entrar na Comunidade
              </Button>
            )}
          </div>
        </div>

        {/* Hero Contextual */}
        <Card className="relative overflow-hidden border-0 shadow-xl rounded-2xl hidden md:block group">
          <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105">
            <img
              src="https://images.unsplash.com/photo-1543269865-cbf427effbad?w=1920&h=600&fit=crop&q=80"
              alt="Announcements Banner"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-indigo-950/90" />
          </div>
          
          <div className="relative z-10 p-8 md:p-12 text-white">
            <div className="max-w-3xl space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 shadow-sm">
                <Megaphone className="h-4 w-4 text-indigo-300" />
                <span className="text-xs font-bold tracking-wider uppercase text-indigo-200">
                  {isChiefAdmin ? 'Direção Geral Executiva' : isAdmin ? 'Painel Administrativo' : 'Canal Oficial de Notícias'}
                </span>
              </div>

              <div className="space-y-3">
                <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
                  {isChiefAdmin ? 'Gestão Central de Alinhamento' : isAdmin ? 'Publique Avisos Oficiais' : 'Fique por Dentro de Tudo'}
                </h2>
                <p className="text-base md:text-lg text-slate-200/90 font-normal leading-relaxed max-w-2xl">
                  {isAdmin 
                    ? 'Transmita diretrizes, alertas urgentes e atualizações pastorais diretamente no feed em tempo real da comunidade.' 
                    : 'Acompanhe comunicados importantes, notas administrativas e direcionamentos espirituais da liderança.'}
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                {isChiefAdmin && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold text-amber-300">
                    <ShieldCheck className="h-4 w-4 text-amber-400" />
                    Modo Administrador-Chefe Ativo (Controle Total)
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Card Destaque: Comunicado Fixado ou Mais Recente */}
        {pinnedAnnouncement && activeTab === 'all' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500 animate-pulse" /> COMUNICADO DE DESTAQUE IMEDIATO
              </span>
            </div>
            
            {/* CARD APLICANDO A LEI DE ZERO VAZAMENTO DE GRADIENTES NO DARK MODE */}
            <Card className="p-5 md:p-6 border border-indigo-500/20 shadow-md hover:shadow-lg transition-all rounded-2xl
              bg-gradient-to-b from-white to-slate-50/80
              dark:bg-card dark:from-transparent dark:to-transparent dark:shadow-none">
              
              <div className="flex flex-col md:flex-row gap-6">
                <div className="relative w-full md:w-56 h-44 rounded-xl overflow-hidden flex-shrink-0 bg-muted group shadow-inner">
                  <img
                    src={pinnedAnnouncement.imageUrl || 'https://images.unsplash.com/photo-1557200134-90327ee9fafa?w=600&h=400&fit=crop'}
                    alt={pinnedAnnouncement.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {pinnedAnnouncement.is_pinned && (
                    <div className="absolute top-2 left-2 px-2.5 py-1 bg-amber-500 rounded-lg text-white text-[10px] font-black tracking-wider shadow inline-flex items-center gap-1">
                      <Pin className="h-3 w-3 fill-white" /> FIXADO
                    </div>
                  )}
                </div>
                
                <div className="flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border uppercase ${categoryStyles[pinnedAnnouncement.category]}`}>
                        {pinnedAnnouncement.category}
                      </span>
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">{pinnedAnnouncement.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed max-w-3xl whitespace-pre-wrap">
                      {pinnedAnnouncement.content}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-x-6 gap-y-2 py-2 border-t border-b border-border/50 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="font-medium text-foreground">
                        Publicado em {new Date(pinnedAnnouncement.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      <span className="font-medium text-foreground">
                        Por: {pinnedAnnouncement.author_name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      {isChiefAdmin && (
                        <Button
                          onClick={(e) => handleTogglePin(pinnedAnnouncement, e)}
                          disabled={submittingId === pinnedAnnouncement.id}
                          variant="outline"
                          size="sm"
                          className="font-semibold shadow-sm"
                        >
                          <Pin className="mr-1.5 h-3.5 w-3.5" /> Desafixar do Topo
                        </Button>
                      )}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="px-3 gap-1.5 text-xs">
                            <Share2 className="h-3.5 w-3.5" /> Partilhar
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48">
                          <DropdownMenuLabel>Opções</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuMenuItem onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/announcements/${pinnedAnnouncement.id}`)
                            toast.success('Link de acesso copiado!')
                          }}>
                            Copiar Link Direto
                          </DropdownMenuMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {isChiefAdmin && (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={(e) => handleEdit(pinnedAnnouncement, e)}>
                          <Edit2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={(e) => handleDelete(pinnedAnnouncement.id, e)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Filtros Avançados / Abas de Navegação de Categorias */}
        <div className="space-y-6 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-2 gap-4">
            <div className="flex flex-wrap gap-2 p-1 bg-muted rounded-xl w-full sm:w-auto">
              {[
                { id: 'all', label: 'Todos os Avisos' },
                { id: 'urgent', label: 'Urgentes' },
                { id: 'spiritual', label: 'Espiritual' },
                { id: 'event', label: 'Eventos' },
                { id: 'institutional', label: 'Institucional' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab.id ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {tab.label} {tab.id === 'all' ? `(${announcements.length})` : `(${announcements.filter(a => a.category === tab.id).length})`}
                </button>
              ))}
            </div>
          </div>

          {/* Grid de Cards Secundários */}
          {displayedAnnouncements.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedAnnouncements.map((announcement) => {
                return (
                  /* CARD SECUNDÁRIO CUMPRINDO A LEI ESTRITA DE LIGHT MODE APENAS */
                  <Card key={announcement.id} className="group flex flex-col h-full overflow-hidden border border-border bg-card hover:border-primary/40 transition-all hover:shadow-md rounded-2xl relative
                    bg-gradient-to-b from-white to-slate-50/80
                    dark:bg-card dark:from-transparent dark:to-transparent dark:shadow-none">
                    
                    <div className="relative h-44 bg-muted overflow-hidden">
                      <img
                        src={announcement.imageUrl || 'https://images.unsplash.com/photo-1557200134-90327ee9fafa?w=600&h=400&fit=crop'}
                        alt={announcement.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent" />
                      
                      <div className="absolute top-3 right-3 px-2 py-0.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-md text-[11px] font-bold text-white shadow-sm uppercase">
                        {announcement.category}
                      </div>
                      
                      {isChiefAdmin && (
                        <div className="absolute top-3 left-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm p-1 rounded-lg border border-white/10">
                          <Button size="sm" variant="ghost" onClick={(e) => handleTogglePin(announcement, e)} className={`h-7 w-7 p-0 ${announcement.is_pinned ? 'text-amber-400' : 'text-white'} hover:bg-white/20`}>
                            <Pin className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={(e) => handleEdit(announcement, e)} className="h-7 w-7 p-0 text-white hover:bg-white/20">
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={(e) => handleDelete(announcement.id, e)} className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/20">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <h4 className="text-lg font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors leading-snug">
                          {announcement.title}
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed whitespace-pre-wrap">
                          {announcement.content}
                        </p>
                      </div>

                      <div className="space-y-2 text-xs text-muted-foreground border-t border-border/60 pt-3">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-primary/70" />
                          <span className="font-medium text-foreground">
                            {new Date(announcement.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-primary/70" />
                          <span className="font-medium text-foreground truncate">Por: {announcement.author_name}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1">
                        <Button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/announcements/${announcement.id}`)
                            toast.success('Link do comunicado copiado para partilha!')
                          }}
                          size="sm"
                          variant="outline"
                          className="w-full font-semibold transition-all"
                        >
                          <Share2 className="mr-1.5 h-3.5 w-3.5" /> Partilhar Aviso
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={Megaphone}
              title="Mural limpo por enquanto"
              description="Nenhum comunicado oficial foi publicado sob esta categoria específica."
            />
          )}
        </div>

        {/* Rodapé de Conversão para Visitantes (Guests) */}
        {isGuest && announcements.length > 0 && (
          <div className="pt-4">
            <GuestPrompt
              title="Mantenha-se profundamente alinhado"
              description="Crie seu perfil oficial de membro para receber notificações push instantâneas a cada novo comunicado crítico emitido pela direção."
              actionLabel="Solicitar Vinculação"
              onAction={() => navigate('/about')}
            />
          </div>
        )}
      </div>

      {/* Editor Modal de Anúncios acoplado exatamente à assinatura do AgendaPage */}
      <AnnouncementEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        announcement={editingAnnouncement}
        onSuccess={handleEditorSuccess}
      />
    </Layout>
  )
}

export default AnnouncementsPage
