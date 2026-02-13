// Multicaixa Express Payment Integration
// Handles payment reference generation and webhook confirmations

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const multicaixaApiKey = Deno.env.get('MULTICAIXA_API_KEY')!
const multicaixaApiUrl = Deno.env.get('MULTICAIXA_API_URL') || 'https://api.multicaixa.ao/v1'

interface PaymentRequest {
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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const url = new URL(req.url)
    const path = url.pathname

    // Generate Payment Reference
    if (path.endsWith('/generate') && req.method === 'POST') {
      const { userId, amount, type, description }: PaymentRequest = await req.json()

      if (!userId || !amount || amount <= 0) {
        return new Response(
          JSON.stringify({ error: 'Invalid payment data' }),
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

      if (dbError) {
        console.error('Database error:', dbError)
        return new Response(
          JSON.stringify({ error: 'Failed to create transaction' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Generate Multicaixa payment reference
      try {
        const multicaixaResponse = await fetch(`${multicaixaApiUrl}/payments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${multicaixaApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amount,
            currency: 'AOA',
            description: `KAIRÓS MER - ${type}`,
            reference: transaction.id,
            callback_url: `${supabaseUrl}/functions/v1/multicaixa-payment/webhook`,
          }),
        })

        if (!multicaixaResponse.ok) {
          const errorText = await multicaixaResponse.text()
          console.error('Multicaixa API error:', errorText)
          throw new Error('Multicaixa API error')
        }

        const multicaixaData = await multicaixaResponse.json()

        // Update transaction with payment reference
        await supabase
          .from('transactions')
          .update({ 
            payment_reference: multicaixaData.reference,
            multicaixa_transaction_id: multicaixaData.transaction_id,
          })
          .eq('id', transaction.id)

        return new Response(
          JSON.stringify({
            success: true,
            reference: multicaixaData.reference,
            transactionId: transaction.id,
            amount: amount,
            expiresAt: multicaixaData.expires_at,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (multicaixaError) {
        console.error('Multicaixa integration error:', multicaixaError)
        
        // Mark transaction as failed
        await supabase
          .from('transactions')
          .update({ status: 'failed' })
          .eq('id', transaction.id)

        return new Response(
          JSON.stringify({ error: 'Failed to generate payment reference' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Webhook - Payment Confirmation
    if (path.endsWith('/webhook') && req.method === 'POST') {
      const payload: WebhookPayload = await req.json()

      console.log('Webhook received:', payload)

      // Update transaction status
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          status: payload.status,
          multicaixa_transaction_id: payload.transactionId,
          updated_at: new Date().toISOString(),
        })
        .eq('payment_reference', payload.reference)

      if (updateError) {
        console.error('Failed to update transaction:', updateError)
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
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
