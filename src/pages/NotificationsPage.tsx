import { useState, useEffect } from 'react'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Bell, Check, Trash2, Filter } from 'lucide-react'
import { toast } from 'sonner'
import type { Notification } from '../types'

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
      <div className="space-y-6">
        {/* Header */}
        <Card className="p-6 border-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-1">Notificações</h2>
              <p className="text-muted-foreground">
                {notifications.filter((n) => !n.isRead).length} não lidas
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
              >
                Todas
              </Button>
              <Button
                variant={filter === 'unread' ? 'default' : 'outline'}
                onClick={() => setFilter('unread')}
              >
                Não Lidas
              </Button>
              <Button variant="outline" onClick={markAllAsRead}>
                <Check className="h-4 w-4 mr-2" />
                Marcar Todas
              </Button>
            </div>
          </div>
        </Card>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`p-6 border-2 transition-all hover:shadow-lg ${
                !notification.isRead ? 'border-primary/50 bg-primary/5' : ''
              }`}
            >
              <div className="flex gap-4">
                <div className="text-3xl">{getIcon(notification.type)}</div>

                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-foreground">{notification.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!notification.isRead && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteNotification(notification.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
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
          <Card className="p-12 text-center border-2">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {filter === 'unread'
                ? 'Nenhuma notificação não lida'
                : 'Nenhuma notificação'}
            </p>
          </Card>
        )}
      </div>
    </Layout>
  )
}

export default NotificationsPage
