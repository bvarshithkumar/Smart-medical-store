import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, type, payload } = await req.json()

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 1. Generate secure 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // 2. Hash the OTP using SHA-256
    const msgUint8 = new TextEncoder().encode(otp)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const otpHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // 3. Setup Supabase Client using Service Role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ""
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ""
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if there is an active unverified request for the email and type
    const { data: recentReq } = await supabase
      .from('verification_requests')
      .select('created_at, resend_count')
      .eq('email', email)
      .eq('verification_type', type)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let resendCount = 0
    if (recentReq) {
      const elapsed = (Date.now() - new Date(recentReq.created_at).getTime()) / 1000
      
      // Cooldown rule: 60 seconds
      if (elapsed < 60) {
        return new Response(JSON.stringify({ 
          error: `Please wait ${Math.ceil(60 - elapsed)}s before requesting a new code.` 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Max resend attempts rule: 3 resends (4 total codes)
      resendCount = (recentReq.resend_count || 0) + 1
      if (resendCount > 3) {
        return new Response(JSON.stringify({ 
          error: 'Maximum resend attempts exceeded. Please try again in 10 minutes.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Invalidate the previous code by setting it to expire now
      await supabase
        .from('verification_requests')
        .update({ expires_at: new Date().toISOString() })
        .eq('email', email)
        .eq('verification_type', type)
        .eq('verified', false)
    }

    // Insert the new verification request
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes from now
    const { error: insertError } = await supabase
      .from('verification_requests')
      .insert({
        verification_type: type,
        email: email,
        otp_hash: otpHash,
        expires_at: expiresAt,
        attempt_count: 0,
        resend_count: resendCount,
        verified: false,
        payload: payload || {}
      })

    if (insertError) {
      console.error('[send-verification-email] DB Insert Error:', insertError)
      throw insertError
    }

    // 4. Send Email via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      // DEV/TEST MODE FALLBACK: Log the OTP and return it in payload
      console.log(`\n============================================\n[DEV MODE] Verification OTP for ${email} (${type}): ${otp}\n============================================\n`);
      return new Response(JSON.stringify({
        success: true,
        message: 'OTP generated and logged (Resend key missing).',
        dev_mode: true,
        otp: otp
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // HTML Email Template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>SVMS Verification Code</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
          .container { max-width: 580px; margin: 40px auto; background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; }
          .header { text-align: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 24px; }
          .logo { font-size: 24px; font-weight: 800; color: #0f766e; text-decoration: none; letter-spacing: -0.5px; }
          .content { padding: 32px 0; text-align: center; }
          .title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 12px; }
          .desc { font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 24px; }
          .otp-card { background-color: #f0fdfa; border: 1px dashed #14b8a6; border-radius: 10px; padding: 24px; margin: 0 auto 28px; display: inline-block; min-width: 240px; }
          .otp-code { font-size: 40px; font-weight: 900; color: #0f766e; letter-spacing: 6px; line-height: 1; }
          .expiry-notice { font-size: 13px; color: #0d9488; font-weight: 600; margin-top: 10px; }
          .footer { text-align: center; border-top: 1px solid #f1f5f9; padding-top: 24px; font-size: 13px; color: #94a3b8; line-height: 1.5; }
          .footer a { color: #0f766e; text-decoration: none; font-weight: 600; }
        </style>
      </head>
      <body>
        <div style="background-color: #f8fafc; padding: 20px 0; min-height: 100vh;">
          <div class="container">
            <div class="header">
              <span class="logo">Sri Venkateshwara Medical Store</span>
            </div>
            <div class="content">
              <h2 class="title">Verification Code</h2>
              <p class="desc">Please use the verification code below to authorize your account action. This code is valid for 10 minutes and can only be used once.</p>
              <div class="otp-card">
                <div class="otp-code">${otp}</div>
                <div class="expiry-notice">Expires in 10 minutes</div>
              </div>
              <p class="desc" style="font-size: 13px; color: #94a3b8; margin: 0;">If you did not request this verification code, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>SVMS Trusted Pharmacy, Gachibowli, Hyderabad</p>
              <p>Need support? Contact <a href="mailto:support@svmspharmacy.com">support@svmspharmacy.com</a></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: 'SVMS Pharmacy <noreply@svmspharmacy.com>',
        to: email,
        subject: `[SVMS] Your Verification Code: ${otp}`,
        html: htmlContent
      })
    })

    const resJson = await res.json()
    if (!res.ok) {
      console.error('[send-verification-email] Resend API Error:', resJson)
      throw new Error(resJson.message || 'Failed to deliver email through Resend API')
    }

    return new Response(JSON.stringify({ success: true, message: 'OTP sent successfully.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('[send-verification-email] Edge Function exception:', err)
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
