import { Users, MessageCircle, Calendar, BookOpen, Heart, Share2 } from 'lucide-react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'

const Community = () => {
  const features = [
    {
      icon: MessageCircle,
      title: 'Fórum da Comunidade',
      description: 'Conecte-se com outros membros, compartilhe experiências e faça perguntas',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Calendar,
      title: 'Grupos de Estudo',
      description: 'Participe de grupos de estudo bíblico e cresça espiritualmente',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: BookOpen,
      title: 'Recursos Bíblicos',
      description: 'Acesse materiais, estudos e recursos para seu crescimento',
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: Heart,
      title: 'Pedidos de Oração',
      description: 'Compartilhe pedidos de oração e ore pelos irmãos',
      color: 'from-red-500 to-rose-500',
    },
    {
      icon: Share2,
      title: 'Testemunhos',
      description: 'Compartilhe como Deus tem agido em sua vida',
      color: 'from-yellow-500 to-orange-500',
    },
    {
      icon: Users,
      title: 'Encontre uma Célula',
      description: 'Participe de um pequeno grupo perto de você',
      color: 'from-indigo-500 to-purple-500',
    },
  ]

  const testimonials = [
    {
      name: 'Ana Paula',
      role: 'Membro há 3 anos',
      text: 'A MER transformou minha vida! Encontrei uma família que me acolheu com amor e me ajudou a crescer na fé.',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    },
    {
      name: 'Carlos Eduardo',
      role: 'Líder de Célula',
      text: 'Ser parte desta comunidade é uma bênção. Aqui encontrei propósito e oportunidade de servir a Deus.',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    },
    {
      name: 'Juliana Santos',
      role: 'Membro há 5 anos',
      text: 'A palavra de Deus pregada aqui tem sido fonte de vida e transformação para minha família.',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    },
  ]

  return (
    <section id="community" className="section-padding bg-background">
      <div className="container-custom">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in-up">
          <div className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-4">
            Comunidade
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Faça Parte da{' '}
            <span className="text-gradient">Família MER</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Conecte-se, cresça e sirva em uma comunidade vibrante de fé
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {features.map((feature, index) => (
            <Card
              key={feature.title}
              className={`group p-8 hover:shadow-xl transition-all duration-500 border-2 hover:border-primary/50 cursor-pointer animate-fade-in-up animate-delay-${index * 100}`}
            >
              <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.color} mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>

        {/* Testimonials */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-foreground text-center mb-10">
            Testemunhos da Nossa Comunidade
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card
                key={testimonial.name}
                className={`p-8 border-2 hover:border-primary/50 transition-all hover:shadow-xl animate-fade-in-up animate-delay-${index * 100}`}
              >
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-primary"
                  />
                  <div>
                    <div className="font-bold text-foreground">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed italic">
                  "{testimonial.text}"
                </p>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1200&h=400&fit=crop"
              alt="Comunidade"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-purple-900/90 to-secondary/95" />
          </div>
          
          <div className="relative z-10 text-center py-20 px-8 text-white">
            <h3 className="text-4xl font-bold mb-4">
              Pronto para Fazer Parte?
            </h3>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Junte-se à família MER e experimente uma comunidade de amor, fé e crescimento
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-6 rounded-full font-semibold">
                Quero Ser Membro
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-white text-white hover:bg-white hover:text-primary text-lg px-8 py-6 rounded-full font-semibold"
              >
                Visitante de Primeira Vez
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </section>
  )
}

export default Community
