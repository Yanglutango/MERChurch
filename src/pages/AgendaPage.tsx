import { useState, useEffect } from 'react'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Calendar, Clock, MapPin, Users, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { Event } from '../types'

const AgendaPage = () => {
  const { user } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [registeredEvents, setRegisteredEvents] = useState<string[]>([])

  useEffect(() => {
    loadEvents()
    loadRegistrations()
  }, [])

  const loadEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('date', new Date().toISOString())
      .order('date', { ascending: true })

    if (error) {
      console.error('Error loading events:', error)
      return
    }

    setEvents(data)
  }

  const loadRegistrations = async () => {
    const { data, error } = await supabase
      .from('event_attendees')
      .select('event_id')
      .eq('user_id', user!.id)

    if (error) {
      console.error('Error loading registrations:', error)
      return
    }

    setRegisteredEvents(data.map((r) => r.event_id))
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

  return (
    <Layout title="Agenda">
      <div className="space-y-6">
        <Card className="p-6 border-2 bg-gradient-to-r from-primary to-secondary text-white">
          <h2 className="text-2xl font-bold mb-2">Agenda de Eventos</h2>
          <p className="text-white/90">Participe dos nossos eventos e faça parte da família MER</p>
        </Card>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => {
            const isRegistered = registeredEvents.includes(event.id)

            return (
              <Card key={event.id} className="overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-xl">
                <div className="relative h-48">
                  <img
                    src={event.imageUrl || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&h=400&fit=crop'}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  {event.category && (
                    <div className="absolute top-3 right-3 px-3 py-1 bg-primary rounded-full text-white text-sm font-semibold">
                      {event.category}
                    </div>
                  )}
                </div>

                <div className="p-6 space-y-4">
                  <h3 className="text-xl font-bold text-foreground">{event.title}</h3>
                  
                  {event.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                  )}

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      {new Date(event.date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      {new Date(event.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        {event.location}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={() => toggleRegistration(event.id)}
                    className={`w-full ${isRegistered ? 'bg-green-500 hover:bg-green-600' : ''}`}
                  >
                    {isRegistered ? 'Inscrito ✓' : 'Participar'}
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>

        {events.length === 0 && (
          <Card className="p-12 text-center border-2">
            <p className="text-muted-foreground">Nenhum evento programado no momento</p>
          </Card>
        )}
      </div>
    </Layout>
  )
}

export default AgendaPage
