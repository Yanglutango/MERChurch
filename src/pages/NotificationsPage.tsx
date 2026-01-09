import { useState, useEffect } from 'react'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Bell, Check, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Notification } from '../types'
import { PageHeader } from '../components/shared/PageHeader'
import { EmptyState } from '../components/shared/EmptyState'

const NotificationsPage = () => {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  useEffect(() => {
    loadNotifications()
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

    setNotifications(data as any)
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

    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )
  }

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user!.id)

    if (error) {
      toast.error('Erro ao marcar todas como lidas')
      return
    }

    setNotifications(notifications.map((n) => ({ ...n, isRead: true })))
    toast.success('Todas as notificações marcadas como lidas')
  }

  const deleteNotification = async (id: string) => {
    const { error } = await supabase.from('notifications').delete().eq('id', id)

    if (error) {
      toast.error('Erro ao excluir notificação')
      return
    }

    setNotifications(notifications.filter((n) => n.id !== id))
    toast.success('Notificação excluída')
  }

  const filteredNotifications =
    filter === 'all'
      ? notifications
      : notifications.filter((n) => !n.isRead)

  const getIcon = (type: string) => {
    const icons: Record<string, string> = {
      sermon: '📖',
      event: '📅',
      announcement: '📢',
      prayer: '🙏',
      counseling: '💬',
    }
    return icons[type] || '🔔'
  }

  return (
    <Layout title="Notificações">
      <div className="space-section max-w-4xl mx-auto">
        {/* Header */}
        <PageHeader
          title="Notificações"
          description={`${notifications.filter((n) => !n.isRead).length} não lidas`}
          icon={Bell}
          gradient="from-purple-500 via-indigo-500 to-blue-500"
          actions={
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
                size="sm"
              >
                Todas
              </Button>
              <Button
                variant={filter === 'unread' ? 'default' : 'outline'}
                onClick={() => setFilter('unread')}
                size="sm"
              >
                Não Lidas
              </Button>
              <Button variant="outline" onClick={markAllAsRead} size="sm">
                <Check className="h-4 w-4 mr-2" />
                Marcar Todas
              </Button>
            </div>
          }
        />

        {/* Notifications List */}
        <div className="space-items">
          {filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`p-5 md:p-6 border-2 transition-all hover:shadow-lg elevation-1 ${
                !notification.isRead ? 'border-primary/40 bg-primary/5' : ''
              }`}
            >
              <div className="flex gap-4">
                <div className="text-4xl flex-shrink-0">{getIcon(notification.type)}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-base md:text-lg text-foreground leading-snug mb-1">
                        {notification.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {notification.message}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {!notification.isRead && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => markAsRead(notification.id)}
                          className="h-8 w-8"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteNotification(notification.id)}
                        className="h-8 w-8 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {new Date(notification.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredNotifications.length === 0 && (
          <EmptyState
            icon={Bell}
            title={filter === 'unread' ? 'Nenhuma notificação não lida' : 'Nenhuma notificação'}
            description={filter === 'unread' ? 'Você está em dia!' : 'Novas notificações aparecerão aqui'}
          />
        )}
      </div>
    </Layout>
  )
}

export default NotificationsPage
