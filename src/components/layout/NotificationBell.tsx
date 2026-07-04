import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
interface DBNotification {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
}

export const NotificationBell = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [showPopup, setShowPopup] = useState(false)
  const [recentNotifications, setRecentNotifications] = useState<DBNotification[]>([])

  useEffect(() => {
    if (!user || user.role === 'guest') return

    loadNotifications()

    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000)

    return () => clearInterval(interval)
  }, [user])

  const loadNotifications = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) {
      console.error('Error loading notifications:', error)
      return
    }

    setUnreadCount(data?.length || 0)
    setRecentNotifications(data || [])
  }

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    loadNotifications()
  }

  if (!user || user.role === 'guest') return null

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowPopup(!showPopup)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {showPopup && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPopup(false)}
          />
          <Card className="absolute right-0 top-12 w-96 max-h-96 overflow-y-auto z-50 border-2 shadow-2xl">
            <div className="p-4 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-foreground">Notificações</h3>
                {unreadCount > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {unreadCount} {unreadCount === 1 ? 'nova' : 'novas'}
                  </span>
                )}
              </div>
            </div>

            {recentNotifications.length > 0 ? (
              <div className="divide-y divide-border">
                {recentNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => {
                      markAsRead(notification.id)
                      setShowPopup(false)
                      navigate('/notifications')
                    }}
                    className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className="font-semibold text-foreground mb-1 text-sm">
                      {notification.title}
                    </div>
                    <div className="text-sm text-muted-foreground line-clamp-2">
                      {notification.message}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(notification.created_at).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Nenhuma notificação nova
              </div>
            )}

            <div className="p-3 border-t border-border bg-muted/30">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowPopup(false)
                  navigate('/notifications')
                }}
                className="w-full text-primary hover:text-primary"
              >
                Ver todas as notificações
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
