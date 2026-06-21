import { useState, useEffect, useRef } from 'react'
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
  Send, MessageCircle, Shield, Ban, Clock, Pin,
  Flame, Heart, BookOpen, Radio as RadioIcon, ArrowDown
} from 'lucide-react'
import { toast } from 'sonner'
import type { LiveMessage } from '../types'
import { LoadingState } from '../components/shared/LoadingState'
import Hls from 'hls.js'

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

const LivePage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useAppStore()
  
  const [messages, setMessages] = useState<LiveMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [prayerCount, setPrayerCount] = useState(0)
  const [activeSession, setActiveSession] = useState<LiveSession | null>(null)
  const [nextSession, setNextSession] = useState<LiveSession | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [showScrollButton, setShowScrollButton] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const isGuest = user?.role === 'guest'
  const isAdmin = user?.role === 'admin'
  const isOnline = !!activeSession

  // 1. Inicialização de dados e Inscrição em Tempo Real (Realtime)
  useEffect(() => {
    loadSession()
    loadInitialMessages()

    // Canal em tempo real para mensagens do chat
    const chatChannel = supabase
      .channel('live-chat-room')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_messages' },
        async (payload) => {
          // Busca o perfil do usuário que enviou a mensagem para manter a consistência estrutural
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('username, avatar_url')
            .eq('id', payload.new.user_id)
            .single()

          const formattedMessage = {
            ...payload.new,
            user: profile,
            // Normalização caso o banco use snake_case
            createdAt: payload.new.created_at || payload.new.createdAt 
          } as unknown as LiveMessage

          setMessages((prev) => [...prev.slice(-99), formattedMessage]) // Mantém apenas as últimas 100 em memória
        }
      )
      .subscribe()

    // Canal para escutar atualizações do status da sessão (Iniciar/Encerrar Live)
    const sessionChannel = supabase
      .channel('live-session-status')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_sessions' },
        () => {
          loadSession()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(chatChannel)
      supabase.removeChannel(sessionChannel)
    }
  }, [])

  // 2. Efeito para gerenciamento inteligente de Scroll do Chat
  useEffect(() => {
    if (!chatContainerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current
    // Se o usuário estiver a menos de 150px do fundo, faz o scroll automático autônomo
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150

    if (isNearBottom) {
      scrollToBottom('smooth')
    } else {
      setShowScrollButton(true)
    }
  }, [messages])

  // 3. Suporte HLS Nativo via Engine hls.js
  useEffect(() => {
    if (!videoRef.current || !activeSession?.stream_url || isYouTubeUrl(activeSession.stream_url)) return

    const video = videoRef.current
    const streamUrl = activeSession.stream_url

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Suporte nativo do Safari (iOS / Mac)
      video.src = streamUrl
    } else if (Hls.isSupported()) {
      // Suporte via hls.js para Chrome, Firefox, Edge, Android, etc.
      const hls = new Hls()
      hls.loadSource(streamUrl)
      hls.attachMedia(video)
      return () => hls.destroy()
    }
  }, [activeSession?.stream_url])

  const loadSession = async () => {
    try {
      const [activeRes, nextRes, prayersRes] = await Promise.all([
        supabase.from('live_sessions').select('*').eq('is_active', true).limit(1).maybeSingle(),
        supabase.from('live_sessions').select('*').eq('is_active', false).gte('start_time', new Date().toISOString()).order('start_time', { ascending: true }).limit(1).maybeSingle(),
        supabase.from('prayer_requests').select('id', { count: 'exact', head: true }),
      ])
      setActiveSession(activeRes.data)
      setNextSession(nextRes.data)
      setPrayerCount(prayersRes.count || 0)
    } catch (err) {
      console.error('Erro ao carregar dados da transmissão:', err)
    } finally {
      setSessionLoading(false)
    }
  }

  const loadInitialMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('live_messages')
        .select('*, user:user_profiles(username, avatar_url)')
        .order('created_at', { ascending: false }) // Busca os mais recentes primeiro
        .limit(60)

      if (error) throw error

      // Inverte para renderizar cronologicamente de cima para baixo
      const chronologicalMessages = (data || []).reverse().map((msg: any) => ({
        ...msg,
        createdAt: msg.created_at // Assegura compatibilidade entre snake_case e camelCase
      }))

      setMessages(chronologicalMessages as any)
    } catch (error) {
      console.error('Erro ao carregar chat:', error)
    } finally {
      setLoadingMessages(false)
      setTimeout(() => scrollToBottom('auto'), 100)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return
    setSending(true)
    
    const { error } = await supabase
      .from('live_messages')
      .insert({ user_id: user!.id, message: newMessage.trim() })

    if (error) {
      toast.error('Erro ao enviar mensagem')
    } else {
      setNewMessage('')
    }
    setSending(false)
  }

  const handleScroll = () => {
    if (!chatContainerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
    if (isNearBottom) setShowScrollButton(false)
  }

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
    setShowScrollButton(false)
  }

  const isYouTubeUrl = (url: string) => url.includes('youtube.com') || url.includes('youtu.be')
  
  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:v=|youtu\.be\/|embed\/)([^&\s?]+)/)
    return match ? match[1] : null
  }

  // Ações de Moderação via Admin
  const handlePinMessage = (id: string) => {
    toast.success('Mensagem fixada (Funcionalidade de exemplo)')
  }

  const handleBanUser = (userId: string) => {
    toast.error('Usuário banido do chat')
  }

  return (
    <Layout title="Ao Vivo">
      <div className="p-4 max-w-7xl mx-auto space-y-6">
        
        {/* Header Responsivo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOnline ? 'bg-red-500' : 'bg-muted-foreground/30'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isOnline ? 'bg-red-600' : 'bg-muted-foreground/40'}`}></span>
            </span>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-foreground">
              {sessionLoading ? 'Carregando sessão...' : isOnline ? activeSession!.title : 'Transmissão ao Vivo'}
            </h1>
          </div>
          {isOnline && (
            <div className="self-start sm:self-auto px-3 py-1 bg-red-600 text-white text-xs font-black rounded-md tracking-wider shadow-sm animate-pulse">
              AO VIVO
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6 items-start">
          
          {/* Seção de Vídeo e Detalhes */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="overflow-hidden border border-border shadow-xl rounded-xl bg-black">
              <div className="relative aspect-video">
                {sessionLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <LoadingState message="Preparando Player..." />
                  </div>
                ) : isOnline && activeSession?.stream_url ? (
                  isYouTubeUrl(activeSession.stream_url) ? (
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
                  )
                ) : (
                  // Estado Offline Melhorado
                  <div className="absolute inset-0 relative">
                    <img
                      src="https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1280&h=720&fit=crop&q=80"
                      alt="Ambiente de Transmissão"
                      className="w-full h-full object-cover opacity-40 blur-[2px]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent flex items-center justify-center p-6">
                      <div className="text-center max-w-md space-y-4">
                        <div className="inline-flex p-4 bg-primary/10 border border-primary/20 rounded-2xl text-primary shadow-inner">
                          <RadioIcon className="h-10 w-10 animate-pulse" />
                        </div>
                        {nextSession ? (
                          <div className="space-y-2">
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Próxima Programação</p>
                            <h3 className="text-xl font-bold text-foreground">{nextSession.title}</h3>
                            {nextSession.preacher_name && <p className="text-sm text-primary font-medium">Ministração: {nextSession.preacher_name}</p>}
                            {nextSession.start_time && (
                              <p className="text-xs font-semibold px-3 py-1.5 bg-muted rounded-full inline-block border text-muted-foreground">
                                {new Date(nextSession.start_time).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })} às {' '}
                                {new Date(nextSession.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <h3 className="text-base font-bold text-foreground">Nenhuma transmissão agendada</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">Fique atento às redes e confira nossa biblioteca de sermões passados.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Metadados da Sessão Ativa */}
            {isOnline && activeSession && (
              <Card className="p-5 border shadow-sm rounded-xl">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-foreground leading-tight">{activeSession.title}</h3>
                    {activeSession.description && (
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{activeSession.description}</p>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-y-2 gap-x-4 pt-2 border-t border-muted text-xs font-medium text-muted-foreground">
                    {activeSession.preacher_name && (
                      <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded-md">
                        <Flame className="h-3.5 w-3.5 fill-current" />
                        <span>{activeSession.preacher_name}</span>
                      </div>
                    )}
                    {activeSession.start_time && (
                      <div className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-md">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Iniciou às {new Date(activeSession.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 bg-rose-500/10 text-rose-500 px-2.5 py-1 rounded-md">
                      <Heart className="h-3.5 w-3.5 fill-current" />
                      <span>{prayerCount} Pedidos</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => navigate('/prayer')} className="h-8 text-xs font-bold shadow-sm">
                      <Heart className="h-3.5 w-3.5 mr-1.5 text-rose-500" /> Quero Pedir Oração
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => navigate('/sermons')} className="h-8 text-xs font-bold shadow-sm">
                      <BookOpen className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /> Ver Biblioteca
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* CTA para Visitantes */}
            {isGuest && (
              <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 shadow-sm">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-foreground">Entre na comunhão</p>
                  <p className="text-xs text-muted-foreground">Crie seu perfil e interaja em tempo real com irmãos e moderadores.</p>
                </div>
                <Button size="sm" onClick={() => navigate('/about')} className="font-bold shrink-0 shadow-md">
                  Fazer Login
                </Button>
              </div>
            )}
          </div>

          {/* Seção do Chat Interativo */}
          <div className="lg:col-span-1">
            <Card className="flex flex-col border shadow-xl rounded-xl overflow-hidden h-[500px] lg:h-[calc(100vh-180px)] sticky top-6">
              
              {/* Header do Chat */}
              <div className="p-3 border-b border-border bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm tracking-tight text-foreground">Chat da Comunidade</h3>
                    <p className="text-[10px] font-medium text-muted-foreground">{messages.length} mensagens enviadas</p>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 dark:bg-amber-500/20 rounded-md border border-amber-500/30">
                    <Shield className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">Painel Mod</span>
                  </div>
                )}
              </div>

              {/* Corpo do Chat */}
              <div 
                ref={chatContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/5 relative"
              >
                {isGuest ? (
                  <div className="h-full flex items-center justify-center p-4">
                    <div className="text-center max-w-xs space-y-3">
                      <div className="inline-flex p-3 bg-muted rounded-full text-muted-foreground">
                        <MessageCircle className="h-6 w-6" />
                      </div>
                      <h4 className="text-sm font-bold text-foreground">Chat Protegido</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">Apenas membros autenticados podem ler ou enviar mensagens no chat ao vivo.</p>
                      <Button size="sm" variant="outline" onClick={() => navigate('/about')} className="w-full text-xs font-bold">
                        Cadastrar / Entrar
                      </Button>
                    </div>
                  </div>
                ) : loadingMessages ? (
                  <div className="h-full flex items-center justify-center"><LoadingState message="" /></div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center p-4">
                    <p className="text-xs font-medium text-muted-foreground">A paz do Senhor! Seja o primeiro a saudar os irmãos.</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="group relative flex items-start gap-2.5 p-1 rounded-md hover:bg-muted/30 transition-colors">
                      <Avatar className="h-7 w-7 border shrink-0">
                        <AvatarImage src={msg.user?.avatar_url || ''} alt={msg.user?.username || 'User'} />
                        <AvatarFallback className="text-[10px] font-bold uppercase bg-gradient-to-br from-primary to-primary/60 text-white">
                          {msg.user?.username?.substring(0, 2) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-1.5 mb-0.5">
                          <span className="font-bold text-xs text-foreground truncate">{msg.user?.username || 'Membro'}</span>
                          <span className="text-[9px] text-muted-foreground shrink-0">
                            {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-foreground/90 break-words leading-relaxed">{msg.message}</p>
                      </div>

                      {/* Ferramentas do Moderador */}
                      {isAdmin && (
                        <div className="absolute right-1 top-1 flex items-center gap-0.5 bg-background border rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10">
                          <button onClick={() => handlePinMessage(msg.id)} title="Fixar Mensagem" className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground"><Pin className="h-3 w-3" /></button>
                          <button onClick={() => handleBanUser(msg.user_id)} title="Banir Usuário" className="p-1 hover:bg-red-50 text-muted-foreground hover:text-red-600"><Ban className="h-3 w-3" /></button>
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />

                {/* Botão Flutuante de Scroll */}
                {showScrollButton && (
                  <button 
                    onClick={() => scrollToBottom('smooth')}
                    className="absolute bottom-3 right-3 p-1.5 rounded-full bg-primary text-white shadow-lg border hover:scale-105 transition-transform flex items-center justify-center"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Input de Envio de Mensagem */}
              {!isGuest && (
                <div className="p-3 border-t border-border bg-background">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      placeholder="Envie uma palavra de fé..."
                      className="flex-1 h-9 text-xs shadow-inner"
                      maxLength={200}
                      disabled={sending}
                    />
                    <Button 
                      onClick={sendMessage} 
                      disabled={sending || !newMessage.trim()}
                      className="h-9 w-9 p-0 shrink-0 shadow-md"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-1.5 text-center font-medium">
                    {isAdmin ? '🛡️ Modo de Moderação Ativo' : 'Seja encorajador e respeite os irmãos'}
                  </p>
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
