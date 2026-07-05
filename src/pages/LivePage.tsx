import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar'
import { useAuth } from '../hooks/useAuth'
import { useAppStore } from '../stores/appStore'
import { supabase } from '../lib/supabase'
import {
  Send, MessageCircle, Shield, Ban, Clock, Pin, Flame, Heart, BookOpen,
  Radio as RadioIcon, ArrowDown, Settings, Users, Eye, Volume2, Share2,
  Music, Maximize, X, Bell
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

const LivePage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useAppStore()

  // State Management
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
  const [liveViewers, setLiveViewers] = useState(0)

  // Refs & Cache
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const profileCache = useRef<Record<string, UserProfile>>({})

  const isGuest = user?.role === 'guest'
  const isAdmin = user?.role === 'admin'
  const isOnline = !!activeSession?.is_active

  // ===== UTILS & HELPERS =====
  const isYouTubeUrl = useCallback((url: string) => url.includes('youtube.com') || url.includes('youtu.be'), [])

  const getYouTubeId = useCallback((url: string) => {
    const match = url.match(/(?:v=|youtu\.be\/|embed\/)([^&\s?]+)/)
    return match ? match[1] : null
  }, [])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
    setShowScrollButton(false)
  }, [])

  // ===== DATA LOADING =====
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
      setLiveViewers(Math.floor(Math.random() * (500 - 50 + 1) + 50)) // Mock viewers
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
        user: msg.user as unknown as UserProfile
      })) as unknown as LiveMessage[]

      setMessages(chronologicalMessages)
    } catch (error) {
      console.error('Erro ao carregar chat:', error)
    } finally {
      setLoadingMessages(false)
      setTimeout(() => scrollToBottom('auto'), 100)
    }
  }, [scrollToBottom])

  // ===== INITIALIZATION & REALTIME SUBSCRIPTIONS =====
  useEffect(() => {
    loadSession()
    loadInitialMessages()

    // Chat Realtime Channel
    const chatChannel = supabase
      .channel('live-chat-room')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_messages' },
        async (payload) => {
          const userId = payload.new.user_id
          let profile = profileCache.current[userId]

          // Otimização: Só busca o perfil no banco se ele não estiver mapeado no cache local
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
            createdAt: payload.new.created_at || payload.new.createdAt
          } as unknown as LiveMessage

          setMessages((prev) => [...prev.slice(-99), formattedMessage])
        }
      )
      .subscribe()

    // Session Status Channel
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

  // ===== AUTO-SCROLL MANAGEMENT =====
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

  // ===== HLS/NATIVE STREAMING SUPPORT & CLEANUP =====
  useEffect(() => {
    if (!videoRef.current || !activeSession?.stream_url || isYouTubeUrl(activeSession.stream_url)) return

    const video = videoRef.current
    const streamUrl = activeSession.stream_url

    // Suporte nativo HLS (Safari/iOS) ou src directo para outros formatos
    video.src = streamUrl
    video.load()

    return () => {
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  }, [activeSession?.stream_url, isYouTubeUrl])

  // ===== ACTIONS =====
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
  }

  const handleBanUser = (userId: string) => {
    toast.error('Usuário removido do chat')
  }

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev)
  }

  // ===== RENDER =====
  if (isFullscreen && isOnline && activeSession?.stream_url) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
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
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            controls
            autoPlay
            playsInline
          />
        )}
      </div>
    )
  }

  return (
    <Layout title="Transmissão Ao Vivo">
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">

          {/* ===== TOP BROADCAST HEADER ===== */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="relative flex h-4 w-4">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOnline ? 'bg-red-500' : 'bg-muted-foreground/20'}`}></span>
                <span className={`relative inline-flex rounded-full h-4 w-4 ${isOnline ? 'bg-red-600' : 'bg-muted-foreground/50'}`}></span>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
                  {sessionLoading ? '🎙️ Carregando...' : isOnline ? activeSession!.title : '✨ Transmissão Ao Vivo'}
                </h1>
                {isOnline && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                    <Eye className="h-3 w-3" />
                    <span>{liveViewers.toLocaleString('pt-BR')} assistindo</span>
                  </p>
                )}
              </div>
            </div>

            {isOnline && (
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <div className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white text-xs font-black rounded-lg tracking-wider shadow-lg animate-pulse flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-300"></span>
                  </span>
                  AO VIVO
                </div>
              </div>
            )}
          </div>

          {/* ===== MAIN CONTENT GRID ===== */}
          <div className="grid lg:grid-cols-3 gap-4 items-start">

            {/* ===== VIDEO PLAYER SECTION ===== */}
            <div ref={playerContainerRef} className="lg:col-span-2 space-y-4">
              <Card className="overflow-hidden border border-border/50 shadow-2xl rounded-2xl bg-black group">
                <div className="relative aspect-video bg-black">
                  {sessionLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
                      <LoadingState message="🔄 Preparando Transmissão..." />
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
                        <video
                          ref={videoRef}
                          className="absolute inset-0 w-full h-full object-contain"
                          controls
                          autoPlay
                          playsInline
                        />
                      )}
                      <button
                        onClick={toggleFullscreen}
                        className="absolute bottom-4 right-4 z-10 p-2 bg-black/60 hover:bg-black/80 rounded-lg text-white transition-all opacity-0 group-hover:opacity-100"
                        title="Tela Cheia"
                      >
                        <Maximize className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black overflow-hidden">
                      <div className="absolute inset-0 opacity-20">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary/30 to-transparent rounded-full blur-3xl animate-pulse"></div>
                        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-primary/20 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
                      </div>

                      <div className="absolute inset-0 flex items-center justify-center p-6">
                        <div className="text-center max-w-lg space-y-6 relative z-10">
                          <div className="inline-flex p-5 bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-3xl text-primary shadow-lg">
                            <RadioIcon className="h-12 w-12 animate-pulse" />
                          </div>

                          {nextSession ? (
                            <div className="space-y-3">
                              <div className="space-y-1">
                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70 mb-2">📅 Próximo Culto</p>
                                <h3 className="text-2xl font-black text-foreground leading-tight">{nextSession.title}</h3>
                              </div>

                              {nextSession.preacher_name && (
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
                                  <Flame className="h-3.5 w-3.5 text-primary" />
                                  <span className="text-xs font-bold text-primary">{nextSession.preacher_name}</span>
                                </div>
                              )}

                              {nextSession.start_time && (
                                <div className="space-y-2">
                                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 rounded-lg">
                                    <Clock className="h-4 w-4 text-primary" />
                                    <span className="text-sm font-bold text-foreground">
                                      {new Date(nextSession.start_time).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })} às{' '}
                                      {new Date(nextSession.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                </div>
                              )}

                              <div className="pt-2">
                                <Button className="w-full font-bold shadow-lg" onClick={() => navigate('/prayer')}>
                                  <Heart className="h-4 w-4 mr-2 fill-current" /> Pedir Oração Agora
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <h3 className="text-lg font-bold text-foreground">Nenhuma transmissão agendada</h3>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                Acesse nossa biblioteca para rever cultos anteriores ou configure notificações.
                              </p>
                              <div className="flex gap-2 pt-2">
                                <Button variant="outline" className="flex-1 text-xs font-bold" onClick={() => navigate('/sermons')}>
                                  <BookOpen className="h-4 w-4 mr-1" /> Biblioteca
                                </Button>
                                <Button variant="secondary" className="flex-1 text-xs font-bold">
                                  <Bell className="h-4 w-4 mr-1" /> Notificações
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {isOnline && activeSession && (
                <Card className="p-6 border border-border/50 shadow-lg rounded-2xl bg-gradient-to-br from-primary/5 to-transparent">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-black text-foreground leading-tight">{activeSession.title}</h3>
                      {activeSession.description && (
                        <p className="text-sm text-muted-foreground mt-3 leading-relaxed border-l-2 border-primary/30 pl-3">
                          {activeSession.description}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-3 border-t border-border/30">
                      {activeSession.preacher_name && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/30 rounded-full text-xs font-bold text-primary">
                          <Flame className="h-4 w-4 fill-current" />
                          Ministração por {activeSession.preacher_name}
                        </div>
                      )}

                      {activeSession.start_time && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-muted border border-border/50 rounded-full text-xs font-bold text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          Iniciou às {new Date(activeSession.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}

                      <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-rose-500/20 to-rose-500/5 border border-rose-500/30 rounded-full text-xs font-bold text-rose-600 dark:text-rose-400">
                        <Heart className="h-4 w-4 fill-current" />
                        {prayerCount} Pedidos de Oração
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button size="sm" className="font-bold shadow-md" onClick={() => navigate('/prayer')}>
                        <Heart className="h-4 w-4 mr-1.5 fill-current" /> Pedir Oração
                      </Button>
                      <Button size="sm" variant="secondary" className="font-bold shadow-md" onClick={() => navigate('/sermons')}>
                        <BookOpen className="h-4 w-4 mr-1.5" /> Biblioteca
                      </Button>
                      <Button size="sm" variant="outline" className="font-bold shadow-md">
                        <Share2 className="h-4 w-4 mr-1.5" /> Compartilhar
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {isGuest && (
                <Card className="p-4 border-l-4 border-l-primary shadow-md rounded-lg bg-gradient-to-r from-primary/5 to-transparent">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-black text-foreground">💬 Participe da Comunidade</p>
                      <p className="text-xs text-muted-foreground">Faça login para interagir no chat ao vivo com outros membros e moderadores.</p>
                    </div>
                    <Button size="sm" onClick={() => navigate('/about')} className="font-bold whitespace-nowrap">
                      Entrar Agora
                    </Button>
                  </div>
                </Card>
              )}
            </div>

            {/* ===== LIVE CHAT SECTION ===== */}
            <div className="lg:col-span-1 h-[600px] lg:h-[calc(100vh-220px)]">
              <Card className="flex flex-col border border-border/50 shadow-2xl rounded-2xl overflow-hidden h-full bg-gradient-to-b from-muted/50 to-background/50 backdrop-blur">
                
                <div className="p-4 border-b border-border/30 bg-gradient-to-r from-primary/10 to-transparent flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 rounded-lg text-primary">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm tracking-tight text-foreground">Chat da Comunidade</h3>
                      <p className="text-xs text-muted-foreground/70 font-medium">{messages.length} mensagens • {isOnline ? '🟢 Ao Vivo' : '⚪ Offline'}</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-amber-500/20 to-amber-500/5 rounded-lg border border-amber-500/20">
                      <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-300">Mod</span>
                    </div>
                  )}
                </div>

                <div
                  ref={chatContainerRef}
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto p-3 space-y-2 bg-gradient-to-b from-transparent to-muted/10 relative"
                >
                  {isGuest ? (
                    <div className="h-full flex items-center justify-center p-4">
                      <div className="text-center max-w-xs space-y-3">
                        <div className="inline-flex p-4 bg-muted/50 rounded-2xl text-muted-foreground">
                          <MessageCircle className="h-8 w-8" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-foreground">Chat Protegido</h4>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            Apenas membros autenticados podem participar das conversas ao vivo.
                          </p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => navigate('/about')} className="w-full text-xs font-bold mt-2">
                          Cadastre-se / Entre
                        </Button>
                      </div>
                    </div>
                  ) : loadingMessages ? (
                    <div className="h-full flex items-center justify-center">
                      <LoadingState message="" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center p-4">
                      <div className="space-y-2">
                        <p className="text-2xl">🕊️</p>
                        <p className="text-xs font-medium text-muted-foreground">Paz! Seja o primeiro a saudar.</p>
                      </div>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className="group relative flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-muted/40 transition-colors duration-200"
                      >
                        <Avatar className="h-8 w-8 border border-border/50 shrink-0 shadow-sm">
                          <AvatarImage src={msg.user?.avatar_url || ''} alt={msg.user?.username || 'User'} />
                          <AvatarFallback className="text-xs font-bold uppercase bg-gradient-to-br from-primary to-primary/60 text-white">
                            {msg.user?.username?.substring(0, 2) || 'U'}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-1.5 mb-0.5">
                            <span className="font-bold text-xs text-foreground truncate">{msg.user?.username || 'Membro'}</span>
                            <span className="text-[9px] text-muted-foreground/60 shrink-0 font-medium">
                              {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-foreground/85 break-words leading-relaxed">{msg.message}</p>
                        </div>

                        {isAdmin && (
                          <div className="absolute right-2 top-2 flex items-center gap-1 bg-background border border-border/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10">
                            <button
                              onClick={() => handlePinMessage(msg.id)}
                              title="Fixar Mensagem"
                              className="p-1.5 hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Pin className="h-3.5 w-3.5" />
                            </button>
                            <div className="w-px h-4 bg-border/30"></div>
                            <button
                              onClick={() => handleBanUser(msg.user_id)}
                              title="Remover Usuário"
                              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950 text-muted-foreground hover:text-red-600 transition-colors"
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
                      className="absolute bottom-3 right-3 p-2 rounded-full bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg hover:scale-110 transition-transform z-10 animate-pulse"
                      title="Ir para o final"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {!isGuest ? (
                  <div className="p-3 border-t border-border/30 bg-gradient-to-t from-background to-background/80 shrink-0 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                        placeholder="Uma palavra de fé..."
                        className="flex-1 h-9 text-xs shadow-inner border-border/50"
                        maxLength={200}
                        disabled={sending || !isOnline}
                      />
                      <Button
                        onClick={sendMessage}
                        disabled={sending || !newMessage.trim() || !isOnline}
                        className="h-9 w-9 p-0 shrink-0 shadow-md"
                        title={isOnline ? 'Enviar' : 'Transmissão offline'}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-[9px] text-muted-foreground text-center font-medium px-2">
                      {isAdmin ? '🛡️ Modo de Moderação Ativo' : '✨ Seja respeitoso e encorajador'}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 border-t border-border/30 bg-muted/30 text-center">
                    <p className="text-xs text-muted-foreground font-medium">
                      Faça login para participar do chat
                    </p>
                  </div>
                )}
              </Card>
            </div>

          </div>
        </div>
      </div>
    </Layout>
  )
}

export default LivePage
