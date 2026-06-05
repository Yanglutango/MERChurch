// Multicaixa Express Payment Integration
// Handles payment reference generation and webhook confirmations

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const multicaixaApiKey = Deno.env.get('MULTICAIXA_API_KEY') || ''
const multicaixaApiUrl = Deno.env.get('MULTICAIXA_API_URL') || 'https://api.multicaixa.ao/v1'

// Whether to use sandbox/simulation mode when no real API key is provided
const SIMULATION_MODE = !multicaixaApiKey || multicaixaApiKey === 'sandbox'

interface PaymentRequest {
  action: 'generate'
  userId: string
  amount: number
  type: 'tithe' | 'offering' | 'donation' | 'project'
  description?: string
}

interface WebhookPayload {
  reference: string
  status: 'completed' | 'failed'
  amount: number
  transactionId: string
}

// Generate a realistic-looking Multicaixa reference
function generateSimulatedReference(): string {
  const num = Math.floor(100000000 + Math.random() * 900000000).toString()
  return `${num.slice(0, 3)} ${num.slice(3, 6)} ${num.slice(6, 9)}`
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const body = await req.json()
    const { action } = body

    // ── Generate Payment Reference ─────────────────────────────────────────
    if (action === 'generate') {
      const { userId, amount, type, description }: PaymentRequest = body

      if (!userId || !amount || amount <= 0) {
        return new Response(
          JSON.stringify({ error: 'Dados de pagamento inválidos' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (amount < 100) {
        return new Response(
          JSON.stringify({ error: 'Valor mínimo é Kz 100,00' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create pending transaction in database
      const { data: transaction, error: dbError } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          amount,
          type,
          method: 'multicaixa',
          status: 'pending',
          description: description || '',
        })
        .select()
        .single()

      if (dbError || !transaction) {
        console.error('Database error:', dbError)
        return new Response(
          JSON.stringify({ error: 'Erro ao criar transação' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      let referenceData: { reference: string; transaction_id?: string; expires_at?: string }

      if (SIMULATION_MODE) {
        // ── SIMULATION MODE — Generate realistic reference without real API ──
        console.log('[Multicaixa] SIMULATION MODE — generating test reference')
        const reference = generateSimulatedReference()
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 min

        referenceData = {
          reference,
          transaction_id: `SIM-${transaction.id.slice(0, 8).toUpperCase()}`,
          expires_at: expiresAt,
        }

        // In simulation, auto-confirm after 30 seconds for demo purposes
        // (In production this would come via webhook)
        setTimeout(async () => {
          await supabase
            .from('transactions')
            .update({
              status: 'completed',
              payment_reference: reference,
              multicaixa_transaction_id: referenceData.transaction_id,
              updated_at: new Date().toISOString(),
            })
            .eq('id', transaction.id)
          console.log('[Multicaixa] Simulation: auto-confirmed transaction', transaction.id)
        }, 30_000)

      } else {
        // ── PRODUCTION MODE — Call real Multicaixa Express API ───────────────
        console.log('[Multicaixa] PRODUCTION MODE — calling real API')
        const multicaixaResponse = await fetch(`${multicaixaApiUrl}/payments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${multicaixaApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount,
            currency: 'AOA',
            description: `KAIRÓS MER - ${type}`,
            reference: transaction.id,
            callback_url: `${supabaseUrl}/functions/v1/multicaixa-payment`,
          }),
        })

        if (!multicaixaResponse.ok) {
          const errText = await multicaixaResponse.text()
          console.error('[Multicaixa] API error:', errText)

          await supabase
            .from('transactions')
            .update({ status: 'failed' })
            .eq('id', transaction.id)

          return new Response(
            JSON.stringify({ error: `Multicaixa: ${errText}` }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        referenceData = await multicaixaResponse.json()
      }

      // Update transaction with reference
      await supabase
        .from('transactions')
        .update({
          payment_reference: referenceData.reference,
          multicaixa_transaction_id: referenceData.transaction_id || null,
        })
        .eq('id', transaction.id)

      console.log(`[Multicaixa] Reference generated: ${referenceData.reference} for transaction ${transaction.id}`)

      return new Response(
        JSON.stringify({
          success: true,
          reference: referenceData.reference,
          transactionId: transaction.id,
          amount,
          expiresAt: referenceData.expires_at || null,
          simulation: SIMULATION_MODE,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Webhook — Payment Confirmation from Multicaixa ─────────────────────
    if (body.reference && body.status) {
      const payload: WebhookPayload = body
      console.log('[Multicaixa] Webhook received:', payload)

      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          status: payload.status,
          multicaixa_transaction_id: payload.transactionId,
          updated_at: new Date().toISOString(),
        })
        .eq('payment_reference', payload.reference)

      if (updateError) {
        console.error('[Multicaixa] Failed to update transaction:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to update transaction' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Action not recognized. Use action: "generate" or send a webhook payload.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[Multicaixa] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
