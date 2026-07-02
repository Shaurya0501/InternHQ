import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncService } from '@/lib/services/sync.service'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()

    // 1. Check for CRON scheduled trigger via Authorization Header
    const authHeader = req.headers.get('authorization')
    const isCron = 
      process.env.CRON_SECRET && 
      authHeader === `Bearer ${process.env.CRON_SECRET}`

    if (isCron) {
      // Query all users that have Google OAuth records
      const { data: oauthUsers, error: tokenErr } = await supabase
        .from('oauth_tokens')
        .select('user_id')

      if (tokenErr) {
        return NextResponse.json({ error: 'Failed to retrieve active OAuth tokens: ' + tokenErr.message }, { status: 500 })
      }

      const syncReport = []
      for (const record of oauthUsers || []) {
        try {
          const stats = await syncService.syncUserAssistant(supabase, record.user_id)
          syncReport.push({ userId: record.user_id, status: 'success', stats })
        } catch (userErr: any) {
          syncReport.push({ userId: record.user_id, status: 'failed', error: userErr.message || userErr })
        }
      }

      return NextResponse.json({
        cron_triggered: true,
        synced_accounts: syncReport.length,
        details: syncReport
      })
    }

    // 2. Manual Sync for the logged-in user session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const syncStats = await syncService.syncUserAssistant(supabase, user.id)
    return NextResponse.json({
      success: true,
      stats: syncStats
    })
  } catch (err: any) {
    console.error('Career Assistant sync route failure:', err)
    return NextResponse.json(
      { error: err.message || 'Verification of sync request failed.' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  // Delegate GET requests to POST to support simple scheduling hooks
  return POST(req)
}
