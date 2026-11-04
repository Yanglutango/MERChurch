import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog'
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Circle,
  Flame,
  UserPlus,
  Download,
  ExternalLink,
  FileDown,
  TrendingUp,
  Share2,
  Loader2,
  CalendarDays,
  Users,
  ArrowUpRight,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Event } from '../types'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { EventEditor } from '../components/admin/EventEditor'
import { downloadICS, getGoogleCalendarUrl, getOutlookUrl } from '../lib/calendarExporter'
import { GuestPrompt } from '../components/shared/GuestPrompt'

const FALLBACK_EVENT_IMAGE = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=900&h=600&fit=crop'

const formatEventDate = (value: string, options: Intl.DateTimeFormatOptions) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Data a confirmar' : date.toLocaleDateString('pt-BR', options)
}

const formatEventTime = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Horário a confirmar' : `${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h`
}

const openCalendarUrl = (url: string) => {
  const parsedUrl = new URL(url, window.location.origin)
  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    toast.error('Não foi possível abrir o calendário.')
    return
  }
  window.open(parsedUrl.href, '_blank', 'noopener,noreferrer')
}

const AgendaPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

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
    if (!user?.id || user.role === 'guest') return

    const { data, error } = await supabase
      .from('event_attendees')
      .select('event_id')
      .eq('user_id', user.id)

    if (error) {
      console.error('Error loading registrations:', error)
      return
    }

    setRegisteredEvents((data || []).map(registration => registration.event_id))
  }, [user?.id, user?.role])

  useEffect(() => {
    let isMounted = true

    const initialize = async () => {
      setLoading(true)
      await Promise.all([
        loadEvents(),
        user?.id && user.role !== 'guest' ? loadRegistrations() : Promise.resolve(),
      ])
      if (isMounted) setLoading(false)
    }

    void initialize()
    return () => { isMounted = false }
  }, [user?.id, user?.role, loadEvents, loadRegistrations])

  const handleEditorSuccess = () => {
    void loadEvents()
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
    void loadEvents()
  }

  const toggleRegistration = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user || isGuest) {
      navigate('/about')
      return
    }

    const wasRegistered = registeredEvents.includes(eventId)
    setSubmittingId(eventId)
    setRegisteredEvents(current => wasRegistered
      ? current.filter(id => id !== eventId)
      : [...current, eventId])

    try {
      const result = wasRegistered
        ? await supabase
          .from('event_attendees')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', user.id)
        : await supabase.from('event_attendees').insert({ event_id: eventId, user_id: user.id })

      if (result.error) throw result.error
      toast.success(wasRegistered ? 'Inscrição cancelada' : 'Sua presença foi confirmada')
    } catch (error) {
      console.error('Error updating event registration:', error)
      setRegisteredEvents(current => wasRegistered
        ? current.includes(eventId) ? current : [...current, eventId]
        : current.filter(id => id !== eventId))
      toast.error(wasRegistered ? 'Erro ao cancelar inscrição' : 'Erro ao fazer inscrição')
    } finally {
      setSubmittingId(null)
    }
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
    : events.filter(event => registeredEvents.includes(event.id))

  const calendarMenu = (event: Event, align: 'start' | 'end' = 'end') => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
          aria-label="Sincronizar com calendário"
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-52 rounded-xl">
        <DropdownMenuLabel>Adicionar ao calendário</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => openCalendarUrl(getGoogleCalendarUrl(event))}>
          <ExternalLink className="mr-2 h-4 w-4 text-muted-foreground" />Google Agenda
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openCalendarUrl(getOutlookUrl(event))}>
          <ExternalLink className="mr-2 h-4 w-4 text-muted-foreground" />Outlook Web
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadICS(event)}>
          <FileDown className="mr-2 h-4 w-4 text-muted-foreground" />Arquivo .iCal
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <Layout title="Agenda">
      <div className="min-h-screen bg-[#f5f7f8] text-slate-900 dark:bg-[#07111c] dark:text-slate-50">
        <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
          <section className="relative overflow-hidden rounded-[30px] bg-slate-950 shadow-[0_26px_75px_rgba(15,23,42,0.2)]">
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(216,176,122,0.26),transparent_30%),linear-gradient(120deg,#07111c,#0a2e4a_65%,#153b50)]" />
              <div className="absolute -right-20 -top-32 h-80 w-80 rounded-full border border-white/10" />
              <div className="absolute -right-8 -top-20 h-56 w-56 rounded-full border border-white/10" />
            </div>

            <div className="relative z-10 flex flex-col gap-6 p-6 md:p-8 lg:flex-row lg:items-end lg:justify-between lg:p-10">
              <div className="max-w-3xl space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.23em] text-slate-100">
                  <CalendarDays className="h-4 w-4 text-[#d8b07a]" />
                  Vida da comunidade · MER
                </div>
                <div className="space-y-3">
                  <h1 className="text-3xl font-black tracking-[-0.06em] text-white md:text-5xl">
                    Encontros que nos <span className="text-[#d8b07a]">aproximam</span>
                  </h1>
                  <p className="max-w-2xl text-sm leading-relaxed text-slate-200 md:text-base">
                    Cultos, comunhões e momentos especiais para crescer na fé e viver a missão juntos.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-200">
                  <span className="rounded-full border border-white/15 bg-white/8 px-3 py-1.5">{events.length} {events.length === 1 ? 'evento futuro' : 'eventos futuros'}</span>
                  {!isGuest && <span className="rounded-full border border-white/15 bg-white/8 px-3 py-1.5">{registeredEvents.length} confirmações</span>}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {isAdmin && (
                  <Button onClick={() => { setEditingEvent(null); setEditorOpen(true) }} className="h-12 rounded-full bg-[#d8b07a] px-6 font-bold text-slate-900 shadow-[0_16px_30px_rgba(216,176,122,0.28)] hover:bg-[#e3c28d]">
                    <Plus className="mr-2 h-4 w-4" />Criar evento
                  </Button>
                )}
                {isGuest && (
                  <Button onClick={() => navigate('/about')} className="h-12 rounded-full bg-white px-6 font-bold text-slate-900 hover:bg-slate-100">
                    <UserPlus className="mr-2 h-4 w-4" />Conheça a comunidade
                  </Button>
                )}
              </div>
            </div>
          </section>

          <Card className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f4eee4] text-[#927044] dark:bg-amber-900/20 dark:text-[#d8b07a]">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {isAdmin ? 'Organize a vida da igreja' : isMember ? 'Planeje sua participação' : 'Encontre seu próximo encontro'}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {isAdmin ? 'Mantenha datas, locais e informações dos eventos atualizados.' : 'Consulte os próximos encontros e confirme sua presença com facilidade.'}
                </p>
              </div>
            </div>
            {!isGuest && events.length > 0 && (
              <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                {registeredEvents.length} presenças confirmadas
              </div>
            )}
          </Card>

          {nextEvent && activeTab === 'all' && (
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                <Flame className="h-4 w-4 text-[#b58a54]" />Próximo encontro
              </div>

              <Card className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="grid md:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.4fr)]">
                  <div className="relative min-h-56 bg-slate-100 dark:bg-slate-800 md:min-h-full">
                    <img
                      src={nextEvent.imageUrl || FALLBACK_EVENT_IMAGE}
                      alt={nextEvent.title}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-black/10" />
                    {nextEvent.category && (
                      <span className="absolute left-4 top-4 rounded-full border border-white/20 bg-slate-950/65 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white backdrop-blur-md">
                        {nextEvent.category}
                      </span>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-col justify-between gap-5 p-5 md:p-7">
                    <div className="space-y-3">
                      <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#9a7447] dark:text-[#d8b07a]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#d8b07a]" />
                        Em breve
                      </div>
                      <h2 className="text-2xl font-black tracking-[-0.05em] text-slate-900 dark:text-white md:text-3xl">{nextEvent.title}</h2>
                      {nextEvent.description && <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">{nextEvent.description}</p>}
                    </div>

                    <div className="grid gap-3 border-y border-slate-200 py-4 text-sm dark:border-slate-800 sm:grid-cols-2">
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Data e hora</p>
                          <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100">{formatEventDate(nextEvent.date, { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{formatEventTime(nextEvent.date)}</p>
                        </div>
                      </div>
                      {nextEvent.location && (
                        <div className="flex min-w-0 items-start gap-2.5">
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            <MapPin className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Local</p>
                            <p className="mt-0.5 truncate font-semibold text-slate-800 dark:text-slate-100">{nextEvent.location}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          onClick={e => toggleRegistration(nextEvent.id, e)}
                          disabled={submittingId === nextEvent.id}
                          variant={registeredEvents.includes(nextEvent.id) ? 'outline' : 'default'}
                          className={`h-11 rounded-full px-5 font-semibold ${registeredEvents.includes(nextEvent.id) ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-[#0A2E4A] text-white hover:bg-[#0d3a5c]'}`}
                        >
                          {submittingId === nextEvent.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : registeredEvents.includes(nextEvent.id) ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Circle className="mr-2 h-4 w-4" />}
                          {registeredEvents.includes(nextEvent.id) ? 'Presença confirmada' : 'Confirmar presença'}
                        </Button>
                        {registeredEvents.includes(nextEvent.id) && calendarMenu(nextEvent, 'start')}
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={e => handleEdit(nextEvent, e)} className="h-9 w-9 rounded-xl" aria-label="Editar evento">
                            <Edit2 className="h-4 w-4 text-slate-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={e => handleDeleteClick(nextEvent.id, e)} className="h-9 w-9 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20" aria-label="Excluir evento">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </section>
          )}

          <div className="flex w-full gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:w-fit" role="tablist" aria-label="Filtrar eventos">
            <button
              role="tab"
              aria-selected={activeTab === 'all'}
              onClick={() => setActiveTab('all')}
              className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-bold transition-all sm:flex-none ${activeTab === 'all' ? 'bg-[#0A2E4A] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'}`}
            >
              Todos os eventos <span className="ml-1 opacity-70">{events.length}</span>
            </button>
            {!isGuest && (
              <button
                role="tab"
                aria-selected={activeTab === 'registered'}
                onClick={() => setActiveTab('registered')}
                className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-bold transition-all sm:flex-none ${activeTab === 'registered' ? 'bg-[#0A2E4A] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'}`}
              >
                Minha agenda <span className="ml-1 opacity-70">{registeredEvents.length}</span>
              </button>
            )}
          </div>

          {displayedEvents.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {displayedEvents.map(event => {
                const isRegistered = registeredEvents.includes(event.id)

                return (
                  <Card key={event.id} className="group flex h-full flex-col overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
                    <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img
                        src={event.imageUrl || FALLBACK_EVENT_IMAGE}
                        alt={event.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                      {event.category && (
                        <div className="absolute right-3 top-3 rounded-full border border-white/20 bg-slate-950/65 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur-md">
                          {event.category}
                        </div>
                      )}
                      {isAdmin && (
                        <div className="absolute left-3 top-3 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                          <Button size="icon" variant="secondary" onClick={e => handleEdit(event, e)} className="h-8 w-8 rounded-full border border-white/20 bg-white/90 p-0 text-slate-900 shadow-sm hover:bg-white" aria-label="Editar evento">
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="destructive" onClick={e => handleDeleteClick(event.id, e)} className="h-8 w-8 rounded-full p-0 shadow-sm" aria-label="Excluir evento">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col gap-4 p-4">
                      <div className="space-y-2">
                        <h3 className="line-clamp-2 text-base font-black leading-snug tracking-[-0.035em] text-slate-900 dark:text-white">{event.title}</h3>
                        {event.description && <p className="line-clamp-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{event.description}</p>}
                      </div>

                      <div className="mt-auto space-y-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <Calendar className="h-3.5 w-3.5 text-[#9a7447] dark:text-[#d8b07a]" />
                          <span className="font-semibold">{formatEventDate(event.date, { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          <span className="text-slate-400">·</span>
                          <Clock className="h-3.5 w-3.5 text-[#9a7447] dark:text-[#d8b07a]" />
                          <span className="font-semibold">{formatEventTime(event.date)}</span>
                        </div>
                        {event.location && (
                          <div className="flex min-w-0 items-center gap-2 text-slate-600 dark:text-slate-300">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#9a7447] dark:text-[#d8b07a]" />
                            <span className="truncate font-medium">{event.location}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          onClick={e => toggleRegistration(event.id, e)}
                          disabled={submittingId === event.id}
                          size="sm"
                          variant={isRegistered ? 'outline' : 'default'}
                          className={`h-10 flex-1 rounded-full font-semibold ${isRegistered ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-[#0A2E4A] text-white hover:bg-[#0d3a5c]'}`}
                        >
                          {submittingId === event.id ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : isRegistered ? <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> : <Circle className="mr-2 h-3.5 w-3.5" />}
                          {isRegistered ? 'Confirmado' : 'Confirmar presença'}
                        </Button>
                        {isRegistered && calendarMenu(event)}
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
              action={isAdmin && activeTab === 'all' ? <Button onClick={() => { setEditingEvent(null); setEditorOpen(true) }} className="bg-[#0A2E4A] text-white hover:bg-[#0d3a5c"><Plus className="mr-2 h-4 w-4" />Criar evento</Button> : undefined}
            />
          )}

          {isGuest && events.length > 0 && (
            <GuestPrompt
              title="Participe integralmente da comunidade"
              description="Cadastre-se para salvar agendas personalizadas, sincronizar calendários externos e receber notificações em tempo real."
              actionLabel="Realizar cadastro"
              onAction={() => navigate('/about')}
            />
          )}
        </div>
      </div>

      <EventEditor open={editorOpen} onOpenChange={setEditorOpen} event={editingEvent} onSuccess={handleEditorSuccess} />

      <AlertDialog open={!!deleteTargetId} onOpenChange={open => { if (!open && !deleting) setDeleteTargetId(null) }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  )
}

export default AgendaPage
