import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import {
  Send, Loader2, BookOpen, Heart, Lightbulb,
  PlusCircle, Trash2, Bookmark, BookmarkCheck,
  UserPlus, Copy, Check, Share2, ChevronRight,
  Sparkles, MessageSquare, X,
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
  { icon: Sparkles,  text: 'Explique a salvação pela graça',               category: 'Evangelho' },
]

const LogosAIPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isGuest = user?.role === 'guest'

  const [chats, setChats] = useState<Chat[]>([
    { id: '1', title: 'Nova Conversa', messages: [], lastUpdated: new Date() },
  ])
  const [currentChatId, setCurrentChatId] = useState('1')
  const [input, setInput] = useState('')
  const [loadingAI, setLoadingAI] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [showSidebar, setShowSidebar] = useState(false)
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const currentChat = chats.find(c => c.id === currentChatId)!

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
}, [isGuest, user])  // ← ADD user TO THIS ARRAY
  
  const loadUsageStats = async () => {
  if (!user) return  // ← ADD THIS LINE
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { count } = await supabase
    .from('logos_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)  // ← REMOVE the ! (non-null assertion)
    .gte('created_at', today.toISOString())
  setUsageStats({ used: count || 0, limit: 50, remaining: 50 - (count || 0) })
}
  const createNewChat = () => {
    const id = Date.now().toString()
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
    if (!msg || loadingAI) return
    if (usageStats && usageStats.remaining <= 0) {
      toast.error('Limite diário atingido. Tente amanhã.')
      return
    }

    const userMessage: Message = { role: 'user', content: msg, timestamp: new Date() }
    const history = [...(currentChat?.messages || []), userMessage]

    setChats(prev => prev.map(c =>
      c.id === currentChatId
        ? {
            ...c,
            messages: history,
            title: c.messages.length === 0 ? msg.slice(0, 35) : c.title,
            lastUpdated: new Date(),
          }
        : c
    ))
    setInput('')
    setLoadingAI(true)

    const result = await routeAIRequest({
      messages: history.map(m => ({ role: m.role, content: m.content })),
      userId: user!.id,
      topic: msg.slice(0, 60),
    })

    if (result.error === 'quota_exceeded') {
      setUsageStats(prev => prev ? { ...prev, remaining: 0 } : null)
      setChats(prev => prev.map(c =>
        c.id === currentChatId ? { ...c, messages: c.messages.slice(0, -1) } : c
      ))
      toast.error('Limite diário atingido.')
      setLoadingAI(false)
      return
    }

    const aiMsg: Message = { role: 'assistant', content: result.content, timestamp: new Date() }
    setChats(prev => prev.map(c =>
      c.id === currentChatId ? { ...c, messages: [...history, aiMsg] } : c
    ))
    if (result.success) loadUsageStats()
    setLoadingAI(false)
  }, [input, currentChat, currentChatId, loadingAI, usageStats, user])

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

  // ── GUEST ────────────────────────────────────────────────────────────────
  if (isGuest) {
    return (
      <Layout title="Logos by KAIRÓS">
        <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-8">
          <div className="space-y-3">
            <div className="inline-flex p-3 bg-[#0A2E4A] rounded-xl">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Logos by KAIRÓS</h1>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Assistente bíblico com IA. Respostas fundamentadas exclusivamente nas Escrituras Sagradas.
            </p>
            <Button
              onClick={() => navigate('/auth')}
              className="bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-semibold"
            >
              <UserPlus className="mr-2 h-4 w-4" />Criar Conta para Conversar
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 text-left">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => navigate('/auth')}
                className="group flex items-start gap-3 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/50 transition-all text-left"
              >
                <s.icon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                    {s.category}
                  </p>
                  <p className="text-sm font-medium text-foreground leading-snug">{s.text}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 ml-auto flex-shrink-0 mt-0.5 group-hover:text-muted-foreground transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </Layout>
    )
  }

  // ── MEMBER / ADMIN ───────────────────────────────────────────────────────
  return (
    <Layout title="Logos by KAIRÓS">
      {/* Cabeçalho compacto */}
      <div className="flex items-center justify-between gap-3 pb-3 mb-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-[#0A2E4A] rounded-lg flex-shrink-0">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground leading-tight">Logos by KAIRÓS</h1>
            {usageStats && (
              <p className="text-[10px] text-muted-foreground">
                {usageStats.remaining}/{usageStats.limit} mensagens hoje
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowSidebar(v => !v)}
            className="lg:hidden h-8 text-xs"
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />Conversas
          </Button>
          <Button size="sm" variant="outline" onClick={createNewChat} className="h-8 text-xs">
            <PlusCircle className="h-3.5 w-3.5 mr-1.5" />Nova
          </Button>
        </div>
      </div>

      <div className="flex gap-4" style={{ height: 'calc(100vh - 210px)', minHeight: '480px' }}>
        {/* Sidebar de conversas */}
        {showSidebar && (
          <Card className="w-56 flex-shrink-0 flex flex-col border overflow-hidden">
            <div className="p-2.5 border-b border-border flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Conversas
              </span>
              <button
                onClick={() => setShowSidebar(false)}
                className="p-1 rounded hover:bg-muted transition-colors lg:hidden"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
              {chats.map(chat => (
                <div
                  key={chat.id}
                  onClick={() => {
                    setCurrentChatId(chat.id)
                    if (window.innerWidth < 1024) setShowSidebar(false)
                  }}
                  className={`group flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-colors ${
                    currentChatId === chat.id
                      ? 'bg-[#0A2E4A] text-white'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{chat.title}</p>
                    <p className="text-[10px] opacity-70">{chat.messages.length} msg</p>
                  </div>
                  {chats.length > 1 && (
                    <button
                      onClick={e => { e.stopPropagation(); deleteChat(chat.id) }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity flex-shrink-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Área do chat */}
        <Card className="flex-1 flex flex-col border overflow-hidden min-w-0">
          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {currentChat?.messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-5 text-center px-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Como posso ajudá-lo?</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Perguntas sobre a Bíblia, fé ou vida cristã
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-2 w-full max-w-lg">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(s.text)}
                      className="group flex items-center gap-2.5 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/50 text-left transition-all"
                    >
                      <s.icon className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground leading-snug">
                        {s.text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              currentChat.messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="h-7 w-7 rounded-lg bg-[#0A2E4A] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}
                  <div
                    className={`group max-w-[78%] flex flex-col gap-1 ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-[#0A2E4A] text-white rounded-tr-sm'
                          : 'bg-muted border border-border/50 text-foreground rounded-tl-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] text-muted-foreground mr-1">
                          {msg.timestamp.toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <button
                          onClick={() => copyMsg(msg.content, idx)}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Copiar"
                        >
                          {copiedIndex === idx
                            ? <Check className="h-3 w-3 text-green-500" />
                            : <Copy className="h-3 w-3" />}
                        </button>
                        <button
                          onClick={() => {
                            if (navigator.share) navigator.share({ text: msg.content })
                            else copyMsg(msg.content, -1)
                          }}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Partilhar"
                        >
                          <Share2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => toggleSave(idx)}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title={msg.saved ? 'Remover dos salvos' : 'Guardar'}
                        >
                          {msg.saved
                            ? <BookmarkCheck className="h-3 w-3 text-primary" />
                            : <Bookmark className="h-3 w-3" />}
                        </button>
                      </div>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="h-7 w-7 rounded-lg bg-muted border border-border flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-foreground">
                      {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
              ))
            )}

            {loadingAI && (
              <div className="flex gap-2.5 justify-start">
                <div className="h-7 w-7 rounded-lg bg-[#0A2E4A] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="px-3.5 py-2.5 bg-muted border border-border/50 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.15s]" />
                  <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.3s]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border bg-background">
            {usageStats && usageStats.remaining <= 5 && usageStats.remaining > 0 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 text-center mb-2">
                {usageStats.remaining}{' '}
                {usageStats.remaining === 1 ? 'mensagem restante' : 'mensagens restantes'} hoje
              </p>
            )}
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Faça uma pergunta bíblica..."
                className="flex-1 h-10 text-sm"
                maxLength={500}
                disabled={loadingAI || usageStats?.remaining === 0}
              />
              <Button
                onClick={() => handleSend()}
                disabled={loadingAI || !input.trim() || usageStats?.remaining === 0}
                className="h-10 px-3 bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white flex-shrink-0"
              >
                {loadingAI
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-1.5">
              Baseada nas Escrituras Sagradas · Sola Scriptura
            </p>
          </div>
        </Card>
      </div>
    </Layout>
  )
}

export default LogosAIPage
