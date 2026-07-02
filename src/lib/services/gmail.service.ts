import { ParsedEmail } from '@/types/internship'

export interface GmailMessage {
  id: string
  threadId: string
}

export interface GmailMessageDetail {
  id: string
  snippet: string
  payload: any
  internalDate: string
}

export class GmailService {
  /**
   * Decodes Base64Url strings from Gmail payload.
   */
  private decodeBase64(base64UrlStr: string): string {
    const base64 = base64UrlStr.replace(/-/g, '+').replace(/_/g, '/')
    return Buffer.from(base64, 'base64').toString('utf8')
  }

  /**
   * Recursively extract text/plain or text/html body from message payload.
   */
  private extractBody(payload: any): { plain: string; html: string } {
    let plain = ''
    let html = ''

    if (!payload) return { plain, html }

    if (payload.mimeType === 'text/plain' && payload.body?.data) {
      plain = this.decodeBase64(payload.body.data)
    } else if (payload.mimeType === 'text/html' && payload.body?.data) {
      html = this.decodeBase64(payload.body.data)
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        const partsExtracted = this.extractBody(part)
        plain += partsExtracted.plain
        html += partsExtracted.html
      }
    }

    return { plain, html }
  }

  /**
   * Strip HTML tags for keyword extraction/preview
   */
  stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Extract company name from the sender header.
   */
  extractCompanyFromEmail(sender: string, subject: string): string {
    let displayName = sender
    const angleBracketIndex = sender.indexOf('<')
    if (angleBracketIndex !== -1) {
      displayName = sender.substring(0, angleBracketIndex).trim()
    }

    displayName = displayName.replace(/['"]/g, '').trim()

    if (displayName) {
      const suffixes = [
        /\bcareers\b/i,
        /\brecruiting\b/i,
        /\brecruitment\b/i,
        /\bjobs\b/i,
        /\bteam\b/i,
        /\bhr\b/i,
        /\btalent\b/i,
        /\bpeople\b/i,
        /\bsupport\b/i,
        /\bno-reply\b/i,
        /\bnoreply\b/i,
        /\bnotifications\b/i,
        /\bupdates\b/i
      ]
      let clean = displayName
      for (const suffix of suffixes) {
        clean = clean.replace(suffix, '')
      }
      clean = clean.replace(/\s+/g, ' ').trim()
      if (clean && clean.length > 1 && !['careers', 'jobs', 'noreply'].includes(clean.toLowerCase())) {
        return clean
      }
    }

    if (angleBracketIndex !== -1) {
      const emailPart = sender.substring(angleBracketIndex + 1, sender.indexOf('>')).trim()
      const domainParts = emailPart.split('@')[1]?.split('.')
      if (domainParts && domainParts.length >= 2) {
        const mainDomain = domainParts[domainParts.length - 2]
        // Filter common free email providers
        if (!['gmail', 'outlook', 'yahoo', 'hotmail'].includes(mainDomain.toLowerCase())) {
          return mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1)
        }
      }
    }

    // Try checking the subject line for hints (e.g. "Your application to Stripe")
    const match = subject.match(/(?:at|to|with)\s+([A-Z][a-zA-Z0-9]+)/)
    if (match && match[1]) {
      return match[1]
    }

    return 'Google' // Default fallback
  }

  /**
   * Fetch a list of internship-related emails.
   */
  async fetchInternshipEmails(accessToken: string, maxResults = 25): Promise<ParsedEmail[]> {
    // Query filter for Gmail API
    // Search subject or body for keywords related to internship, interview, assessment, offer, rejection
    const q = 'subject:(internship OR interview OR offer OR reject OR waitlist OR assessment OR hackerrank OR codesignal)'
    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(q)}&maxResults=${maxResults}`

    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    if (!listRes.ok) {
      throw new Error(`Gmail list failed: ${listRes.statusText}`)
    }

    const listData = await listRes.json()
    const messages: GmailMessage[] = listData.messages || []
    const parsedEmails: ParsedEmail[] = []

    for (const msg of messages) {
      try {
        const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`
        const detailRes = await fetch(detailUrl, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })

        if (!detailRes.ok) continue

        const detail: GmailMessageDetail = await detailRes.json()
        const headers = detail.payload?.headers || []
        
        const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)'
        const sender = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender'
        const dateStr = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || ''
        
        const { plain, html } = this.extractBody(detail.payload)
        const fullBody = plain || this.stripHtml(html) || detail.snippet || ''
        const preview = detail.snippet || fullBody.substring(0, 150)
        const company = this.extractCompanyFromEmail(sender, subject)
        const emailDate = dateStr ? new Date(dateStr) : new Date(parseInt(detail.internalDate))

        parsedEmails.push({
          gmailMessageId: detail.id,
          subject,
          sender,
          preview,
          body: fullBody,
          company,
          date: emailDate
        })
      } catch (err) {
        console.error(`Error parsing message ${msg.id}:`, err)
      }
    }

    return parsedEmails
  }
}

export const gmailService = new GmailService()
