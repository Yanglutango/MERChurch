
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { useAuth } from '../hooks/useAuth'
import { useAppStore } from '../stores/appStore'
import { supabase } from '../lib/supabase'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button' 
import { // Added 'import {' here
  Send, 
  Loader2, 
  BookOpen, 
  Heart, 
  Lightbulb,
  Cross,
  PlusCircle,
  Trash2,
  Bookmark,
  BookmarkCheck,
  UserPlus,
  Copy,
  Check,
  Share2,
  ChevronRight,
  Flame,
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

const LogosAIPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useAppStore()
  const [chats, setChats] = useState<Chat[]>([
    {
      id: '1',
      title: 'Nova Conversa',
      messages: [],
      lastUpdated: new Date(),
    },
  ])
  const [currentChatId, setCurrentChatId] = useState('1')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showSidebar, setShowSidebar] = useState(true)
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)

  const isGuest = user?.role === 'guest'

  const currentChat = chats.find((c) => c.id === currentChatId)!

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [currentChat.messages])

  useEffect(() => {
    if (!isGuest) {
      loadUsageStats()
    }
  }, [])

  const loadUsageStats = async () => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const { count } = await supabase
        .from('logos_usage')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .gte('created_at', today.toISOString())

      setUsageStats({
        used: count || 0,
        limit: 50,
        remaining: 50 - (count || 0),
      })
    } catch (error) {
      console.error('Error loading usage stats:', error)
    }
  }

  const suggestions = [
    { icon: BookOpen, text: 'O que significa graça na Bíblia?', category: 'Doutrina' },
    { icon: Heart, text: 'Como vencer a ansiedade segundo as Escrituras?', category: 'Vida Cristã' },
    { icon: Lightbulb, text: 'Como discernir a vontade de Deus?', category: 'Discernimento' },
    { icon: Cross, text: 'Explique a salvação pela graça', category: 'Evangelho' },
  ]

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'Nova Conversa',
      messages: [],
      lastUpdated: new Date(),
    }
    setChats([...chats, newChat])
    setCurrentChatId(newChat.id)
  }

  const deleteChat = (chatId: string) => {
    if (chats.length === 1) return
    const filtered = chats.filter((c) => c.id !== chatId)
    setChats(filtered)
    if (currentChatId === chatId) {
      setCurrentChatId(filtered[0].id)
    }
  }

  const updateChatTitle = (chatId: string, firstMessage: string) => {
    const title = firstMessage.slice(0, 30) + (firstMessage.length > 30 ? '...' : '')
    setChats(chats.map((c) => (c.id === chatId ? { ...c, title } : c)))
  }

  const toggleSaveMessage = (messageIndex: number) => {
    const updatedMessages = [...currentChat.messages]
    updatedMessages[messageIndex].saved = !updatedMessages[messageIndex].saved
    
    setChats(
      chats.map((c) =>
        c.id === currentChatId ? { ...c, messages: updatedMessages } : c
      )
    )

    toast.success(
      updatedMessages[messageIndex].saved ? 'Resposta salva!' : 'Resposta removida dos salvos'
    )
  }

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      toast.success('Texto copiado!')
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (error) {
      toast.error('Erro ao copiar texto')
    }
  }

  const shareMessage = (content: string) => {
    if (navigator.share) {
      navigator.share({ title: 'Logos - MER', text: content }).catch(() => {})
    } else {
      copyToClipboard(content, -1)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return

    if (usageStats && usageStats.remaining <= 0) {
      toast.error(`Limite diário atingido (${usageStats.limit} mensagens/dia). Tente novamente amanhã.`, { duration: 6000 })
      return
    }

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    const updatedMessages = [...currentChat.messages, userMessage]
    
    setChats(
      chats.map((c) =>
        c.id === currentChatId ? { ...c, messages: updatedMessages, lastUpdated: new Date() } : c
      )
    )

    if (currentChat.messages.length === 0) {
      updateChatTitle(currentChatId, input.trim())
    }

    setInput('')
    setLoading(true)

    // Use AI Router — provider-agnostic, handles fallback automatically
    const result = await routeAIRequest({
      messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
      userId: user!.id,
      topic: userMessage.content.slice(0, 60),
    })

    if (result.error === 'quota_exceeded') {
      setUsageStats(prev => prev ? { ...prev, remaining: 0 } : null)
      toast.error('Limite diário atingido. Volte amanhã! "Cada dia tem o seu próprio afã." Mateus 6:34', { duration: 8000 })
      setChats(chats.map(c => c.id === currentChatId ? { ...c, messages: c.messages.slice(0, -1) } : c))
      setLoading(false)
      return
    }

    const aiMessage: Message = {
      role: 'assistant',
      content: result.content,
      timestamp: new Date(),
    }

    setChats(
      chats.map((c) =>
        c.id === currentChatId ? { ...c, messages: [...updatedMessages, aiMessage] } : c
      )
    )

    if (!result.success) {
      toast.warning('Logos está temporariamente com lentidão. A resposta pode ser limitada.', { duration: 4000 })
    } else {
      loadUsageStats()
    }

    setLoading(false)
  }

  const handleSuggestion = (text: string) => {
    if (isGuest) {
      toast.error('Crie uma conta para conversar com a Logos')
      navigate('/auth')
      return
    }
    // Set input directly — no setTimeout needed, state updates are synchronous here
    setInput(text)
  }

  if (isGuest) {
    return (
      <Layout title="Logos by KAIRÓS">
        <div className="max-w-5xl mx-auto space-y-8 py-8">
          {/* Spiritual Header - Guest */}
          <div className="text-center space-y-6 py-12">
            <div className="inline-flex items-center justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 rounded-2xl blur-xl opacity-30 animate-pulse" />
                <div className="relative p-5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-2xl">
                  <Flame className="h-12 w-12 text-white" />
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h1 className="text-4xl md:text-6xl font-bold text-foreground tracking-tight">
                Logos
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground font-medium">
                Sabedoria à Luz das Escrituras
              </p>
              <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Faça perguntas, explore as Escrituras e aprofunde sua caminhada com Deus.
              </p>
            </div>

            <Button
              size="lg"
              onClick={() => navigate('/auth')}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold px-8 py-6 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all"
            >
              <UserPlus className="mr-2 h-5 w-5" />
              Criar Conta para Conversar
            </Button>
          </div>

          {/* Sugestões de Perguntas - Guest */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-muted-foreground text-center">Exemplos de Perguntas</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {suggestions.map((suggestion, index) => (
                <Card
                  key={index}
                  className="group p-6 border-2 hover:border-amber-500/50 hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => navigate('/auth')}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-xl group-hover:scale-110 transition-transform">
                      <suggestion.icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">
                        {suggestion.category}
                      </div>
                      <p className="text-sm font-medium text-foreground leading-relaxed">
                        {suggestion.text}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Features - Guest */}
          <div className="grid md:grid-cols-3 gap-6 pt-8">
            <div className="text-center space-y-3">
              <div className="inline-flex p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl">
                <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Fundamentada na Bíblia</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Todas as respostas baseadas exclusivamente nas Escrituras Sagradas.</p>
            </div>

            <div className="text-center space-y-3">
              <div className="inline-flex p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl">
                <Heart className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Acolhedora e Clara</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Interface elegante e linguagem pastoral, não técnica.</p>
            </div>

            <div className="text-center space-y-3">
              <div className="inline-flex p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl">
                <Cross className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Ortodoxa e Responsável</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Sem revelações extras, apenas a verdade bíblica histórica.</p>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Logos by KAIRÓS">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Spiritual Header */}
        <div className="text-center space-y-4 py-8">
          <div className="inline-flex items-center justify-center mb-2">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 rounded-2xl blur-xl opacity-20 animate-pulse" />
              <div className="relative p-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-xl">
                <Flame className="h-10 w-10 text-white" />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl md:text-5xl font-bold text-foreground tracking-tight">
              Logos
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground font-medium">
              Sabedoria à Luz das Escrituras
            </p>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Faça perguntas, explore as Escrituras e aprofunde sua caminhada com Deus.
            </p>
          </div>

          {/* Usage Indicator */}
          {usageStats && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full border border-border">
              <div className={`h-2 w-2 rounded-full ${
                usageStats.remaining > 10 ? 'bg-green-500' : usageStats.remaining > 0 ? 'bg-orange-500' : 'bg-red-500'
              }`} />
              <span className="text-xs font-medium text-muted-foreground">
                {usageStats.remaining} {usageStats.remaining === 1 ? 'pergunta restante' : 'perguntas restantes'} hoje
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-6">
          {/* Sidebar - Chat History */}
          {showSidebar && (
            <Card className="w-80 flex-shrink-0 border-2 flex flex-col overflow-hidden rounded-2xl shadow-lg" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              <div className="p-4 border-b border-border bg-muted/30">
                <Button
                  onClick={createNewChat}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-md"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Nova Conversa
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => setCurrentChatId(chat.id)}
                    className={`group p-3 rounded-lg cursor-pointer transition-all mb-1 ${
                      currentChatId === chat.id
                        ? 'bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-500/30'
                        : 'hover:bg-muted border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-foreground truncate">
                          {chat.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {chat.messages.length} mensagens
                        </div>
                      </div>
                      {chats.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteChat(chat.id)
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-opacity"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Main Chat Area */}
          <Card className="flex-1 border-2 flex flex-col overflow-hidden rounded-2xl shadow-lg" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-gradient-to-b from-background via-muted/5 to-background">
              {currentChat.messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4 py-12">
                  <div className="mb-8">
                    <div className="relative inline-flex">
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 rounded-3xl blur-2xl opacity-20 animate-pulse" />
                      <div className="relative p-8 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-3xl">
                        <Flame className="h-20 w-20 text-amber-600 dark:text-amber-400" />
                      </div>
                    </div>
                  </div>
                  
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                    Como posso ajudá-lo hoje?
                  </h2>
                  <p className="text-muted-foreground mb-12 max-w-lg leading-relaxed">
                    Faça perguntas sobre a Bíblia, busque orientação espiritual ou explore a Palavra de Deus.
                  </p>

                  {/* Suggestions */}
                  <div className="grid md:grid-cols-2 gap-4 w-full max-w-3xl">
                    {suggestions.map((suggestion, index) => (
                      <Card
                        key={index}
                        onClick={() => handleSuggestion(suggestion.text)}
                        className="group p-6 cursor-pointer hover:shadow-xl transition-all border-2 hover:border-amber-500/50 hover:-translate-y-1 transform rounded-xl"
                      >
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-xl group-hover:scale-110 transition-transform">
                            <suggestion.icon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className="flex-1 text-left">
                            <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">
                              {suggestion.category}
                            </div>
                            <p className="text-sm font-medium text-foreground leading-relaxed">
                              {suggestion.text}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {/* Conversation Start Indicator */}
                  <div className="flex items-center gap-3 py-4">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                    <div className="text-xs font-medium text-muted-foreground px-3 py-1 bg-muted/50 rounded-full">
                      Início da conversa
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                  </div>
                  
                  {currentChat.messages.map((message, index) => (
                    <div key={index} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                      {message.role === 'user' ? (
                        // User Message - Compact
                        <div className="flex justify-end gap-3 mb-8">
                          <div className="max-w-[80%] bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl rounded-tr-md px-5 py-3 shadow-md">
                            <p className="text-sm leading-relaxed">{message.content}</p>
                          </div>
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-md flex items-center justify-center">
                              <span className="text-white font-bold text-sm">
                                {user?.username?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Assistant Message - Elegant Card
                        <div className="flex gap-4 mb-8">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-md flex items-center justify-center">
                              <Flame className="h-5 w-5 text-white" />
                            </div>
                          </div>
                          
                          <Card className="flex-1 border-2 shadow-lg hover:shadow-xl transition-all rounded-2xl overflow-hidden group animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="p-7 space-y-5">
                              {/* Main Response */}
                              <div className="prose prose-sm dark:prose-invert max-w-none">
                                <p className="text-foreground leading-[1.75] whitespace-pre-line text-[15px]">
                                  {message.content}
                                </p>
                              </div>

                              {/* Biblical Foundation Badge */}
                              <div className="pt-4 border-t border-border/50">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border-2 border-amber-200 dark:border-amber-800 rounded-xl shadow-sm">
                                  <BookOpen className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300 tracking-wide">
                                    📖 Baseado nas Escrituras Sagradas
                                  </span>
                                </div>
                              </div>

                              {/* Actions Footer */}
                              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                                <div className="text-xs text-muted-foreground">
                                  {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => copyToClipboard(message.content, index)}
                                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                                    title="Copiar texto"
                                  >
                                    {copiedIndex === index ? (
                                      <Check className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <Copy className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => shareMessage(message.content)}
                                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                                    title="Compartilhar"
                                  >
                                    <Share2 className="h-4 w-4 text-muted-foreground" />
                                  </button>
                                  <button
                                    onClick={() => toggleSaveMessage(index)}
                                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                                    title={message.saved ? 'Remover dos salvos' : 'Salvar resposta'}
                                  >
                                    {message.saved ? (
                                      <BookmarkCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    ) : (
                                      <Bookmark className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </Card>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {loading && (
                    <div className="flex gap-4 mb-8 animate-in fade-in duration-700">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-md flex items-center justify-center animate-pulse">
                          <Flame className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      
                      <Card className="flex-1 border-2 shadow-lg rounded-2xl p-7 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/30">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="flex gap-1.5">
                              <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-bounce" />
                              <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                              <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                            </div>
                            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                              Logos está refletindo nas Escrituras...
                            </span>
                          </div>
                          {/* Cursor piscando */}
                          <div className="h-5 w-0.5 bg-amber-500 animate-pulse" />
                        </div>
                      </Card>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input Area - Fixed at Bottom */}
            <div className="p-6 border-t-2 border-border bg-background">
              {/* Sugestões Rápidas */}
              {currentChat.messages.length === 0 && (
                <div className="mb-4">
                  <div className="text-xs font-semibold text-muted-foreground mb-2">Sugestões:</div>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.slice(0, 3).map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestion(suggestion.text)}
                        className="px-3 py-1.5 bg-muted hover:bg-muted/80 border border-border rounded-full text-xs font-medium text-foreground transition-colors"
                      >
                        {suggestion.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Usage Warning */}
              {usageStats && usageStats.remaining <= 5 && usageStats.remaining > 0 && (
                <div className="mb-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl text-center">
                  <p className="text-xs text-orange-700 dark:text-orange-300 font-medium">
                    ⚠️ Restam apenas {usageStats.remaining} {usageStats.remaining === 1 ? 'pergunta' : 'perguntas'} hoje
                  </p>
                </div>
              )}
              
              {/* Input Field */}
              <div className="relative">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Faça uma pergunta sobre fé, Bíblia ou vida cristã..."
                  className="w-full h-16 text-base pl-6 pr-16 rounded-3xl border-2 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 shadow-lg transition-all"
                  disabled={loading || (usageStats?.remaining === 0)}
                />
                <Button
                  onClick={handleSend}
                  disabled={loading || !input.trim() || (usageStats?.remaining === 0)}
                  size="icon"
                  className="absolute right-2 top-2 h-12 w-12 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  ) : (
                    <Send className="h-5 w-5 text-white" />
                  )}
                </Button>
              </div>
              
              {/* Footer Info */}
              <div className="mt-3 flex items-center justify-center gap-2 text-center">
                <BookOpen className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <p className="text-xs text-muted-foreground">
                  Baseada exclusivamente nas Escrituras Sagradas • Sola Scriptura
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  )
}

export default LogosAIPage
