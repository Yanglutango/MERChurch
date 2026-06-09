import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useAppStore } from '../stores/appStore'
import { Bell, Check, Trash2, BookOpen, Calendar, Heart, MessageCircle, Shield, UserPlus, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '../components/shared/EmptyState'

interface DBNotification {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
}

const NotificationsPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useAppStore()
  const [notifications, setNotifications] = useState<DBNotification[]>([])
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const isGuest = user?.role === 'guest'
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (!isGuest) loadNotifications()
  }, [])

  const loadNotifications = async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading notifications:', error)
      return
    }

    setNotifications(data || [])
  }

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)

    if (error) {
      toast.error('Erro ao marcar como lida')
      return
    }

    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user!.id)
      .eq('is_read', false)

    if (error) {
      toast.error('Erro ao marcar todas como lidas')
      return
    }

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    toast.success('Todas as notificações marcadas como lidas')
  }

  const deleteNotification = async (id: string) => {
    const { error } = await supabase.from('notifications').delete().eq('id', id)

    if (error) {
      toast.error('Erro ao excluir notificação')
      return
    }

    setNotifications(prev => prev.filter(n => n.id !== id))
    toast.success('Notificação excluída')
  }

  const filteredNotifications =
    filter === 'all'
      ? notifications
      : notifications.filter(n => !n.is_read)

  const unreadCount = notifications.filter(n => !n.is_read).length

  const getIcon = (type: string) => {
    const iconMap: Record<string, { icon: any; gradient: string }> = {
      sermon: { icon: BookOpen, gradient: 'from-blue-500 to-cyan-500' },
      event: { icon: Calendar, gradient: 'from-purple-500 to-pink-500' },
      announcement: { icon: Bell, gradient: 'from-amber-500 to-orange-500' },
      prayer: { icon: Heart, gradient: 'from-rose-500 to-pink-500' },
      counseling: { icon: MessageCircle, gradient: 'from-green-500 to-emerald-500' },
      ministry: { icon: Shield, gradient: 'from-teal-500 to-cyan-500' },
      admin: { icon: Shield, gradient: 'from-red-500 to-rose-500' },
    }
    return iconMap[type] || { icon: Bell, gradient: 'from-primary to-secondary' }
  }

  // Redirect guests
  if (isGuest) {
    return (
      <Layout title="Notificações">
        <div className="p-4 md:p-6">
        <div className="max-w-2xl mx-auto py-12 md:py-20">
          <Card className="p-10 md:p-14 text-center border-2 shadow-xl">
            <div className="max-w-md mx-auto space-y-6">
              <div className="inline-flex p-6 bg-primary/10 rounded-full">
                <Bell className="h-16 w-16 text-primary" />
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl md:text-4xl font-black text-foreground">Área Exclusiva para Membros</h2>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  Faça parte da família MER para receber notificações sobre novos cultos, sermões, eventos e muito mais.
                </p>
              </div>
              <Button onClick={() => navigate('/about')} size="lg" className="gradient-primary text-white font-bold">
                <UserPlus className="mr-2 h-5 w-5" />
                Tornar-se Membro
              </Button>
            </div>
          </Card>
        </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Notificações">
      <div className="p-4 md:p-6">
        {/* Hero */}
        <Card className="relative overflow-hidden border-0 shadow-2xl rounded-2xl">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1920&h=600&fit=crop&q=80"
              alt="Notifications"
              className="w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/95 via-purple-600/93 to-pink-600/91" />
          </div>

          <div className="relative z-10 p-6 md:p-10 lg:p-12 text-white">
            <div className="max-w-3xl space-y-5">
              <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-white/20 backdrop-blur-md rounded-full border border-white/30 shadow-lg">
                <Bell className="h-4 w-4 md:h-5 md:w-5" />
                <span className="text-sm md:text-base font-bold tracking-wide">
                  {unreadCount} NÃO {unreadCount === 1 ? 'LIDA' : 'LIDAS'}
                </span>
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl md:text-5xl font-black leading-tight tracking-tight">
                  {isAdmin && <Shield className="inline h-10 w-10 md:h-12 md:w-12 mr-3 align-middle" />}
                  Suas Notificações
                </h1>
                <p className="text-lg md:text-xl text-white/90 font-medium leading-relaxed">
                  {isAdmin
                    ? 'Acompanhe atualizações importantes, conteúdo pendente e atividades críticas da casa.'
                    : 'Fique conectado com novidades, eventos e movimentos da sua comunidade espiritual.'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 md:gap-3">
                <Button
                  variant={filter === 'all' ? 'secondary' : 'outline'}
                  onClick={() => setFilter('all')}
                  className={`font-semibold ${filter === 'all' ? 'bg-white text-purple-600 hover:bg-white/95' : 'border-white/80 text-white hover:bg-white/10 backdrop-blur-sm'}`}
                >
                  Todas ({notifications.length})
                </Button>
                <Button
                  variant={filter === 'unread' ? 'secondary' : 'outline'}
                  onClick={() => setFilter('unread')}
                  className={`font-semibold ${filter === 'unread' ? 'bg-white text-purple-600 hover:bg-white/95' : 'border-white/80 text-white hover:bg-white/10 backdrop-blur-sm'}`}
                >
                  Não Lidas ({unreadCount})
                </Button>
                {unreadCount > 0 && (
                  <Button
                    variant="outline"
                    onClick={markAllAsRead}
                    className="border-white/80 text-white hover:bg-white/10 backdrop-blur-sm font-semibold"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Marcar Todas como Lidas
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-yellow-400/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-white/10 to-transparent rounded-full blur-3xl" />
        </Card>

        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.map((notification) => {
            const { icon: Icon, gradient } = getIcon(notification.type)
            const isUnread = !notification.is_read

            return (
              <Card
                key={notification.id}
                className={`group p-5 md:p-6 border-2 transition-all hover:shadow-xl elevation-1 ${
                  isUnread
                    ? 'border-primary/50 bg-gradient-to-br from-primary/10 via-background to-background shadow-lg'
                    : 'hover:border-primary/30'
                }`}
              >
                <div className="flex gap-4 md:gap-5">
                  <div className={`flex-shrink-0 p-3 md:p-4 bg-gradient-to-br ${gradient} rounded-2xl shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon className="h-6 w-6 md:h-7 md:w-7 text-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-base md:text-lg text-foreground leading-snug">
                            {notification.title}
                          </h3>
                          {isUnread && (
                            <div className="px-2 py-0.5 bg-primary rounded-full">
                              <span className="text-xs font-bold text-primary-foreground">NOVA</span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm md:text-base text-foreground/90 leading-relaxed">
                          {notification.message}
                        </p>
                      </div>

                      <div className="flex gap-1 flex-shrink-0">
                        {isUnread && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); markAsRead(notification.id) }}
                            className="h-9 w-9 hover:bg-primary/10"
                            title="Marcar como lida"
                          >
                            <Check className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id) }}
                          className="h-9 w-9 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600"
                          title="Excluir notificação"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {new Date(notification.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        {/* Empty State */}
        {filteredNotifications.length === 0 && (
          <Card className="p-12 md:p-16 text-center border-2 border-dashed bg-muted/20">
            <div className="max-w-md mx-auto space-y-5">
              <div className="inline-flex p-5 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl">
                {filter === 'unread' ? (
                  <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-400" />
                ) : (
                  <Bell className="h-16 w-16 text-muted-foreground/60" />
                )}
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl md:text-3xl font-bold text-foreground">
                  {filter === 'unread' ? 'Você está em dia!' : 'Nenhuma notificação'}
                </h3>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  {filter === 'unread'
                    ? 'Todas as notificações foram lidas. Continue acompanhando as novidades da MER.'
                    : 'Novas atualizações e movimentos da comunidade aparecerão aqui.'}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  )
}

export default NotificationsPage
