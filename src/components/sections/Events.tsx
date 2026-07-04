import { Calendar, Clock, MapPin, Users } from 'lucide-react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'

const Events = () => {
  const events = [
    {
      title: 'Culto de Celebração',
      date: 'Todos os Domingos',
      time: '09:00 & 18:00',
      location: 'Templo Principal',
      attendees: '500+',
      image: 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=600&h=400&fit=crop',
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: 'Reunião de Oração',
      date: 'Quartas-feiras',
      time: '19:30',
      location: 'Templo Principal',
      attendees: '200+',
      image: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=600&h=400&fit=crop',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Conferência Anual',
      date: '15-17 de Dezembro',
      time: '19:00',
      location: 'Centro de Convenções',
      attendees: '2000+',
      image: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&h=400&fit=crop',
      color: 'from-amber-500 to-orange-500',
    },
  ]

  const upcomingEvents = [
    { title: 'Retiro de Jovens', date: '05 Jan 2025' },
    { title: 'Acampamento Infantil', date: '12 Jan 2025' },
    { title: 'Congresso de Missões', date: '20 Jan 2025' },
    { title: 'Seminário de Casais', date: '27 Jan 2025' },
  ]

  return (
    <section id="events" className="section-padding bg-muted/30">
      <div className="container-custom">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in-up">
          <div className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-4">
            Eventos
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Próximos{' '}
            <span className="text-gradient">Eventos</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Participe dos nossos eventos e faça parte desta família abençoada
          </p>
        </div>

        {/* Main Events */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {events.map((event, index) => (
            <Card
              key={event.title}
              className={`group overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 animate-fade-in-up animate-delay-${index * 100}`}
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={event.image}
                  alt={event.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className={`absolute inset-0 bg-gradient-to-br ${event.color} opacity-60`} />
                <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-sm font-semibold text-foreground flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {event.attendees}
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <h3 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                  {event.title}
                </h3>

                <div className="space-y-2 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>{event.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>{event.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>{event.location}</span>
                  </div>
                </div>

                <Button className="w-full gradient-primary text-white font-semibold">
                  Participar
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Upcoming Events Timeline */}
        <Card className="p-8 border-2">
          <h3 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Agenda Completa
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {upcomingEvents.map((event, index) => (
              <div
                key={event.title}
                className={`p-4 rounded-xl bg-muted/50 hover:bg-primary/5 border border-border hover:border-primary/50 transition-all cursor-pointer animate-fade-in-up animate-delay-${index * 100}`}
              >
                <div className="text-sm text-primary font-semibold mb-1">
                  {event.date}
                </div>
                <div className="font-medium text-foreground">{event.title}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  )
}

export default Events
