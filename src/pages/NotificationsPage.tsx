import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useAppStore } from '../stores/appStore'
import { 
  Bell, Check, Trash2, BookOpen, Calendar, Heart, 
  MessageCircle, Shield, UserPlus, CheckCircle2, Loader2, Sparkles
} from 'lucide-react'
import { toast } from 'sonner'

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
  const [isLoading, setIsLoading] = useState(true)

  const isGuest = user?.role === 'guest'
  const isAdmin = user?.role === 'admin'

  // Load notifications and subscribe to real-time changes
  useEffect(() => {
    if (isGuest || !user?.id) {
      setIsLoading(false)
      return
    }

    loadNotifications()

    // Real-time listener for user notifications
    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, isGuest])

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotifications(data || [])
    } catch (error) {
      console.error('Error loading notifications:', error)
      toast.error('Erro ao carregar notificações')
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (id: string) => {
    // Optimistic UI Update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)

    if (error) {
      toast.error('Erro ao marcar como lida')
      loadNotifications() // Rollback on failure
    }
  }

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
    if (unreadIds.length === 0) return

    // Optimistic UI Update
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    toast.success('Todas as notificações foram marcadas como lidas')

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user!.id)
      .eq('is_read', false)

    if (error) {
      toast.error('Erro ao sincronizar atualizações')
      loadNotifications() // Rollback on failure
    }
  }

  const deleteNotification = async (id: string) => {
    // Optimistic UI Update
    setNotifications(prev => prev.filter(n => n.id !== id))
    toast.success('Notificação excluída')

    const { error } = await supabase
      .from('notifications').delete().eq('id', id)

    if (error) {
      toast.error('Erro ao excluir notificação de nuvem')
      loadNotifications() // Rollback on failure
    }
  }

  const filteredNotifications =
    filter === 'all'
      ? notifications
      : notifications.filter(n => !n.is_read)

  const unreadCount = notifications.filter(n => !n.is_read).length

  const getIcon = (type: string) => {
    const iconMap: Record<string, { icon: any; gradient: string; bgLight: string; text: string }> = {
      sermon: { icon: BookOpen, gradient: 'from-blue-500 to-indigo-600', bgLight: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
      event: { icon: Calendar, gradient: 'from-purple-500 to-pink-600', bgLight: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400' },
      announcement: { icon: Bell, gradient: 'from-amber-500 to-orange-600', bgLight: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
      prayer: { icon: Heart, gradient: 'from-rose-500 to-red-600', bgLight: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400' },
      counseling: { icon: MessageCircle, gradient: 'from-green-500 to-emerald-600', bgLight: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400' },
      ministry: { icon: Shield, gradient: 'from-teal-500 to-cyan-600', bgLight: 'bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400' },
      admin: { icon: Shield, gradient: 'from-red-500 to-rose-600', bgLight: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400' },
    }
    return iconMap[type] || { icon: Bell, gradient: 'from-slate-500 to-slate-700', bgLight: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400' }
  }

  // Redirect guests
  if (isGuest) {
    return (
      <Layout title="Notificações">
        <div className="container max-w-4xl mx-auto px-4 py-12 md:py-24">
          <Card className="relative overflow-hidden p-8 md:p-16 text-center border shadow-2xl bg-gradient-to-b from-background to-muted/20">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="max-w-md mx-auto space-y-6 relative z-10">
              <div className="inline-flex p-5 bg-primary/10 rounded-3xl animate-pulse">
                <Bell className="h-12 w-12 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">Área Exclusiva para Membros</h2>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  Faça parte da família MER para receber notificações em tempo real sobre novos cultos, sermões, eventos e muito mais.
                </p>
              </div>
              <Button onClick={() => navigate('/about')} size="lg" className="w-full sm:w-auto bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform">
                <UserPlus className="mr-2 h-5 w-5" />
                Tornar-se Membro
              </Button>
            </div>
          </Card>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Notificações">
      <div className="container max-w-5xl mx-auto px-4 py-6 space-y-8">
        
        {/* Header Block Banner */}
        <Card className="relative overflow-hidden border-0 shadow-xl rounded-3xl bg-slate-900 text-white">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1920&h=600&fit=crop&q=80"
              alt="Background"
              className="w-full h-full object-cover opacity-25 mix-blend-overlay"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-950 via-purple-900 to-slate-900" />
          </div>

          <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10">
                <Sparkles className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                <span className="text-xs font-semibold tracking-wider uppercase">
                  {unreadCount} {unreadCount === 1 ? 'Pendente' : 'Pendentes'}
                </span>
              </div>
              <h1 className="text-2xl md:text-4xl font-black tracking-tight flex items-center gap-2">
                {isAdmin && <Shield className="h-8 w-8 text-red-400 shrink-0" />}
                Painel de Notificações
              </h1>
              <p className="text-sm md:text-base text-slate-300 leading-relaxed">
                {isAdmin
                  ? 'Gerencie atualizações operacionais importantes, novos conteúdos e logs administrativos de forma centralizada.'
                  : 'Fique atualizado com as atividades, avisos comunitários e agendamentos de sua jornada espiritual.'}
              </p>
            </div>
          </div>
        </Card>

        {/* Action & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
          <div className="flex bg-muted p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'all' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Todas ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'unread' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Não Lidas ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="w-full sm:w-auto text-xs font-semibold border-dashed hover:border-solid transition-all"
            >
              <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
              Limpar todas como lidas
            </Button>
          )}
        </div>

        {/* Dynamic State Engine */}
        {isLoading ? (
          <div className="space-y-3 py-12 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Buscando atualizações...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Card className="p-12 md:p-16 text-center border border-dashed bg-muted/10 rounded-2xl">
            <div className="max-w-sm mx-auto space-y-4">
              <div className="inline-flex p-4 bg-muted rounded-2xl">
                {filter === 'unread' ? (
                  <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                ) : (
                  <Bell className="h-10 w-10 text-muted-foreground/50" />
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">
                  {filter === 'unread' ? 'Ambiente Organizado!' : 'Caixa Vazia'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {filter === 'unread'
                    ? 'Você leu todas as notificações recentes por aqui.'
                    : 'Nenhum registro encontrado neste período.'}
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid gap-3.5">
            {filteredNotifications.map((notification) => {
              const { icon: Icon, bgLight, text } = getIcon(notification.type)
              const isUnread = !notification.is_read

              return (
                <div
                  key={notification.id}
                  className={`group relative flex gap-4 p-4 md:p-5 border rounded-2xl transition-all duration-200 bg-card hover:shadow-md ${
                    isUnread
                      ? 'border-l-4 border-l-primary border-y-muted border-r-muted shadow-sm dark:bg-primary/[0.02]'
                      : 'border-muted opacity-85 hover:opacity-100'
                  }`}
                >
                  {/* Decorative indicator light for unread status */}
                  {isUnread && (
                    <span className="absolute top-4 right-4 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                  )}

                  {/* Icon Block */}
                  <div className={`flex-shrink-0 h-11 w-11 md:h-12 md:w-12 rounded-xl flex items-center justify-center ${bgLight} ${text}`}>
                    <Icon className="h-5 w-5 md:h-6 md:w-6" />
                  </div>

                  {/* Text Details */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className={`font-semibold text-sm md:text-base leading-tight text-foreground ${isUnread ? 'font-bold' : ''}`}>
                        {notification.title}
                      </h3>
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed mb-2.5 break-words">
                      {notification.message}
                    </p>
                    
                    {/* Timestamp element */}
                    <span className="text-[11px] text-muted-foreground/80 font-medium block">
                      {new Date(notification.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Operational Interactive Side Menu Actions */}
                  <div className="flex sm:flex-col gap-1 self-start sm:self-center ml-auto">
                    {isUnread && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => markAsRead(notification.id)}
                        className="h-8 w-8 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
                        title="Marcar como lida"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteNotification(notification.id)}
                      className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}

export default NotificationsPage
