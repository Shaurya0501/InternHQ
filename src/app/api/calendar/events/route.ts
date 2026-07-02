import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/security'
import { calendarService } from '@/lib/services/calendar.service'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await req.json()
    const { applicationId, title, description, start_time, end_time, event_type } = body

    if (!title || !start_time || !end_time || !event_type) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 })
    }

    // Check if Google Calendar OAuth credentials exist for this user
    const { data: oauthToken } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    let googleEventId = null

    if (oauthToken) {
      const accessToken = decrypt(oauthToken.access_token)
      try {
        googleEventId = await calendarService.createGoogleEvent(accessToken, {
          title,
          description: description || '',
          start_time,
          end_time
        })
      } catch (calErr) {
        console.warn('Google Calendar push failed during manual creation, creating locally instead:', calErr)
      }
    }

    // Insert the event into Supabase
    const { data: calendarEvent, error: dbErr } = await supabase
      .from('calendar_events')
      .insert({
        user_id: user.id,
        application_id: applicationId || null,
        google_event_id: googleEventId,
        title,
        description,
        start_time,
        end_time,
        event_type
      })
      .select()
      .single()

    if (dbErr) {
      throw dbErr
    }

    return NextResponse.json({
      success: true,
      event: calendarEvent
    })
  } catch (err: any) {
    console.error('Calendar API Route Failure:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
