import { Heart, CreditCard, QrCode, Building2, TrendingUp, Users } from 'lucide-react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'

const Donations = () => {
  const donationOptions = [
    {
      icon: Heart,
      title: 'Oferta Única',
      description: 'Faça uma contribuição pontual',
      color: 'from-pink-500 to-rose-500',
    },
    {
      icon: TrendingUp,
      title: 'Oferta Recorrente',
      description: 'Contribua mensalmente',
      color: 'from-purple-500 to-indigo-500',
    },
    {
      icon: Users,
      title: 'Projetos Especiais',
      description: 'Apoie projetos específicos',
      color: 'from-blue-500 to-cyan-500',
    },
  ]

  const projects = [
    {
      title: 'Nova Ala de Construção',
      description: 'Expansão do templo para atender mais pessoas',
      raised: 75000,
      goal: 100000,
      percentage: 75,
    },
    {
      title: 'Missões Internacionais',
      description: 'Apoio a missionários ao redor do mundo',
      raised: 30000,
      goal: 50000,
      percentage: 60,
    },
    {
      title: 'Ação Social',
      description: 'Ajuda a famílias carentes da comunidade',
      raised: 15000,
      goal: 20000,
      percentage: 75,
    },
  ]

  return (
    <section id="donations" className="section-padding bg-muted/30">
      <div className="container-custom">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in-up">
          <div className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-4">
            Ofertas e Doações
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Faça Parte da{' '}
            <span className="text-gradient">Missão</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Sua generosidade ajuda a transformar vidas e expandir o Reino de Deus
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Donation Options */}
          <div className="lg:col-span-2 space-y-6">
            {/* Options Cards */}
            <div className="grid md:grid-cols-3 gap-4">
              {donationOptions.map((option, index) => (
                <Card
                  key={option.title}
                  className={`p-6 text-center cursor-pointer hover:shadow-xl transition-all duration-500 border-2 hover:border-primary group animate-fade-in-up animate-delay-${index * 100}`}
                >
                  <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${option.color} mb-4 group-hover:scale-110 transition-transform`}>
                    <option.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-bold text-foreground mb-2">{option.title}</h3>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </Card>
              ))}
            </div>

            {/* Projects Progress */}
            <Card className="p-8 border-2">
              <h3 className="text-2xl font-bold text-foreground mb-6">
                Projetos em Andamento
              </h3>
              <div className="space-y-6">
                {projects.map((project, index) => (
                  <div key={project.title} className={`animate-fade-in-up animate-delay-${index * 100}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-foreground">{project.title}</h4>
                        <p className="text-sm text-muted-foreground">{project.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-primary">
                          {project.percentage}%
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full gradient-primary transition-all duration-1000 rounded-full"
                        style={{ width: `${project.percentage}%` }}
                      />
                    </div>
                    
                    <div className="flex justify-between text-sm text-muted-foreground mt-2">
                      <span>R$ {project.raised.toLocaleString('pt-BR')}</span>
                      <span>Meta: R$ {project.goal.toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Payment Methods */}
            <Card className="p-8 border-2">
              <h3 className="text-2xl font-bold text-foreground mb-6">
                Formas de Contribuir
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-6 rounded-xl bg-muted/50 hover:bg-primary/5 border border-border hover:border-primary/50 transition-all cursor-pointer text-center">
                  <CreditCard className="h-8 w-8 text-primary mx-auto mb-3" />
                  <div className="font-semibold text-foreground">Cartão</div>
                  <div className="text-sm text-muted-foreground mt-1">Crédito/Débito</div>
                </div>
                <div className="p-6 rounded-xl bg-muted/50 hover:bg-primary/5 border border-border hover:border-primary/50 transition-all cursor-pointer text-center">
                  <QrCode className="h-8 w-8 text-primary mx-auto mb-3" />
                  <div className="font-semibold text-foreground">PIX</div>
                  <div className="text-sm text-muted-foreground mt-1">Instantâneo</div>
                </div>
                <div className="p-6 rounded-xl bg-muted/50 hover:bg-primary/5 border border-border hover:border-primary/50 transition-all cursor-pointer text-center">
                  <Building2 className="h-8 w-8 text-primary mx-auto mb-3" />
                  <div className="font-semibold text-foreground">Transferência</div>
                  <div className="text-sm text-muted-foreground mt-1">TED/DOC</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - Main CTA */}
          <div className="space-y-6">
            <Card className="p-8 gradient-primary text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16" />
              
              <div className="relative space-y-6">
                <div className="inline-flex p-4 bg-white/20 rounded-2xl">
                  <Heart className="h-8 w-8" />
                </div>
                
                <h3 className="text-2xl font-bold">
                  Sua Oferta Faz a Diferença
                </h3>
                
                <p className="text-white/90 leading-relaxed">
                  Cada contribuição, por menor que seja, ajuda a expandir o Reino de Deus e transformar vidas.
                </p>

                <div className="space-y-3">
                  <Button className="w-full bg-white text-primary hover:bg-white/90 font-semibold text-lg py-6">
                    Doar Agora
                  </Button>
                  <Button variant="outline" className="w-full border-2 border-white text-white hover:bg-white hover:text-primary font-semibold">
                    Ver Dados Bancários
                  </Button>
                </div>

                <div className="pt-4 border-t border-white/20 text-sm text-white/80">
                  💡 Todas as doações são 100% transparentes e prestamos contas regularmente
                </div>
              </div>
            </Card>

            {/* Stats */}
            <Card className="p-6 border-2">
              <h4 className="font-bold text-foreground mb-4">Em 2024</h4>
              <div className="space-y-4">
                <div>
                  <div className="text-3xl font-bold text-primary">500+</div>
                  <div className="text-sm text-muted-foreground">Famílias Ajudadas</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary">R$ 2M+</div>
                  <div className="text-sm text-muted-foreground">Em Doações</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary">25+</div>
                  <div className="text-sm text-muted-foreground">Projetos Realizados</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Donations
