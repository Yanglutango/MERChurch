import { useState, useEffect, useMemo, useCallback } from 'react'
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

// [MUSK] Otimização de Memória: Mapeamento estático fora do componente evita re-alocações inúteis
const ICON_CONFIG: Record<string, { icon: any; bgLight: string; text: string }> = {
  sermon: { icon: BookOpen, bgLight: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
  event: { icon: Calendar, bgLight: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400' },
  announcement: { icon: Bell, bgLight: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  prayer: { icon: Heart, bgLight: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400' },
  counseling: { icon: MessageCircle, bgLight: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400' },
  ministry: { icon: Shield, bgLight: 'bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400' },
  admin: { icon: Shield, bgLight: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400' },
}

const NotificationsPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useAppStore()
  const [notifications, setNotifications] = useState<DBNotification[]>([])
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)

  // [JOBS] Prevenção de Hydration Mismatch em SSR
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const isGuest = user?.role === 'guest'
  const isAdmin = user?.role === 'admin'

  // [ZUCKERBERG] Carregamento seguro isolado com tratamento de limites de paginação
  const loadNotifications = useCallback(async () => {
    if (!user?.id) return
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(0, 50) // Limite de proteção de payload

      if (error) throw error
      setNotifications(data || [])
    } catch (error) {
      console.error('Error loading notifications:', error)
      toast.error('Erro ao carregar notificações')
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  // Real-time listener resiliente com reconnect automático implícito pelo Supabase Client
  useEffect(() => {
    if (isGuest || !user?.id) {
      setIsLoading(false)
      return
    }

    loadNotifications()

    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => { loadNotifications() }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, isGuest, loadNotifications])

  const markAsRead = async (id: string) => {
    // Atualização Optimista Blindada
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)

    if (error) {
      toast.error('Erro ao atualizar estado')
      loadNotifications()
    }
  }

  const markAllAsRead = async () => {
    if (!user?.id) return
    const unreadNotifications = notifications.filter(n => !n.is_read)
    if (unreadNotifications.length === 0) return

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    toast.success('Todas as notificações foram marcadas como lidas')

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (error) {
      toast.error('Erro de sincronização')
      loadNotifications()
    }
  }

  const deleteNotification = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Erro ao eliminar o registo')
      loadNotifications()
    }
  }

  // [MUSK] Processamento de filtros memorizado para evitar recalculamento em re-renders vazios
  const filteredNotifications = useMemo(() => {
    return filter === 'all' ? notifications : notifications.filter(n => !n.is_read)
  }, [notifications, filter])

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.is_read).length
  }, [notifications])

  // Formatação segura de datas para evitar Hydration Mismatch
  const formatNotificationDate = (dateString: string) => {
    if (!isMounted) return ''
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isGuest) {
    return (
      <Layout title="Notificações">
        <div className="container max-w-4xl mx-auto px-4 py-12 md:py-24">
          <Card className="relative overflow-hidden p-8 md:p-16 text-center border shadow-2xl bg-gradient-to-b from-background to-muted/20 rounded-3xl">
            <div className="max-w-md mx-auto space-y-6">
              <div className="inline-flex p-5 bg-primary/10 rounded-3xl">
                <Bell className="h-12 w-12 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">Área Exclusiva para Membros</h2>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  Faça parte da família MER para receber notificações em tempo real sobre novos cultos, sermões e eventos comunitários.
                </p>
              </div>
              <Button onClick={() => navigate('/about')} size="lg" className="w-full sm:w-auto bg-primary text-primary-foreground font-semibold shadow-lg hover:scale-[1.02] transition-all duration-200">
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
      <div className="container max-w-5xl mx-auto px-4 py-6 space-y-8 animate-fade-in">
        
        {/* Banner Hero Principal */}
        <Card className="relative overflow-hidden border-0 shadow-xl rounded-3xl bg-slate-900 text-white">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1920&h=600&fit=crop&q=80"
              alt="Banner"
              className="w-full h-full object-cover opacity-25 mix-blend-overlay"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-950 via-purple-900 to-slate-900" />
          </div>

          <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10">
                <Sparkles className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                <span className="text-xs font-bold tracking-wider uppercase">
                  {unreadCount} {unreadCount === 1 ? 'Pendente' : 'Pendentes'}
                </span>
              </div>
              <h1 className="text-2xl md:text-4xl font-black tracking-tight flex items-center gap-2">
                {isAdmin && <Shield className="h-8 w-8 text-red-400 shrink-0" />}
                Painel de Notificações
              </h1>
              <p className="text-sm md:text-base text-slate-300 leading-relaxed">
                {isAdmin
                  ? 'Controlo operacional de atualizações da infraestrutura, novos conteúdos e logs eclesiásticos.'
                  : 'Fique atualizado com as atividades da sua comunidade espiritual e avisos apostólicos.'}
              </p>
            </div>
          </div>
        </Card>

        {/* [JOBS] Barra de Filtros com Touch-Target Otimizado para Mobile */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b pb-4">
          <div className="flex bg-muted p-1 rounded-xl min-h-[48px] w-full sm:w-auto">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                filter === 'all' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Todas ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                filter === 'unread' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
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
              className="text-xs font-bold border-dashed hover:border-solid hover:bg-emerald-50 dark:hover:bg-emerald-950/20 h-10 transition-all"
            >
              <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
              Marcar tudo como lido
            </Button>
          )}
        </div>

        {/* Renderização Condicional Limpa baseada em Estados Finitos */}
        {isLoading ? (
          <div className="space-y-4 py-20 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-semibold tracking-wide">A sincronizar com a nuvem KAIRÓS...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Card className="p-12 md:p-16 text-center border border-dashed bg-muted/10 rounded-3xl">
            <div className="max-w-sm mx-auto space-y-4">
              <div className="inline-flex p-4 bg-muted rounded-2xl">
                {filter === 'unread' ? (
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                ) : (
                  <Bell className="h-8 w-8 text-muted-foreground/40" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {filter === 'unread' ? 'Tudo Organizado!' : 'Sem Notificações'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {filter === 'unread' ? 'Leu todas as mensagens prioritárias do seu feed.' : 'Não existem registos nesta categoria.'}
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid gap-3 transition-all duration-300">
            {filteredNotifications.map((notification) => {
              const config = ICON_CONFIG[notification.type] || { icon: Bell, bgLight: 'bg-slate-500/10', text: 'text-slate-600' }
              const Icon = config.icon
              const isUnread = !notification.is_read

              return (
                <div
                  key={notification.id}
                  className={`group relative flex gap-4 p-4 md:p-5 border rounded-2xl transition-all duration-200 bg-card hover:shadow-sm ${
                    isUnread ? 'border-l-4 border-l-primary shadow-xs dark:bg-primary/[0.01]' : 'border-muted opacity-90'
                  }`}
                >
                  {/* [JOBS] Indicador Visual Orgânico Alinhado ao Bloco de Ícone */}
                  {isUnread && (
                    <span className="absolute top-5 left-2 flex h-2 w-2 -ml-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                    </span>
                  )}

                  <div className={`flex-shrink-0 h-12 w-12 rounded-xl flex items-center justify-center ${config.bgLight} ${config.text} group-hover:scale-105 transition-transform duration-200`}>
                    <Icon className="h-5 w-5 md:h-6 md:w-6" />
                  </div>

                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className={`font-semibold text-sm md:text-base text-foreground leading-tight ${isUnread ? 'font-bold' : ''}`}>
                      {notification.title}
                    </h3>
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed mt-1 break-words">
                      {notification.message}
                    </p>
                    <span className="text-[11px] text-muted-foreground/60 font-semibold block mt-2">
                      {formatNotificationDate(notification.created_at)}
                    </span>
                  </div>

                  {/* Botões de Ação com Área de Toque Resguardada */}
                  <div className="flex items-center gap-1 ml-auto shrink-0 self-center">
                    {isUnread && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => markAsRead(notification.id)}
                        className="h-9 w-9 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
                        title="Marcar como lida"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteNotification(notification.id)}
                      className="h-9 w-9 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
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
