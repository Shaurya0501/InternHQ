import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { googleService } from '@/lib/services/google.service'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const googleConfigured = googleService.areCredentialsConfigured()

    // 1. Query oauth_tokens
    const { data: token } = await supabase
      .from('oauth_tokens')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    // 2. Query if they have past email events to determine Connected vs Disconnected vs Never Connected
    const { count: emailCount } = await supabase
      .from('email_events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    let connectionStatus: 'Connected' | 'Disconnected' | 'Never Connected' = 'Never Connected'
    if (token) {
      connectionStatus = 'Connected'
    } else if (emailCount && emailCount > 0) {
      connectionStatus = 'Disconnected'
    }

    // 3. Query reminder settings
    let { data: reminders } = await supabase
      .from('reminder_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!reminders) {
      // Seed default reminder settings if missing
      const { data: seeded } = await supabase
        .from('reminder_settings')
        .insert({ user_id: user.id })
        .select()
        .single()
      reminders = seeded
    }

    return NextResponse.json({
      googleConfigured,
      connectionStatus,
      reminders
    })
  } catch (err: any) {
    console.error('Failed to get assistant status:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Remove Google token to disconnect
    const { error } = await supabase
      .from('oauth_tokens')
      .delete()
      .eq('user_id', user.id)

    if (error) throw error

    // Query if they have email events to verify status transitions to 'Disconnected'
    const { count: emailCount } = await supabase
      .from('email_events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const newStatus = (emailCount && emailCount > 0) ? 'Disconnected' : 'Never Connected'

    return NextResponse.json({
      success: true,
      connectionStatus: newStatus
    })
  } catch (err: any) {
    console.error('Failed to disconnect assistant:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
