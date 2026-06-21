import { useState, useEffect } from 'react'
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
  Calendar, Clock, MapPin, Plus, Edit2, Trash2, 
  CheckCircle2, Circle, Flame, Shield, UserPlus, 
  Download, ExternalLink, Copy, TrendingUp, Filter, Share2 
} from 'lucide-react'
import { toast } from 'sonner'
import type { Event } from '../types'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { AdminAction } from '../components/shared/AdminAction'
import { GuestPrompt } from '../components/shared/GuestPrompt'
import { EventEditor } from '../components/admin/EventEditor'
import { downloadICS, getGoogleCalendarUrl, getOutlookUrl } from '../lib/calendarExporter'

const AgendaPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useAppStore()
  
  const [events, setEvents] = useState<Event[]>([])
  const [registeredEvents, setRegisteredEvents] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'registered'>('all')
  
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  
  const isGuest = user?.role === 'guest'
  const isMember = user?.role === 'member'
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    const initPage = async () => {
      setLoading(true)
      await loadEvents()
      if (user && !isGuest) {
        await loadRegistrations()
      }
      setLoading(false)
    }
    initPage()
  }, [user])

  const loadEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('date', new Date().toISOString())
      .order('date', { ascending: true })

    if (error) {
      console.error('Error loading events:', error)
      toast.error('Não foi possível carregar os eventos')
      return
    }
    setEvents(data || [])
  }

  const loadRegistrations = async () => {
    if (!user || isGuest) return
    const { data, error } = await supabase
      .from('event_attendees')
      .select('event_id')
      .eq('user_id', user.id)

    if (error) {
      console.error('Error loading registrations:', error)
      return
    }
    setRegisteredEvents(data.map((r) => r.event_id))
  }

  const handleEditorSuccess = () => {
    loadEvents()
    setEditingEvent(null)
    setEditorOpen(false)
  }

  const handleEdit = (event: Event, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingEvent(event)
    setEditorOpen(true)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    toast('Excluir evento?', {
      description: 'Esta ação não poderá ser desfeita.',
      action: {
        label: 'Excluir',
        onClick: async () => {
          const { error } = await supabase.from('events').delete().eq('id', id)
          if (error) {
            toast.error('Erro ao excluir evento')
            return
          }
          toast.success('Evento excluído com sucesso!')
          loadEvents()
        },
      },
    })
  }

  const toggleRegistration = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user || isGuest) {
      navigate('/about')
      return
    }

    const isRegistered = registeredEvents.includes(eventId)
    setSubmittingId(eventId)

    // Atualização Otimista na UI
    if (isRegistered) {
      setRegisteredEvents(prev => prev.filter(id => id !== eventId))
    } else {
      setRegisteredEvents(prev => [...prev, eventId])
    }

    if (isRegistered) {
      const { error } = await supabase
        .from('event_attendees')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', user.id)

      if (error) {
        toast.error('Erro ao cancelar inscrição')
        setRegisteredEvents(prev => [...prev, eventId]) // Reverte se falhar
      } else {
        toast.success('Inscrição cancelada')
      }
    } {
      const { error } = await supabase.from('event_attendees').insert({
        event_id: eventId,
        user_id: user.id,
      })

      if (error) {
        toast.error('Erro ao fazer inscrição')
        setRegisteredEvents(prev => prev.filter(id => id !== eventId)) // Reverte se falhar
      } else {
        toast.success('Sua presença foi confirmada!')
      }
    }
    setSubmittingId(null)
  }

  if (loading) {
    return (
      <Layout title="Agenda">
        <LoadingState fullScreen message="Sincronizando compromissos..." />
      </Layout>
    )
  }

  const nextEvent = events[0]
  const displayedEvents = activeTab === 'all' 
    ? (nextEvent ? events.slice(1) : events)
    : events.filter(e => registeredEvents.includes(e.id))

  return (
    <Layout title="Agenda">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-8">
        
        {/* Header Principal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">Agenda de Atividades</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {events.length} {events.length === 1 ? 'evento localizado' : 'eventos localizados'} · {registeredEvents.length} confirmados
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button size="default" onClick={() => { setEditingEvent(null); setEditorOpen(true) }} className="w-full sm:w-auto bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-medium shadow-sm transition-all">
                <Plus className="h-4 w-4 mr-2" />Criar Evento
              </Button>
            )}
            {isGuest && (
              <Button size="default" onClick={() => navigate('/about')} className="w-full sm:w-auto bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-medium shadow-sm transition-all">
                <UserPlus className="h-4 w-4 mr-2" />Entrar na Comunidade
              </Button>
            )}
          </div>
        </div>

        {/* Hero Contextual */}
        <Card className="relative overflow-hidden border-0 shadow-xl rounded-2xl hidden md:block group">
          <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105">
            <img
              src="https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=1920&h=600&fit=crop&q=80"
              alt="Church Banner"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/95 via-purple-900/90 to-slate-900/90" />
          </div>
          
          <div className="relative z-10 p-8 md:p-12 text-white">
            <div className="max-w-3xl space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 shadow-sm">
                <Calendar className="h-4 w-4 text-purple-300" />
                <span className="text-xs font-bold tracking-wider uppercase text-purple-200">
                  {isAdmin ? 'Módulo Administrativo' : 'Comunidade Ativa'}
                </span>
              </div>

              <div className="space-y-3">
                <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
                  {isAdmin ? 'Gerencie a Agenda Casa' : isMember ? 'Sua Agenda de Crescimento' : 'Descubra Nossos Encontros'}
                </h2>
                <p className="text-base md:text-lg text-slate-200/90 font-normal leading-relaxed max-w-2xl">
                  {isAdmin 
                    ? 'Monitore o engajamento de membros, organize salas, horários e disponibilize programações completas.' 
                    : 'Acompanhe e participe ativamente de cultos, comunhões, vigílias e programações especiais estruturadas para você.'}
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                {!isGuest && events.length > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    Você possui {registeredEvents.length} presenças confirmadas
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Card Destaque: Próximo Evento Cronológico */}
        {nextEvent && activeTab === 'all' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500 animate-pulse" /> Evento de Destaque Imediato
              </span>
            </div>
            <Card className="p-5 md:p-6 border border-orange-500/20 bg-gradient-to-br from-orange-500/[0.02] via-transparent to-transparent shadow-md hover:shadow-lg transition-all rounded-2xl">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="relative w-full md:w-56 h-44 rounded-xl overflow-hidden flex-shrink-0 bg-muted group shadow-inner">
                  <img
                    src={nextEvent.imageUrl || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&h=400&fit=crop'}
                    alt={nextEvent.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-2 left-2 px-2.5 py-1 bg-red-600 rounded-lg text-white text-[10px] font-black tracking-wider shadow">
                    EM BREVE
                  </div>
                </div>
                
                <div className="flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {nextEvent.category && (
                        <span className="px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-md">
                          {nextEvent.category}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">{nextEvent.title}</h3>
                    {nextEvent.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed max-w-3xl">
                        {nextEvent.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-x-6 gap-y-2 py-2 border-t border-b border-border/50 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="font-medium text-foreground">
                        {new Date(nextEvent.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="font-medium text-foreground">
                        {new Date(nextEvent.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} h
                      </span>
                    </div>
                    {nextEvent.location && (
                      <div className="flex items-center gap-2 max-w-xs">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="font-medium text-foreground truncate">{nextEvent.location}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={(e) => toggleRegistration(nextEvent.id, e)}
                        disabled={submittingId === nextEvent.id}
                        className={`font-semibold shadow-sm px-5 ${
                          registeredEvents.includes(nextEvent.id)
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-primary hover:bg-primary/90 text-white'
                        }`}
                      >
                        {registeredEvents.includes(nextEvent.id) ? (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Presença Confirmada
                          </>
                        ) : (
                          <>
                            <Circle className="mr-2 h-4 w-4" /> Confirmar Minha Presença
                          </>
                        )}
                      </Button>

                      {registeredEvents.includes(nextEvent.id) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon">
                              <Share2 className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-48">
                            <DropdownMenuLabel>Sincronizar</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => window.open(getGoogleCalendarUrl(nextEvent), '_blank')}>
                              <ExternalLink className="mr-2 h-4 w-4 text-blue-500" /> Google Agenda
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.open(getOutlookUrl(nextEvent), '_blank')}>
                              <Copy className="mr-2 h-4 w-4 text-orange-500" /> Outlook Web
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => downloadICS(nextEvent)}>
                              <Download className="mr-2 h-4 w-4 text-emerald-500" /> Arquivo .iCal
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={(e) => handleEdit(nextEvent, e)}>
                          <Edit2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={(e) => handleDelete(nextEvent.id, e)}>
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

        {/* Seção Filtros Avançados / Abas de Navegação */}
        <div className="space-y-6 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-2 gap-4">
            <div className="flex gap-2 p-1 bg-muted rounded-xl w-full sm:w-auto">
              <button 
                onClick={() => setActiveTab('all')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'all' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Todos os Eventos ({events.length})
              </button>
              {!isGuest && (
                <button 
                  onClick={() => setActiveTab('registered')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'registered' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Minha Agenda ({registeredEvents.length})
                </button>
              )}
            </div>
          </div>

          {/* Grid de Cards Secundários */}
          {displayedEvents.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedEvents.map((event) => {
                const isRegistered = registeredEvents.includes(event.id)

                return (
                  <Card key={event.id} className="group flex flex-col h-full overflow-hidden border border-border bg-card hover:border-primary/40 transition-all hover:shadow-md rounded-2xl relative">
                    <div className="relative h-44 bg-muted overflow-hidden">
                      <img
                        src={event.imageUrl || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&h=400&fit=crop'}
                        alt={event.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent" />
                      
                      {event.category && (
                        <div className="absolute top-3 right-3 px-2 py-0.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-md text-[11px] font-bold text-white shadow-sm">
                          {event.category}
                        </div>
                      )}
                      
                      {isAdmin && (
                        <div className="absolute top-3 left-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm p-1 rounded-lg border border-white/10">
                          <Button size="sm" variant="ghost" onClick={(e) => handleEdit(event, e)} className="h-7 w-7 p-0 text-white hover:bg-white/20">
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={(e) => handleDelete(event.id, e)} className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/20">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <h4 className="text-lg font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors leading-snug">
                          {event.title}
                        </h4>
                        {event.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {event.description}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2 text-xs text-muted-foreground border-t border-border/60 pt-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-primary/70" />
                          <span className="font-medium text-foreground">
                            {new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-primary/70" />
                          <span className="font-medium text-foreground">
                            {new Date(event.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} h
                          </span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2 truncate">
                            <MapPin className="h-3.5 w-3.5 text-primary/70" />
                            <span className="font-medium text-foreground truncate">{event.location}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 pt-1">
                        <Button
                          onClick={(e) => toggleRegistration(event.id, e)}
                          disabled={submittingId === event.id}
                          size="sm"
                          variant={isRegistered ? "outline" : "default"}
                          className={`w-full font-semibold transition-all ${
                            isRegistered 
                              ? 'border-emerald-600/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100/50' 
                              : ''
                          }`}
                        >
                          {isRegistered ? (
                            <>
                              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Confirmado
                            </>
                          ) : (
                            <>
                              <Circle className="mr-1.5 h-3.5 w-3.5" /> Confirmar presença
                            </>
                          )}
                        </Button>

                        {isRegistered && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="px-2">
                                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => window.open(getGoogleCalendarUrl(event), '_blank')}>
                                Google Agenda
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => window.open(getOutlookUrl(event), '_blank')}>
                                Outlook Web
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => downloadICS(event)}>
                                Baixar .ics
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={Calendar}
              title={activeTab === 'all' ? 'Sem eventos por enquanto' : 'Nenhuma confirmação realizada'}
              description={activeTab === 'all' ? 'Não localizamos atividades futuras agendadas para este período.' : 'Seus eventos confirmados serão listados nesta aba.'}
            />
          )}
        </div>

        {/* Rodapé de Conversão para Guests */}
        {isGuest && events.length > 0 && (
          <div className="pt-4">
            <GuestPrompt
              title="Participe integralmente de nossa comunidade"
              description="Efetue seu cadastro para salvar agendas personalizadas, sincronizar calendários externos e receber notificações em tempo real."
              actionLabel="Realizar Cadastro"
              onAction={() => navigate('/about')}
            />
          </div>
        )}
      </div>

      <EventEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        event={editingEvent}
        onSuccess={handleEditorSuccess}
      />
    </Layout>
  )
}

export default AgendaPage
