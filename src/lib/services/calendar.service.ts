/**
 * Service to manage Google Calendar events and .ics calendar exports.
 */
export class CalendarService {
  /**
   * Create an event in the user's primary Google Calendar
   * Returns the Google Event ID
   */
  async createGoogleEvent(
    accessToken: string,
    event: {
      title: string
      description?: string
      start_time: string
      end_time: string
    }
  ): Promise<string> {
    const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
    const body = {
      summary: event.title,
      description: event.description || '',
      start: {
        dateTime: new Date(event.start_time).toISOString(),
        timeZone: 'UTC'
      },
      end: {
        dateTime: new Date(event.end_time).toISOString(),
        timeZone: 'UTC'
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errBody = await response.text()
      console.error('Failed to create Google Calendar event:', errBody)
      throw new Error(`Google Calendar event creation failed: ${response.statusText}`)
    }

    const data = await response.json()
    return data.id
  }

  /**
   * Delete an event in the user's Google Calendar
   */
  async deleteGoogleEvent(accessToken: string, googleEventId: string): Promise<void> {
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    if (!response.ok && response.status !== 404) {
      const errBody = await response.text()
      console.error('Failed to delete Google Calendar event:', errBody)
      throw new Error(`Google Calendar event deletion failed: ${response.statusText}`)
    }
  }

  /**
   * Generates a standard iCalendar (.ics) string for offline export.
   */
  generateICSString(event: {
    title: string
    description?: string
    start_time: string
    end_time: string
  }): string {
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr)
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }

    const dtStamp = formatDate(new Date().toISOString())
    const dtStart = formatDate(event.start_time)
    const dtEnd = formatDate(event.end_time)
    const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@internhq.com`

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//InternHQ//Career Assistant//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${event.title.replace(/[,;]/g, '\\$&')}`,
      `DESCRIPTION:${(event.description || '').replace(/[,;]/g, '\\$&').replace(/\n/g, '\\n')}`,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'END:VEVENT',
      'END:VCALENDAR'
    ]

    return lines.join('\r\n')
  }
}

export const calendarService = new CalendarService()
