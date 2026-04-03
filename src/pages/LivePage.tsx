
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { useAuth } from '../hooks/useAuth'
import { useAppStore } from '../stores/appStore'
import { supabase } from '../lib/supabase'
import { Send, Users, Radio as RadioIcon, Heart, BookOpen, MessageCircle, Shield, Volume2, Ban, Pin, Calendar, Clock, MapPin, Flame, Eye, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import type { LiveMessage } from '../types'
import { LoadingState } from '../components/shared/LoadingState'
import { GuestPrompt } from '../components/shared/GuestPrompt'
import { AdminAction } from '../components/shared/AdminAction'

const LivePage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useAppStore()
  const [messages, setMessages] = useState<LiveMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [viewerCount, setViewerCount] = useState(0)
  const [prayerRequests, setPrayerRequests] = useState(0)
  
  const isGuest = user?.role === 'guest'
  const isMember = user?.role === 'member'
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    loadMessages()
    loadStats()

    // Poll for new messages and stats every 15 seconds
    const interval = setInterval(() => {
      loadMessages()
      loadStats()
    }, 15000)

    return () => clearInterval(interval)
  }, [])

  const loadStats = async () => {
    const [messagesRes, prayersRes] = await Promise.all([
      supabase.from('live_messages').select('id', { count: 'exact', head: true }),
      supabase.from('prayer_requests').select('id', { count: 'exact', head: true }),
    ])
    setViewerCount(messagesRes.count || 0)
    setPrayerRequests(prayersRes.count || 0)
  }

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
      <div className="space-y-6">
        {/* Hero Banner - Contextual */}
        <Card className="relative overflow-hidden border-0 shadow-2xl rounded-2xl elevation-3">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1920&h=600&fit=crop&q=80"
              alt="Worship"
              className="w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-red-600/95 via-rose-600/93 to-pink-600/91" />
          </div>
          
          <div className="relative z-10 p-6 md:p-10 lg:p-14 text-white">
            <div className="max-w-4xl space-y-5 md:space-y-7">
              <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-white/20 backdrop-blur-md rounded-full border border-white/30 shadow-lg">
                <div className="h-2.5 w-2.5 bg-white rounded-full animate-pulse shadow-lg shadow-white/50" />
                <span className="text-sm md:text-base font-bold tracking-wide">TRANSMISSÃO AO VIVO</span>
              </div>

              <div className="space-y-4">
                {isGuest && (
                  <>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight">
                      Junte-se ao{' '}
                      <span className="bg-gradient-to-r from-white via-yellow-200 to-white bg-clip-text text-transparent">
                        Culto ao Vivo
                      </span>
                    </h1>
                    <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-medium leading-relaxed max-w-2xl">
                      Experimente a presença de Deus em tempo real. Adoração, palavra e comunhão — você é bem-vindo.
                    </p>
                  </>
                )}
                
                {(isMember || isAdmin) && (
                  <>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight">
                      {isAdmin && <Shield className="inline h-10 w-10 md:h-14 md:w-14 mr-3 md:mr-4 align-middle" />}
                      Culto de Celebração
                    </h1>
                    <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-medium leading-relaxed max-w-2xl">
                      {isAdmin ? 'Acompanhe a transmissão ao vivo e modere a experiência da comunidade.' : 'Adore, compartilhe e conecte-se com sua família espiritual neste momento.'}
                    </p>
                  </>
                )}
              </div>

              <div className="flex items-center gap-4 md:gap-6 flex-wrap">
                <div className="flex items-center gap-2 px-4 py-2 bg-white/15 backdrop-blur-sm rounded-full">
                  <Eye className="h-5 w-5" />
                  <span className="text-sm md:text-base font-bold">{viewerCount.toLocaleString()} assistindo</span>
                </div>
                {(isMember || isAdmin) && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/15 backdrop-blur-sm rounded-full">
                    <Heart className="h-5 w-5" />
                    <span className="text-sm md:text-base font-bold">{prayerRequests} pedidos de oração</span>
                  </div>
                )}
                {isAdmin && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/30 backdrop-blur-sm rounded-full border border-yellow-300/50">
                    <Shield className="h-5 w-5 text-yellow-200" />
                    <span className="text-sm md:text-base font-bold text-yellow-100">Modo Administração</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-yellow-400/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-white/10 to-transparent rounded-full blur-3xl" />
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-2 space-y-5">
            <Card className="overflow-hidden border-0 shadow-xl elevation-3">
              <div className="relative bg-black aspect-video group">
                <img
                  src="https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1280&h=720&fit=crop"
                  alt="Live Stream"
                  className="w-full h-full object-cover opacity-85"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white px-4">
                    <div className="inline-flex p-4 md:p-5 bg-red-600/20 backdrop-blur-sm rounded-3xl mb-4 md:mb-6 border border-red-500/30">
                      <RadioIcon className="h-14 w-14 md:h-20 md:w-20 animate-pulse" />
                    </div>
                    <p className="text-xl md:text-3xl font-black mb-2">Transmissão ao Vivo</p>
                    <p className="text-base md:text-lg text-white/80 font-medium">Culto de Celebração</p>
                  </div>
                </div>

                {/* Live Badge */}
                <div className="absolute top-4 left-4 flex items-center gap-2.5 px-5 py-2.5 bg-red-600 rounded-full shadow-2xl border border-red-400/50">
                  <div className="h-2.5 w-2.5 bg-white rounded-full animate-pulse shadow-lg shadow-white/50" />
                  <span className="text-white text-sm md:text-base font-bold tracking-wide">AO VIVO</span>
                </div>

                {/* Controls for Admin */}
                {isAdmin && (
                  <div className="absolute bottom-4 left-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <AdminAction>
                      <Button size="sm" variant="secondary" className="backdrop-blur-md bg-white/10 text-white border-white/20 hover:bg-white/20">
                        <Volume2 className="h-4 w-4 mr-2" />
                        Controles
                      </Button>
                    </AdminAction>
                  </div>
                )}

                {/* Viewer Count */}
                <div className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2.5 bg-black/70 backdrop-blur-md rounded-full border border-white/10 shadow-lg">
                  <Eye className="h-4 w-4 text-white" />
                  <span className="text-white font-bold text-sm md:text-base">{viewerCount.toLocaleString()}</span>
                </div>
              </div>
            </Card>

            {/* Informações do Culto */}
            <Card className="p-6 md:p-8 border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-background to-secondary/5 elevation-2">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 bg-gradient-to-br from-primary to-secondary rounded-xl shadow-lg">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-foreground">
                  {isAdmin ? 'Informações da Transmissão' : 'Sobre Este Culto'}
                </h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-foreground">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Data</p>
                      <p className="font-bold">Domingo, 22 de Dezembro de 2024</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-foreground">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Horário</p>
                      <p className="font-bold">18:00 - 20:00</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-foreground">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Local</p>
                      <p className="font-bold">Templo Principal - MER</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-foreground">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Flame className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Pregador</p>
                      <p className="font-bold">Pr. João Silva</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                    {isGuest 
                      ? 'Participe deste momento de adoração, palavra e comunhão. Deus tem uma mensagem especial para você hoje.'
                      : 'Prepare seu coração para este tempo de adoração e palavra. Vamos juntos buscar a presença de Deus.'}
                  </p>
                </div>
              </div>
            </Card>

            {/* CTA para Convidados */}
            {isGuest && (
              <GuestPrompt
                title="Faça parte da comunidade"
                description="Membros podem participar do chat ao vivo, fazer pedidos de oração e interagir com a família MER."
                actionLabel="Tornar-se Membro"
                onAction={() => navigate('/about')}
              />
            )}

            {/* Recursos do Culto - Member/Admin */}
            {(isMember || isAdmin) && (
              <Card className="p-6 md:p-8 border-2 hover:border-primary/50 transition-all elevation-1">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg">
                    <Heart className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-foreground">Recursos do Culto</h3>
                </div>

                <div className="space-y-3">
                  <Button 
                    onClick={() => navigate('/prayer')} 
                    variant="outline" 
                    className="w-full justify-start h-auto p-4 hover:bg-primary/5 hover:border-primary/50"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="p-2 bg-rose-100 dark:bg-rose-950/50 rounded-lg">
                        <Heart className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-bold text-foreground">Fazer Pedido de Oração</div>
                        <div className="text-xs text-muted-foreground">Compartilhe suas necessidades com a igreja</div>
                      </div>
                    </div>
                  </Button>

                  <Button 
                    variant="outline" 
                    className="w-full justify-start h-auto p-4 hover:bg-primary/5 hover:border-primary/50"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="p-2 bg-blue-100 dark:bg-blue-950/50 rounded-lg">
                        <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-bold text-foreground">Notas do Culto</div>
                        <div className="text-xs text-muted-foreground">Registre insights e revelações</div>
                      </div>
                    </div>
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Live Chat */}
          <Card className="lg:col-span-1 flex flex-col border-2 shadow-xl h-[700px] elevation-2">
            <div className="p-5 border-b-2 border-border bg-gradient-to-r from-primary/5 to-secondary/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-primary to-secondary rounded-lg shadow-md">
                    <MessageCircle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">Chat ao Vivo</h3>
                    <p className="text-xs text-muted-foreground">{messages.length} mensagens</p>
                  </div>
                </div>
                {isAdmin && (
                  <AdminAction>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <Shield className="h-4 w-4 text-accent" />
                    </Button>
                  </AdminAction>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
              {isGuest ? (
                <div className="h-full flex items-center justify-center p-6">
                  <div className="text-center space-y-4 max-w-sm">
                    <div className="inline-flex p-4 bg-primary/10 rounded-full">
                      <MessageCircle className="h-10 w-10 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-lg font-bold text-foreground">Chat Somente para Membros</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Faça parte da família MER para participar do chat ao vivo, compartilhar reações e fazer pedidos de oração.
                      </p>
                    </div>
                    <Button onClick={() => navigate('/about')} className="gradient-primary text-white font-semibold">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Tornar-se Membro
                    </Button>
                  </div>
                </div>
              ) : loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <LoadingState message="Carregando chat..." />
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="group relative">
                    <div className="flex gap-3 p-3 rounded-xl hover:bg-background/60 transition-colors">
                      {msg.user?.avatar_url ? (
                        <img src={msg.user.avatar_url} alt="" className="h-9 w-9 rounded-full flex-shrink-0 border-2 border-primary/20" />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-md">
                          {msg.user?.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="font-bold text-sm text-foreground truncate">{msg.user?.username || 'Anônimo'}</span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/90 leading-relaxed">{msg.message}</p>
                      </div>
                      
                      {isAdmin && (
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <AdminAction>
                            <Button size="icon" variant="ghost" className="h-7 w-7">
                              <Pin className="h-3 w-3" />
                            </Button>
                          </AdminAction>
                          <AdminAction>
                            <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-red-500">
                              <Ban className="h-3 w-3" />
                            </Button>
                          </AdminAction>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {!isGuest && (
              <div className="p-4 border-t-2 border-border bg-background">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="Compartilhe sua mensagem..."
                    className="flex-1 h-11 border-2 focus:border-primary"
                  />
                  <Button 
                    onClick={sendMessage} 
                    disabled={loading || !newMessage.trim()} 
                    className="gradient-primary text-white h-11 px-5"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {isAdmin ? 'Moderação ativa • Use com sabedoria' : 'Seja respeitoso e encorajador'}
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  )
}

export default LivePage
