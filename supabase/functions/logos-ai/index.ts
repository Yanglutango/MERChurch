// Logos AI - Christian AI Assistant powered by OpenAI
// Exclusively based on Biblical Scripture

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Rate limiting: 50 messages per day per user
const DAILY_LIMIT = 50

const SYSTEM_PROMPT = `Você é a Logos, uma assistente de IA cristã da Missão Evangélica da Reconciliação (MER).

═══ IDENTIDADE E AUTORIDADE ═══
✓ Sua ÚNICA autoridade é a Bíblia Sagrada (Sola Scriptura)
✓ Você segue a Teologia Bíblica histórica ortodoxa
✓ Você é interdenominacional e neutra em questões secundárias  
✓ Cristo e o Evangelho são sempre o centro de tudo

═══ LIMITES ABSOLUTOS ═══
✗ NÃO substitui orientação pastoral ou liderança humana
✗ NÃO oferece aconselhamento clínico, médico ou psicológico
✗ NÃO vai além do que está revelado nas Escrituras
✗ NÃO especula sobre profecias futuras ou datas
✗ NÃO cria doutrinas ou revelações extras
✗ NÃO dá respostas que exigem discernimento pastoral direto

═══ ESTILO DE COMUNICAÇÃO ═══
• Linguagem pastoral, acolhedora e profundamente respeitosa
• Tom reverente mas acessível e humano
• Respostas organizadas e estruturadas com clareza
• Use emojis bíblicos discretos quando apropriado (📖, 🙏, ✝️, ❤️, 🕊️)
• SEMPRE cite versículos específicos com livro, capítulo e versículo

═══ ESTRUTURA DE RESPOSTA IDEAL ═══
Quando apropriado, organize assim:

**📖 Resposta Direta**  
Aborde a pergunta com clareza e objetividade

**✝️ Fundamento Bíblico**  
Cite versículos específicos com contexto histórico e teológico

**❤️ Aplicação Prática**  
Como viver essa verdade hoje, de forma concreta

**🙏 Convite à Reflexão**  
Pergunta ou desafio para meditação pessoal

═══ DIVERGÊNCIAS TEOLÓGICAS ═══
Quando houver divergências históricas legítimas:
• Apresente as principais perspectivas com equilíbrio
• Fundamente CADA posição nas Escrituras
• Explique o contexto histórico de cada visão
• Mantenha humildade e clareza
• Nunca force posicionamento denominacional

═══ REDIRECIONAMENTO PASTORAL ═══
Quando a pergunta exigir:
• Perguntas fora do escopo cristão → redirecione educadamente ao propósito da Logos
• Crises espirituais ou emocionais urgentes → indique busca por liderança pastoral humana
• Questões médicas, legais ou financeiras → oriente profissionais qualificados
• Dúvidas sobre revelações/sonhos → encaminhe para discernimento pastoral presencial

═══ PRINCÍPIOS IMUTÁVEIS ═══
1. A Bíblia é a autoridade final absoluta
2. Cristo é o centro de toda resposta
3. O Espírito Santo guia, você auxilia
4. Humildade acima de certeza absoluta
5. Amor e verdade sempre juntos

Responda com sabedoria bíblica, clareza pastoral e amor cristão genuíno. 🕊️`

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface RequestBody {
  messages: Message[]
  userId: string
  stream?: boolean
}

// Check daily usage limit
async function checkUsageLimit(userId: string): Promise<{ allowed: boolean; used: number; limit: number }> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const { count, error } = await supabase
    .from('logos_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', today.toISOString())
  
  const used = count || 0
  const allowed = used < DAILY_LIMIT
  
  return { allowed, used, limit: DAILY_LIMIT }
}

// Log usage for analytics (without storing message content)
async function logUsage(userId: string, topic: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  await supabase.from('logos_usage').insert({
    user_id: userId,
    topic: topic, // Just the topic/category, not the full message
  })
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages, userId, stream = false }: RequestBody = await req.json()

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check usage limit
    const usageStatus = await checkUsageLimit(userId)
    if (!usageStatus.allowed) {
      return new Response(
        JSON.stringify({ 
          error: `Limite diário atingido (${usageStatus.limit} mensagens/dia). Tente novamente amanhã ou contate a administração.`,
          usageLimit: true,
          used: usageStatus.used,
          limit: usageStatus.limit
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare messages with system prompt
    const apiMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.slice(-10), // Keep last 10 messages for context
    ]

    const lastUserMessage = messages[messages.length - 1]?.content || 'geral'
    const topic = lastUserMessage.slice(0, 50) // First 50 chars for analytics

    console.log(`[Logos AI] Request from user ${userId}, messages: ${messages.length}, used: ${usageStatus.used}/${usageStatus.limit}`)

    // Call OpenAI API
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Cost-effective and high quality
        messages: apiMessages,
        temperature: 0.7, // Balanced creativity and consistency
        max_tokens: 1500,
        top_p: 0.9,
        frequency_penalty: 0.3,
        presence_penalty: 0.3,
        stream: stream,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Logos AI] OpenAI API error:', response.status, errorText)
      
      // Handle specific error codes
      if (response.status === 429) {
        throw new Error('OpenAI: Limite de uso excedido. Por favor, verifique sua quota/créditos em platform.openai.com ou aguarde alguns minutos.')
      } else if (response.status === 401) {
        throw new Error('OpenAI: Chave API inválida ou expirada.')
      } else if (response.status === 500 || response.status === 503) {
        throw new Error('OpenAI: Serviço temporariamente indisponível. Tente novamente em alguns instantes.')
      } else {
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
      }
    }

    // If streaming, return the stream
    if (stream) {
      // Log usage
      await logUsage(userId, topic)
      
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // Non-streaming response
    const data = await response.json()
    const assistantMessage = data.choices[0].message.content

    // Log usage
    await logUsage(userId, topic)

    console.log(`[Logos AI] Response generated successfully`)

    return new Response(
      JSON.stringify({
        success: true,
        message: assistantMessage,
        model: data.model,
        usage: data.usage,
        usageStatus: {
          used: usageStatus.used + 1,
          limit: usageStatus.limit,
          remaining: usageStatus.limit - usageStatus.used - 1,
        },
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('[Logos AI] Error:', error)
    
    // Return user-friendly error message
    const errorMessage = error.message || 'Erro ao processar sua pergunta. Por favor, tente novamente.'
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
