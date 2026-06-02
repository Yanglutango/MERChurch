import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { useAuth } from '../hooks/useAuth'
import { useAppStore } from '../stores/appStore'
import { supabase } from '../lib/supabase'
import {
  Send, MessageCircle, Shield, Ban, Calendar, Clock, Pin,
  Flame, Eye, UserPlus, Radio as RadioIcon, Heart, BookOpen,
} from 'lucide-react'
import { toast } from 'sonner'
import type { LiveMessage } from '../types'
import { LoadingState } from '../components/shared/LoadingState'
import { AdminAction } from '../components/shared/AdminAction'

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
  const [loading, setLoading] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [prayerCount, setPrayerCount] = useState(0)
  const [activeSession, setActiveSession] = useState<LiveSession | null>(null)
  const [nextSession, setNextSession] = useState<LiveSession | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const isGuest = user?.role === 'guest'
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    loadSession(
      supabase.from('prayer_requests')
  .select('id', { count: 'exact', head: true })
  .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    )
    loadMessages()
    const interval = setInterval(() => { loadMessages(); loadSession() }, 15000)
    return () => { clearInterval(interval) }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadSession = async () => {
    setSessionLoading(true)
    const [activeRes, nextRes, prayersRes] = await Promise.all([
      supabase.from('live_sessions').select('*').eq('is_active', true).limit(1).maybeSingle(),
      supabase.from('live_sessions').select('*').eq('is_active', false).gte('start_time', new Date().toISOString()).order('start_time', { ascending: true }).limit(1).maybeSingle(),
      supabase.from('prayer_requests').select('id', { count: 'exact', head: true }),
    ])
    setActiveSession(activeRes.data)
    setNextSession(nextRes.data)
    setPrayerCount(prayersRes.count || 0)
    setSessionLoading(false)
  }

  const loadMessages = async () => {
    setLoadingMessages(true)
    const { data, error } = await supabase
      .from('live_messages')
      .select('*, user:user_profiles(username, avatar_url)')
      .order('created_at', { ascending: true })
      .limit(60)
    if (error) { setLoadingMessages(false); return }
    setMessages(data as any)
    setLoadingMessages(false)
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || loading) return
    setLoading(true)
    const { error } = await supabase.from('live_messages').insert({ user_id: user!.id, message: newMessage.trim() })
    if (error) { toast.error('Erro ao enviar mensagem'); setLoading(false); return }
    setNewMessage('')
    loadMessages()
    setLoading(false)
  }

  // ── Detect YouTube vs HLS ─────────────────────────────────────────────
  const isYouTubeUrl = (url: string) => url.includes('youtube.com') || url.includes('youtu.be')
  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:v=|youtu\.be\/)([^&\s]+)/)
    return match ? match[1] : null
  }

  const isOnline = !!activeSession

  return (
    <Layout title="Ao Vivo">
      <div className="space-y-5">
        {/* Compact page header */}
        <div className="flex items-center justify-between gap-3 pb-1 border-b border-border">
          <div className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-red-500 animate-pulse' : 'bg-muted-foreground/40'}`} />
            <h1 className="text-xl font-bold text-foreground">
              {sessionLoading ? 'Ao Vivo' : isOnline ? activeSession!.title : 'Transmissão ao Vivo'}
            </h1>
            {isOnline && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">AO VIVO</span>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* ── Stream area ────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">
            {/* Video Player */}
            <Card className="overflow-hidden border shadow-md">
              <div className="relative bg-black aspect-video">
                {sessionLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse" />
                ) : isOnline && activeSession?.stream_url ? (
                  isYouTubeUrl(activeSession.stream_url) ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${getYouTubeId(activeSession.stream_url) || 'live_stream'}?autoplay=1&rel=0`}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={activeSession.title}
                    />
                  ) : (
                    // HLS or direct video
                    <video
                      className="absolute inset-0 w-full h-full"
                      src={activeSession.stream_url}
                      controls
                      autoPlay
                      playsInline
                    />
                  )
                ) : (
                  // Offline state — static image + info
                  <>
                    <img
                      src="https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1280&h=720&fit=crop&q=80"
                      alt="MER Church"
                      className="w-full h-full object-cover opacity-60"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-[#0A2E4A]/90 to-[#4A90A4]/80 flex items-center justify-center">
                      <div className="text-center text-white px-6 space-y-3">
                        <div className="inline-flex p-4 bg-white/10 backdrop-blur-sm rounded-3xl border border-white/20">
                          <RadioIcon className="h-12 w-12 opacity-70" />
                        </div>
                        {nextSession ? (
                          <>
                            <p className="text-lg font-bold">Próxima Transmissão</p>
                            <p className="font-semibold text-[#D4A574]">{nextSession.title}</p>
                            {nextSession.preacher_name && <p className="text-sm text-white/80">Pregador: {nextSession.preacher_name}</p>}
                            {nextSession.start_time && (
                              <p className="text-sm text-white/80">
                                {new Date(nextSession.start_time).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                                {' às '}
                                {new Date(nextSession.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="text-lg font-bold">Transmissão Indisponível</p>
                            <p className="text-sm text-white/70">Não há transmissão ao vivo agora.<br />Assista sermões anteriores na biblioteca.</p>
                          </>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Live badge overlay */}
                {isOnline && (
                  <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 bg-red-600 rounded-full shadow-lg text-white text-xs font-bold">
                    <div className="h-2 w-2 bg-white rounded-full animate-pulse" />
                    AO VIVO
                  </div>
                )}
              </div>
            </Card>

            {/* Session info */}
            {isOnline && activeSession && (
              <Card className="p-4 border bg-primary/5">
                <div className="space-y-3">
                  <h3 className="font-bold text-foreground">{activeSession.title}</h3>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {activeSession.preacher_name && (
                      <div className="flex items-center gap-1.5">
                        <Flame className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-foreground">{activeSession.preacher_name}</span>
                      </div>
                    )}
                    {activeSession.start_time && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-primary" />
                        <span>{new Date(activeSession.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Heart className="h-4 w-4 text-rose-500" />
                      <span>{prayerCount} pedidos de oração</span>
                    </div>
                  </div>
                  {activeSession.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{activeSession.description}</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => navigate('/prayer')} className="text-xs font-semibold">
                      <Heart className="h-3.5 w-3.5 mr-1.5" />Pedido de Oração
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => navigate('/sermons')} className="text-xs font-semibold">
                      <BookOpen className="h-3.5 w-3.5 mr-1.5" />Sermões Anteriores
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {isGuest && (
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
                <div>
                  <p className="text-sm font-semibold text-foreground">Participe do chat ao vivo</p>
                  <p className="text-xs text-muted-foreground">Membros podem enviar mensagens e pedidos de oração.</p>
                </div>
                <Button size="sm" onClick={() => navigate('/about')} className="bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-bold flex-shrink-0">
                  <UserPlus className="h-3.5 w-3.5 mr-1.5" />Entrar
                </Button>
              </div>
            )}
          </div>

          {/* ── Chat ──────────────────────────────────────────────────── */}
          <Card className="flex flex-col border shadow-md h-[520px] lg:h-[calc(100vh-160px)]">
            <div className="p-3 border-b border-border bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#0A2E4A] rounded-lg">
                  <MessageCircle className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">Chat ao Vivo</h3>
                  <p className="text-[10px] text-muted-foreground">{messages.length} mensagens</p>
                </div>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                  <Shield className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">Mod</span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-muted/10">
              {isGuest ? (
                <div className="h-full flex items-center justify-center p-4">
                  <div className="text-center space-y-3">
                    <div className="inline-flex p-3 bg-primary/10 rounded-full">
                      <MessageCircle className="h-8 w-8 text-primary" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">Apenas para membros</p>
                    <p className="text-xs text-muted-foreground">Crie uma conta para participar do chat</p>
                    <Button size="sm" onClick={() => navigate('/about')} className="bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-bold">
                      <UserPlus className="h-3.5 w-3.5 mr-1.5" />Criar Conta
                    </Button>
                  </div>
                </div>
              ) : loadingMessages ? (
                <LoadingState message="Carregando chat..." />
              ) : messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Seja o primeiro a enviar uma mensagem!</p>
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className="group relative flex gap-2">
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#0A2E4A] to-[#4A90A4] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {msg.user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5 mb-0.5">
                        <span className="font-bold text-xs text-foreground">{msg.user?.username || 'Anônimo'}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/90 leading-relaxed">{msg.message}</p>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"><Pin className="h-3 w-3" /></button>
                        <button className="p-1 hover:bg-red-100 dark:hover:bg-red-950/20 rounded text-muted-foreground hover:text-red-500"><Ban className="h-3 w-3" /></button>
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {!isGuest && (
              <div className="p-2.5 border-t border-border bg-background">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="Compartilhe sua mensagem..."
                    className="flex-1 h-9 text-sm"
                    maxLength={200}
                  />
                  <Button onClick={sendMessage} disabled={loading || !newMessage.trim()}
                    className="h-9 px-3 bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                  {isAdmin ? 'Moderação ativa' : 'Seja encorajador e respeitoso'}
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
