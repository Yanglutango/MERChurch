import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useAppStore } from '../stores/appStore'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog'
import {
  Calendar, Clock, MapPin, Plus, Edit2, Trash2,
  CheckCircle2, Circle, Flame, UserPlus,
  Download, ExternalLink, FileDown, TrendingUp, Share2, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Event } from '../types'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { EventEditor } from '../components/admin/EventEditor'
import { downloadICS, getGoogleCalendarUrl, getOutlookUrl } from '../lib/calendarExporter'
import { GuestPrompt } from '../components/shared/GuestPrompt'

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
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const isGuest = user?.role === 'guest'
  const isMember = user?.role === 'member'
  const isAdmin = user?.role === 'admin'

  const loadEvents = useCallback(async () => {
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
  }, [])

  const loadRegistrations = useCallback(async () => {
    if (!user?.id || user?.role === 'guest') return
    const { data, error } = await supabase
      .from('event_attendees')
      .select('event_id')
      .eq('user_id', user.id)

    if (error) {
      console.error('Error loading registrations:', error)
      return
    }
    setRegisteredEvents(data.map((r) => r.event_id))
  }, [user?.id, user?.role])

  useEffect(() => {
    let isMounted = true

    const initPage = async () => {
      setLoading(true)
      await loadEvents()
      if (user?.id && user?.role !== 'guest') {
        await loadRegistrations()
      }
      if (isMounted) setLoading(false)
    }

    initPage()

    return () => { isMounted = false }
  }, [user?.id, user?.role, loadEvents, loadRegistrations])

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

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteTargetId(id)
  }

  // Confirmação agora via AlertDialog — alinhado com o padrão usado em
  // Comunidade, Departamentos e Recursos. O toast com botão de ação era
  // o único fluxo de exclusão da app fora desse padrão.
  const confirmDelete = async () => {
    if (!deleteTargetId) return
    setDeleting(true)
    const { error } = await supabase.from('events').delete().eq('id', deleteTargetId)
    setDeleting(false)
    setDeleteTargetId(null)

    if (error) {
      toast.error('Erro ao excluir evento')
      return
    }
    toast.success('Evento excluído')
    loadEvents()
  }

  const toggleRegistration = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user || isGuest) {
      navigate('/about')
      return
    }

    const isRegistered = registeredEvents.includes(eventId)
    setSubmittingId(eventId)

    setRegisteredEvents(prev =>
      isRegistered ? prev.filter(id => id !== eventId) : [...prev, eventId]
    )

    if (isRegistered) {
      const { error } = await supabase
        .from('event_attendees')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', user.id)

      if (error) {
        toast.error('Erro ao cancelar inscrição')
        setRegisteredEvents(prev => [...prev, eventId])
      } else {
        toast.success('Inscrição cancelada')
      }
    } else {
      const { error } = await supabase.from('event_attendees').insert({
        event_id: eventId,
        user_id: user.id,
      })

      if (error) {
        toast.error('Erro ao fazer inscrição')
        setRegisteredEvents(prev => prev.filter(id => id !== eventId))
      } else {
        toast.success('Sua presença foi confirmada')
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
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 space-y-6">

        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Agenda de Atividades</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {events.length} {events.length === 1 ? 'evento' : 'eventos'} · {registeredEvents.length} confirmados
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button onClick={() => { setEditingEvent(null); setEditorOpen(true) }} className="w-full sm:w-auto rounded-md">
                <Plus className="h-4 w-4 mr-1.5" />Criar Evento
              </Button>
            )}
            {isGuest && (
              <Button onClick={() => navigate('/about')} className="w-full sm:w-auto rounded-md">
                <UserPlus className="h-4 w-4 mr-1.5" />Entrar na Comunidade
              </Button>
            )}
          </div>
        </div>

        {/* Faixa contextual — simplificada, sem gradiente de cor fora da
            paleta e mostrada em TODOS os tamanhos de ecrã (antes existia só
            em desktop; mobile ficava sem qualquer contexto introdutório). */}
        <Card className="p-4 border rounded-lg bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              {isAdmin ? 'Gestão da agenda da casa' : isMember ? 'Sua agenda de crescimento' : 'Descubra nossos encontros'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isAdmin
                ? 'Organize datas, salas e programações completas.'
                : 'Acompanhe cultos, comunhões e programações especiais.'}
            </p>
          </div>
          {!isGuest && events.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-md text-xs font-medium text-foreground flex-shrink-0">
              <TrendingUp className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
              {registeredEvents.length} presenças confirmadas
            </div>
          )}
        </Card>

        {/* Próximo evento em destaque */}
        {nextEvent && activeTab === 'all' && (
          <div className="space-y-3">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />Próximo evento
            </span>

            <Card className="p-5 border rounded-lg">
              <div className="flex flex-col md:flex-row gap-5">
                <div className="relative w-full md:w-52 h-40 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                  <img
                    src={nextEvent.imageUrl || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&h=400&fit=crop'}
                    alt={nextEvent.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    {nextEvent.category && (
                      <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-md">
                        {nextEvent.category}
                      </span>
                    )}
                    <h3 className="text-lg font-semibold text-foreground">{nextEvent.title}</h3>
                    {nextEvent.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {nextEvent.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-x-5 gap-y-1.5 py-2.5 border-t border-border text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" strokeWidth={1.75} />
                      <span className="font-medium text-foreground">
                        {new Date(nextEvent.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" strokeWidth={1.75} />
                      <span className="font-medium text-foreground">
                        {new Date(nextEvent.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h
                      </span>
                    </span>
                    {nextEvent.location && (
                      <span className="flex items-center gap-1.5 truncate">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.75} />
                        <span className="font-medium text-foreground truncate">{nextEvent.location}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={(e) => toggleRegistration(nextEvent.id, e)}
                        disabled={submittingId === nextEvent.id}
                        variant={registeredEvents.includes(nextEvent.id) ? 'outline' : 'default'}
                        className="rounded-md"
                      >
                        {registeredEvents.includes(nextEvent.id)
                          ? <><CheckCircle2 className="mr-1.5 h-4 w-4" />Presença confirmada</>
                          : <><Circle className="mr-1.5 h-4 w-4" />Confirmar presença</>}
                      </Button>

                      {registeredEvents.includes(nextEvent.id) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="rounded-md" aria-label="Sincronizar com calendário">
                              <Share2 className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-48 rounded-md">
                            <DropdownMenuLabel>Sincronizar</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => window.open(getGoogleCalendarUrl(nextEvent), '_blank')}>
                              <ExternalLink className="mr-2 h-4 w-4 text-muted-foreground" />Google Agenda
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.open(getOutlookUrl(nextEvent), '_blank')}>
                              <ExternalLink className="mr-2 h-4 w-4 text-muted-foreground" />Outlook Web
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => downloadICS(nextEvent)}>
                              <FileDown className="mr-2 h-4 w-4 text-muted-foreground" />Arquivo .iCal
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-0.5">
                        <Button variant="ghost" size="icon" onClick={(e) => handleEdit(nextEvent, e)} className="h-8 w-8 rounded-md" aria-label="Editar evento">
                          <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={(e) => handleDeleteClick(nextEvent.id, e)} className="h-8 w-8 rounded-md" aria-label="Excluir evento">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Abas */}
        <div className="flex gap-1 p-1 bg-muted rounded-md w-full sm:w-fit">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-sm text-xs font-medium transition-colors ${
              activeTab === 'all' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Todos os Eventos ({events.length})
          </button>
          {!isGuest && (
            <button
              onClick={() => setActiveTab('registered')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-sm text-xs font-medium transition-colors ${
                activeTab === 'registered' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Minha Agenda ({registeredEvents.length})
            </button>
          )}
        </div>

        {/* Grid de eventos */}
        {displayedEvents.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedEvents.map((event) => {
              const isRegistered = registeredEvents.includes(event.id)

              return (
                <Card key={event.id} className="group flex flex-col h-full overflow-hidden border rounded-lg">
                  <div className="relative h-36 bg-muted overflow-hidden">
                    <img
                      src={event.imageUrl || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&h=400&fit=crop'}
                      alt={event.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {event.category && (
                      <div className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-background/90 backdrop-blur-sm border border-border rounded-md text-[11px] font-medium text-foreground">
                        {event.category}
                      </div>
                    )}
                    {isAdmin && (
                      <div className="absolute top-2.5 left-2.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur-sm p-0.5 rounded-md border border-border">
                        <Button size="sm" variant="ghost" onClick={(e) => handleEdit(event, e)} className="h-6 w-6 p-0" aria-label="Editar evento">
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={(e) => handleDeleteClick(event.id, e)} className="h-6 w-6 p-0" aria-label="Excluir evento">
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium text-foreground line-clamp-1">{event.title}</h4>
                      {event.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {event.description}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs text-muted-foreground border-t border-border pt-2.5">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" strokeWidth={1.75} />
                        <span className="font-medium text-foreground">
                          {new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" strokeWidth={1.75} />
                        <span className="font-medium text-foreground">
                          {new Date(event.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h
                        </span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="h-3 w-3 flex-shrink-0" strokeWidth={1.75} />
                          <span className="font-medium text-foreground truncate">{event.location}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        onClick={(e) => toggleRegistration(event.id, e)}
                        disabled={submittingId === event.id}
                        size="sm"
                        variant={isRegistered ? 'outline' : 'default'}
                        className="w-full rounded-md"
                      >
                        {isRegistered
                          ? <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Confirmado</>
                          : <><Circle className="mr-1.5 h-3.5 w-3.5" />Confirmar</>}
                      </Button>

                      {isRegistered && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="px-2 rounded-md flex-shrink-0" aria-label="Sincronizar com calendário">
                              <Download className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 rounded-md">
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
            description={activeTab === 'all' ? 'Não há atividades futuras agendadas para este período.' : 'Seus eventos confirmados serão listados aqui.'}
          />
        )}

        {isGuest && events.length > 0 && (
          <GuestPrompt
            title="Participe integralmente de nossa comunidade"
            description="Cadastre-se para salvar agendas personalizadas, sincronizar calendários externos e receber notificações em tempo real."
            actionLabel="Realizar Cadastro"
            onAction={() => navigate('/about')}
          />
        )}
      </div>

      <EventEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        event={editingEvent}
        onSuccess={handleEditorSuccess}
      />

      <AlertDialog open={!!deleteTargetId} onOpenChange={open => { if (!open) setDeleteTargetId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  )
}

export default AgendaPage
