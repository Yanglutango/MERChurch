import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import {
  Send, Loader2, BookOpen, Heart, Lightbulb,
  PlusCircle, Trash2, Bookmark, BookmarkCheck,
  UserPlus, Copy, Check, Share2, ChevronRight,
  Sparkles, X, Menu
} from 'lucide-react'
import { toast } from 'sonner'
import { routeAIRequest } from '../lib/aiRouter'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  saved?: boolean
}

interface Chat {
  id: string
  title: string
  messages: Message[]
  lastUpdated: Date
}

interface UsageStats {
  used: number
  limit: number
  remaining: number
}

const SUGGESTIONS = [
  { icon: BookOpen,  text: 'O que significa graça na Bíblia?',           category: 'Doutrina' },
  { icon: Heart,     text: 'Como vencer a ansiedade pelas Escrituras?',   category: 'Vida Cristã' },
  { icon: Lightbulb, text: 'Como discernir a vontade de Deus?',           category: 'Discernimento' },
  { icon: Sparkles,  text: 'Explique a salvação pela graça',                category: 'Evangelho' },
]

const STORAGE_KEY = 'kairos_logos_chats_v1'

// Gera um id seguro mesmo em browsers sem crypto.randomUUID disponível.
function generateChatId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// Lê e reconstrói o estado de conversas guardado nesta aba (sessionStorage).
// Nunca lança erro — qualquer formato inválido/corrompido é ignorado em silêncio
// e o chamador recebe null, caindo de volta no estado inicial padrão.
function loadPersistedState(): { chats: Chat[]; currentChatId: string } | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.chats) || parsed.chats.length === 0) return null

    const chats: Chat[] = parsed.chats.map((c: any) => ({
      id: String(c.id),
      title: String(c.title || 'Conversa'),
      lastUpdated: new Date(c.lastUpdated || Date.now()),
      messages: Array.isArray(c.messages)
        ? c.messages.map((m: any) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: String(m.content || ''),
            timestamp: new Date(m.timestamp || Date.now()),
            saved: !!m.saved,
          }))
        : [],
    }))

    const currentChatId = chats.some(c => c.id === parsed.currentChatId)
      ? parsed.currentChatId
      : chats[0].id

    return { chats, currentChatId }
  } catch {
    return null
  }
}

const LogosAIPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isGuest = user?.role === 'guest'

  const [chats, setChats] = useState<Chat[]>(() => {
    const persisted = loadPersistedState()
    return persisted?.chats || [{ id: generateChatId(), title: 'Nova Conversa', messages: [], lastUpdated: new Date() }]
  })
  const [currentChatId, setCurrentChatId] = useState<string>(() => {
    const persisted = loadPersistedState()
    return persisted?.currentChatId || chats[0]?.id
  })
  const [input, setInput] = useState('')
  // loadingChatId guarda QUAL conversa está à espera de resposta da IA — não um
  // booleano global. Isto evita mostrar "Pensando..." na conversa errada e
  // evita bloquear o envio numa conversa B só porque a A está a carregar.
  const [loadingChatId, setLoadingChatId] = useState<string | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [showSidebar, setShowSidebar] = useState(false)
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const currentChat = chats.find(c => c.id === currentChatId)!
  const isCurrentChatLoading = loadingChatId === currentChat?.id

  useEffect(() => {
    const check = () => setShowSidebar(window.innerWidth >= 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentChat?.messages])

  useEffect(() => {
    if (!isGuest) loadUsageStats()
  }, [isGuest, user])

  // Persiste o histórico nesta aba do browser. Falha em silêncio (modo privado,
  // quota excedida, etc.) — o chat continua a funcionar, só perde a persistência.
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ chats, currentChatId }))
    } catch {
      // sem persistência neste browser — não bloqueia o uso do chat
    }
  }, [chats, currentChatId])

  const loadUsageStats = async () => {
    if (!user) return
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { count } = await supabase
      .from('logos_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', today.toISOString())
    setUsageStats({ used: count || 0, limit: 50, remaining: 50 - (count || 0) })
  }

  const createNewChat = () => {
    const id = generateChatId()
    setChats(prev => [{ id, title: 'Nova Conversa', messages: [], lastUpdated: new Date() }, ...prev])
    setCurrentChatId(id)
    if (window.innerWidth < 1024) setShowSidebar(false)
  }

  const deleteChat = (chatId: string) => {
    if (chats.length === 1) return
    const next = chats.filter(c => c.id !== chatId)
    setChats(next)
    if (currentChatId === chatId) setCurrentChatId(next[0].id)
  }

  const handleSend = useCallback(async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || !user) return
    if (loadingChatId === currentChatId) return // já há uma resposta pendente NESTA conversa
    if (usageStats && usageStats.remaining <= 0) {
      toast.error('Limite diário atingido. Tente amanhã.')
      return
    }

    const userMessage: Message = { role: 'user', content: msg, timestamp: new Date() }
    const history = [...(currentChat?.messages || []), userMessage]
    const targetChatId = currentChatId // congela o id desta conversa específica

    setChats(prev => prev.map(c =>
      c.id === targetChatId
        ? {
            ...c,
            messages: history,
            title: c.messages.length === 0 ? msg.slice(0, 35) : c.title,
            lastUpdated: new Date(),
          }
        : c
    ))
    setInput('')
    setLoadingChatId(targetChatId)

    try {
      const result = await routeAIRequest({
        messages: history.map(m => ({ role: m.role, content: m.content })),
        userId: user.id,
        topic: msg.slice(0, 60),
      })

      if (result.error === 'quota_exceeded') {
        setUsageStats(prev => prev ? { ...prev, remaining: 0 } : null)
        setChats(prev => prev.map(c =>
          c.id === targetChatId ? { ...c, messages: c.messages.slice(0, -1) } : c
        ))
        toast.error('Limite diário atingido.')
        return
      }

      const aiMsg: Message = { role: 'assistant', content: result.content, timestamp: new Date() }
      setChats(prev => prev.map(c =>
        c.id === targetChatId ? { ...c, messages: [...history, aiMsg] } : c
      ))
      if (result.success) loadUsageStats()
    } finally {
      // só limpa se ainda for esta a conversa "em carregamento" — evita apagar
      // por engano o estado de uma requisição mais recente noutra conversa
      setLoadingChatId(prev => (prev === targetChatId ? null : prev))
    }
  }, [input, currentChat, currentChatId, loadingChatId, usageStats, user])

  const toggleSave = (idx: number) => {
    setChats(prev => prev.map(c =>
      c.id === currentChatId
        ? { ...c, messages: c.messages.map((m, i) => i === idx ? { ...m, saved: !m.saved } : m) }
        : c
    ))
  }

  const copyMsg = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text)
    setCopiedIndex(idx)
    toast.success('Copiado!')
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  // ── GUEST SCREEN (PREMIUM MINIMALIST) ──────────────────────────────────────
  if (isGuest) {
    return (
      <Layout title="Logos AI">
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 animate-fade-in">
          <div className="w-full max-w-2xl text-center space-y-8">
            <div className="space-y-4">
              <div className="inline-flex p-3 text-[#0A2E4A] dark:text-blue-400">
                <Sparkles className="h-10 w-10 animate-pulse" />
              </div>
              <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
                Assistente bíblico avançado focado em respostas exaustivas fundamentadas estritamente nas Escrituras.
              </p>
            </div>

            <div className="pt-2">
              <Button
                onClick={() => navigate('/auth')}
                className="bg-[#0A2E4A] hover:bg-[#0A2E4A]/90 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-white font-medium px-6 h-12 rounded-full shadow-sm transition-all"
              >
                <UserPlus className="mr-2 h-4 w-4" />Começar agora gratuitamente
              </Button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-left pt-8">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => navigate('/auth')}
                  className="group flex flex-col justify-between p-5 rounded-2xl border border-border bg-card/40 hover:bg-muted/40 transition-all duration-200"
                >
                  <span className="text-[10px] font-medium text-muted-foreground/80 uppercase tracking-widest mb-3 block">
                    {s.category}
                  </span>
                  <div className="flex items-center justify-between w-full gap-2">
                    <p className="text-sm font-medium text-foreground/90 leading-snug line-clamp-2">{s.text}</p>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:translate-x-0.5 group-hover:text-foreground transition-all flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  // ── MEMBER / ADMIN SCREEN (AI CANVAS STYLE) ────────────────────────────────
  return (
    <Layout title="Logos AI">
      {/* Altura calculada a partir do chrome real do Layout: header fixo de
          3.5rem (h-14) + no mobile, 5rem extra de padding-bottom reservado
          para a bottom tab bar (pb-20). O valor antigo (65px) não correspondia
          a nada do Layout e fazia o input flutuante ficar atrás da tab bar
          no mobile. */}
      <div className="flex h-[calc(100vh-8.5rem)] lg:h-[calc(100vh-3.5rem)] overflow-hidden bg-background font-sans">
        
        {/* Sidebar Estilo ChatGPT/Claude */}
        {showSidebar && (
          <div 
            className="fixed inset-0 bg-background/40 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}

        <aside className={`
          fixed lg:static inset-y-0 left-0 w-64 z-50 lg:z-0 flex-shrink-0 flex flex-col bg-muted/30 border-r border-border/60 transition-all duration-200 transform
          ${showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:flex'}
        `}>
          <div className="p-3.5 flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={createNewChat} 
              className="flex-1 justify-start gap-2 h-10 px-3 rounded-lg hover:bg-muted text-foreground/80 font-medium text-sm"
            >
              <PlusCircle className="h-4 w-4 text-muted-foreground" />
              Nova conversa
            </Button>
            <button
              onClick={() => setShowSidebar(false)}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground lg:hidden ml-1"
              aria-label="Fechar histórico de conversas"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
            {chats.map(chat => (
              <div
                key={chat.id}
                onClick={() => {
                  setCurrentChatId(chat.id)
                  if (window.innerWidth < 1024) setShowSidebar(false)
                }}
                className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all ${
                  currentChatId === chat.id
                    ? 'bg-muted text-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <span className="text-xs truncate flex-1 pr-2">{chat.title}</span>
                {chats.length > 1 && (
                  <button
                    onClick={e => { e.stopPropagation(); deleteChat(chat.id) }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-background text-muted-foreground hover:text-destructive transition-all"
                    title="Excluir"
                    aria-label={`Excluir conversa ${chat.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Painel Inferior de Quota */}
          {usageStats && (
            <div className="p-4 border-t border-border/60 bg-muted/10">
              <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-1.5">
                <span>Limite diário</span>
                <span>{usageStats.remaining} / {usageStats.limit} restando</span>
              </div>
              <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                <div 
                  className="bg-[#0A2E4A] dark:bg-zinc-400 h-full transition-all duration-300"
                  style={{ width: `${(usageStats.remaining / usageStats.limit) * 100}%` }}
                />
              </div>
            </div>
          )}
        </aside>

        {/* Área Central de Trabalho */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-background">
          
          {/* Topbar Slim Mobile */}
          <header className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 lg:border-none flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSidebar(v => !v)}
              className="lg:hidden h-9 w-9"
              aria-label="Abrir histórico de conversas"
            >
              <Menu className="h-5 w-5 text-muted-foreground" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={createNewChat} 
              className="lg:hidden h-8 text-xs font-medium"
            >
              <PlusCircle className="h-3.5 w-3.5 mr-1" /> Novo
            </Button>
          </header>

          {/* Área de Mensagens Infinitas */}
          <div className="flex-1 overflow-y-auto px-4 pt-4 pb-36 space-y-6">
            {currentChat?.messages.length === 0 ? (
              
              // Estado Inicial Centralizado (Estilo Gemini)
              <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto space-y-8 animate-fade-in pt-12">
                <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-center text-foreground/50">
                  Como posso auxiliar seu estudo teológico hoje?
                </h2>
                <div className="grid sm:grid-cols-2 gap-3 w-full">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(s.text)}
                      className="group flex flex-col justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted/40 text-left transition-all duration-200"
                    >
                      <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest mb-2">{s.category}</span>
                      <span className="text-xs sm:text-sm text-foreground/80 group-hover:text-foreground font-medium leading-snug line-clamp-2">
                        {s.text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              
              // Feed de Chat Alinhado e Limpo (Estilo Claude)
              <div className="max-w-3xl mx-auto space-y-8 w-full">
                {currentChat.messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-4 group ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
                  >
                    {/* Ícone Lateral para as respostas da IA */}
                    {msg.role === 'assistant' && (
                      <div className="h-7 w-7 rounded-full border border-border bg-background flex items-center justify-center flex-shrink-0 text-muted-foreground shadow-sm mt-0.5">
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>
                    )}

                    <div className={`flex flex-col gap-1.5 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      
                      {/* Texto com tipografia espaçada e limpa */}
                      <div className={`
                        text-sm md:text-base leading-relaxed tracking-normal whitespace-pre-wrap
                        ${msg.role === 'user'
                          ? 'bg-muted/80 text-foreground px-4 py-2.5 rounded-2xl rounded-tr-none'
                          : 'text-foreground/90 pl-1 pr-4 py-0.5'}
                      `}>
                        {msg.content}
                      </div>
                      
                      {/* Painel de ações flutuantes sob a resposta da IA */}
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pl-1">
                          <span className="text-[10px] text-muted-foreground mr-2 font-mono">
                            {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            onClick={() => copyMsg(msg.content, idx)}
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                            title="Copiar"
                            aria-label="Copiar resposta"
                          >
                            {copiedIndex === idx
                              ? <Check className="h-3.5 w-3.5 text-green-600" />
                              : <Copy className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            onClick={() => {
                              if (navigator.share) navigator.share({ text: msg.content }).catch(() => null)
                              else copyMsg(msg.content, -1)
                            }}
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                            title="Compartilhar"
                            aria-label="Compartilhar resposta"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => toggleSave(idx)}
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                            title={msg.saved ? 'Remover salvo' : 'Salvar'}
                            aria-label={msg.saved ? 'Remover dos salvos' : 'Salvar resposta'}
                          >
                            {msg.saved
                              ? <BookmarkCheck className="h-3.5 w-3.5 text-foreground" />
                              : <Bookmark className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Loading elegante e discreto — só aparece na conversa que
                    realmente está a aguardar resposta */}
                {isCurrentChatLoading && (
                  <div className="flex gap-4 justify-start animate-pulse">
                    <div className="h-7 w-7 rounded-full border border-border bg-background flex items-center justify-center flex-shrink-0 text-muted-foreground shadow-sm">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <div className="py-2 flex items-center gap-1">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/60" />
                      <span className="text-xs text-muted-foreground/60 font-medium">Pensando...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Flutuante no Rodapé (Estilo ChatGPT) */}
          <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-background via-background to-transparent flex-shrink-0 z-20">
            <div className="max-w-3xl mx-auto space-y-2">
              
              {usageStats && usageStats.remaining <= 5 && usageStats.remaining > 0 && (
                <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 text-center animate-fade-in">
                  Restam apenas {usageStats.remaining} mensagens de sua cota diária.
                </p>
              )}

              <div className="relative flex items-center bg-card border border-border shadow-md rounded-2xl px-3 py-1.5 focus-within:ring-1 focus-within:ring-border focus-within:border-muted-foreground/30 transition-all">
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder={usageStats?.remaining === 0 ? "Limite diário alcançado." : "Faça uma pergunta bíblica ou teológica..."}
                  className="flex-1 bg-transparent border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 h-11 text-base placeholder:text-muted-foreground/60"
                  maxLength={500}
                  disabled={isCurrentChatLoading || usageStats?.remaining === 0}
                />
                
                <Button
                  onClick={() => handleSend()}
                  disabled={isCurrentChatLoading || !input.trim() || usageStats?.remaining === 0}
                  className="h-9 w-9 p-0 bg-foreground text-background hover:bg-foreground/90 rounded-xl transition-all flex-shrink-0 shadow-sm disabled:opacity-20"
                  aria-label="Enviar mensagem"
                >
                  {isCurrentChatLoading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Send className="h-4 w-4" />}
                </Button>
              </div>

              <p className="text-[10px] text-muted-foreground/70 text-center font-normal tracking-wide">
                Respostas fundamentadas exclusivamente nas Escrituras Sagradas · Sola Scriptura
              </p>
            </div>
          </div>

        </main>
      </div>
    </Layout>
  )
}

export default LogosAIPage
