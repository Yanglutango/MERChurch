import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const MAX_ATTEMPTS = 3
const WINDOW_HOURS = 1

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { keyAttempt } = await req.json()

    if (!keyAttempt || typeof keyAttempt !== 'string') {
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid request' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get IP for rate limiting (use CF-Connecting-IP or X-Forwarded-For)
    const ip = req.headers.get('CF-Connecting-IP') ||
               req.headers.get('X-Forwarded-For')?.split(',')[0].trim() ||
               'unknown'

    // Hash the IP for privacy
    const encoder = new TextEncoder()
    const data = encoder.encode(ip + Deno.env.get('SUPABASE_URL'))
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const ipHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Create admin Supabase client for rate limit checks
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check rate limit: count attempts in the last WINDOW_HOURS
    const windowStart = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000).toISOString()
    const { count: attemptCount, error: countError } = await supabaseAdmin
      .from('admin_key_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('attempted_at', windowStart)

    if (countError) {
      console.error('[verify-admin-key] Rate limit check failed:', countError)
      // Fail open (don't block users due to DB errors) but log
    } else if ((attemptCount ?? 0) >= MAX_ATTEMPTS) {
      console.warn(`[verify-admin-key] Rate limit exceeded for IP hash: ${ipHash.slice(0, 8)}...`)
      return new Response(
        JSON.stringify({ valid: false, error: 'rate_limited', retryAfter: WINDOW_HOURS * 3600 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      )
    }

    // Record this attempt
    await supabaseAdmin
      .from('admin_key_attempts')
      .insert({ ip_hash: ipHash })

    // Verify the key against env secret
    const adminSecret = Deno.env.get('ADMIN_SECRET_KEY')
    if (!adminSecret) {
      console.error('[verify-admin-key] ADMIN_SECRET_KEY environment variable not set')
      return new Response(
        JSON.stringify({ valid: false, error: 'Server configuration error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const valid = keyAttempt === adminSecret

    if (valid) {
      // On success, clean up this IP's failed attempts
      await supabaseAdmin
        .from('admin_key_attempts')
        .delete()
        .eq('ip_hash', ipHash)
    }

    console.log(`[verify-admin-key] Attempt result: ${valid ? 'valid' : 'invalid'} from IP hash ${ipHash.slice(0, 8)}...`)

    return new Response(
      JSON.stringify({ valid }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (err) {
    console.error('[verify-admin-key] Unexpected error:', err)
    return new Response(
      JSON.stringify({ valid: false, error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
