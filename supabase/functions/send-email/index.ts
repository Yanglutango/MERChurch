import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

interface EmailPayload {
  to: string
  subject: string
  html: string
  type: 'event_confirmation' | 'counseling_response' | 'newsletter' | 'custom'
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: EmailPayload = await req.json()
    const { to, subject, html, type } = payload

    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: 'Missing required fields: to, subject, html' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

    if (!RESEND_API_KEY) {
      // If no key configured, log and return success (graceful degradation)
      console.log(`[Email Simulation] Would send ${type} email to ${to}: ${subject}`)
      return new Response(JSON.stringify({ 
        success: true, 
        simulated: true,
        message: 'Email logged (RESEND_API_KEY not configured)' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'MER Kairós <noreply@mer.co.ao>',
        to: [to],
        subject,
        html,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Resend API error:', errorText)
      return new Response(JSON.stringify({ error: `Resend: ${errorText}` }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await response.json()
    console.log(`Email sent successfully to ${to}: ${subject}`)

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Email function error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
