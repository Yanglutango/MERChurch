// Logos AI - Christian AI Assistant powered by OnSpace AI
// Exclusively based on Biblical Scripture

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const ONSPACE_AI_API_KEY = Deno.env.get('ONSPACE_AI_API_KEY')
const ONSPACE_AI_BASE_URL = Deno.env.get('ONSPACE_AI_BASE_URL')
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

async function checkUsageLimit(userId: string): Promise<{ allowed: boolean; used: number; limit: number }> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { count } = await supabase
    .from('logos_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', today.toISOString())
  const used = count || 0
  return { allowed: used < DAILY_LIMIT, used, limit: DAILY_LIMIT }
}

async function logUsage(userId: string, topic: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  await supabase.from('logos_usage').insert({ user_id: userId, topic })
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!ONSPACE_AI_API_KEY || !ONSPACE_AI_BASE_URL) {
    return new Response(
      JSON.stringify({ error: 'Serviço de IA não configurado. Contacte o administrador.' }),
      { status: 503, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
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
          error: `Limite diário atingido (${usageStatus.limit} mensagens/dia). Tente novamente amanhã.`,
          usageLimit: true,
          used: usageStatus.used,
          limit: usageStatus.limit,
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare messages with system prompt
    const apiMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.slice(-10),
    ]

    const lastUserMessage = messages[messages.length - 1]?.content || 'geral'
    const topic = lastUserMessage.slice(0, 50)

    console.log(`[Logos AI] Request from user ${userId}, messages: ${messages.length}, used: ${usageStatus.used}/${usageStatus.limit}`)

    // Call OnSpace AI
    const response = await fetch(`${ONSPACE_AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ONSPACE_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: apiMessages,
        stream,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Logos AI] OnSpace AI error:', response.status, errorText)
      throw new Error(`OnSpace AI error: ${response.status} - ${errorText}`)
    }

    // Streaming response
    if (stream) {
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
    const assistantMessage = data.choices?.[0]?.message?.content || ''

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
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[Logos AI] Error:', error)
    const errorMessage = error.message || 'Erro ao processar sua pergunta. Tente novamente.'
    return new Response(
      JSON.stringify({ error: errorMessage, timestamp: new Date().toISOString() }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
