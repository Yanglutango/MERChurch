/**
 * AI Gateway Layer — AI Router
 * 
 * Central service that routes all AI calls through a single interface.
 * Providers (OpenAI via Edge Function, fallback messages) can be
 * switched without changing any page-level code.
 */

export type AIProvider = 'logos-edge' | 'fallback'

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AIRequest {
  messages: AIMessage[]
  userId: string
  topic?: string
  stream?: boolean
}

export interface AIResponse {
  content: string
  provider: AIProvider
  success: boolean
  error?: string
  tokensUsed?: number
}

async function callLogosEdge(request: AIRequest): Promise<AIResponse> {
  const { supabase } = await import('./supabase')

  const { data, error } = await supabase.functions.invoke('logos-ai', {
    body: {
      messages: request.messages,   // array completo — corrigido
      userId: request.userId,
      stream: false,
    },
  })

  if (error) {
    const { FunctionsHttpError } = await import('@supabase/supabase-js')
    let errorMessage = error.message
    if (error instanceof FunctionsHttpError) {
      try {
        const text = await error.context?.text()
        errorMessage = text || error.message
      } catch {
        errorMessage = error.message
      }
    }
    throw new Error(errorMessage)
  }

  // Edge function retorna { message: string } — lê todos os campos possíveis
  const content = data?.message || data?.response || data?.content || ''

  return {
    content,
    provider: 'logos-edge',
    success: true,
  }
}

function callFallback(request: AIRequest): AIResponse {
  const lastMessage = request.messages[request.messages.length - 1]?.content || ''
  console.warn('[AIRouter] Using fallback — logos-edge unavailable')
  return {
    content: `📖 Estou momentaneamente indisponível. Por favor, tente novamente em alguns instantes.\n\n"A palavra de Deus é viva e eficaz..." (Hebreus 4:12)\n\nSua pergunta: "${lastMessage.slice(0, 100)}${lastMessage.length > 100 ? '...' : ''}"`,
    provider: 'fallback',
    success: false,
    error: 'Primary provider unavailable',
  }
}

export async function routeAIRequest(request: AIRequest): Promise<AIResponse> {
  try {
    return await callLogosEdge(request)
  } catch (err: any) {
    console.warn('[AIRouter] logos-edge failed:', err.message)
    if (
      err.message?.includes('429') ||
      err.message?.includes('quota') ||
      err.message?.includes('limite')
    ) {
      return {
        content: '⚠️ Você atingiu o limite diário de perguntas. Volte amanhã. "Cada dia tem o seu próprio afã." (Mateus 6:34)',
        provider: 'logos-edge',
        success: false,
        error: 'quota_exceeded',
      }
    }
    return callFallback(request)
  }
}

export async function routeAIStream(request: AIRequest): Promise<ReadableStream | null> {
  try {
    const { supabase } = await import('./supabase')
    const { data: { session } } = await supabase.auth.getSession()
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/logos-ai`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          messages: request.messages,
          userId: request.userId,
          stream: true,
        }),
      }
    )
    if (!response.ok || !response.body) return null
    return response.body
  } catch (err) {
    console.warn('[AIRouter] Stream failed:', err)
    return null
  }
}
