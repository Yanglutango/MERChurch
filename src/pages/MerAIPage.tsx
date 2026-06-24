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
  { icon: Sparkles,  text: 'Explique a salvação pela graça',                category: 'Evangelho' },
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
  }, [isGuest, user])
  
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

  // ── GUEST SCREEN ──────────────────────────────────────────────────────────
  if (isGuest) {
    return (
      <Layout title="Logos by KAIRÓS">
        <div className="p-4 md:p-8 max-w-4xl mx-auto flex flex-col justify-center min-h-[70vh] animate-fade-in">
          <div className="max-w-2xl mx-auto text-center space-y-8 bg-card p-6 md:p-10 rounded-2xl border border-border shadow-xl">
            <div className="space-y-4">
              <div className="inline-flex p-3.5 bg-[#0A2E4A] rounded-2xl shadow-md text-white ring-4 ring-[#0A2E4A]/10">
                <Sparkles className="h-7 w-7 animate-pulse" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">Logos by KAIRÓS</h1>
              <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
                Assistente bíblico inteligente. Obtenha respostas exaustivas e solidamente fundamentadas nas Escrituras Sagradas.
              </p>
              <div className="pt-2">
                <Button
                  onClick={() => navigate('/auth')}
                  className="bg-[#0A2E4A] hover:bg-[#0A2E4A]/90 text-white font-bold px-6 h-11 rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  <UserPlus className="mr-2 h-4 w-4" />Criar Minha Conta Gratuitamente
                </Button>
              </div>
            </div>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-dashed" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-3 text-muted-foreground font-semibold">Exemplos de Consulta</span></div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3.5 text-left">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => navigate('/auth')}
                  className="group flex items-start gap-3.5 p-4 rounded-xl border border-border bg-background hover:border-[#0A2E4A]/40 hover:bg-[#0A2E4A]/5 hover:shadow-md transition-all duration-200 text-left"
                >
                  <div className="p-2 rounded-lg bg-muted text-muted-foreground group-hover:bg-[#0A2E4A] group-hover:text-white transition-colors mt-0.5">
                    <s.icon className="h-4 w-4 flex-shrink-0" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-[#4A90A4] uppercase tracking-widest mb-0.5">
                      {s.category}
                    </p>
                    <p className="text-xs md:text-sm font-semibold text-foreground leading-snug group-hover:text-foreground transition-colors line-clamp-2">{s.text}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/30 ml-auto flex-shrink-0 mt-2 group-hover:translate-x-0.5 group-hover:text-[#0A2E4A] transition-all" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  // ── MEMBER / ADMIN SCREEN ─────────────────────────────────────────────────
  return (
    <Layout title="Logos by KAIRÓS">
      <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col h-[calc(100vh-120px)] lg:h-[calc(100vh-90px)]">
        
        {/* Cabeçalho Compacto Elegante */}
        <div className="flex items-center justify-between gap-3 pb-3 mb-4 border-b border-border/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#0A2E4A] rounded-xl flex-shrink-0 shadow-sm text-white ring-4 ring-[#0A2E4A]/5">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-black text-foreground tracking-tight">Logos by KAIRÓS</h1>
              {usageStats && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${usageStats.remaining > 5 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <p className="text-[10px] md:text-xs font-medium text-muted-foreground">
                    {usageStats.remaining} de {usageStats.limit} créditos diários restantes
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowSidebar(v => !v)}
              className={`lg:hidden h-9 text-xs font-bold transition-all ${showSidebar ? 'bg-muted border-border' : ''}`}
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />Histórico
            </Button>
            <Button size="sm" onClick={createNewChat} className="h-9 text-xs font-bold bg-[#0A2E4A] hover:bg-[#0A2E4A]/90 text-white shadow-sm">
              <PlusCircle className="h-3.5 w-3.5 mr-1.5" />Nova Conversa
            </Button>
          </div>
        </div>

        {/* Corpo Principal Responsivo */}
        <div className="flex flex-1 gap-4 overflow-hidden relative">
          
          {/* Overlay Mobile para fechar a Sidebar */}
          {showSidebar && (
            <div 
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setShowSidebar(false)}
            />
          )}

          {/* Sidebar de Conversas */}
          <Card className={`
            fixed lg:static inset-y-0 left-0 w-64 z-50 lg:z-0 flex-shrink-0 flex flex-col border shadow-xl lg:shadow-none bg-card transition-all duration-200 transform
            ${showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:hidden'}
          `}>
            <div className="p-3 border-b border-border/80 flex items-center justify-between bg-muted/20">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Conversas Ativas
              </span>
              <button
                onClick={() => setShowSidebar(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors lg:hidden"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {chats.map(chat => (
                <div
                  key={chat.id}
                  onClick={() => {
                    setCurrentChatId(chat.id)
                    if (window.innerWidth < 1024) setShowSidebar(false)
                  }}
                  className={`group flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all duration-150 relative ${
                    currentChatId === chat.id
                      ? 'bg-[#0A2E4A] text-white shadow-sm font-semibold'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-xs truncate">{chat.title}</p>
                    <p className={`text-[10px] mt-0.5 opacity-70 ${currentChatId === chat.id ? 'text-blue-200' : 'text-muted-foreground'}`}>
                      {chat.messages.length} {chat.messages.length === 1 ? 'mensagem' : 'mensagens'}
                    </p>
                  </div>
                  {chats.length > 1 && (
                    <button
                      onClick={e => { e.stopPropagation(); deleteChat(chat.id) }}
                      className={`
                        absolute right-2 p-1.5 rounded-lg transition-all duration-150 lg:opacity-0 group-hover:opacity-100
                        ${currentChatId === chat.id ? 'hover:bg-blue-950 text-blue-200 hover:text-white' : 'hover:bg-background text-muted-foreground hover:text-red-500'}
                      `}
                      title="Excluir histórico"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Área Principal do Chat */}
          <Card className="flex-1 flex flex-col border overflow-hidden bg-card shadow-sm min-w-0">
            {/* Histórico de Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-muted/5">
              {currentChat?.messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-6 text-center max-w-xl mx-auto animate-fade-in">
                  <div className="space-y-2">
                    <p className="text-lg font-bold text-foreground">Como posso guiar seu estudo hoje?</p>
                    <p className="text-xs md:text-sm text-muted-foreground max-w-sm mx-auto">
                      Pesquise textos bíblicos, conceitos teológicos ou orientações pastorais fundamentadas na Palavra.
                    </p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2.5 w-full">
                    {SUGGESTIONS.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(s.text)}
                        className="group flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card hover:border-[#0A2E4A]/40 hover:bg-[#0A2E4A]/5 text-left transition-all duration-200 shadow-sm"
                      >
                        <s.icon className="h-4 w-4 text-[#4A90A4] group-hover:text-[#0A2E4A] flex-shrink-0 transition-colors" />
                        <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground leading-snug line-clamp-2 transition-colors">
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
                    className={`flex gap-3 max-w-4xl mx-auto ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="h-8 w-8 rounded-xl bg-[#0A2E4A] text-white flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                        <Sparkles className="h-4 w-4" />
                      </div>
                    )}
                    <div className={`group max-w-[85%] sm:max-w-[75%] flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`
                        px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm transition-all duration-150
                        ${msg.role === 'user'
                          ? 'bg-[#0A2E4A] text-white rounded-tr-none font-medium'
                          : 'bg-card border border-border/80 text-foreground rounded-tl-none'}
                      `}>
                        {msg.content}
                      </div>
                      
                      {/* Painel de Ações sob a mensagem */}
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-1 lg:opacity-0 group-hover:opacity-100 transition-opacity duration-200 pl-1">
                          <span className="text-[10px] text-muted-foreground font-medium mr-2">
                            {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            onClick={() => copyMsg(msg.content, idx)}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                            title="Copiar texto"
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
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                            title="Compartilhar"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => toggleSave(idx)}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                            title={msg.saved ? 'Remover dos itens salvos' : 'Guardar referência'}
                          >
                            {msg.saved
                              ? <BookmarkCheck className="h-3.5 w-3.5 text-[#0A2E4A]" />
                              : <Bookmark className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="h-8 w-8 rounded-xl bg-muted border border-border flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-black text-foreground shadow-sm">
                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* Loader/Indicador de Digitação */}
              {loadingAI && (
                <div className="flex gap-3 max-w-4xl mx-auto justify-start animate-pulse">
                  <div className="h-8 w-8 rounded-xl bg-[#0A2E4A] flex items-center justify-center flex-shrink-0 shadow-sm text-white">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="px-4 py-3.5 bg-card border border-border/80 rounded-2xl rounded-tl-none flex items-center gap-1.5 shadow-sm">
                    <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-duration:1s]" />
                    <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-duration:1s] [animation-delay:0.15s]" />
                    <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-duration:1s] [animation-delay:0.3s]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Container de Entrada Fixado abaixo */}
            <div className="p-3 md:p-4 border-t border-border/80 bg-card flex-shrink-0">
              {usageStats && usageStats.remaining <= 5 && usageStats.remaining > 0 && (
                <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 text-center mb-2 animate-fade-in">
                  Atenção: Você possui apenas {usageStats.remaining} {usageStats.remaining === 1 ? 'consulta restante' : 'consultas restantes'} hoje.
                </p>
              )}
              <div className="flex gap-2 max-w-4xl mx-auto">
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder={usageStats?.remaining === 0 ? "Limite diário alcançado." : "Faça uma pergunta teológica ou devocional..."}
                  className="flex-1 h-11 text-sm bg-background/50 focus-visible:ring-[#0A2E4A]/20 rounded-xl"
                  maxLength={500}
                  disabled={loadingAI || usageStats?.remaining === 0}
                />
                <Button
                  onClick={() => handleSend()}
                  disabled={loadingAI || !input.trim() || usageStats?.remaining === 0}
                  className="h-11 w-11 p-0 bg-[#0A2E4A] hover:bg-[#0A2E4A]/90 text-white flex-shrink-0 rounded-xl shadow-md disabled:opacity-50"
                >
                  {loadingAI
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-2 font-medium tracking-wide">
                Respostas fundamentadas estritamente nas Sagradas Escrituras · Sola Scriptura
              </p>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  )
}

export default LogosAIPage
