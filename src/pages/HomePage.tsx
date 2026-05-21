import { useState, useEffect } from 'react'
import Layout from '../components/layout/Layout'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../stores/appStore'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
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
  UserPlus,
  Shield,
  Bell,
  BarChart3,
  Flame,
  Clock,
  MapPin,
} from 'lucide-react'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { StatCard } from '../components/shared/StatCard'
import { ActionCard } from '../components/shared/ActionCard'
import { GuestPrompt } from '../components/shared/GuestPrompt'
import { AdminAction } from '../components/shared/AdminAction'

const HomePage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useAppStore()
  const isGuest = user?.role === 'guest'
  const isMember = user?.role === 'member'
  const isAdmin = user?.role === 'admin'
  const [recentSermons, setRecentSermons] = useState<any[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      const [sermonsRes, eventsRes, liveRes] = await Promise.all([
        supabase.from('sermons').select('id, title, speaker, date, views').order('date', { ascending: false }).limit(3),
        supabase.from('events').select('id, title, date, location, max_attendees').gte('date', new Date().toISOString()).order('date', { ascending: true }).limit(3),
        supabase.from('live_streams').select('id').eq('is_active', true).limit(1),
      ])
      if (sermonsRes.data) setRecentSermons(sermonsRes.data)
      if (eventsRes.data) setUpcomingEvents(eventsRes.data)
      if (liveRes.data && liveRes.data.length > 0) setIsLive(true)
    }
    loadData()
  }, [])

  // Caminhos contextuais por papel
  const getQuickActions = () => {
    const commonActions = [
      { icon: Radio, label: t('nav.live'), path: '/live', color: 'from-red-600 to-rose-600', description: 'Culto ao vivo agora' },
      { icon: Calendar, label: t('nav.agenda'), path: '/agenda', color: 'from-purple-600 to-pink-600', description: 'Próximos encontros' },
      { icon: BookOpen, label: t('nav.sermons'), path: '/sermons', color: 'from-blue-600 to-cyan-600', description: 'Palavra compartilhada' },
    ]

    if (isGuest) {
      return [
        ...commonActions,
        { icon: Users, label: 'Sobre a MER', path: '/about', color: 'from-teal-600 to-green-600', description: 'Conheça nossa família' },
        { icon: Heart, label: 'Oração', path: '/prayer', color: 'from-rose-600 to-pink-600', description: 'Peça e interceda' },
      ]
    }

    if (isAdmin) {
      return [
        { icon: BarChart3, label: 'Dashboard', path: '/dashboard', color: 'from-amber-600 to-orange-600', description: 'Visão estratégica' },
        ...commonActions,
        { icon: Users, label: t('nav.ministries'), path: '/ministries', color: 'from-green-600 to-emerald-600', description: 'Gestão ministerial' },
        { icon: MessageCircle, label: t('nav.community'), path: '/community', color: 'from-pink-600 to-fuchsia-600', description: 'Vida comunitária' },
      ]
    }

    // Member
    return [
      ...commonActions,
      { icon: MessageCircle, label: t('nav.community'), path: '/community', color: 'from-pink-600 to-fuchsia-600', description: 'Comunidade viva' },
      { icon: Users, label: t('nav.ministries'), path: '/ministries', color: 'from-green-600 to-emerald-600', description: 'Seu ministério' },
      { icon: GraduationCap, label: t('nav.academy'), path: '/academy', color: 'from-indigo-600 to-purple-600', description: 'Crescimento bíblico' },
      { icon: Heart, label: t('nav.prayer'), path: '/prayer', color: 'from-rose-600 to-pink-600', description: 'Pedidos e intercessão' },
      { icon: Sparkles, label: t('nav.ai'), path: '/ai', color: 'from-yellow-600 to-amber-600', description: 'Logos - IA espiritual' },
    ]
  }

  const quickActions = getQuickActions()

  // Stats contextuais
  const getStats = () => {
    if (isGuest) {
      return [
        { label: 'Anos de História', value: '35+', icon: Flame, color: 'from-amber-600 to-orange-600' },
        { label: 'Vidas Transformadas', value: '10k+', icon: Heart, color: 'from-rose-600 to-pink-600' },
        { label: 'Congregações Ativas', value: '8+', icon: MapPin, color: 'from-teal-600 to-cyan-600' },
        { label: 'Ministérios Atuantes', value: '8', icon: Users, color: 'from-purple-600 to-indigo-600' },
      ]
    }

    if (isAdmin) {
      return [
        { label: 'Membros Ativos', value: '5.2k', icon: Users, color: 'from-blue-600 to-cyan-600', trend: { value: '+12%', isPositive: true } },
        { label: 'Células Ativas', value: '52', icon: Users, color: 'from-purple-600 to-pink-600', trend: { value: '+4', isPositive: true } },
        { label: 'Cursos em Andamento', value: '18', icon: GraduationCap, color: 'from-green-600 to-emerald-600' },
        { label: 'Orações Esta Semana', value: '340', icon: Heart, color: 'from-rose-600 to-pink-600', trend: { value: '+8%', isPositive: true } },
      ]
    }

    // Member
    return [
      { label: 'Membros Conectados', value: '5.2k+', icon: Users, color: 'from-blue-600 to-cyan-600' },
      { label: 'Células Ativas', value: '52+', icon: Users, color: 'from-purple-600 to-pink-600' },
      { label: 'Vidas Impactadas', value: '10k+', icon: Heart, color: 'from-rose-600 to-pink-600' },
      { label: 'Cursos Disponíveis', value: '25+', icon: GraduationCap, color: 'from-green-600 to-emerald-600' },
    ]
  }

  const stats = getStats()

  return (
    <Layout title={t('nav.home')}>
      <div className="space-y-8">
        {/* Hero Banner - Contextual por papel */}
        <Card className="relative overflow-hidden border-0 shadow-2xl rounded-2xl elevation-3">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?w=1920&h=600&fit=crop&q=80"
              alt="Worship"
              className="w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#0A2E4A]/96 via-[#1a4d6d]/94 to-[#4A90A4]/92" />
          </div>

          <div className="relative z-10 p-6 md:p-12 lg:p-16 text-white">
            <div className="max-w-4xl space-y-6 md:space-y-8">
              {/* Badge dinâmico */}
              {isLive ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/90 backdrop-blur-md rounded-full border border-red-400/50 shadow-lg">
                  <div className="h-2 w-2 bg-white rounded-full animate-pulse" />
                  <span className="text-sm font-bold tracking-wide">AO VIVO AGORA</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 backdrop-blur-md rounded-full border border-white/20">
                  <span className="text-sm font-semibold">Próximo Culto: Domingo 9h</span>
                </div>
              )}

              {/* Título contextual */}
              <div className="space-y-4 md:space-y-5">
                {isGuest && (
                  <>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight">
                      Bem-vindo à{' '}
                      <span className="bg-gradient-to-r from-[#D4A574] via-[#e8c78f] to-[#D4A574] bg-clip-text text-transparent">
                        Família MER
                      </span>
                    </h1>
                    <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-medium leading-relaxed max-w-2xl">
                      Um lugar de reconciliação, transformação e propósito divino. Aqui você não é visitante — você é esperado.
                    </p>
                  </>
                )}
                
                {isMember && (
                  <>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight">
                      {user?.username ? `Bem-vindo, ${user.username}` : 'Bem-vindo de Volta'}
                    </h1>
                    <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-medium leading-relaxed max-w-2xl">
                      Sua jornada espiritual continua. Conecte-se, cresça e impacte vidas hoje.
                    </p>
                  </>
                )}
                
                {isAdmin && (
                  <>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight flex items-center gap-3 md:gap-4 flex-wrap">
                      <Shield className="h-10 w-10 md:h-14 md:w-14 text-[#D4A574]" />
                      Visão Administrativa
                    </h1>
                    <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-medium leading-relaxed max-w-2xl">
                      Gerencie a casa de Deus com sabedoria. Dados ao vivo, ações rápidas e governo eficaz.
                    </p>
                  </>
                )}
              </div>

              {/* CTAs contextuais */}
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-2">
                {isGuest && (
                  <>
                    <Button
                      size="lg"
                      onClick={() => navigate('/live')}
                      className="bg-white text-[#0A2E4A] hover:bg-white/95 font-bold text-base md:text-lg px-7 md:px-9 py-6 md:py-7 rounded-full shadow-2xl hover:shadow-white/20 transform hover:scale-[1.03] transition-all duration-300"
                    >
                      <Play className="mr-2.5 h-5 w-5 md:h-6 md:w-6 fill-current" />
                      Assistir Culto Ao Vivo
                    </Button>
                    <Button
                      size="lg"
                      onClick={() => navigate('/about')}
                      className="bg-gradient-to-r from-[#D4A574] to-[#c89860] text-white hover:from-[#e8c78f] hover:to-[#D4A574] font-bold text-base md:text-lg px-7 md:px-9 py-6 md:py-7 rounded-full shadow-2xl hover:shadow-[#D4A574]/30 transform hover:scale-[1.03] transition-all duration-300"
                    >
                      <UserPlus className="mr-2.5 h-5 w-5 md:h-6 md:w-6" />
                      Tornar-se Membro
                    </Button>
                  </>
                )}
                
                {(isMember || isAdmin) && (
                  <>
                    <Button
                      size="lg"
                      onClick={() => navigate('/live')}
                      className="bg-white text-[#0A2E4A] hover:bg-white/95 font-bold text-base md:text-lg px-7 md:px-9 py-6 md:py-7 rounded-full shadow-2xl hover:shadow-white/20 transform hover:scale-[1.03] transition-all duration-300"
                    >
                      <Play className="mr-2.5 h-5 w-5 md:h-6 md:w-6 fill-current" />
                      Ir para o Culto
                    </Button>
                    <Button
                      size="lg"
                      onClick={() => navigate('/community')}
                      className="border-2 border-white/80 text-white hover:bg-white/10 backdrop-blur-sm font-bold text-base md:text-lg px-7 md:px-9 py-6 md:py-7 rounded-full shadow-xl transform hover:scale-[1.03] transition-all duration-300"
                    >
                      <MessageCircle className="mr-2.5 h-5 w-5 md:h-6 md:w-6" />
                      Comunidade
                    </Button>
                    {isAdmin && (
                      <Button
                        size="lg"
                        onClick={() => navigate('/dashboard')}
                        className="bg-gradient-to-r from-[#D4A574] to-[#c89860] text-white hover:from-[#e8c78f] hover:to-[#D4A574] font-bold text-base md:text-lg px-7 md:px-9 py-6 md:py-7 rounded-full shadow-2xl hover:shadow-[#D4A574]/30 transform hover:scale-[1.03] transition-all duration-300"
                      >
                        <BarChart3 className="mr-2.5 h-5 w-5 md:h-6 md:w-6" />
                        Dashboard
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Elementos decorativos */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#D4A574]/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-[#4A90A4]/20 to-transparent rounded-full blur-3xl" />
        </Card>

        {/* Stats Contextuais */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {stats.map((stat) => (
            <StatCard
              key={stat.label}
              icon={stat.icon}
              label={stat.label}
              value={stat.value}
              gradient={stat.color}
              trend={stat.trend}
            />
          ))}
        </div>

        {/* Próximo Culto / Ao Vivo */}
        <Card className="p-6 md:p-8 border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-secondary/5 to-background hover:border-primary/50 transition-all duration-300 elevation-2">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 md:gap-6">
            <div className="flex items-start gap-4 md:gap-5 flex-1">
              <div className="p-3.5 md:p-4 bg-gradient-to-br from-red-600 to-rose-600 rounded-2xl shadow-lg flex-shrink-0">
                <Clock className="h-7 w-7 md:h-8 md:w-8 text-white" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-xl md:text-2xl font-bold text-foreground">Culto de Domingo</h3>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 text-xs font-bold rounded-full border border-red-200 dark:border-red-800">
                    <Radio className="h-3 w-3" />
                    EM BREVE
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm md:text-base text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="font-semibold">Domingo, 22 Dez 2024</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="font-semibold">18:00 - 20:00</span>
                  </div>
                </div>
                <p className="text-sm md:text-base text-foreground/80 leading-relaxed max-w-2xl">
                  {isGuest 
                    ? 'Junte-se a nós neste momento de adoração, palavra e comunhão. Todos são bem-vindos!' 
                    : 'Prepare seu coração para um tempo de adoração, palavra transformadora e comunhão.'}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto">
              <Button
                onClick={() => navigate('/live')}
                className="gradient-primary text-white font-bold shadow-lg hover:shadow-xl"
                size="lg"
              >
                <Play className="mr-2 h-5 w-5 fill-current" />
                Assistir Ao Vivo
              </Button>
              <Button
                onClick={() => navigate('/agenda')}
                variant="outline"
                className="border-2 font-semibold"
                size="lg"
              >
                <Calendar className="mr-2 h-5 w-5" />
                Ver Agenda
              </Button>
            </div>
          </div>
        </Card>

        {/* Caminhos Principais - Contextuais */}
        <div className="space-y-5 md:space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
              <div className="p-2.5 md:p-3 bg-gradient-to-br from-primary to-secondary rounded-xl shadow-md">
                <TrendingUp className="h-6 w-6 md:h-7 md:w-7 text-white" />
              </div>
              {isGuest ? 'Explore a MER' : isAdmin ? 'Acesso Rápido' : 'Sua Jornada Espiritual'}
            </h2>
            {isAdmin && (
              <Button
                onClick={() => navigate('/dashboard')}
                variant="outline"
                size="sm"
                className="hidden sm:flex border-2 font-semibold"
              >
                <Shield className="mr-2 h-4 w-4" />
                Painel Admin
              </Button>
            )}
          </div>
          
          <div className={`grid grid-cols-2 gap-3 md:gap-4 ${
            isGuest ? 'sm:grid-cols-3 lg:grid-cols-5' : 
            isAdmin ? 'sm:grid-cols-3 lg:grid-cols-5' : 
            'sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7'
          }`}>
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

          {/* CTA contextual para convidados */}
          {isGuest && (
            <GuestPrompt
              title="Pronto para fazer parte da família?"
              description="Membros têm acesso completo a cursos, comunidade, ministérios e recursos espirituais."
              actionLabel="Tornar-se Membro Agora"
              onAction={() => navigate('/about')}
            />
          )}
        </div>

        {/* Destaques - Conteúdo Vivo */}
        <div className="grid lg:grid-cols-2 gap-5 md:gap-6">
          {/* Últimas Mensagens */}
          <Card className="p-6 md:p-8 border-2 hover:border-primary/40 hover:shadow-xl transition-all duration-300 elevation-1">
            <div className="flex items-center justify-between mb-5 md:mb-6">
              <h3 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-3">
                <div className="p-2 md:p-2.5 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl shadow-md flex-shrink-0">
                  <BookOpen className="h-6 w-6 md:h-7 md:w-7 text-white" />
                </div>
                <span className="leading-tight">Palavra Compartilhada</span>
              </h3>
              {isAdmin && (
                <AdminAction
                  label="Gerenciar"
                  onClick={() => navigate('/sermons')}
                  variant="ghost"
                  size="sm"
                />
              )}
            </div>
            <div className="space-y-3">
              {(recentSermons.length > 0 ? recentSermons : []).map((sermon: any) => (
                <div 
                  key={sermon.title} 
                  onClick={() => navigate('/sermons')}
                  className="flex items-start gap-3 md:gap-4 p-3.5 md:p-4 rounded-xl hover:bg-primary/5 dark:hover:bg-primary/10 cursor-pointer transition-all duration-200 group border border-transparent hover:border-primary/20"
                >
                  <div className="p-2.5 md:p-3 bg-gradient-to-br from-primary to-secondary rounded-xl shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all flex-shrink-0">
                    <Play className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm md:text-base text-foreground mb-1 group-hover:text-primary transition-colors leading-snug line-clamp-1">
                      {sermon.title}
                    </div>
                    <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground leading-relaxed flex-wrap">
                      {sermon.speaker && <span className="font-medium">{sermon.speaker}</span>}
                      {sermon.speaker && <span>•</span>}
                      <span>{new Date(sermon.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Play className="h-3 w-3" />
                        {sermon.views || 0}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button 
              onClick={() => navigate('/sermons')} 
              className="w-full mt-5 md:mt-6 font-semibold" 
              variant="outline" 
              size="lg"
            >
              <BookOpen className="mr-2 h-5 w-5" />
              Ver Todas as Mensagens
            </Button>
          </Card>

          {/* Próximos Eventos */}
          <Card className="p-6 md:p-8 border-2 hover:border-primary/40 hover:shadow-xl transition-all duration-300 elevation-1">
            <div className="flex items-center justify-between mb-5 md:mb-6">
              <h3 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-3">
                <div className="p-2 md:p-2.5 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl shadow-md flex-shrink-0">
                  <Calendar className="h-6 w-6 md:h-7 md:w-7 text-white" />
                </div>
                <span className="leading-tight">Próximos Encontros</span>
              </h3>
              {isAdmin && (
                <AdminAction
                  label="Gerenciar"
                  onClick={() => navigate('/agenda')}
                  variant="ghost"
                  size="sm"
                />
              )}
            </div>
            <div className="space-y-3">
              {(upcomingEvents.length > 0 ? upcomingEvents : []).map((event: any) => (
                <div 
                  key={event.title} 
                  onClick={() => navigate('/agenda')}
                  className="flex items-start gap-3 md:gap-4 p-3.5 md:p-4 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/20 cursor-pointer transition-all duration-200 group border border-transparent hover:border-purple-200 dark:hover:border-purple-800"
                >
                  <div className="p-2.5 md:p-3 bg-gradient-to-br from-secondary to-accent rounded-xl shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all flex-shrink-0">
                    <Calendar className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm md:text-base text-foreground mb-1 group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors leading-snug line-clamp-1">
                      {event.title}
                    </div>
                    <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground leading-relaxed flex-wrap">
                      <span className="font-medium">{new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                      <span>•</span>
                      <span>{new Date(event.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      {event.max_attendees && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {event.max_attendees}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button 
              onClick={() => navigate('/agenda')} 
              className="w-full mt-5 md:mt-6 font-semibold" 
              variant="outline" 
              size="lg"
            >
              <Calendar className="mr-2 h-5 w-5" />
              Ver Agenda Completa
            </Button>
          </Card>
        </div>

        {/* CTA Final - Contextual */}
        {isGuest && (
          <Card className="p-8 md:p-12 border-2 border-accent/40 bg-gradient-to-br from-accent/10 via-background to-primary/5 hover:border-accent/60 transition-all duration-300 elevation-2">
            <div className="max-w-3xl mx-auto text-center space-y-5 md:space-y-6">
              <div className="inline-flex p-4 bg-gradient-to-br from-accent to-[#c89860] rounded-2xl shadow-xl">
                <Heart className="h-10 w-10 md:h-12 md:w-12 text-white" />
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl md:text-4xl font-black text-foreground leading-tight">
                  Pronto para fazer parte desta família?
                </h2>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                  A MER é mais que uma igreja — é uma comunidade de fé, reconciliação e transformação. 
                  Junte-se a milhares de vidas impactadas pelo amor de Cristo.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Button
                  onClick={() => navigate('/about')}
                  size="lg"
                  className="gradient-primary text-white font-bold text-lg px-8 py-6 shadow-2xl hover:shadow-primary/20"
                >
                  <UserPlus className="mr-2 h-6 w-6" />
                  Tornar-se Membro
                </Button>
                <Button
                  onClick={() => navigate('/prayer')}
                  size="lg"
                  variant="outline"
                  className="border-2 font-bold text-lg px-8 py-6"
                >
                  <Heart className="mr-2 h-6 w-6" />
                  Fazer um Pedido de Oração
                </Button>
              </div>
            </div>
          </Card>
        )}

        {(isMember || isAdmin) && (
          <Card className="p-8 md:p-12 border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-background to-secondary/5 hover:border-primary/50 transition-all duration-300 elevation-2">
            <div className="max-w-3xl mx-auto text-center space-y-5 md:space-y-6">
              <div className="inline-flex p-4 bg-gradient-to-br from-primary to-secondary rounded-2xl shadow-xl">
                <Flame className="h-10 w-10 md:h-12 md:w-12 text-white" />
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl md:text-4xl font-black text-foreground leading-tight">
                  Continue crescendo em sua jornada
                </h2>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                  {isAdmin 
                    ? 'Gerencie a casa de Deus com sabedoria, acompanhe métricas ao vivo e tome decisões estratégicas.'
                    : 'Explore cursos bíblicos, participe da comunidade, encontre seu ministério e fortaleça sua fé diariamente.'}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                {isAdmin ? (
                  <>
                    <Button
                      onClick={() => navigate('/dashboard')}
                      size="lg"
                      className="bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold text-lg px-8 py-6 shadow-2xl hover:shadow-amber-600/20"
                    >
                      <BarChart3 className="mr-2 h-6 w-6" />
                      Ir para Dashboard
                    </Button>
                    <Button
                      onClick={() => navigate('/notifications')}
                      size="lg"
                      variant="outline"
                      className="border-2 font-bold text-lg px-8 py-6"
                    >
                      <Bell className="mr-2 h-6 w-6" />
                      Notificações
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => navigate('/academy')}
                      size="lg"
                      className="gradient-primary text-white font-bold text-lg px-8 py-6 shadow-2xl hover:shadow-primary/20"
                    >
                      <GraduationCap className="mr-2 h-6 w-6" />
                      Explorar Cursos
                    </Button>
                    <Button
                      onClick={() => navigate('/ministries')}
                      size="lg"
                      variant="outline"
                      className="border-2 font-bold text-lg px-8 py-6"
                    >
                      <Users className="mr-2 h-6 w-6" />
                      Encontrar Ministério
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  )
}

export default HomePage
