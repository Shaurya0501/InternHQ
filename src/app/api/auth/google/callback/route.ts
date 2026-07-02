import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { googleService } from '@/lib/services/google.service'
import { encrypt } from '@/lib/security'

export async function GET(req: Request) {
  const requestUrl = new URL(req.url)
  const code = requestUrl.searchParams.get('code')
  const stateUserId = requestUrl.searchParams.get('state') // This is the user's ID we passed
  const errorParam = requestUrl.searchParams.get('error')

  // Construct fallback redirect URL back to the profile page
  const redirectUrl = new URL('/dashboard/profile', requestUrl.origin)
  redirectUrl.searchParams.set('tab', 'assistant')

  if (errorParam) {
    console.error('Google OAuth callback returned error:', errorParam)
    redirectUrl.searchParams.set('error', `OAuth failed: ${errorParam}`)
    return NextResponse.redirect(redirectUrl)
  }

  if (!code) {
    redirectUrl.searchParams.set('error', 'Authorization code not provided by Google.')
    return NextResponse.redirect(redirectUrl)
  }

  try {
    const supabase = await createClient()

    // 1. Double check session user matches state user to prevent CSRF issues
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.id !== stateUserId) {
      redirectUrl.searchParams.set('error', 'User session mismatch or unauthorized access.')
      return NextResponse.redirect(redirectUrl)
    }

    // 2. Exchange code for access & refresh tokens
    const tokens = await googleService.getTokensFromCode(code)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // 3. Encrypt and save tokens in Supabase oauth_tokens table
    const encryptedAccess = encrypt(tokens.access_token)
    const encryptedRefresh = tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined

    const tokenPayload: any = {
      user_id: user.id,
      access_token: encryptedAccess,
      expires_at: expiresAt,
      token_type: tokens.token_type,
      scope: tokens.scope,
      updated_at: new Date().toISOString()
    }

    if (encryptedRefresh) {
      tokenPayload.refresh_token = encryptedRefresh
    }

    // Upsert tokens in database
    const { error: dbErr } = await supabase
      .from('oauth_tokens')
      .upsert(tokenPayload, { onConflict: 'user_id' })

    if (dbErr) {
      throw dbErr
    }

    // Redirect to profile with success query
    redirectUrl.searchParams.set('success', 'google_connected')
    return NextResponse.redirect(redirectUrl)
  } catch (err: any) {
    console.error('Failed to complete Google OAuth flow:', err)
    redirectUrl.searchParams.set('error', `Authentication callback failed: ${err.message || err}`)
    return NextResponse.redirect(redirectUrl)
  }
}
