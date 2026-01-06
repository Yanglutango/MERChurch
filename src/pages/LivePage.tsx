
import { useState, useEffect } from 'react'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Send, Users, Radio as RadioIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { LiveMessage } from '../types'
import { LoadingState } from '../components/shared/LoadingState'

const LivePage = () => {
  const { user } = useAuth()
  const [messages, setMessages] = useState<LiveMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [viewerCount, setViewerCount] = useState(1247)

  useEffect(() => {
    loadMessages()
    
    // Simulate viewer count changes
    const interval = setInterval(() => {
      setViewerCount((prev) => prev + Math.floor(Math.random() * 10 - 5))
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const loadMessages = async () => {
    setLoadingMessages(true)
    const { data, error } = await supabase
      .from('live_messages')
      .select(`
        *,
        user:user_profiles(username, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error loading messages:', error)
      setLoadingMessages(false)
      return
    }

    setMessages(data as any)
    setLoadingMessages(false)
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || loading) return

    setLoading(true)
    try {
      const { error } = await supabase.from('live_messages').insert({
        user_id: user!.id,
        message: newMessage.trim(),
      })

      if (error) throw error

      setNewMessage('')
      loadMessages()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar mensagem')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout title="Ao Vivo">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Video Player */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="overflow-hidden border-2">
            <div className="relative bg-black aspect-video">
              <img
                src="https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1280&h=720&fit=crop"
                alt="Live Stream"
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <RadioIcon className="h-16 w-16 mx-auto mb-4 animate-pulse" />
                  <p className="text-2xl font-bold">Transmissão ao Vivo</p>
                  <p className="text-white/70">Culto de Celebração</p>
                </div>
              </div>

              {/* Live Badge */}
              <div className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 bg-red-500 rounded-full shadow-lg">
                <div className="h-2 w-2 bg-white rounded-full animate-pulse" />
                <span className="text-white font-bold">AO VIVO</span>
              </div>

              {/* Viewer Count */}
              <div className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-sm rounded-full">
                <Users className="h-4 w-4 text-white" />
                <span className="text-white font-semibold">{viewerCount.toLocaleString()}</span>
              </div>
            </div>

            <div className="p-6">
              <h2 className="text-2xl font-bold text-foreground mb-2">Culto de Celebração</h2>
              <p className="text-muted-foreground">
                Junte-se a nós neste momento especial de adoração e louvor. Que Deus abençoe sua vida!
              </p>
            </div>
          </Card>

          <Card className="p-6 border-2">
            <h3 className="text-xl font-bold text-foreground mb-4">Sobre esta Transmissão</h3>
            <div className="space-y-2 text-muted-foreground">
              <p>📅 Domingo, 22 de Dezembro de 2024</p>
              <p>⏰ 18:00 - 20:00</p>
              <p>📍 Templo Principal - MER</p>
              <p>🎤 Pr. João Silva</p>
            </div>
          </Card>
        </div>

        {/* Live Chat */}
        <Card className="lg:col-span-1 flex flex-col border-2 h-[600px]">
          <div className="p-4 border-b border-border">
            <h3 className="font-bold text-foreground">Chat ao Vivo</h3>
            <p className="text-sm text-muted-foreground">{messages.length} mensagens</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <LoadingState message="Carregando chat..." />
              </div>
            ) : (
            // The original code had an extra set of curly braces here, causing a parsing error.
            // JSX expects a single expression or a list of JSX elements directly after the colon in a ternary.
            // Removing the outer curly braces fixes this.
            messages.map((msg) => (
              <div key={msg.id} className="flex gap-3">
                {msg.user?.avatar_url ? (
                  <img src={msg.user.avatar_url} alt="" className="h-8 w-8 rounded-full flex-shrink-0" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {msg.user?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-sm text-foreground">{msg.user?.username || 'Anônimo'}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{msg.message}</p>
                </div>
              </div>
            ))
            )}
          </div>

          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Digite sua mensagem..."
                className="flex-1"
              />
              <Button onClick={sendMessage} disabled={loading || !newMessage.trim()} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  )
}

export default LivePage
