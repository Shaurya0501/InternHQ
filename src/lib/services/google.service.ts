/**
 * Service to manage Google OAuth API operations.
 * Communicates with Google authorization servers via native fetch.
 */
export class GoogleService {
  /**
   * Check if client credentials are set in environment variables.
   */
  areCredentialsConfigured(): boolean {
    return !!(
      process.env.GOOGLE_CLIENT_ID && 
      process.env.GOOGLE_CLIENT_SECRET
    )
  }

  /**
   * Get the client ID
   */
  getClientId(): string {
    return process.env.GOOGLE_CLIENT_ID || ''
  }

  /**
   * Get the redirect URI
   */
  getRedirectUri(): string {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return `${appUrl}/api/auth/google/callback`
  }

  /**
   * Generate authorization url for Google OAuth
   */
  getAuthUrl(userId: string): string {
    const clientId = this.getClientId()
    const redirectUri = this.getRedirectUri()
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/calendar.events'
    ].join(' ')

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline', // Requests refresh_token
      prompt: 'consent',     // Forces consent screen so refresh_token is always returned
      state: userId
    })

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  /**
   * Exchage code for tokens
   */
  async getTokensFromCode(code: string): Promise<{
    access_token: string
    refresh_token?: string
    expires_in: number
    scope: string
    token_type: string
  }> {
    const redirectUri = this.getRedirectUri()
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.getClientId(),
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    })

    if (!response.ok) {
      const errBody = await response.text()
      console.error('Failed to exchange Google OAuth code:', errBody)
      throw new Error(`Google token exchange failed: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Refresh an expired access token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string
    expires_in: number
    scope: string
    token_type: string
  }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: this.getClientId(),
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        grant_type: 'refresh_token'
      })
    })

    if (!response.ok) {
      const errBody = await response.text()
      console.error('Failed to refresh Google OAuth token:', errBody)
      throw new Error(`Google token refresh failed: ${response.statusText}`)
    }

    return response.json()
  }
}

export const googleService = new GoogleService()
