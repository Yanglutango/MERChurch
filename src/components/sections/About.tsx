import { Heart, Users, Globe, BookOpen } from 'lucide-react'

const About = () => {
  const values = [
    {
      icon: Heart,
      title: 'Amor',
      description: 'Demonstramos o amor de Cristo em tudo que fazemos',
    },
    {
      icon: Users,
      title: 'Comunidade',
      description: 'Somos uma família unida pela fé e companheirismo',
    },
    {
      icon: Globe,
      title: 'Missão',
      description: 'Levamos esperança e transformação ao mundo',
    },
    {
      icon: BookOpen,
      title: 'Palavra',
      description: 'Fundamentados nas Escrituras Sagradas',
    },
  ]

  return (
    <section id="about" className="section-padding bg-muted/30">
      <div className="container-custom">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column - Image */}
          <div className="relative animate-fade-in">
            <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1507692049790-de58290a4334?w=800&h=600&fit=crop"
                alt="Nossa Igreja"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
              />
            </div>
            <div className="absolute -bottom-8 -right-8 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10" />
          </div>

          {/* Right Column - Content */}
          <div className="space-y-6 animate-fade-in-up">
            <div className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold">
              Sobre Nós
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-foreground">
              Uma História de{' '}
              <span className="text-gradient">Fé e Reconciliação</span>
            </h2>

            <p className="text-lg text-muted-foreground leading-relaxed">
              A Missão Evangélica da Reconciliação foi fundada com o propósito de levar o amor de Deus a todas as pessoas. Somos uma comunidade vibrante e acolhedora, comprometida em fazer a diferença em nossa cidade e além.
            </p>

            <p className="text-lg text-muted-foreground leading-relaxed">
              Nossa visão é ser uma igreja que transforma vidas através do poder do evangelho, criando um ambiente onde todos podem crescer espiritualmente e servir ao próximo.
            </p>

            {/* Values Grid */}
            <div className="grid grid-cols-2 gap-4 pt-6">
              {values.map((value, index) => (
                <div
                  key={value.title}
                  className={`p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all hover:shadow-lg group animate-fade-in-up animate-delay-${index * 100}`}
                >
                  <value.icon className="h-8 w-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="font-bold text-foreground mb-1">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default About
