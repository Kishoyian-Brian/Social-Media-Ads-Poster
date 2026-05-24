import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class XService {
  private readonly logger = new Logger(XService.name)
  private readonly bearerToken?: string
  private readonly apiUrl: string
  private readonly clientId?: string
  private readonly clientSecret?: string
  private readonly redirectUri?: string
  private readonly authUrl: string
  private readonly tokenUrl: string
  private readonly scopes: string

  constructor(private config: ConfigService) {
    this.bearerToken = this.config.get<string>('X_BEARER_TOKEN')
    this.apiUrl = this.config.get<string>('X_API_URL') ?? 'https://api.twitter.com/2/tweets'
    this.clientId = this.config.get<string>('X_CLIENT_ID')
    this.clientSecret = this.config.get<string>('X_CLIENT_SECRET')
    this.redirectUri = this.config.get<string>('X_OAUTH_REDIRECT_URI')
    this.authUrl = this.config.get<string>('X_OAUTH_AUTHORIZE_URL') ?? 'https://twitter.com/i/oauth2/authorize'
    this.tokenUrl = this.config.get<string>('X_OAUTH_TOKEN_URL') ?? 'https://api.twitter.com/2/oauth2/token'
    this.scopes = this.config.get<string>('X_OAUTH_SCOPES') ?? 'tweet.read tweet.write users.read offline.access'
  }

  getOAuthUrl(state: string, codeChallenge: string) {
    if (!this.clientId || !this.redirectUri) {
      throw new Error('Missing X OAuth client configuration')
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scopes,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    })

    return `${this.authUrl}?${params.toString()}`
  }

  async exchangeCode(code: string, codeVerifier: string) {
    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      throw new Error('Missing X OAuth client configuration')
    }

    const body = new URLSearchParams()
    body.set('grant_type', 'authorization_code')
    body.set('code', code)
    body.set('redirect_uri', this.redirectUri)
    body.set('client_id', this.clientId)
    body.set('client_secret', this.clientSecret)
    body.set('code_verifier', codeVerifier)

    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    const payload = await response.json()
    if (!response.ok) {
      this.logger.error(`X token exchange failed (${response.status}): ${JSON.stringify(payload)}`)
      throw new Error('Failed to exchange X OAuth code')
    }

    return payload as { access_token: string; refresh_token?: string; expires_in?: number }
  }

  async publishAd(content: string, imageUrl?: string, userToken?: string) {
    const token = userToken ?? this.bearerToken
    if (!token) {
      this.logger.warn('No X token available for publish. Skipping X publish.')
      return { success: false, reason: 'missing_token' } as const
    }

    const body: Record<string, unknown> = { text: content }

    if (imageUrl) {
      body.media = { media_urls: [imageUrl] }
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const payload = await response.text()
      if (!response.ok) {
        this.logger.error(`X publish failed (${response.status}): ${payload}`)
        return { success: false, reason: 'http_error', status: response.status, payload }
      }

      this.logger.log(`X publish succeeded: ${payload}`)
      return { success: true, data: JSON.parse(payload) } as const
    } catch (error) {
      this.logger.error('X publish exception', error as Error)
      return { success: false, reason: 'exception', error: String(error) } as const
    }
  }
}
