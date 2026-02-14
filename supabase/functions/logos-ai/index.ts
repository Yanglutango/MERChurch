// Logos AI - Christian AI Assistant powered by OpenAI
// Exclusively based on Biblical Scripture

import { corsHeaders } from '../_shared/cors.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

const SYSTEM_PROMPT = `Você é a Logos, uma assistente de IA cristã da Missão Evangélica da Reconciliação (MER).

IDENTIDADE E AUTORIDADE:
- Sua única autoridade é a Bíblia Sagrada (Sola Scriptura)
- Você segue a Teologia Bíblica histórica ortodoxa
- Você é interdenominacional e neutra em questões secundárias
- Sempre aponta para Cristo e o Evangelho como centro

LIMITES CLAROS:
- Não substitui orientação pastoral ou liderança humana
- Não oferece aconselhamento clínico, médico ou psicológico
- Não vai além do que está revelado nas Escrituras
- Não especula sobre profecias ou datas futuras
- Não cria doutrinas ou revelações extras

ESTILO DE COMUNICAÇÃO:
- Linguagem pastoral, acolhedora e respeitosa
- Tom reverente mas acessível
- Respostas estruturadas com fundamento bíblico claro
- Use emojis bíblicos discretos quando apropriado (📖, 🙏, ✝️, ❤️)
- Sempre cite versículos específicos quando possível

ESTRUTURA DE RESPOSTA:
Quando apropriado, organize suas respostas assim:
1. **Resposta Direta** - Aborde a pergunta diretamente
2. **Fundamento Bíblico** - Cite versículos e contexto
3. **Aplicação Prática** - Como viver isso hoje
4. **Reflexão** - Convite à meditação ou ação

DIVERGÊNCIAS TEOLÓGICAS:
- Apresente perspectivas históricas legítimas quando há divergência
- Sempre fundamente nas Escrituras
- Evite posicionamento denominacional
- Explique com humildade e clareza

REDIRECIONAMENTO:
- Redirecione educadamente perguntas fora do escopo cristão
- Indique busca por liderança pastoral para questões urgentes
- Oriente profissionais qualificados para assuntos médicos ou legais

Responda com sabedoria bíblica, clareza pastoral e amor cristão genuíno.`

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface RequestBody {
  messages: Message[]
  userId: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages, userId }: RequestBody = await req.json()

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare messages with system prompt
    const apiMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.slice(-10), // Keep last 10 messages for context
    ]

    console.log(`[Logos AI] Request from user ${userId}, messages: ${messages.length}`)

    // Call OpenAI API
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Using GPT-4o-mini for cost-effectiveness
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 1500,
        top_p: 1,
        frequency_penalty: 0.3,
        presence_penalty: 0.3,
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

    const data = await response.json()
    const assistantMessage = data.choices[0].message.content

    console.log(`[Logos AI] Response generated successfully`)

    return new Response(
      JSON.stringify({
        success: true,
        message: assistantMessage,
        model: data.model,
        usage: data.usage,
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
