import { Users, Baby, Music, HandHeart, GraduationCap, Sparkles } from 'lucide-react'
import { Card } from '../ui/card'

const Services = () => {
  const ministries = [
    {
      icon: Music,
      title: 'Louvor e Adoração',
      description: 'Ministério de música que conduz a igreja em momentos de adoração poderosa',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: Users,
      title: 'Células',
      description: 'Pequenos grupos que se reúnem para comunhão, estudo bíblico e oração',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Baby,
      title: 'Ministério Infantil',
      description: 'Cuidado especial e ensino bíblico para nossas crianças',
      color: 'from-yellow-500 to-orange-500',
    },
    {
      icon: GraduationCap,
      title: 'Escola Bíblica',
      description: 'Cursos e treinamentos para aprofundar o conhecimento da Palavra',
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: HandHeart,
      title: 'Ação Social',
      description: 'Projetos de assistência às comunidades carentes',
      color: 'from-red-500 to-rose-500',
    },
    {
      icon: Sparkles,
      title: 'Jovens',
      description: 'Atividades e eventos especiais para a juventude',
      color: 'from-indigo-500 to-purple-500',
    },
  ]

  return (
    <section id="services" className="section-padding bg-background">
      <div className="container-custom">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in-up">
          <div className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-4">
            Ministérios
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Servindo com{' '}
            <span className="text-gradient">Excelência</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Descubra os diversos ministérios e encontre seu lugar para servir na família MER
          </p>
        </div>

        {/* Ministries Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ministries.map((ministry, index) => (
            <Card
              key={ministry.title}
              className={`group relative overflow-hidden p-8 hover:shadow-2xl transition-all duration-500 cursor-pointer border-2 hover:border-primary/50 animate-fade-in-up animate-delay-${index * 100}`}
            >
              {/* Background Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${ministry.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
              
              {/* Icon */}
              <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${ministry.color} mb-6 group-hover:scale-110 transition-transform duration-500`}>
                <ministry.icon className="h-8 w-8 text-white" />
              </div>

              {/* Content */}
              <h3 className="text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                {ministry.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {ministry.description}
              </p>

              {/* Hover Effect Line */}
              <div className={`absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r ${ministry.color} group-hover:w-full transition-all duration-500`} />
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12 animate-fade-in-up">
          <p className="text-lg text-muted-foreground mb-4">
            Quer fazer parte de um ministério?
          </p>
          <button className="px-8 py-4 gradient-primary text-white font-semibold rounded-full hover:shadow-lg hover:scale-105 transition-all">
            Fale Conosco
          </button>
        </div>
      </div>
    </section>
  )
}

export default Services
