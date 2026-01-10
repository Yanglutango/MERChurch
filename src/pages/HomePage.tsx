import Layout from '../components/layout/Layout'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../stores/appStore'
import {
  Radio,
  BookOpen,
  Calendar,
  Sparkles,
  Users,
  GraduationCap,
  MessageCircle,
  DollarSign,
  Heart,
  HeadphonesIcon,
  ArrowRight,
  Play,
  TrendingUp,
} from 'lucide-react'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { StatCard } from '../components/shared/StatCard'
import { ActionCard } from '../components/shared/ActionCard'

const HomePage = () => {
  const navigate = useNavigate()
  const { t } = useAppStore()

  const quickActions = [
    { icon: Radio, label: t('nav.live'), path: '/live', color: 'from-red-500 to-rose-500', description: 'Assista o culto ao vivo' },
    { icon: BookOpen, label: t('nav.sermons'), path: '/sermons', color: 'from-blue-500 to-cyan-500', description: 'Mensagens recentes' },
    { icon: Calendar, label: t('nav.agenda'), path: '/agenda', color: 'from-purple-500 to-pink-500', description: 'Próximos eventos' },
    { icon: Sparkles, label: t('nav.ai'), path: '/ai', color: 'from-yellow-500 to-orange-500', description: 'Assistente espiritual' },
    { icon: Users, label: t('nav.ministries'), path: '/ministries', color: 'from-green-500 to-emerald-500', description: 'Encontre seu lugar' },
    { icon: GraduationCap, label: t('nav.academy'), path: '/academy', color: 'from-indigo-500 to-purple-500', description: 'Cursos bíblicos' },
    { icon: MessageCircle, label: t('nav.community'), path: '/community', color: 'from-pink-500 to-rose-500', description: 'Conecte-se' },
    { icon: DollarSign, label: t('nav.treasury'), path: '/treasury', color: 'from-cyan-500 to-blue-500', description: 'Dízimos e ofertas' },
    { icon: Heart, label: t('nav.prayer'), path: '/prayer', color: 'from-red-500 to-pink-500', description: 'Pedidos de oração' },
    { icon: HeadphonesIcon, label: t('nav.counseling'), path: '/counseling', color: 'from-teal-500 to-green-500', description: 'Ajuda pastoral' },
  ]

  const stats = [
    { label: t('home.activeMembers'), value: '5000+', icon: Users, color: 'from-blue-500 to-cyan-500' },
    { label: t('home.activeCells'), value: '50+', icon: Users, color: 'from-purple-500 to-pink-500' },
    { label: t('home.transformedLives'), value: '10k+', icon: Heart, color: 'from-red-500 to-rose-500' },
    { label: t('home.coursesAvailable'), value: '25+', icon: GraduationCap, color: 'from-green-500 to-emerald-500' },
  ]

  return (
    <Layout title={t('nav.home')}>
      <div className="space-y-8">
        {/* Hero Banner - Worship/Holy Spirit */}
        <Card className="relative overflow-hidden border-0 shadow-2xl rounded-2xl">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?w=1920&h=600&fit=crop&q=80"
              alt="Worship"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-blue-900/90 to-indigo-900/95" />
          </div>

          <div className="relative z-10 p-6 md:p-12 lg:p-16 text-white">
            <div className="max-w-3xl space-y-6 md:space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-white/20 backdrop-blur-sm rounded-full">
                <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs md:text-sm font-semibold">{t('home.liveNow')}</span>
              </div>

              <div className="space-y-4">
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight">
                  {t('home.welcomeTitle')}
                </h1>
                <p className="text-lg md:text-xl lg:text-2xl text-white/85 leading-relaxed max-w-2xl">
                  {t('home.welcomeSubtitle')}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-2">
                <Button
                  size="lg"
                  onClick={() => navigate('/live')}
                  className="bg-white text-primary hover:bg-white/90 font-semibold text-base md:text-lg px-6 md:px-8 py-5 md:py-6 rounded-full shadow-2xl transform hover:scale-[1.02] transition-all duration-300"
                >
                  <Play className="mr-2 h-5 w-5 md:h-6 md:w-6" />
                  {t('home.watchLive')}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/about')}
                  className="border-2 border-white text-white hover:bg-white hover:text-primary font-semibold text-base md:text-lg px-6 md:px-8 py-5 md:py-6 rounded-full transform hover:scale-[1.02] transition-all duration-300"
                >
                  {t('home.knowMore')}
                  <ArrowRight className="ml-2 h-5 w-5 md:h-6 md:w-6" />
                </Button>
              </div>
            </div>
          </div>

          {/* Decorative element */}
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-tl from-accent/30 to-transparent rounded-full blur-3xl" />
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <StatCard
              key={stat.label}
              icon={stat.icon}
              label={stat.label}
              value={stat.value}
              gradient={stat.color}
            />
          ))}
        </div>

        {/* Quick Actions */}
        <div className="space-y-5 md:space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 md:p-2.5 bg-gradient-to-br from-primary to-accent rounded-xl">
              <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            {t('home.quickAccess')}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
            {quickActions.map((action) => (
              <ActionCard
                key={action.path}
                icon={action.icon}
                label={action.label}
                description={action.description}
                gradient={action.color}
                onClick={() => navigate(action.path)}
              />
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid lg:grid-cols-2 gap-5 md:gap-6">
          <Card className="p-6 md:p-8 border-2 hover:shadow-lg transition-all duration-300">
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-5 md:mb-6 flex items-center gap-2.5 md:gap-3">
              <div className="p-1.5 md:p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg md:rounded-xl flex-shrink-0">
                <BookOpen className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              <span className="leading-tight">{t('home.latestSermons')}</span>
            </h3>
            <div className="space-y-3 md:space-y-4">
              {[
                { title: 'O Poder da Fé', speaker: 'Pr. João Silva', date: '20 Dez 2024' },
                { title: 'Vencendo os Desafios', speaker: 'Pra. Maria Santos', date: '15 Dez 2024' },
                { title: 'Amor Incondicional', speaker: 'Pr. Pedro Costa', date: '10 Dez 2024' },
              ].map((sermon) => (
                <div key={sermon.title} className="flex items-start gap-3 md:gap-4 p-3 md:p-4 rounded-lg md:rounded-xl hover:bg-muted/50 cursor-pointer transition-all duration-200 group">
                  <div className="p-2 md:p-3 bg-gradient-to-br from-primary to-secondary rounded-lg md:rounded-xl shadow-md group-hover:scale-105 transition-transform flex-shrink-0">
                    <Play className="h-4 w-4 md:h-5 md:w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm md:text-base text-foreground mb-0.5 group-hover:text-primary transition-colors leading-snug">{sermon.title}</div>
                    <div className="text-xs md:text-sm text-muted-foreground leading-relaxed">{sermon.speaker} • {sermon.date}</div>
                  </div>
                </div>
              ))}
            </div>
            <Button onClick={() => navigate('/sermons')} className="w-full mt-5 md:mt-6" variant="outline" size="lg">
              {t('home.seeAllSermons')}
            </Button>
          </Card>

          <Card className="p-6 md:p-8 border-2 hover:shadow-lg transition-all duration-300">
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-5 md:mb-6 flex items-center gap-2.5 md:gap-3">
              <div className="p-1.5 md:p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg md:rounded-xl flex-shrink-0">
                <Calendar className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              <span className="leading-tight">{t('home.upcomingEvents')}</span>
            </h3>
            <div className="space-y-3 md:space-y-4">
              {[
                { title: 'Culto de Celebração', date: '24 Dez 2024', time: '18:00' },
                { title: 'Retiro de Jovens', date: '05 Jan 2025', time: '08:00' },
                { title: 'Conferência Anual', date: '15 Jan 2025', time: '19:00' },
              ].map((event) => (
                <div key={event.title} className="flex items-start gap-3 md:gap-4 p-3 md:p-4 rounded-lg md:rounded-xl hover:bg-muted/50 cursor-pointer transition-all duration-200 group">
                  <div className="p-2 md:p-3 bg-gradient-to-br from-secondary to-accent rounded-lg md:rounded-xl shadow-md group-hover:scale-105 transition-transform flex-shrink-0">
                    <Calendar className="h-4 w-4 md:h-5 md:w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm md:text-base text-foreground mb-0.5 group-hover:text-primary transition-colors leading-snug">{event.title}</div>
                    <div className="text-xs md:text-sm text-muted-foreground leading-relaxed">{event.date} às {event.time}</div>
                  </div>
                </div>
              ))}
            </div>
            <Button onClick={() => navigate('/agenda')} className="w-full mt-5 md:mt-6" variant="outline" size="lg">
              {t('home.seeFullAgenda')}
            </Button>
          </Card>
        </div>
      </div>
    </Layout>
  )
}

export default HomePage