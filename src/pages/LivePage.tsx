import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import {
  Send, MessageCircle, Shield, Ban, Clock, Pin, Flame, Heart, BookOpen,
  Radio as RadioIcon, ArrowDown, Share2, Maximize, X, Bell, Circle,
} from 'lucide-react'
import { toast } from 'sonner'
import type { LiveMessage } from '../types'
import { LoadingState } from '../components/shared/LoadingState'

interface LiveSession {
  id: string
  title: string
  preacher_name: string | null
  stream_url: string | null
  start_time: string | null
  end_time: string | null
  is_active: boolean
  description: string | null
}

interface UserProfile {
  username: string | null
  avatar_url: string | null
}

const formatSessionTime = (value: string | null, options: Intl.DateTimeFormatOptions) => {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return date.toLocaleString('pt-BR', options)
}

const LivePage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [messages, setMessages] = useState<LiveMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [prayerCount, setPrayerCount] = useState(0)
  const [activeSession, setActiveSession] = useState<LiveSession | null>(null)
  const [nextSession, setNextSession] = useState<LiveSession | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const profileCache = useRef<Record<string, UserProfile>>({})

  const isGuest = user?.role === 'guest'
  const isAdmin = user?.role === 'admin'
  const isOnline = !!activeSession?.is_active

  const isYouTubeUrl = useCallback((url: string) => url.includes('youtube.com') || url.includes('youtu.be'), [])

  const getYouTubeId = useCallback((url: string) => {
    const match = url.match(/(?:v=|youtu\.be\/|embed\/)([^&\s?]+)/)
    return match ? match[1] : null
  }, [])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
    setShowScrollButton(false)
  }, [])

  const loadSession = useCallback(async () => {
    try {
      const [activeRes, nextRes, prayersRes] = await Promise.all([
        supabase.from('live_sessions').select('*').eq('is_active', true).limit(1).maybeSingle(),
        supabase.from('live_sessions').select('*').eq('is_active', false).gte('start_time', new Date().toISOString()).order('start_time', { ascending: true }).limit(1).maybeSingle(),
        supabase.from('prayer_requests').select('id', { count: 'exact', head: true }),
      ])

      setActiveSession(activeRes.data as LiveSession | null)
      setNextSession(nextRes.data as LiveSession | null)
      setPrayerCount(prayersRes.count || 0)
    } catch (err) {
      console.error('Erro ao carregar dados da transmissão:', err)
    } finally {
      setSessionLoading(false)
    }
  }, [])

  const loadInitialMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('live_messages')
        .select('*, user:user_profiles(username, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(60)

      if (error) throw error

      const chronologicalMessages = (data || []).reverse().map((msg) => ({
        ...msg,
        createdAt: msg.created_at,
        user: msg.user as unknown as UserProfile,
      })) as unknown as LiveMessage[]

      setMessages(chronologicalMessages)
    } catch (error) {
      console.error('Erro ao carregar chat:', error)
    } finally {
      setLoadingMessages(false)
      setTimeout(() => scrollToBottom('auto'), 100)
    }
  }, [scrollToBottom])

  useEffect(() => {
    loadSession()
    loadInitialMessages()

    const chatChannel = supabase
      .channel('live-chat-room')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_messages' },
        async (payload) => {
          const userId = payload.new.user_id
          let profile = profileCache.current[userId]

          if (!profile) {
            const { data } = await supabase
              .from('user_profiles')
              .select('username, avatar_url')
              .eq('id', userId)
              .single()

            if (data) {
              profile = data as UserProfile
              profileCache.current[userId] = profile
            }
          }

          const formattedMessage = {
            ...payload.new,
            user: profile || { username: 'Membro', avatar_url: null },
            createdAt: payload.new.created_at || payload.new.createdAt,
          } as unknown as LiveMessage

          setMessages((prev) => [...prev.slice(-99), formattedMessage])
        }
      )
      .subscribe()

    const sessionChannel = supabase
      .channel('live-session-status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_sessions' }, () => {
        loadSession()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(chatChannel)
      supabase.removeChannel(sessionChannel)
    }
  }, [loadSession, loadInitialMessages])

  useEffect(() => {
    if (!chatContainerRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150

    if (isNearBottom) {
      scrollToBottom('smooth')
    } else {
      setShowScrollButton(true)
    }
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (!videoRef.current || !activeSession?.stream_url || isYouTubeUrl(activeSession.stream_url)) return

    const video = videoRef.current
    const streamUrl = activeSession.stream_url

    video.src = streamUrl
    video.load()

    return () => {
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  }, [activeSession?.stream_url, isYouTubeUrl])

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || sending || !user?.id) return
    setSending(true)

    const { error } = await supabase
      .from('live_messages')
      .insert({ user_id: user.id, message: newMessage.trim() })

    if (error) {
      toast.error('Erro ao enviar mensagem')
    } else {
      setNewMessage('')
    }

    setSending(false)
  }, [newMessage, sending, user])

  const handleScroll = () => {
    if (!chatContainerRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100

    if (isNearBottom) setShowScrollButton(false)
  }

  const handlePinMessage = (id: string) => {
    toast.success('Mensagem fixada')
    console.log('Pin message:', id)
  }

  const handleBanUser = (userId: string) => {
    toast.error('Usuário removido do chat')
    console.log('Ban user:', userId)
  }

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev)
  }

  const shareLiveSession = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
    const shareTitle = activeSession?.title || 'Transmissão ao vivo'

    try {
      if (navigator.share && shareUrl) {
        await navigator.share({
          title: shareTitle,
          text: 'Acompanhe a transmissão ao vivo da MER Church.',
          url: shareUrl,
        })
        return
      }

      if (shareUrl) {
        await navigator.clipboard.writeText(shareUrl)
        toast.success('Link da transmissão copiado para a área de transferência.')
      }
    } catch {
      toast.error('Não foi possível compartilhar a transmissão neste momento.')
    }
  }

  if (isFullscreen && isOnline && activeSession?.stream_url) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-md text-white transition-colors"
          aria-label="Fechar tela cheia"
        >
          <X className="h-6 w-6" />
        </button>

        {isYouTubeUrl(activeSession.stream_url) ? (
          <iframe
            src={`https://www.youtube.com/embed/${getYouTubeId(activeSession.stream_url)}?autoplay=1&rel=0&modestbranding=1&fs=1`}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={activeSession.title}
          />
        ) : (
          <video ref={videoRef} className="w-full h-full object-contain" controls autoPlay playsInline />
        )}
      </div>
    )
  }

  const currentSessionTitle = sessionLoading
    ? 'Carregando transmissão…'
    : activeSession?.title || 'Transmissão ao vivo'

  const sessionDateLabel = activeSession?.start_time
    ? formatSessionTime(activeSession.start_time, { weekday: 'short', day: '2-digit', month: 'short' })
    : null

  const sessionClockLabel = activeSession?.start_time
    ? formatSessionTime(activeSession.start_time, { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <Layout title="Transmissão Ao Vivo">
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 lg:py-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            {isOnline ? (
              <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
            ) : (
              <Circle className="h-2.5 w-2.5 flex-shrink-0 text-muted-foreground fill-muted-foreground" />
            )}
            <h1 className="text-xl md:text-2xl font-semibold text-foreground truncate">{currentSessionTitle}</h1>
          </div>

          {isOnline && (
            <span className="text-xs font-medium text-red-600 dark:text-red-400 flex-shrink-0">
              Ao vivo agora
            </span>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-5 items-start">
          <div className="lg:col-span-2 space-y-4">
            <Card className="overflow-hidden border rounded-lg bg-black group">
              <div className="relative aspect-video bg-black">
                {sessionLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
                    <LoadingState message="Preparando transmissão…" />
                  </div>
                ) : isOnline && activeSession?.stream_url ? (
                  <>
                    {isYouTubeUrl(activeSession.stream_url) ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${getYouTubeId(activeSession.stream_url)}?autoplay=1&rel=0&modestbranding=1`}
                        className="absolute inset-0 w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={activeSession.title}
                      />
                    ) : (
                      <video ref={videoRef} className="absolute inset-0 w-full h-full object-contain" controls autoPlay playsInline />
                    )}
                    <button
                      onClick={toggleFullscreen}
                      className="absolute bottom-4 right-4 z-10 p-2 bg-black/60 hover:bg-black/80 rounded-md text-white transition-all opacity-0 group-hover:opacity-100"
                      aria-label="Ver em tela cheia"
                    >
                      <Maximize className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <div className="absolute inset-0 bg-neutral-950 flex items-center justify-center p-6">
                    <div className="text-center max-w-md space-y-5">
                      <RadioIcon className="h-9 w-9 text-neutral-500 mx-auto" strokeWidth={1.5} />

                      {nextSession ? (
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1.5">
                              Próximo culto
                            </p>
                            <h3 className="text-xl font-semibold text-white leading-tight">{nextSession.title}</h3>
                          </div>

                          <div className="flex flex-col items-center gap-1 text-sm text-neutral-300">
                            {nextSession.preacher_name && <span>{nextSession.preacher_name}</span>}
                            {nextSession.start_time && (
                              <span className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                {formatSessionTime(nextSession.start_time, {
                                  weekday: 'short',
                                  day: '2-digit',
                                  month: 'short',
                                })}{' às '}
                                {formatSessionTime(nextSession.start_time, {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            )}
                          </div>

                          <Button className="w-full" onClick={() => navigate('/prayer')}>
                            <Heart className="h-4 w-4 mr-2" />Pedir oração agora
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <h3 className="text-base font-medium text-white">Nenhuma transmissão agendada</h3>
                          <p className="text-xs text-neutral-400 leading-relaxed">
                            Acesse a biblioteca para rever cultos anteriores ou active notificações.
                          </p>
                          <div className="flex gap-2 pt-1">
                            <Button variant="secondary" className="flex-1 text-xs" onClick={() => navigate('/sermons')}>
                              <BookOpen className="h-4 w-4 mr-1.5" />Biblioteca
                            </Button>
                            <Button variant="outline" className="flex-1 text-xs text-white border-neutral-700 hover:bg-neutral-900" onClick={() => navigate('/about')}>
                              <Bell className="h-4 w-4 mr-1.5" />Notificações
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {isOnline && activeSession && (
              <Card className="p-5 border rounded-lg">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground leading-tight">{activeSession.title}</h3>
                    {activeSession.description && (
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                        {activeSession.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-3 border-t border-border text-xs text-muted-foreground">
                    {activeSession.preacher_name && (
                      <span className="flex items-center gap-1.5">
                        <Flame className="h-3.5 w-3.5" strokeWidth={1.75} />
                        {activeSession.preacher_name}
                      </span>
                    )}
                    {sessionDateLabel && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" strokeWidth={1.75} />
                        {sessionDateLabel}
                      </span>
                    )}
                    {sessionClockLabel && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" strokeWidth={1.75} />
                        Iniciou às {sessionClockLabel}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <Heart className="h-3.5 w-3.5" strokeWidth={1.75} />
                      {prayerCount} pedidos de oração
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" onClick={() => navigate('/prayer')}>
                      <Heart className="h-4 w-4 mr-1.5" />Pedir oração
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => navigate('/sermons')}>
                      <BookOpen className="h-4 w-4 mr-1.5" />Biblioteca
                    </Button>
                    <Button size="sm" variant="outline" onClick={shareLiveSession}>
                      <Share2 className="h-4 w-4 mr-1.5" />Compartilhar
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {isGuest && (
              <Card className="p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">Participe da comunidade</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Faça login para interagir no chat ao vivo.
                    </p>
                  </div>
                  <Button size="sm" onClick={() => navigate('/about')} className="flex-shrink-0">
                    Entrar
                  </Button>
                </div>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1 h-[600px] lg:h-[calc(100vh-220px)]">
            <Card className="flex flex-col border rounded-lg overflow-hidden h-full">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
                <div className="min-w-0">
                  <h3 className="font-medium text-sm text-foreground">Chat da comunidade</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Circle className={`h-1.5 w-1.5 ${isOnline ? 'text-green-600 fill-green-600' : 'text-muted-foreground fill-muted-foreground'}`} />
                    {messages.length} mensagens
                  </p>
                </div>
                {isAdmin && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-md border border-amber-300 dark:border-amber-800 flex-shrink-0">
                    <Shield className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" strokeWidth={1.75} />
                    <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">Mod</span>
                  </span>
                )}
              </div>

              <div
                ref={chatContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-2 relative"
              >
                {isGuest ? (
                  <div className="h-full flex items-center justify-center p-4">
                    <div className="text-center max-w-xs space-y-3">
                      <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto" strokeWidth={1.5} />
                      <div>
                        <h4 className="text-sm font-medium text-foreground">Chat protegido</h4>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          Apenas membros autenticados podem participar.
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => navigate('/about')} className="w-full">
                        Cadastre-se ou entre
                      </Button>
                    </div>
                  </div>
                ) : loadingMessages ? (
                  <div className="h-full flex items-center justify-center">
                    <LoadingState message="" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center p-4">
                    <p className="text-xs text-muted-foreground">Seja o primeiro a saudar.</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className="group relative flex items-start gap-2.5 p-2 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="h-7 w-7 flex-shrink-0">
                        <AvatarImage src={msg.user?.avatar_url || ''} alt={msg.user?.username || 'User'} />
                        <AvatarFallback className="text-xs font-medium bg-primary text-primary-foreground">
                          {msg.user?.username?.substring(0, 2)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-1.5 mb-0.5">
                          <span className="font-medium text-xs text-foreground truncate">{msg.user?.username || 'Membro'}</span>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">
                            {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-foreground/90 break-words leading-relaxed">{msg.message}</p>
                      </div>

                      {isAdmin && (
                        <div className="absolute right-2 top-2 flex items-center gap-0.5 bg-card border border-border rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <button
                            onClick={() => handlePinMessage(msg.id)}
                            aria-label="Fixar mensagem"
                            className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Pin className="h-3.5 w-3.5" />
                          </button>
                          <div className="w-px h-4 bg-border" />
                          <button
                            onClick={() => handleBanUser(msg.userId)}
                            aria-label="Remover usuário do chat"
                            className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}

                <div ref={messagesEndRef} />

                {showScrollButton && (
                  <button
                    onClick={() => scrollToBottom('smooth')}
                    className="absolute bottom-3 right-3 h-8 w-8 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Ir para o final"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                )}
              </div>

              {!isGuest ? (
                <div className="p-3 border-t border-border flex-shrink-0 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      placeholder="Uma palavra de fé..."
                      className="flex-1 h-9 text-xs"
                      maxLength={200}
                      disabled={sending || !isOnline}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={sending || !newMessage.trim() || !isOnline}
                      className="h-9 w-9 p-0 flex-shrink-0"
                      aria-label={isOnline ? 'Enviar mensagem' : 'Transmissão offline'}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center">
                    {isAdmin ? 'Modo de moderação ativo' : 'Seja respeitoso e encorajador'}
                  </p>
                </div>
              ) : (
                <div className="p-3 border-t border-border text-center flex-shrink-0">
                  <p className="text-xs text-muted-foreground">Faça login para participar do chat</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default LivePage
