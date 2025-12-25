import { useState, useRef, useEffect } from 'react'
import Layout from '../components/layout/Layout'
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
  FileText,
  Mic,
  PlusCircle,
  MoreVertical,
  Trash2,
  Edit,
} from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface Chat {
  id: string
  title: string
  messages: Message[]
  lastUpdated: Date
}

const LogosAIPage = () => {
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

  const currentChat = chats.find((c) => c.id === currentChatId)!

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [currentChat.messages])

  const suggestions = [
    { icon: BookOpen, text: 'Explique João 3:16 em contexto histórico', color: 'from-blue-500 to-cyan-500' },
    { icon: Heart, text: 'Como fortalecer minha vida de oração?', color: 'from-pink-500 to-rose-500' },
    { icon: Lightbulb, text: 'Versículos sobre esperança e fé', color: 'from-yellow-500 to-orange-500' },
    { icon: Cross, text: 'O que significa viver em santidade?', color: 'from-purple-500 to-indigo-500' },
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
        content: `🙏 Como LOGOS AI, estou aqui para ajudá-lo em sua jornada espiritual!\n\nSobre sua pergunta "${userMessage.content}":\n\nA Palavra de Deus nos ensina profundas verdades sobre este tema. Permita-me compartilhar alguns insights bíblicos:\n\n📖 **Contexto Bíblico**: A Escritura nos mostra que...\n\n💡 **Aplicação Prática**: Na sua vida diária, isso significa...\n\n🔥 **Reflexão Espiritual**: Deus deseja que você compreenda...\n\nGostaria de explorar mais algum aspecto específico desta questão?\n\n*Lembre-se: "Toda a Escritura é inspirada por Deus e útil para o ensino, para a repreensão, para a correção e para a instrução na justiça." - 2 Timóteo 3:16*`,
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

  const handleSuggestion = (text: string) => {
    setInput(text)
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
                <h2 className="text-2xl font-bold text-foreground">{t('logosAI.title')}</h2>
                <p className="text-sm text-muted-foreground">{t('logosAI.subtitle')}</p>
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
                  {t('logosAI.howCanHelp')}
                </h2>
                <p className="text-muted-foreground mb-12 max-w-2xl text-lg">
                  {t('logosAI.askQuestions')}
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
                      } p-5 shadow-md`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-line">{message.content}</p>
                      <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-white/70' : 'text-muted-foreground'}`}>
                        {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {message.role === 'user' && (
                      <div className="flex-shrink-0">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-md">
                          <span className="h-6 w-6 flex items-center justify-center text-white font-bold text-sm">
                            U
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
                  placeholder={t('logosAI.placeholder')}
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
                💡 {t('logosAI.powered')}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  )
}

export default LogosAIPage
