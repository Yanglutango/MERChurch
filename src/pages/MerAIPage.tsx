import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/button'
import {
  Send, Loader2, BookOpen, Heart, Lightbulb,
  PlusCircle, Trash2, Bookmark, BookmarkCheck,
  UserPlus, Copy, Check, Share2, ChevronRight,
  Sparkles, X, Menu, MessageSquare, ChevronDown, RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { routeAIRequest } from '../lib/aiRouter'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string
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

// ─── Constants ────────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  { icon: BookOpen,  text: 'O que significa graça na Bíblia?',         category: 'Doutrina' },
  { icon: Heart,     text: 'Como vencer a ansiedade pelas Escrituras?', category: 'Vida Cristã' },
  { icon: Lightbulb, text: 'Como discernir a vontade de Deus?',         category: 'Discernimento' },
  { icon: Sparkles,  text: 'Explique a salvação pela graça',             category: 'Evangelho' },
]

const STORAGE_KEY = 'kairos_logos_chats_v1'
const MAX_CHARS   = 500
const MAX_ROWS    = 5

// ─── Utilities ────────────────────────────────────────────────────────────────

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

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
            id: m.id || generateId(),
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

// Lido uma vez no carregamento do módulo — não a cada render.
const _persisted = loadPersistedState()
const _defaultChat: Chat = {
  id: generateId(),
  title: 'Nova Conversa',
  messages: [],
  lastUpdated: new Date(),
}

// ─── Markdown Renderer ────────────────────────────────────────────────────────
// memo: só re-renderiza se `content` mudar — as respostas longas da IA não
// devem re-renderizar a cada keystroke do utilizador no input de texto.

function renderInline(text: string): React.ReactNode {
  const tokens = text.split(/(\*\*[^*\n]+?\*\*|\*[^*\n]+?\*|`[^`\n]+?`)/g)
  return (
    <>
      {tokens.map((token, i) => {
        if (token.startsWith('**') && token.endsWith('**') && token.length > 4)
          return <strong key={i} className="font-semibold text-foreground">{token.slice(2, -2)}</strong>
        if (token.startsWith('*') && token.endsWith('*') && token.length > 2)
          return <em key={i}>{token.slice(1, -1)}</em>
        if (token.startsWith('`') && token.endsWith('`') && token.length > 2)
          return <code key={i} className="px-1 py-0.5 rounded bg-muted text-[0.85em] font-mono text-foreground">{token.slice(1, -1)}</code>
        return token
      })}
    </>
  )
}

const MarkdownText = memo(function MarkdownText({ content }: { content: string }) {
  const lines = content.split('\n')
  const nodes: React.ReactNode[] = []

  lines.forEach((line, i) => {
    if (line.startsWith('## ')) {
      nodes.push(
        <h2 key={i} className="text-sm font-bold text-foreground mt-3 mb-1 first:mt-0">{line.slice(3)}</h2>
      )
    } else if (line.startsWith('### ')) {
      nodes.push(
        <h3 key={i} className="text-sm font-semibold text-foreground mt-2 mb-0.5">{line.slice(4)}</h3>
      )
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      nodes.push(
        <div key={i} className="flex items-start gap-2 my-0.5">
          <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-muted-foreground/60 flex-shrink-0" />
          <span className="leading-relaxed">{renderInline(line.slice(2))}</span>
        </div>
      )
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)/)
      if (match) {
        nodes.push(
          <div key={i} className="flex items-start gap-2 my-0.5">
            <span className="text-muted-foreground text-[0.8em] font-mono flex-shrink-0 min-w-[1.4rem] leading-relaxed">
              {match[1]}.
            </span>
            <span className="leading-relaxed">{renderInline(match[2])}</span>
          </div>
        )
      }
    } else if (line.trim() === '') {
      nodes.push(<div key={i} className="h-2" />)
    } else {
      nodes.push(
        <p key={i} className="leading-relaxed my-0.5">{renderInline(line)}</p>
      )
    }
  })

  return <div className="text-sm md:text-base text-foreground/90 space-y-0">{nodes}</div>
})

// ─── Component ────────────────────────────────────────────────────────────────

const LogosAIPage = () => {
  const navigate       = useNavigate()
  const { user }       = useAuth()
  const isGuest        = user?.role === 'guest'
  const textareaRef    = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [chats, setChats]                     = useState<Chat[]>(_persisted?.chats ?? [_defaultChat])
  const [currentChatId, setCurrentChatId]     = useState<string>(_persisted?.currentChatId ?? _defaultChat.id)
  const [sidebarTab, setSidebarTab]           = useState<'chats' | 'saved'>('chats')
  const [input, setInput]                     = useState('')
  const [loadingChatId, setLoadingChatId]     = useState<string | null>(null)
  const [copiedId, setCopiedId]               = useState<string | null>(null)
  const [showSidebar, setShowSidebar]         = useState(false)
  const [usageStats, setUsageStats]           = useState<UsageStats | null>(null)
  // confirmDeleteId: guarda o id do chat aguardando confirmação de exclusão.
  // Dois cliques para deletar — evita perda acidental de todo um histórico.
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  // showScrollBtn: botão flutuante "↓" visível quando o utilizador scrollou
  // para cima e precisa voltar ao fundo rapidamente.
  const [showScrollBtn, setShowScrollBtn]     = useState(false)

  const currentChat          = chats.find(c => c.id === currentChatId)!
  const isCurrentChatLoading = loadingChatId === currentChat?.id
  const charsLeft            = MAX_CHARS - input.length

  // Memoized: O(n*m) flatMap não deve recalcular a cada keystroke do input.
  const savedMessages = useMemo(() =>
    chats.flatMap(c =>
      c.messages
        .filter(m => m.saved)
        .map(m => ({ ...m, chatTitle: c.title, chatId: c.id }))
    ),
    [chats]
  )

  // Índice da última mensagem da IA — usado pelo botão "Regenerar".
  // Memoized para não iterar o array a cada render.
  const lastAiMsgIndex = useMemo(() => {
    if (!currentChat) return -1
    for (let i = currentChat.messages.length - 1; i >= 0; i--) {
      if (currentChat.messages[i].role === 'assistant') return i
    }
    return -1
  }, [currentChat?.messages])

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const sync = () => setShowSidebar(window.innerWidth >= 1024)
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentChat?.messages])

  // IntersectionObserver no sentinel div: detecta quando o utilizador scrollou
  // para cima (sentinel saiu do viewport) e mostra o botão "↓".
  // Configurado uma única vez — o observer responde a mudanças de visibilidade
  // continuamente sem precisar de re-setup.
  useEffect(() => {
    const sentinel = messagesEndRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => setShowScrollBtn(!entry.isIntersecting),
      { threshold: 0.1 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  // CORRECÇÃO: loadUsageStats estava fora do array de deps — o effect não
  // re-corria quando user mudava (ex: logout → login com conta diferente).
  // loadUsageStats é useCallback([user]), logo muda quando user muda.
  // Incluí-la aqui é suficiente; `user` tornou-se redundante.
  useEffect(() => {
    if (!isGuest) loadUsageStats()
  }, [isGuest, loadUsageStats]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ chats, currentChatId }))
    } catch { /* sem persistência — não bloqueia o uso */ }
  }, [chats, currentChatId])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const lineHeight = parseInt(getComputedStyle(el).lineHeight) || 24
    const maxHeight  = lineHeight * MAX_ROWS + 16
    el.style.height  = `${Math.min(el.scrollHeight, maxHeight)}px`
  }, [input])

  // ── Callbacks ─────────────────────────────────────────────────────────────

  // Definido ANTES dos effects que dependem dele — ordem correcta de declaração.
  const loadUsageStats = useCallback(async () => {
    if (!user) return
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { count } = await supabase
      .from('logos_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', today.toISOString())
    setUsageStats({ used: count || 0, limit: 50, remaining: 50 - (count || 0) })
  }, [user])

  const createNewChat = useCallback(() => {
    const id = generateId()
    setChats(prev => [{ id, title: 'Nova Conversa', messages: [], lastUpdated: new Date() }, ...prev])
    setCurrentChatId(id)
    setSidebarTab('chats')
    if (window.innerWidth < 1024) setShowSidebar(false)
  }, [])

  const deleteChat = useCallback((chatId: string) => {
    setChats(prev => {
      if (prev.length === 1) return prev
      const next = prev.filter(c => c.id !== chatId)
      setCurrentChatId(cur => cur === chatId ? next[0].id : cur)
      return next
    })
    setConfirmDeleteId(null)
  }, [])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const handleSend = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || !user) return
    if (loadingChatId === currentChatId) return
    if (usageStats && usageStats.remaining <= 0) {
      toast.error('Limite diário atingido. Tente amanhã.')
      return
    }

    const userMessage: Message = { id: generateId(), role: 'user', content: msg, timestamp: new Date() }
    const history      = [...(currentChat?.messages ?? []), userMessage]
    const targetChatId = currentChatId

    setChats(prev => prev.map(c =>
      c.id === targetChatId
        ? { ...c, messages: history, title: c.messages.length === 0 ? msg.slice(0, 35) : c.title, lastUpdated: new Date() }
        : c
    ))
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setLoadingChatId(targetChatId)

    try {
      const result = await routeAIRequest({
        messages: history.map(m => ({ role: m.role, content: m.content })),
        userId:   user.id,
        topic:    msg.slice(0, 60),
      })

      if (result.error === 'quota_exceeded') {
        setUsageStats(prev => prev ? { ...prev, remaining: 0 } : null)
        setChats(prev => prev.map(c =>
          c.id === targetChatId ? { ...c, messages: c.messages.slice(0, -1) } : c
        ))
        toast.error('Limite diário atingido.')
        return
      }

      const aiMsg: Message = { id: generateId(), role: 'assistant', content: result.content, timestamp: new Date() }
      setChats(prev => prev.map(c =>
        c.id === targetChatId ? { ...c, messages: [...history, aiMsg] } : c
      ))
      if (result.success) loadUsageStats()
    } finally {
      setLoadingChatId(prev => prev === targetChatId ? null : prev)
    }
  }, [input, currentChat, currentChatId, loadingChatId, usageStats, user, loadUsageStats])

  // Remove a última resposta da IA e reenvía a última mensagem do utilizador.
  // Não chama handleSend (evita duplicar a mensagem do user no histórico) —
  // usa routeAIRequest directamente com o histórico já truncado.
  const handleRegenerate = useCallback(async () => {
    if (!currentChat || isCurrentChatLoading || !user || lastAiMsgIndex === -1) return

    const trimmedMessages = currentChat.messages.slice(0, lastAiMsgIndex)
    const lastUserMsg     = [...trimmedMessages].reverse().find(m => m.role === 'user')
    if (!lastUserMsg) return

    const targetChatId = currentChatId
    setChats(prev => prev.map(c =>
      c.id === targetChatId ? { ...c, messages: trimmedMessages } : c
    ))
    setLoadingChatId(targetChatId)

    try {
      const result = await routeAIRequest({
        messages: trimmedMessages.map(m => ({ role: m.role, content: m.content })),
        userId:   user.id,
        topic:    lastUserMsg.content.slice(0, 60),
      })

      if (result.error === 'quota_exceeded') {
        setUsageStats(prev => prev ? { ...prev, remaining: 0 } : null)
        toast.error('Limite diário atingido.')
        return
      }

      const aiMsg: Message = { id: generateId(), role: 'assistant', content: result.content, timestamp: new Date() }
      setChats(prev => prev.map(c =>
        c.id === targetChatId ? { ...c, messages: [...trimmedMessages, aiMsg] } : c
      ))
      if (result.success) loadUsageStats()
    } finally {
      setLoadingChatId(prev => prev === targetChatId ? null : prev)
    }
  }, [currentChat, currentChatId, isCurrentChatLoading, lastAiMsgIndex, user, loadUsageStats])

  const toggleSave = useCallback((msgId: string) => {
    setChats(prev => prev.map(c =>
      c.id === currentChatId
        ? { ...c, messages: c.messages.map(m => m.id === msgId ? { ...m, saved: !m.saved } : m) }
        : c
    ))
  }, [currentChatId])

  const copyMsg = useCallback(async (text: string, msgId: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(msgId)
    toast.success('Copiado!')
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  // ── GUEST SCREEN ─────────────────────────────────────────────────────────────

  if (isGuest) {
    return (
      <Layout title="Logos AI">
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 animate-fade-in">
          <div className="w-full max-w-2xl text-center space-y-8">
            <div className="space-y-4">
              <div className="inline-flex p-3 text-[#0A2E4A] dark:text-blue-400">
                <Sparkles className="h-10 w-10 motion-safe:animate-pulse" />
              </div>
              {/* h1 estava ausente — violação semântica e de SEO */}
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Logos AI</h1>
              <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
                Assistente bíblico avançado focado em respostas exaustivas fundamentadas estritamente nas Escrituras.
              </p>
            </div>

            <Button
              onClick={() => navigate('/auth')}
              className="bg-[#0A2E4A] hover:bg-[#0A2E4A]/90 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-white font-medium px-6 h-12 rounded-full shadow-sm"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Começar agora gratuitamente
            </Button>

            {/* Ícones das SUGGESTIONS agora são renderizados — estavam declarados mas nunca usados */}
            <div className="grid sm:grid-cols-2 gap-3 text-left pt-4">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => navigate('/auth')}
                  className="group flex flex-col justify-between p-5 rounded-2xl border border-border bg-card/40 hover:bg-muted/40 transition-all duration-200 text-left"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <s.icon className="h-4 w-4 text-muted-foreground/60 group-hover:text-foreground transition-colors flex-shrink-0" />
                    <span className="text-[10px] font-medium text-muted-foreground/80 uppercase tracking-widest">
                      {s.category}
                    </span>
                  </div>
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

  // ── MEMBER / ADMIN SCREEN ─────────────────────────────────────────────────────

  return (
    <Layout title="Logos AI">
      <div className="flex h-[calc(100vh-8.5rem)] lg:h-[calc(100vh-3.5rem)] overflow-hidden bg-background">

        {/* Overlay mobile */}
        {showSidebar && (
          <div
            className="fixed inset-0 bg-background/40 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 w-64 z-50 lg:z-0
          flex-shrink-0 flex flex-col bg-muted/30 border-r border-border/60
          transition-transform duration-200
          ${showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>

          <div className="p-3 flex items-center gap-1.5 border-b border-border/40">
            <Button
              variant="ghost"
              onClick={createNewChat}
              className="flex-1 justify-start gap-2 h-9 px-3 rounded-lg hover:bg-muted text-foreground/80 font-medium text-sm"
            >
              <PlusCircle className="h-4 w-4 text-muted-foreground" />
              Nova conversa
            </Button>
            <button
              onClick={() => setShowSidebar(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-muted text-muted-foreground"
              aria-label="Fechar painel lateral"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tabs: Conversas | Salvos */}
          <div className="flex px-2 pt-2 border-b border-border/40">
            {(['chats', 'saved'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setSidebarTab(tab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors ${
                  sidebarTab === tab
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === 'chats' ? (
                  <><MessageSquare className="h-3.5 w-3.5" />Conversas</>
                ) : (
                  <>
                    <Bookmark className="h-3.5 w-3.5" />
                    Salvos
                    {savedMessages.length > 0 && (
                      <span className="ml-0.5 px-1.5 py-px text-[10px] font-bold rounded-full bg-foreground text-background">
                        {savedMessages.length}
                      </span>
                    )}
                  </>
                )}
              </button>
            ))}
          </div>

          {/* Conteúdo das tabs */}
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
            {sidebarTab === 'chats' && (
              chats.length === 0
                ? <p className="text-xs text-muted-foreground text-center py-6">Nenhuma conversa</p>
                : chats.map(chat => (
                  <div key={chat.id} className="relative">
                    {confirmDeleteId === chat.id ? (
                      // Confirmação inline — dois cliques para deletar, sem Dialog
                      <div className="flex items-center gap-1 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                        <span className="text-[11px] text-destructive font-medium flex-1 truncate">Excluir?</span>
                        <button
                          onClick={() => deleteChat(chat.id)}
                          className="text-[11px] font-bold text-destructive hover:underline px-1"
                        >
                          Sim
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-[11px] font-bold text-muted-foreground hover:text-foreground px-1"
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          setCurrentChatId(chat.id)
                          if (window.innerWidth < 1024) setShowSidebar(false)
                        }}
                        className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all border-l-2 ${
                          currentChatId === chat.id
                            ? 'border-l-foreground bg-muted text-foreground font-medium'
                            : 'border-l-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                        }`}
                      >
                        <span className="text-xs truncate flex-1 pr-1">{chat.title}</span>
                        {chats.length > 1 && (
                          <button
                            onClick={e => { e.stopPropagation(); setConfirmDeleteId(chat.id) }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-background text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
                            aria-label={`Excluir conversa "${chat.title}"`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
            )}

            {sidebarTab === 'saved' && (
              savedMessages.length === 0
                ? (
                  <div className="text-center py-8 space-y-2">
                    <Bookmark className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                    <p className="text-xs text-muted-foreground">Nenhuma resposta guardada.</p>
                    <p className="text-[11px] text-muted-foreground/60">
                      Use o marcador nas mensagens da IA para guardar as melhores respostas.
                    </p>
                  </div>
                )
                : savedMessages.map(m => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setCurrentChatId(m.chatId)
                      setSidebarTab('chats')
                      if (window.innerWidth < 1024) setShowSidebar(false)
                    }}
                    className="w-full text-left p-2.5 rounded-lg hover:bg-muted/60 transition-colors space-y-1"
                  >
                    <div className="flex items-center gap-1.5">
                      <BookmarkCheck className="h-3 w-3 text-foreground flex-shrink-0" />
                      <span className="text-[10px] text-muted-foreground truncate">{m.chatTitle}</span>
                    </div>
                    <p className="text-xs text-foreground/80 line-clamp-2 leading-relaxed">{m.content}</p>
                  </button>
                ))
            )}
          </div>

          {/* Quota */}
          {usageStats && (
            <div className="p-4 border-t border-border/60 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                <span>Limite diário</span>
                <span className={usageStats.remaining <= 5 ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}>
                  {usageStats.remaining} / {usageStats.limit}
                </span>
              </div>
              <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    usageStats.remaining <= 5 ? 'bg-amber-500' : 'bg-[#0A2E4A] dark:bg-zinc-400'
                  }`}
                  style={{ width: `${(usageStats.remaining / usageStats.limit) * 100}%` }}
                />
              </div>
            </div>
          )}
        </aside>

        {/* ── Área principal ────────────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-background">

          {/* Topbar: mobile tem Menu + Novo; desktop mostra o título da conversa activa */}
          <header className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 lg:border-border/20 flex-shrink-0 min-h-[44px]">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSidebar(v => !v)}
              className="lg:hidden h-9 w-9"
              aria-label="Abrir painel de conversas"
            >
              <Menu className="h-5 w-5 text-muted-foreground" />
            </Button>

            {/* Título da conversa activa — visível no desktop, orientação sem ambiguidade */}
            <span className="hidden lg:block text-sm font-medium text-muted-foreground truncate max-w-sm">
              {currentChat?.title || 'Nova Conversa'}
            </span>

            <Button
              variant="ghost"
              size="sm"
              onClick={createNewChat}
              className="lg:hidden h-8 text-xs font-medium"
            >
              <PlusCircle className="h-3.5 w-3.5 mr-1" />Novo
            </Button>

            {/* Botão "Novo" no desktop — alinhado à direita do header */}
            <Button
              variant="ghost"
              size="sm"
              onClick={createNewChat}
              className="hidden lg:flex h-8 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <PlusCircle className="h-3.5 w-3.5 mr-1" />Nova conversa
            </Button>
          </header>

          {/* Feed de mensagens */}
          <div className="flex-1 overflow-y-auto px-4 pt-4 pb-40 space-y-6">
            {currentChat?.messages.length === 0 ? (
              <div className="min-h-[60vh] flex flex-col items-center justify-center max-w-2xl mx-auto space-y-6 animate-fade-in">
                <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-center text-foreground/40">
                  Como posso auxiliar seu estudo teológico hoje?
                </h2>
                {/* Ícones das SUGGESTIONS agora são renderizados no estado vazio também */}
                <div className="grid sm:grid-cols-2 gap-3 w-full">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(s.text)}
                      className="group flex flex-col justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted/40 text-left transition-all duration-200"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <s.icon className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground transition-colors flex-shrink-0" />
                        <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">
                          {s.category}
                        </span>
                      </div>
                      <span className="text-xs sm:text-sm text-foreground/80 group-hover:text-foreground font-medium leading-snug line-clamp-2">
                        {s.text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-8 w-full">
                {currentChat.messages.map((msg, idx) => {
                  const isLastAi = idx === lastAiMsgIndex
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 group ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="h-7 w-7 rounded-full border border-border bg-background flex items-center justify-center flex-shrink-0 text-muted-foreground shadow-sm mt-0.5">
                          <Sparkles className="h-3.5 w-3.5" />
                        </div>
                      )}

                      <div className={`flex flex-col gap-1.5 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        {msg.role === 'user' ? (
                          <div className="bg-muted/80 text-foreground text-sm md:text-base leading-relaxed px-4 py-2.5 rounded-2xl rounded-tr-none whitespace-pre-wrap">
                            {msg.content}
                          </div>
                        ) : (
                          <div className="pl-1 pr-4 py-0.5">
                            <MarkdownText content={msg.content} />
                          </div>
                        )}

                        {msg.role === 'assistant' && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150 pl-1">
                            <span className="text-[10px] text-muted-foreground mr-1.5 font-mono tabular-nums">
                              {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <button
                              onClick={() => copyMsg(msg.content, msg.id)}
                              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              aria-label="Copiar resposta"
                            >
                              {copiedId === msg.id
                                ? <Check className="h-3.5 w-3.5 text-green-600" />
                                : <Copy className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              onClick={() => {
                                if (navigator.share) navigator.share({ text: msg.content }).catch(() => null)
                                else copyMsg(msg.content, msg.id)
                              }}
                              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              aria-label="Compartilhar resposta"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => toggleSave(msg.id)}
                              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              aria-label={msg.saved ? 'Remover dos salvos' : 'Guardar resposta'}
                            >
                              {msg.saved
                                ? <BookmarkCheck className="h-3.5 w-3.5 text-foreground" />
                                : <Bookmark className="h-3.5 w-3.5" />}
                            </button>
                            {/* Botão "Regenerar" apenas na última resposta da IA e fora do loading */}
                            {isLastAi && !isCurrentChatLoading && (
                              <button
                                onClick={handleRegenerate}
                                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                aria-label="Regenerar resposta"
                                title="Regenerar resposta"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Typing indicator — contextual à natureza espiritual do assistente */}
                {isCurrentChatLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="h-7 w-7 rounded-full border border-border bg-background flex items-center justify-center flex-shrink-0 text-muted-foreground shadow-sm">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <div className="py-2 flex items-center gap-2">
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <div
                            key={i}
                            className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 motion-safe:animate-bounce"
                            style={{ animationDelay: `${i * 150}ms` }}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground/60 font-medium">
                        Meditando nas Escrituras…
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Sentinel: observado pelo IntersectionObserver para detectar scroll-up */}
            <div ref={messagesEndRef} />
          </div>

          {/* Botão "scroll to bottom" — aparece quando o utilizador scrollou para cima */}
          {showScrollBtn && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-28 right-6 z-30 h-8 w-8 rounded-full bg-card border border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:shadow-lg transition-all motion-safe:animate-fade-in"
              aria-label="Ir para o fundo da conversa"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          )}

          {/* ── Input flutuante ────────────────────────────────────────────────── */}
          <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent z-20">
            <div className="max-w-3xl mx-auto space-y-1.5">

              {usageStats && usageStats.remaining <= 5 && usageStats.remaining > 0 && (
                <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 text-center">
                  {usageStats.remaining === 1
                    ? 'Última mensagem da sua cota diária.'
                    : `Restam apenas ${usageStats.remaining} mensagens da sua cota diária.`}
                </p>
              )}

              <div className="relative flex items-end bg-card border border-border shadow-md rounded-2xl px-3 py-2 gap-2 focus-within:ring-1 focus-within:ring-border focus-within:border-muted-foreground/30 transition-all">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => {
                    if (e.target.value.length <= MAX_CHARS) setInput(e.target.value)
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder={
                    usageStats?.remaining === 0
                      ? 'Limite diário alcançado.'
                      : 'Faça uma pergunta bíblica ou teológica… (Shift+Enter para nova linha)'
                  }
                  rows={1}
                  disabled={isCurrentChatLoading || usageStats?.remaining === 0}
                  className="flex-1 bg-transparent border-0 shadow-none outline-none resize-none text-sm md:text-base placeholder:text-muted-foreground/60 text-foreground leading-relaxed py-1.5 max-h-32 overflow-y-auto disabled:opacity-50 disabled:cursor-not-allowed"
                />

                <div className="flex flex-col items-end gap-1 flex-shrink-0 pb-0.5">
                  <Button
                    onClick={() => handleSend()}
                    disabled={isCurrentChatLoading || !input.trim() || usageStats?.remaining === 0}
                    className="h-9 w-9 p-0 bg-foreground text-background hover:bg-foreground/90 rounded-xl transition-all shadow-sm disabled:opacity-20"
                    aria-label="Enviar mensagem"
                  >
                    {isCurrentChatLoading
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Send className="h-4 w-4" />}
                  </Button>
                  {/* Contador "usado / total" — contexto claro, não um número solto */}
                  {input.length > MAX_CHARS * 0.7 && (
                    <span className={`text-[10px] font-mono tabular-nums ${
                      charsLeft < 50 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground/50'
                    }`}>
                      {input.length} / {MAX_CHARS}
                    </span>
                  )}
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground/60 text-center tracking-wide">
                Respostas fundamentadas nas Escrituras Sagradas · Sola Scriptura
              </p>
            </div>
          </div>
        </main>
      </div>
    </Layout>
  )
}

export default LogosAIPage
