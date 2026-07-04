import { ArrowRight, Calendar, Users, Heart } from 'lucide-react'
import { Button } from '../ui/button'

const Hero = () => {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=1920&h=1080&fit=crop"
          alt="Igreja"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-purple-900/80 to-secondary/90" />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Floating Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-accent/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-float animate-delay-200" />
      </div>

      {/* Content */}
      <div className="relative z-10 container-custom text-center text-white">
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-white/30">
            <Heart className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium">Bem-vindo à nossa família</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
            Missão Evangélica da
            <span className="block gradient-gold bg-clip-text text-transparent mt-2">
              Reconciliação
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto">
            Uma comunidade vibrante de fé, amor e esperança. Venha experimentar a presença de Deus conosco.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-6 rounded-full font-semibold shadow-2xl"
            >
              Próximo Culto
              <Calendar className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-white text-white hover:bg-white hover:text-primary text-lg px-8 py-6 rounded-full font-semibold"
            >
              Conheça a MER
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12">
            <div className="glass rounded-2xl p-6 border border-white/30">
              <div className="text-4xl font-bold gradient-gold bg-clip-text text-transparent">
                5000+
              </div>
              <div className="text-white/80 mt-2">Membros Ativos</div>
            </div>
            <div className="glass rounded-2xl p-6 border border-white/30">
              <div className="text-4xl font-bold gradient-gold bg-clip-text text-transparent">
                15+
              </div>
              <div className="text-white/80 mt-2">Anos de Ministério</div>
            </div>
            <div className="glass rounded-2xl p-6 border border-white/30">
              <div className="text-4xl font-bold gradient-gold bg-clip-text text-transparent">
                50+
              </div>
              <div className="text-white/80 mt-2">Células Ativas</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center pt-2">
          <div className="w-1 h-2 bg-white/50 rounded-full" />
        </div>
      </div>
    </section>
  )
}

export default Hero
