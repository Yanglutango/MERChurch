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

          <div className="relative z-10 p-8 md:p-16 text-white">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-6">
                <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-semibold">{t('home.liveNow')}</span>
              </div>

              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                {t('home.welcomeTitle')}
              </h1>
              <p className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed">
                {t('home.welcomeSubtitle')}
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  onClick={() => navigate('/live')}
                  className="bg-white text-primary hover:bg-white/90 font-semibold text-lg px-8 py-6 rounded-full shadow-2xl transform hover:scale-105 transition-transform"
                >
                  <Play className="mr-2 h-6 w-6" />
                  {t('home.watchLive')}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/about')}
                  className="border-2 border-white text-white hover:bg-white hover:text-primary font-semibold text-lg px-8 py-6 rounded-full transform hover:scale-105 transition-transform"
                >
                  {t('home.knowMore')}
                  <ArrowRight className="ml-2 h-6 w-6" />
                </Button>
              </div>
            </div>
          </div>

          {/* Decorative element */}
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-tl from-accent/30 to-transparent rounded-full blur-3xl" />
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={stat.label} className="p-6 border-2 hover:border-primary/50 transition-all hover:shadow-xl hover:-translate-y-1 duration-300 group">
              <div className={`inline-flex p-3 rounded-2xl bg-gradient-to-br ${stat.color} mb-4 group-hover:scale-110 transition-transform`}>
                <stat.icon className="h-7 w-7 text-white" />
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary to-accent rounded-xl">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            {t('home.quickAccess')}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {quickActions.map((action, index) => (
              <Card
                key={action.path}
                onClick={() => navigate(action.path)}
                className="group p-6 cursor-pointer hover:shadow-2xl transition-all duration-500 border-2 hover:border-primary/50 hover:-translate-y-2 transform"
              >
                <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${action.color} mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                  <action.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                  {action.label}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{action.description}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-8 border-2 hover:shadow-xl transition-shadow">
            <h3 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              {t('home.latestSermons')}
            </h3>
            <div className="space-y-4">
              {[
                { title: 'O Poder da Fé', speaker: 'Pr. João Silva', date: '20 Dez 2024' },
                { title: 'Vencendo os Desafios', speaker: 'Pra. Maria Santos', date: '15 Dez 2024' },
                { title: 'Amor Incondicional', speaker: 'Pr. Pedro Costa', date: '10 Dez 2024' },
              ].map((sermon) => (
                <div key={sermon.title} className="flex items-start gap-4 p-4 rounded-xl hover:bg-muted/50 cursor-pointer transition-all group">
                  <div className="p-3 bg-gradient-to-br from-primary to-secondary rounded-xl shadow-md group-hover:scale-110 transition-transform">
                    <Play className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">{sermon.title}</div>
                    <div className="text-sm text-muted-foreground">{sermon.speaker} • {sermon.date}</div>
                  </div>
                </div>
              ))}
            </div>
            <Button onClick={() => navigate('/sermons')} className="w-full mt-6" variant="outline">
              {t('home.seeAllSermons')}
            </Button>
          </Card>

          <Card className="p-8 border-2 hover:shadow-xl transition-shadow">
            <h3 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              {t('home.upcomingEvents')}
            </h3>
            <div className="space-y-4">
              {[
                { title: 'Culto de Celebração', date: '24 Dez 2024', time: '18:00' },
                { title: 'Retiro de Jovens', date: '05 Jan 2025', time: '08:00' },
                { title: 'Conferência Anual', date: '15 Jan 2025', time: '19:00' },
              ].map((event) => (
                <div key={event.title} className="flex items-start gap-4 p-4 rounded-xl hover:bg-muted/50 cursor-pointer transition-all group">
                  <div className="p-3 bg-gradient-to-br from-secondary to-accent rounded-xl shadow-md group-hover:scale-110 transition-transform">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">{event.title}</div>
                    <div className="text-sm text-muted-foreground">{event.date} às {event.time}</div>
                  </div>
                </div>
              ))}
            </div>
            <Button onClick={() => navigate('/agenda')} className="w-full mt-6" variant="outline">
              {t('home.seeFullAgenda')}
            </Button>
          </Card>
        </div>
      </div>
    </Layout>
  )
}

export default HomePage
