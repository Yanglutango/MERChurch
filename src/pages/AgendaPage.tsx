import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useAppStore } from '../stores/appStore'
import { Calendar, Clock, MapPin, Plus, Edit2, Trash2, CheckCircle2, Circle, Flame, Shield, UserPlus, Download, ExternalLink, Copy, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import type { Event } from '../types'
import { PageHeader } from '../components/shared/PageHeader'
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
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  
  const isGuest = user?.role === 'guest'
  const isMember = user?.role === 'member'
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    loadEvents()
    if (user && !isGuest) {
      loadRegistrations()
    }
  }, [user])

  const loadEvents = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('date', new Date().toISOString())
      .order('date', { ascending: true })

    if (error) {
      console.error('Error loading events:', error)
      setLoading(false)
      return
    }

    setEvents(data)
    setLoading(false)
  }

  // Per-event calendar popover state
  const [calPopover, setCalPopover] = useState<string | null>(null)

  const CalendarPopover = ({ event }: { event: Event }) => (
    calPopover === event.id ? (
      <div className="absolute z-50 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl p-2 min-w-[200px]" onClick={e => e.stopPropagation()}>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">Exportar para</p>
        <button onClick={() => { window.open(getGoogleCalendarUrl(event), '_blank'); setCalPopover(null) }}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-foreground hover:bg-muted rounded-lg transition-colors">
          <ExternalLink className="h-3.5 w-3.5 text-blue-500" />Google Calendar
        </button>
        <button onClick={() => { downloadICS(event); setCalPopover(null) }}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-foreground hover:bg-muted rounded-lg transition-colors">
          <Download className="h-3.5 w-3.5 text-primary" />Baixar .ICS
        </button>
        <button onClick={() => { window.open(getOutlookUrl(event), '_blank'); setCalPopover(null) }}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-foreground hover:bg-muted rounded-lg transition-colors">
          <Copy className="h-3.5 w-3.5 text-orange-500" />Outlook
        </button>
      </div>
    ) : null
  )

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
  }

  const handleEdit = (event: Event) => {
    setEditingEvent(event)
    setEditorOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este evento?')) return

    const { error } = await supabase.from('events').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir evento')
      return
    }

    toast.success('Evento excluído com sucesso!')
    loadEvents()
  }

  const toggleRegistration = async (eventId: string) => {
    const isRegistered = registeredEvents.includes(eventId)

    if (isRegistered) {
      const { error } = await supabase
        .from('event_attendees')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', user!.id)

      if (error) {
        toast.error('Erro ao cancelar inscrição')
        return
      }

      setRegisteredEvents(registeredEvents.filter((id) => id !== eventId))
      toast.success('Inscrição cancelada')
    } else {
      const { error } = await supabase.from('event_attendees').insert({
        event_id: eventId,
        user_id: user!.id,
      })

      if (error) {
        toast.error('Erro ao fazer inscrição')
        return
      }

      setRegisteredEvents([...registeredEvents, eventId])
      toast.success('Inscrição realizada!')
    }
  }

  if (loading) {
    return (
      <Layout title="Agenda">
        <LoadingState fullScreen message="Carregando eventos..." />
      </Layout>
    )
  }

  // Próximo evento (destaque)
  const nextEvent = events[0]
  
  return (
    <Layout title="Agenda">
      <div className="p-4 space-y-6">
        {/* Compact page header */}
        <div className="flex items-center justify-between gap-3 pb-1 border-b border-border">
          <div>
            <h1 className="text-xl font-bold text-foreground">Agenda</h1>
            <p className="text-sm text-muted-foreground">{events.length} eventos · {registeredEvents.length} confirmados</p>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={() => { setEditingEvent(null); setEditorOpen(true) }} className="bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-semibold">
              <Plus className="h-4 w-4 mr-1.5" />Criar Evento
            </Button>
          )}
          {isGuest && (
            <Button size="sm" onClick={() => navigate('/about')} className="bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-semibold">
              <UserPlus className="h-4 w-4 mr-1.5" />Entrar
            </Button>
          )}
        </div>

        {/* KEPT: Hero Contextual (below compact header) */}
        <Card className="relative overflow-hidden border-0 shadow-2xl rounded-2xl elevation-3 hidden md:block">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=1920&h=600&fit=crop&q=80"
              alt="Church Event"
              className="w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/95 via-pink-600/93 to-rose-600/91" />
          </div>
          
          <div className="relative z-10 p-6 md:p-10 lg:p-14 text-white">
            <div className="max-w-4xl space-y-5 md:space-y-7">
              <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-white/20 backdrop-blur-md rounded-full border border-white/30 shadow-lg">
                <Calendar className="h-4 w-4 md:h-5 md:w-5" />
                <span className="text-sm md:text-base font-bold tracking-wide">{isAdmin ? 'GESTÃO DE EVENTOS' : 'AGENDA MER'}</span>
              </div>

              <div className="space-y-4">
                {isGuest && (
                  <>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight">
                      Próximos{' '}
                      <span className="bg-gradient-to-r from-white via-yellow-200 to-white bg-clip-text text-transparent">
                        Encontros
                      </span>
                    </h1>
                    <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-medium leading-relaxed max-w-2xl">
                      Junte-se à nossa comunidade em momentos de celebração, adoração e crescimento espiritual.
                    </p>
                  </>
                )}
                
                {isMember && (
                  <>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight">
                      Sua Agenda Espiritual
                    </h1>
                    <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-medium leading-relaxed max-w-2xl">
                      Conecte-se com sua família espiritual. Confirme presença e não perca nenhum momento importante.
                    </p>
                  </>
                )}
                
                {isAdmin && (
                  <>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight flex items-center gap-3 md:gap-4 flex-wrap">
                      <Shield className="h-10 w-10 md:h-14 md:w-14 text-yellow-300" />
                      Gerenciar Agenda
                    </h1>
                    <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-medium leading-relaxed max-w-2xl">
                      Crie, edite e organize os eventos da casa. Acompanhe confirmações e engajamento da comunidade.
                    </p>
                  </>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {isAdmin && (
                  <AdminAction>
                    <Button
                      onClick={() => { setEditingEvent(null); setEditorOpen(true); }}
                      size="lg"
                      className="bg-white text-purple-600 hover:bg-white/95 font-bold px-7 py-6 rounded-full shadow-2xl transform hover:scale-105 transition-all"
                    >
                      <Plus className="mr-2 h-5 w-5" />
                      Criar Novo Evento
                    </Button>
                  </AdminAction>
                )}
                {!isGuest && events.length > 0 && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-2 border-white/80 text-white hover:bg-white/10 backdrop-blur-sm font-bold px-7 py-6 rounded-full"
                  >
                    <TrendingUp className="mr-2 h-5 w-5" />
                    {registeredEvents.length} Confirmados
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#D4A574]/20 to-transparent rounded-full blur-3xl" />
        </Card>

        {/* Próximo Evento em Destaque */}
        {nextEvent && (
          <Card className="p-6 md:p-8 border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-secondary/5 to-background shadow-xl elevation-3">
            <div className="flex flex-col md:flex-row gap-5 md:gap-6">
              <div className="relative w-full md:w-48 h-48 rounded-xl overflow-hidden flex-shrink-0 shadow-lg">
                <img
                  src={nextEvent.imageUrl || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=400&h=400&fit=crop'}
                  alt={nextEvent.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute top-3 right-3 px-3 py-1.5 bg-red-600 rounded-full text-white text-xs font-bold shadow-lg">
                  <Flame className="inline h-3 w-3 mr-1" />
                  PRÓXIMO
                </div>
              </div>
              
              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {nextEvent.category && (
                      <span className="px-3 py-1 bg-primary/20 text-primary text-xs font-bold rounded-full">
                        {nextEvent.category}
                      </span>
                    )}
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black text-foreground mb-2">{nextEvent.title}</h3>
                  {nextEvent.description && (
                    <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                      {nextEvent.description}
                    </p>
                  )}
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="flex items-center gap-2.5 text-foreground">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-sm">
                      <div className="font-bold">
                        {new Date(nextEvent.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 text-foreground">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-sm">
                      <div className="font-bold">
                        {new Date(nextEvent.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  {nextEvent.location && (
                    <div className="flex items-center gap-2.5 text-foreground">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <MapPin className="h-4 w-4 text-primary" />
                      </div>
                      <div className="text-sm font-bold truncate">{nextEvent.location}</div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  {!isGuest ? (
                    <>
                      <Button
                        onClick={() => toggleRegistration(nextEvent.id)}
                        className={`font-bold ${
                          registeredEvents.includes(nextEvent.id)
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'gradient-primary text-white'
                        }`}
                        size="lg"
                      >
                        {registeredEvents.includes(nextEvent.id) ? (
                          <>
                            <CheckCircle2 className="mr-2 h-5 w-5" />
                            Confirmado
                          </>
                        ) : (
                          <>
                            <Circle className="mr-2 h-5 w-5" />
                            Confirmar Presença
                          </>
                        )}
                      </Button>
                      
                      {registeredEvents.includes(nextEvent.id) && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={() => downloadICS(nextEvent)}
                            className="flex-1 sm:flex-none"
                          >
                            <Download className="mr-2 h-4 w-4" />
                            <span className="hidden md:inline">Exportar</span>
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <Button onClick={() => navigate('/about')} className="gradient-primary text-white font-bold" size="lg">
                      <UserPlus className="mr-2 h-5 w-5" />
                      Participar
                    </Button>
                  )}
                  
                  {isAdmin && (
                    <AdminAction>
                      <Button variant="outline" onClick={() => handleEdit(nextEvent)} size="lg">
                        <Edit2 className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                    </AdminAction>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Todos os Eventos */}
        {events.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-md">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                {isAdmin ? 'Todos os Eventos' : isGuest ? 'Próximos Encontros' : 'Agenda Completa'}
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {events.slice(nextEvent ? 1 : 0).map((event) => {
                const isRegistered = registeredEvents.includes(event.id)

                return (
                  <Card key={event.id} className="group overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-xl elevation-1">
                    <div className="relative h-48">
                      <img
                        src={event.imageUrl || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&h=400&fit=crop'}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      {event.category && (
                        <div className="absolute top-3 right-3 px-3 py-1.5 bg-primary/90 backdrop-blur-sm rounded-full text-white text-xs font-bold shadow-lg">
                          {event.category}
                        </div>
                      )}
                      {isAdmin && (
                        <AdminAction>
                          <div className="absolute top-3 left-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="sm" variant="secondary" onClick={() => handleEdit(event)} className="h-8 w-8 p-0 backdrop-blur-md">
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDelete(event.id)} className="h-8 w-8 p-0">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </AdminAction>
                      )}
                    </div>

                    <div className="p-5 md:p-6 space-y-4">
                      <h3 className="text-lg md:text-xl font-bold text-foreground line-clamp-2 leading-tight">{event.title}</h3>
                      
                      {event.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{event.description}</p>
                      )}

                      <div className="space-y-2.5 text-sm">
                        <div className="flex items-center gap-2.5 text-foreground">
                          <div className="p-1.5 bg-primary/10 rounded-lg">
                            <Calendar className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-semibold">
                            {new Date(event.date).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 text-foreground">
                          <div className="p-1.5 bg-primary/10 rounded-lg">
                            <Clock className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-semibold">
                            {new Date(event.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2.5 text-foreground">
                            <div className="p-1.5 bg-primary/10 rounded-lg">
                              <MapPin className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-semibold truncate">{event.location}</span>
                          </div>
                        )}
                      </div>

                      {!isGuest ? (
                        <div className="space-y-2">
                          <Button
                            onClick={() => toggleRegistration(event.id)}
                            className={`w-full font-semibold ${
                              isRegistered
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'gradient-primary text-white'
                            }`}
                          >
                            {isRegistered ? (
                              <>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Confirmado
                              </>
                            ) : (
                              <>
                                <Circle className="mr-2 h-4 w-4" />
                                Confirmar Presença
                              </>
                            )}
                          </Button>
                          
                          {isRegistered && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadICS(event)}
                              className="w-full"
                            >
                              <Download className="mr-2 h-3.5 w-3.5" />
                              Exportar Calendário
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Button onClick={() => navigate('/about')} className="w-full gradient-primary text-white font-semibold">
                          <UserPlus className="mr-2 h-4 w-4" />
                          Participar
                        </Button>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Guest Prompt */}
        {isGuest && events.length > 0 && (
          <GuestPrompt
            title="Conecte-se com a comunidade"
            description="Membros podem confirmar presença nos eventos, receber lembretes e acompanhar toda a agenda da casa."
            actionLabel="Tornar-se Membro"
            onAction={() => navigate('/about')}
          />
        )}

        {/* Empty State */}
        {events.length === 0 && (
          <EmptyState
            icon={Calendar}
            title={isAdmin ? 'Nenhum evento criado' : 'Nenhum evento programado'}
            description={isAdmin ? 'Crie o primeiro evento da agenda' : 'Novos encontros serão anunciados em breve'}
            action={
              isAdmin ? (
                <AdminAction>
                  <Button onClick={() => { setEditingEvent(null); setEditorOpen(true); }} className="gradient-primary text-white">
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Primeiro Evento
                  </Button>
                </AdminAction>
              ) : undefined
            }
          />
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
