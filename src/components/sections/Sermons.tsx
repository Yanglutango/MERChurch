import { Play, Download, Calendar, User } from 'lucide-react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'

const Sermons = () => {
  const sermons = [
    {
      title: 'O Poder da Reconciliação',
      pastor: 'Pr. João Silva',
      date: '17 Dez 2024',
      duration: '45 min',
      thumbnail: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=600&h=400&fit=crop',
      series: 'Série: Vivendo em Cristo',
    },
    {
      title: 'Fé que Move Montanhas',
      pastor: 'Pra. Maria Santos',
      date: '10 Dez 2024',
      duration: '38 min',
      thumbnail: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=600&h=400&fit=crop',
      series: 'Série: Fundamentos da Fé',
    },
    {
      title: 'Amor que Transforma',
      pastor: 'Pr. Pedro Costa',
      date: '03 Dez 2024',
      duration: '42 min',
      thumbnail: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&h=400&fit=crop',
      series: 'Série: O Amor de Deus',
    },
  ]

  const series = [
    { title: 'Vivendo em Cristo', episodes: 12 },
    { title: 'Fundamentos da Fé', episodes: 8 },
    { title: 'O Amor de Deus', episodes: 6 },
    { title: 'Espírito Santo', episodes: 10 },
  ]

  return (
    <section id="sermons" className="section-padding bg-background">
      <div className="container-custom">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in-up">
          <div className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-4">
            Mensagens
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Mensagens{' '}
            <span className="text-gradient">Transformadoras</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Assista ou ouça nossas pregações e seja edificado pela Palavra de Deus
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Sermons */}
          <div className="lg:col-span-2 space-y-6">
            {sermons.map((sermon, index) => (
              <Card
                key={sermon.title}
                className={`group overflow-hidden hover:shadow-xl transition-all duration-500 border-2 hover:border-primary/50 animate-fade-in-up animate-delay-${index * 100}`}
              >
                <div className="md:flex">
                  {/* Thumbnail */}
                  <div className="md:w-72 h-48 md:h-auto relative overflow-hidden flex-shrink-0">
                    <img
                      src={sermon.thumbnail}
                      alt={sermon.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/60 to-secondary/60 opacity-80" />
                    
                    {/* Play Button */}
                    <button className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xl">
                        <Play className="h-8 w-8 text-primary ml-1" fill="currentColor" />
                      </div>
                    </button>

                    {/* Duration Badge */}
                    <div className="absolute bottom-4 right-4 px-3 py-1 bg-black/70 backdrop-blur-sm rounded-full text-sm text-white">
                      {sermon.duration}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-sm text-primary font-semibold mb-2">
                        {sermon.series}
                      </div>
                      <h3 className="text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                        {sermon.title}
                      </h3>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {sermon.pastor}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {sermon.date}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button className="flex-1 gradient-primary text-white font-semibold">
                        <Play className="h-4 w-4 mr-2" />
                        Assistir
                      </Button>
                      <Button variant="outline" size="icon" className="border-2">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Series */}
            <Card className="p-6 border-2">
              <h3 className="text-xl font-bold text-foreground mb-4">
                Séries de Mensagens
              </h3>
              <div className="space-y-3">
                {series.map((s, index) => (
                  <div
                    key={s.title}
                    className={`p-4 rounded-xl bg-muted/50 hover:bg-primary/5 border border-border hover:border-primary/50 transition-all cursor-pointer animate-fade-in-up animate-delay-${index * 100}`}
                  >
                    <div className="font-semibold text-foreground">{s.title}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {s.episodes} episódios
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* CTA Card */}
            <Card className="p-6 gradient-primary text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />
              
              <div className="relative">
                <h3 className="text-xl font-bold mb-3">
                  Receba Notificações
                </h3>
                <p className="text-white/90 text-sm mb-4">
                  Seja avisado quando novas mensagens forem publicadas
                </p>
                <Button className="w-full bg-white text-primary hover:bg-white/90 font-semibold">
                  Inscrever-se
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Sermons
