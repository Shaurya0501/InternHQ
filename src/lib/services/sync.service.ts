import { classifierService, EmailClassification } from './classifier.service'
import { gmailService } from './gmail.service'
import { calendarService } from './calendar.service'
import { googleService } from './google.service'
import { decrypt, encrypt } from '../security'
import { SupabaseClient } from '@supabase/supabase-js'

export class SyncService {
  /**
   * Helper to parse dates out of email bodies to automate Calendar event creation.
   */
  parseDateFromText(text: string): Date | null {
    const dateRegexes = [
      /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\.?\s+(\d{1,2})(st|nd|rd|th)?(,\s+(\d{4}))?/i,
      /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4}|\d{2})\b/,
      /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/
    ]

    for (const regex of dateRegexes) {
      const match = text.match(regex)
      if (match) {
        try {
          const parsed = Date.parse(match[0])
          if (!isNaN(parsed)) {
            const d = new Date(parsed)
            if (d.getFullYear() < 2000) {
              d.setFullYear(new Date().getFullYear())
            }
            return d
          }
        } catch (_) {}
      }
    }

    const textLower = text.toLowerCase()
    if (textLower.includes('tomorrow')) {
      const d = new Date()
      d.setDate(d.getDate() + 1)
      return d
    }
    const daysMatch = textLower.match(/in (\d+) days/)
    if (daysMatch && daysMatch[1]) {
      const d = new Date()
      d.setDate(d.getDate() + parseInt(daysMatch[1]))
      return d
    }

    return null
  }

  /**
   * Orchestrates the sync workflow for a single user.
   */
  async syncUserAssistant(supabase: SupabaseClient, userId: string): Promise<{
    emailsSynced: number
    applicationsUpdated: number
    eventsCreated: number
  }> {
    let emailsSynced = 0
    let applicationsUpdated = 0
    let eventsCreated = 0

    // 1. Get OAuth Token
    const { data: oauthToken, error: tokenErr } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (tokenErr || !oauthToken) {
      console.log(`User ${userId} has not connected Google OAuth or error querying.`);
      return { emailsSynced, applicationsUpdated, eventsCreated }
    }

    let accessToken = decrypt(oauthToken.access_token)
    const refreshToken = oauthToken.refresh_token ? decrypt(oauthToken.refresh_token) : null
    const expiresAt = oauthToken.expires_at ? new Date(oauthToken.expires_at) : null

    // 2. Check Expiration & Refresh Token
    if (expiresAt && expiresAt.getTime() - 60000 < Date.now() && refreshToken) {
      console.log(`Refreshing access token for user ${userId}...`)
      try {
        const refreshed = await googleService.refreshAccessToken(refreshToken)
        accessToken = refreshed.access_token
        const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()

        await supabase
          .from('oauth_tokens')
          .update({
            access_token: encrypt(accessToken),
            expires_at: newExpiresAt,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
      } catch (err) {
        console.error(`Token refresh failed for user ${userId}. OAuth may be revoked.`, err)
        return { emailsSynced, applicationsUpdated, eventsCreated }
      }
    }

    // 3. Fetch internship emails
    let emails = []
    try {
      emails = await gmailService.fetchInternshipEmails(accessToken, 15)
    } catch (err) {
      console.error(`Failed to fetch Gmail for user ${userId}:`, err)
      return { emailsSynced, applicationsUpdated, eventsCreated }
    }

    // 4. Fetch User Applications to match
    const { data: apps, error: appsErr } = await supabase
      .from('applications')
      .select('*, internships(*)')
      .eq('user_id', userId)

    if (appsErr || !apps) {
      console.error(`Could not query applications:`, appsErr)
      return { emailsSynced, applicationsUpdated, eventsCreated }
    }

    for (const email of emails) {
      try {
        // Check if email already imported
        const { data: existingEmail } = await supabase
          .from('email_events')
          .select('id')
          .eq('user_id', userId)
          .eq('gmail_message_id', email.gmailMessageId)
          .maybeSingle()

        if (existingEmail) continue // Skip already imported

        // Classify the email
        const classification = classifierService.classify(email.subject, email.body)

        // Find matching application by company name
        const matchedApp = apps.find(app => {
          const appCompany = app.internships?.company_name?.toLowerCase() || ''
          const emailCompany = email.company.toLowerCase()
          return appCompany === emailCompany || appCompany.includes(emailCompany) || emailCompany.includes(appCompany)
        })

        // Save email event
        const { data: savedEmail, error: emailInsertErr } = await supabase
          .from('email_events')
          .insert({
            user_id: userId,
            application_id: matchedApp?.id || null,
            gmail_message_id: email.gmailMessageId,
            subject: email.subject,
            sender: email.sender,
            preview: email.preview,
            body: email.body,
            company: email.company,
            classification,
            date: email.date.toISOString()
          })
          .select()
          .single()

        if (emailInsertErr) {
          console.error('Failed to save email event:', emailInsertErr)
          continue
        }

        emailsSynced++

        // If matched application exists, check if status update is warranted
        if (matchedApp) {
          let targetStatus = null
          if (classification === 'Interview Invitation') {
            targetStatus = 'Interview'
          } else if (classification === 'Assessment') {
            targetStatus = 'Online Assessment'
          } else if (classification === 'Offer Letter') {
            targetStatus = 'Offer'
          } else if (classification === 'Rejected') {
            targetStatus = 'Rejected'
          }

          const currentStatus = matchedApp.status

          // Check if status is a progression
          if (targetStatus && targetStatus !== currentStatus) {
            // Update Application status
            const { error: updateErr } = await supabase
              .from('applications')
              .update({
                status: targetStatus,
                updated_at: new Date().toISOString()
              })
              .eq('id', matchedApp.id)

            if (!updateErr) {
              applicationsUpdated++

              // Insert to timeline with email updates details
              await supabase.from('application_timeline').insert({
                application_id: matchedApp.id,
                status: targetStatus,
                notes: `Email status update: Classified as "${classification}" from ${email.sender}`,
                event_date: email.date.toISOString(),
                update_type: 'email',
                email_subject: email.subject,
                email_preview: email.preview,
                email_event_id: savedEmail.id
              })

              // Create notification
              let notificationType = 'application_updated'
              let notificationTitle = 'Application Status Updated'
              let notificationBody = `Your application for ${matchedApp.internships?.role} at ${matchedApp.internships?.company_name} was auto-updated to ${targetStatus}.`

              if (classification === 'Offer Letter') {
                notificationType = 'offer_received'
                notificationTitle = '🎉 Offer Received!'
                notificationBody = `Congratulations! You received an offer letter from ${matchedApp.internships?.company_name} for the ${matchedApp.internships?.role} role!`
              }

              await supabase.from('notifications').insert({
                user_id: userId,
                title: notificationTitle,
                body: notificationBody,
                type: notificationType,
                read: false
              })
            }
          }

          // If Email is Interview or Assessment, schedule on Calendar
          if (classification === 'Interview Invitation' || classification === 'Assessment') {
            const eventDate = this.parseDateFromText(email.body) || new Date(Date.now() + 24 * 60 * 60 * 1000) // Default to tomorrow
            const eventType = classification === 'Interview Invitation' ? 'Interview' : 'Assessment'
            const title = `${eventType}: ${matchedApp.internships?.company_name} (${matchedApp.internships?.role})`
            const description = `Auto-scheduled from email: "${email.subject}". Preview: ${email.preview}`
            const startTime = eventDate.toISOString()
            const endTime = new Date(eventDate.getTime() + 60 * 60 * 1000).toISOString() // 1 hour event

            let googleEventId = null

            // Optionally create in Google Calendar
            try {
              googleEventId = await calendarService.createGoogleEvent(accessToken, {
                title,
                description,
                start_time: startTime,
                end_time: endTime
              })
            } catch (calErr) {
              console.warn(`Failed to create Google Calendar event for ${userId}:`, calErr)
              // Google calendar not connected or token issue, save as local event
            }

            // Save in Calendar Events database
            const { error: calDbErr } = await supabase.from('calendar_events').insert({
              user_id: userId,
              application_id: matchedApp.id,
              google_event_id: googleEventId,
              title,
              description,
              start_time: startTime,
              end_time: endTime,
              event_type: eventType
            })

            if (!calDbErr) {
              eventsCreated++
              
              // Notify about scheduled event
              const noteTitle = eventType === 'Interview' ? 'Interview Invitation' : 'Assessment Scheduled'
              await supabase.from('notifications').insert({
                user_id: userId,
                title: noteTitle,
                body: `New event scheduled: "${title}" on ${eventDate.toLocaleDateString()}`,
                type: eventType === 'Interview' ? 'interview_tomorrow' : 'assessment_tomorrow',
                read: false
              })
            }
          }
        }
      } catch (emailErr) {
        console.error('Error processing sync for email:', emailErr)
      }
    }

    return { emailsSynced, applicationsUpdated, eventsCreated }
  }
}

export const syncService = new SyncService()
