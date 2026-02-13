import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { useAuth } from '../hooks/useAuth'
import { useAppStore } from '../stores/appStore'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { 
  Sparkles, 
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
} from 'lucide-react'
import { toast } from 'sonner'

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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showSidebar, setShowSidebar] = useState(true)

  const isGuest = user?.role === 'guest'
  const isMember = user?.role === 'member'
  const isAdmin = user?.role === 'admin'

  const currentChat = chats.find((c) => c.id === currentChatId)!

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [currentChat.messages])

  const suggestions = [
    { 
      icon: BookOpen, 
      text: 'Explique João 3:16 em contexto histórico', 
      color: 'from-blue-500 to-cyan-500' 
    },
    { 
      icon: Heart, 
      text: 'Como fortalecer minha vida de oração?', 
      color: 'from-pink-500 to-rose-500' 
    },
    { 
      icon: Lightbulb, 
      text: 'Versículos sobre esperança em tempos difíceis', 
      color: 'from-yellow-500 to-orange-500' 
    },
    { 
      icon: Cross, 
      text: 'O que significa viver em santidade hoje?', 
      color: 'from-purple-500 to-indigo-500' 
    },
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
        c.id === currentChatId
          ? { ...c, messages: updatedMessages }
          : c
      )
    )

    toast.success(
      updatedMessages[messageIndex].saved 
        ? 'Resposta salva!' 
        : 'Resposta removida dos salvos'
    )
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    const updatedMessages = [...currentChat.messages, userMessage]
    
    setChats(
      chats.map((c) =>
        c.id === currentChatId
          ? { ...c, messages: updatedMessages, lastUpdated: new Date() }
          : c
      )
    )

    if (currentChat.messages.length === 0) {
      updateChatTitle(currentChatId, input.trim())
    }

    setInput('')
    setLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        role: 'assistant',
        content: generateBiblicalResponse(userMessage.content),
        timestamp: new Date(),
      }

      setChats(
        chats.map((c) =>
          c.id === currentChatId
            ? { ...c, messages: [...c.messages, userMessage, aiMessage] }
            : c
        )
      )
      setLoading(false)
    }, 1500)
  }

  const generateBiblicalResponse = (question: string) => {
    return `🙏 **Caminhando na Palavra de Deus**

Obrigado por sua pergunta: *"${question}"*

A Escritura nos ensina profundas verdades sobre este tema.

📖 **O que a Bíblia diz:**
A Palavra de Deus nos mostra claramente que devemos buscar sabedoria e orientação em Sua presença. "Confia no Senhor de todo o teu coração e não te estribes no teu próprio entendimento" (Provérbios 3:5).

💡 **Aplicação Prática:**
Em sua vida diária, isso significa colocar Deus em primeiro lugar em todas as decisões. A fé não é apenas crer, mas viver de acordo com a verdade revelada nas Escrituras.

🔥 **Reflexão Espiritual:**
Deus deseja que você cresça em conhecimento bíblico e maturidade espiritual. Cada pergunta é uma oportunidade de aprofundar seu relacionamento com Ele através da Palavra.

✨ **Próximos Passos:**
- Medite nas Escrituras relacionadas
- Ore pedindo sabedoria
- Busque comunhão com outros irmãos
- Aplique o que aprendeu

*"Toda a Escritura é inspirada por Deus e útil para o ensino, para a repreensão, para a correção e para a instrução na justiça." - 2 Timóteo 3:16*

Gostaria de explorar mais algum aspecto específico desta questão? 📖`
  }

  const handleSuggestion = (text: string) => {
    if (isGuest) {
      toast.error('Crie uma conta para conversar com a Logos')
      navigate('/auth')
      return
    }
    setInput(text)
  }

  if (isGuest) {
    return (
      <Layout title={t('logosAI.title')}>
        <div className="space-y-6">
          {/* Hero Banner - Guest */}
          <Card className="relative overflow-hidden border-0 shadow-2xl rounded-2xl elevation-3">
            <div className="absolute inset-0">
              <img
                src="https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=1920&h=600&fit=crop&q=80"
                alt="Logos AI"
                className="w-full h-full object-cover opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-800/96 via-purple-800/94 to-pink-800/92" />
            </div>
            
            <div className="relative z-10 p-6 md:p-10 lg:p-14 text-white">
              <div className="max-w-4xl space-y-5 md:space-y-7">
                <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-white/20 backdrop-blur-md rounded-full border border-white/30 shadow-lg">
                  <Sparkles className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="text-sm md:text-base font-bold tracking-wide">
                    LOGOS — IA CRISTÃ
                  </span>
                </div>

                <div className="space-y-4">
                  <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight">
                    Sua Companheira de{' '}
                    <span className="bg-gradient-to-r from-white via-yellow-200 to-white bg-clip-text text-transparent">
                      Caminhada Bíblica
                    </span>
                  </h1>
                  <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-medium leading-relaxed max-w-2xl">
                    Pergunte, explore e cresça na Palavra. A Logos responde baseada exclusivamente nas Escrituras Sagradas.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    size="lg"
                    onClick={() => navigate('/auth')}
                    className="bg-white text-indigo-700 hover:bg-white/95 font-bold px-7 py-6 rounded-full shadow-2xl transform hover:scale-105 transition-all"
                  >
                    <UserPlus className="mr-2 h-5 w-5" />
                    Criar Conta para Conversar
                  </Button>
                </div>

                <div className="grid md:grid-cols-2 gap-3 pt-4">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="p-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <suggestion.icon className="h-5 w-5 text-white/90" />
                        <p className="text-sm text-white/90">{suggestion.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-yellow-400/20 to-transparent rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-white/10 to-transparent rounded-full blur-3xl" />
          </Card>

          {/* Features - Guest */}
          <div className="grid md:grid-cols-3 gap-5">
            <Card className="p-6 border-2 hover:shadow-xl transition-all">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl inline-flex mb-4">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Fundamentada na Bíblia</h3>
              <p className="text-muted-foreground">Todas as respostas baseadas exclusivamente nas Escrituras Sagradas.</p>
            </Card>

            <Card className="p-6 border-2 hover:shadow-xl transition-all">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl inline-flex mb-4">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Acolhedora e Clara</h3>
              <p className="text-muted-foreground">Interface simples e linguagem pastoral, não técnica.</p>
            </Card>

            <Card className="p-6 border-2 hover:shadow-xl transition-all">
              <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl inline-flex mb-4">
                <Cross className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Ortodoxa e Responsável</h3>
              <p className="text-muted-foreground">Sem revelações extras, apenas a verdade bíblica histórica.</p>
            </Card>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={t('logosAI.title')}>
      <div className="flex h-[calc(100vh-8rem)] gap-4">
        {/* Sidebar - Chat History */}
        {showSidebar && (
          <Card className="w-72 flex-shrink-0 border-2 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border">
              <Button
                onClick={createNewChat}
                className="w-full bg-gradient-to-r from-primary to-accent text-white font-semibold"
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
                      ? 'bg-primary/10 border-2 border-primary/30'
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
        <Card className="flex-1 border-2 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-border bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="p-3 bg-gradient-to-br from-primary to-accent rounded-2xl shadow-lg">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-card" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Logos — IA Cristã</h2>
                <p className="text-sm text-muted-foreground">Sua companheira de caminhada bíblica</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {currentChat.messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="p-6 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl mb-6">
                  <Sparkles className="h-20 w-20 text-primary" />
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-3">
                  Como posso ajudá-lo hoje?
                </h2>
                <p className="text-muted-foreground mb-12 max-w-2xl text-lg">
                  Faça perguntas sobre a Bíblia, busque orientação espiritual ou explore a Palavra de Deus.
                </p>

                {/* Suggestions */}
                <div className="grid md:grid-cols-2 gap-4 w-full max-w-3xl">
                  {suggestions.map((suggestion, index) => (
                    <Card
                      key={index}
                      onClick={() => handleSuggestion(suggestion.text)}
                      className="p-6 cursor-pointer hover:shadow-2xl transition-all border-2 hover:border-primary/50 hover:-translate-y-1 transform group"
                    >
                      <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${suggestion.color} mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                        <suggestion.icon className="h-7 w-7 text-white" />
                      </div>
                      <p className="text-sm text-foreground font-medium leading-relaxed">
                        {suggestion.text}
                      </p>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {currentChat.messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0">
                        <div className="p-2 bg-gradient-to-br from-primary to-accent rounded-xl shadow-md">
                          <Sparkles className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    )}
                    
                    <div
                      className={`max-w-[75%] ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-primary to-accent text-white rounded-2xl rounded-tr-sm'
                          : 'bg-muted text-foreground rounded-2xl rounded-tl-sm'
                      } p-5 shadow-md relative group`}
                    >
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <p className="leading-relaxed whitespace-pre-line">{message.content}</p>
                      </div>
                      <div className={`flex items-center justify-between mt-3 pt-2 border-t ${message.role === 'user' ? 'border-white/20' : 'border-border/50'}`}>
                        <div className={`text-xs ${message.role === 'user' ? 'text-white/70' : 'text-muted-foreground'}`}>
                          {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {message.role === 'assistant' && (
                          <button
                            onClick={() => toggleSaveMessage(index)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-primary/10 rounded"
                          >
                            {message.saved ? (
                              <BookmarkCheck className="h-4 w-4 text-primary" />
                            ) : (
                              <Bookmark className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {message.role === 'user' && (
                      <div className="flex-shrink-0">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-md">
                          <span className="h-6 w-6 flex items-center justify-center text-white font-bold text-sm">
                            {user?.username?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-4">
                    <div className="p-2 bg-gradient-to-br from-primary to-accent rounded-xl shadow-md">
                      <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <div className="bg-muted p-5 rounded-2xl rounded-tl-sm shadow-md">
                      <div className="flex gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="p-6 border-t border-border bg-muted/30">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Faça sua pergunta bíblica..."
                  className="min-h-[48px] text-base resize-none"
                  disabled={loading}
                />
              </div>
              <Button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                size="icon"
                className="h-12 w-12 bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                ) : (
                  <Send className="h-6 w-6 text-white" />
                )}
              </Button>
            </div>
            
            {/* Info */}
            <div className="mt-3 text-center">
              <p className="text-xs text-muted-foreground">
                📖 Todas as respostas baseadas exclusivamente nas Escrituras Sagradas
              </p>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  )
}

export default LogosAIPage
