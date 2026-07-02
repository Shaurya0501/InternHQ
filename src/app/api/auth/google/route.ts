import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { googleService } from '@/lib/services/google.service'

export async function GET() {
  try {
    // 1. Verify credentials are set
    if (!googleService.areCredentialsConfigured()) {
      return NextResponse.json(
        { error: 'Google OAuth credentials are not configured on this server.' },
        { status: 400 }
      )
    }

    // 2. Get active user session to pass as OAuth state
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // 3. Generate auth URL and redirect
    const authUrl = googleService.getAuthUrl(user.id)
    return NextResponse.redirect(authUrl)
  } catch (err: any) {
    console.error('Google OAuth init failed:', err)
    return NextResponse.json(
      { error: 'Failed to initiate Google Authentication.' },
      { status: 500 }
    )
  }
}
