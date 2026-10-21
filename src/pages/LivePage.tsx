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
  Send,
  MessageCircle,
  Shield,
  Ban,
  Clock,
  Pin,
  Flame,
  Heart,
  BookOpen,
  Radio as RadioIcon,
  ArrowDown,
  Share2,
  Maximize,
  X,
  Bell,
  Circle,
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

const formatSessionTime = (
  value: string | null,
  options?: Intl.DateTimeFormatOptions,
) => {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return options ? date.toLocaleString('pt-BR', options) : date.toLocaleString('pt-BR')
}

const isYouTubeUrl = (url: string) => {
  if (!url) return false
  return url.includes('youtube.com') || url.includes('youtu.be')
}

const getYouTubeId = (url: string) => {
  if (!url) return null

  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([^&\s?]+)/)
  return match ? match[1] : null
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

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const chatContainerRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const profileCache = useRef<Record<string, UserProfile>>({})

  const isGuest = user?.role === 'guest'
  const isAdmin = user?.role === 'admin'
  const isOnline = Boolean(activeSession?.is_active)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' })
    setShowScrollButton(false)
  }, [])

  const loadSession = useCallback(async () => {
    try {
      const [activeRes, nextRes, prayersRes] = await Promise.all([
        supabase
          .from('live_sessions')
          .select('*')
          .eq('is_active', true)
          .limit(1)
          .maybeSingle(),
        supabase
          .from('live_sessions')
          .select('*')
          .eq('is_active', false)
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase.from('prayer_requests').select('id', { count: 'exact', head: true }),
      ])

      setActiveSession((activeRes.data as LiveSession | null) ?? null)
      setNextSession((nextRes.data as LiveSession | null) ?? null)
      setPrayerCount(prayersRes.count ?? 0)
    } catch (error) {
      console.error('Erro ao carregar dados da transmissão:', error)
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

      const chronologicalMessages = (data || [])
        .reverse()
        .map((msg) => ({
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
    void loadSession()
    void loadInitialMessages()

    const chatChannel = supabase
      .channel('live-chat-room')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_messages' },
        async (payload) => {
          const userId = payload.new.user_id as string
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

          setMessages((prev) => {
            const exists = prev.some((msg) => msg.id === formattedMessage.id)
            if (exists) return prev
            return [...prev.slice(-99), formattedMessage]
          })
        },
      )
      .subscribe()

    const sessionChannel = supabase
      .channel('live-session-status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_sessions' }, () => {
        void loadSession()
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
  }, [activeSession?.stream_url])

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || sending || !user?.id) return

    setSending(true)

    try {
      const { error } = await supabase
        .from('live_messages')
        .insert({ user_id: user.id, message: newMessage.trim() })

      if (error) throw error

      setNewMessage('')
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      toast.error('Erro ao enviar mensagem')
    } finally {
      setSending(false)
    }
  }, [newMessage, sending, user])

  const handleScroll = () => {
    if (!chatContainerRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100

    if (isNearBottom) setShowScrollButton(false)
  }

  const handlePinMessage = (id: string) => {
    console.log('Pin message:', id)
    toast.info('Funcionalidade de fixar mensagem em desenvolvimento.')
  }

  const handleBanUser = (userId: string) => {
    console.log('Ban user:', userId)
    toast.info('Moderação avançada em desenvolvimento.')
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

  const currentSessionTitle = sessionLoading
    ? 'Carregando transmissão…'
    : activeSession?.title || 'Transmissão ao vivo'

  const sessionDateLabel = activeSession?.start_time
    ? formatSessionTime(activeSession.start_time, {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      })
    : null

  const sessionClockLabel = activeSession?.start_time
    ? formatSessionTime(activeSession.start_time, {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  if (isFullscreen && isOnline && activeSession?.stream_url) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <button
          onClick={toggleFullscreen}
          className="absolute right-4 top-4 z-10 rounded-md bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
          aria-label="Fechar tela cheia"
        >
          <X className="h-6 w-6" />
        </button>

        {isYouTubeUrl(activeSession.stream_url) ? (
          <iframe
            src={`https://www.youtube.com/embed/${getYouTubeId(activeSession.stream_url)}?autoplay=1&rel=0&modestbranding=1&fs=1`}
            className="h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={activeSession.title}
          />
        ) : (
          <video ref={videoRef} className="h-full w-full object-contain" controls autoPlay playsInline />
        )}
      </div>
    )
  }

  return (
    <Layout title="Transmissão Ao Vivo">
      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 lg:px-8 lg:py-8">
        <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-stone-900/80 to-neutral-900/90 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-center gap-3">
              {isOnline ? (
                <span className="relative flex h-3 w-3 flex-shrink-0">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                </span>
              ) : (
                <Circle className="h-3 w-3 flex-shrink-0 fill-muted-foreground text-muted-foreground" />
              )}
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-amber-300/80">
                  MER Church
                </p>
                <h1 className="truncate text-xl font-semibold text-white md:text-2xl">
                  {currentSessionTitle}
                </h1>
              </div>
            </div>

            {isOnline ? (
              <span className="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-200">
                Ao vivo agora
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                Transmissão offline
              </span>
            )}
          </div>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_25px_70px_rgba(0,0,0,0.28)]">
              <div className="relative aspect-video bg-black">
                {sessionLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-neutral-950/90">
                    <LoadingState message="Preparando transmissão…" />
                  </div>
                ) : isOnline && activeSession?.stream_url ? (
                  <>
                    {isYouTubeUrl(activeSession.stream_url) ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${getYouTubeId(activeSession.stream_url)}?autoplay=1&rel=0&modestbranding=1`}
                        className="absolute inset-0 h-full w-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={activeSession.title}
                      />
                    ) : (
                      <video
                        ref={videoRef}
                        className="absolute inset-0 h-full w-full object-contain"
                        controls
                        autoPlay
                        playsInline
                      />
                    )}

                    <button
                      onClick={toggleFullscreen}
                      className="absolute bottom-4 right-4 z-10 rounded-md bg-black/60 p-2 text-white opacity-0 transition-all hover:bg-black/80 group-hover:opacity-100"
                      aria-label="Ver em tela cheia"
                    >
                      <Maximize className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-950 via-stone-950 to-neutral-900 p-6">
                    <div className="max-w-md space-y-5 text-center">
                      <div className="flex justify-center">
                        <div className="rounded-full border border-amber-500/30 bg-amber-500/10 p-3">
                          <RadioIcon className="h-9 w-9 text-amber-300" strokeWidth={1.5} />
                        </div>
                      </div>

                      {nextSession ? (
                        <div className="space-y-4">
                          <div>
                            <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">
                              Próximo culto
                            </p>
                            <h3 className="text-2xl font-semibold leading-tight text-white">
                              {nextSession.title}
                            </h3>
                          </div>

                          <div className="flex flex-col items-center gap-2 text-sm text-neutral-300">
                            {nextSession.preacher_name && <span>{nextSession.preacher_name}</span>}
                            {nextSession.start_time && (
                              <span className="flex items-center gap-1.5 text-neutral-200">
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

                          <Button className="w-full bg-amber-500 text-stone-950 hover:bg-amber-400" onClick={() => navigate('/prayer')}>
                            <Heart className="mr-2 h-4 w-4" />Pedir oração agora
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <h3 className="text-xl font-semibold text-white">Nenhuma transmissão agendada</h3>
                          <p className="text-sm leading-relaxed text-neutral-300">
                            Acesse a biblioteca para rever cultos anteriores ou active notificações.
                          </p>
                          <div className="flex gap-2 pt-1">
                            <Button
                              variant="secondary"
                              className="flex-1 bg-white/5 text-xs text-white hover:bg-white/10"
                              onClick={() => navigate('/sermons')}
                            >
                              <BookOpen className="mr-1.5 h-4 w-4" />Biblioteca
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-1 border-neutral-700 text-xs text-white hover:bg-neutral-800"
                              onClick={() => navigate('/about')}
                            >
                              <Bell className="mr-1.5 h-4 w-4" />Notificações
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
              <Card className="rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 via-neutral-950 to-neutral-950 p-5 shadow-[0_12px_45px_rgba(0,0,0,0.14)]">
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-amber-300/80">
                      Culto em andamento
                    </p>
                    <h3 className="text-lg font-semibold leading-tight text-foreground">
                      {activeSession.title}
                    </h3>
                    {activeSession.description && (
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {activeSession.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
                    {activeSession.preacher_name && (
                      <span className="flex items-center gap-1.5 text-amber-100/90">
                        <Flame className="h-3.5 w-3.5 text-amber-300" strokeWidth={1.75} />
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
                    <span className="flex items-center gap-1.5 text-rose-200">
                      <Heart className="h-3.5 w-3.5" strokeWidth={1.75} />
                      {prayerCount} pedidos de oração
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" className="bg-amber-500 text-stone-950 hover:bg-amber-400" onClick={() => navigate('/prayer')}>
                      <Heart className="mr-1.5 h-4 w-4" />Pedir oração
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => navigate('/sermons')}>
                      <BookOpen className="mr-1.5 h-4 w-4" />Biblioteca
                    </Button>
                    <Button size="sm" variant="outline" onClick={shareLiveSession}>
                      <Share2 className="mr-1.5 h-4 w-4" />Compartilhar
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {isGuest && (
              <Card className="rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-neutral-900 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">Participe da comunidade</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Faça login para interagir no chat ao vivo.
                    </p>
                  </div>
                  <Button size="sm" onClick={() => navigate('/about')} className="flex-shrink-0 bg-amber-500 text-stone-950 hover:bg-amber-400">
                    Entrar
                  </Button>
                </div>
              </Card>
            )}
          </div>

          <div className="h-[600px] lg:col-span-1 lg:h-[calc(100vh-220px)]">
            <Card className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#101010] shadow-[0_20px_50px_rgba(0,0,0,0.18)]">
              <div className="flex flex-shrink-0 items-center justify-between border-b border-border bg-neutral-950/70 px-4 py-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-white">Chat da comunidade</h3>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Circle
                      className={`h-1.5 w-1.5 ${
                        isOnline ? 'fill-green-600 text-green-600' : 'fill-muted-foreground text-muted-foreground'
                      }`}
                    />
                    {messages.length} mensagens
                  </p>
                </div>

                {isAdmin && (
                  <span className="flex flex-shrink-0 items-center gap-1 rounded-md border border-amber-300/40 bg-amber-500/10 px-2 py-1">
                    <Shield className="h-3.5 w-3.5 text-amber-300" strokeWidth={1.75} />
                    <span className="text-[11px] font-medium text-amber-200">Mod</span>
                  </span>
                )}
              </div>

              <div
                ref={chatContainerRef}
                onScroll={handleScroll}
                className="relative flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.06),_transparent_35%)] p-2"
              >
                {isGuest ? (
                  <div className="flex h-full items-center justify-center p-4">
                    <div className="max-w-xs space-y-3 text-center">
                      <MessageCircle className="mx-auto h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
                      <div>
                        <h4 className="text-sm font-medium text-foreground">Chat protegido</h4>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          Apenas membros autenticados podem participar.
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => navigate('/about')} className="w-full">
                        Cadastre-se ou entre
                      </Button>
                    </div>
                  </div>
                ) : loadingMessages ? (
                  <div className="flex h-full items-center justify-center">
                    <LoadingState message="" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center p-4 text-center">
                    <p className="text-xs text-muted-foreground">Seja o primeiro a saudar.</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className="group relative flex items-start gap-2.5 rounded-xl p-2 transition-colors hover:bg-white/5"
                    >
                      <Avatar className="h-7 w-7 flex-shrink-0 border border-white/10">
                        <AvatarImage src={msg.user?.avatar_url || ''} alt={msg.user?.username || 'User'} />
                        <AvatarFallback className="bg-amber-500 text-xs font-medium text-stone-950">
                          {msg.user?.username?.substring(0, 2)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-baseline gap-1.5">
                          <span className="truncate text-xs font-medium text-white">
                            {msg.user?.username || 'Membro'}
                          </span>
                          <span className="flex-shrink-0 text-[10px] text-muted-foreground">
                            {new Date(msg.createdAt).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="break-words text-xs leading-relaxed text-foreground/90">
                          {msg.message}
                        </p>
                      </div>

                      {isAdmin && (
                        <div className="absolute right-2 top-2 z-10 flex items-center gap-0.5 rounded-md border border-border bg-card opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => handlePinMessage(msg.id)}
                            aria-label="Fixar mensagem"
                            className="p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <Pin className="h-3.5 w-3.5" />
                          </button>
                          <div className="h-4 w-px bg-border" />
                          <button
                            onClick={() => handleBanUser(msg.userId)}
                            aria-label="Remover usuário do chat"
                            className="p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
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
                    className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground"
                    aria-label="Ir para o final"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                )}
              </div>

              {!isGuest ? (
                <div className="flex-shrink-0 space-y-2 border-t border-border bg-neutral-950/70 p-3">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(event) => setNewMessage(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault()
                          void sendMessage()
                        }
                      }}
                      placeholder="Uma palavra de fé..."
                      className="h-9 flex-1 border-white/10 bg-white/5 text-xs text-white placeholder:text-muted-foreground"
                      maxLength={200}
                      disabled={sending || !isOnline}
                    />
                    <Button
                      onClick={() => void sendMessage()}
                      disabled={sending || !newMessage.trim() || !isOnline}
                      className="h-9 w-9 flex-shrink-0 bg-amber-500 p-0 text-stone-950 hover:bg-amber-400"
                      aria-label={isOnline ? 'Enviar mensagem' : 'Transmissão offline'}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-center text-[11px] text-muted-foreground">
                    {isAdmin ? 'Modo de moderação ativo' : 'Seja respeitoso e encorajador'}
                  </p>
                </div>
              ) : (
                <div className="flex-shrink-0 border-t border-border bg-neutral-950/70 p-3 text-center">
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
