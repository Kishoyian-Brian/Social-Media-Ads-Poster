import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

export interface TikTokTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  open_id?: string
  scope?: string
  token_type?: string
}

interface TikTokApiResponse<T> {
  data?: T
  error?: { code: string; message: string; log_id?: string }
}

@Injectable()
export class TikTokService {
  private readonly logger = new Logger(TikTokService.name)
  private readonly clientKey?: string
  private readonly clientSecret?: string
  private readonly redirectUri?: string
  private readonly authUrl: string
  private readonly tokenUrl: string
  private readonly revokeUrl: string
  private readonly apiBase: string
  private readonly scopes: string
  private readonly publicUrl: string

  constructor(private config: ConfigService) {
    this.clientKey = this.cleanEnv(this.config.get<string>('TIKTOK_CLIENT_KEY'))
    this.clientSecret = this.cleanEnv(this.config.get<string>('TIKTOK_CLIENT_SECRET'))
    this.redirectUri = this.cleanEnv(this.config.get<string>('TIKTOK_OAUTH_REDIRECT_URI'))
    this.authUrl =
      this.config.get<string>('TIKTOK_OAUTH_AUTHORIZE_URL') ??
      'https://www.tiktok.com/v2/auth/authorize'
    this.tokenUrl =
      this.config.get<string>('TIKTOK_OAUTH_TOKEN_URL') ??
      'https://open.tiktokapis.com/v2/oauth/token/'
    this.revokeUrl =
      this.config.get<string>('TIKTOK_OAUTH_REVOKE_URL') ??
      'https://open.tiktokapis.com/v2/oauth/revoke/'
    this.apiBase = this.config.get<string>('TIKTOK_API_BASE') ?? 'https://open.tiktokapis.com'
    this.scopes = this.config.get<string>('TIKTOK_OAUTH_SCOPES') ?? 'user.info.basic'
    this.publicUrl = this.config.get<string>('PUBLIC_URL') ?? 'http://localhost:4000'

    if (!this.clientKey || !this.redirectUri) {
      this.logger.warn('TikTok OAuth is not fully configured.')
    } else if (!this.redirectUri.startsWith('https://')) {
      this.logger.warn(
        'TikTok Web Login Kit requires an HTTPS redirect URI. Update TIKTOK_OAUTH_REDIRECT_URI after deploy.',
      )
    } else {
      this.logger.log(`TikTok OAuth ready (redirect: ${this.redirectUri})`)
    }
  }

  private cleanEnv(value?: string) {
    return value?.trim().replace(/^["']|["']$/g, '')
  }

  getOAuthUrl(state: string) {
    if (!this.clientKey || !this.redirectUri) {
      throw new Error('Missing TikTok OAuth client configuration')
    }

    const params = new URLSearchParams({
      client_key: this.clientKey,
      response_type: 'code',
      scope: this.scopes,
      redirect_uri: this.redirectUri,
      state,
    })

    return `${this.authUrl.replace(/\/+$/, '')}?${params.toString()}`
  }

  exchangeCode(code: string): Promise<TikTokTokenResponse> {
    const body = new URLSearchParams()
    body.set('client_key', this.clientKey!)
    body.set('client_secret', this.clientSecret!)
    body.set('code', code)
    body.set('grant_type', 'authorization_code')
    body.set('redirect_uri', this.redirectUri!)

    return this.requestToken(body)
  }

  refreshAccessToken(refreshToken: string): Promise<TikTokTokenResponse> {
    const body = new URLSearchParams()
    body.set('client_key', this.clientKey!)
    body.set('client_secret', this.clientSecret!)
    body.set('grant_type', 'refresh_token')
    body.set('refresh_token', refreshToken)

    return this.requestToken(body)
  }

  async revokeAccessToken(accessToken: string) {
    if (!this.clientKey || !this.clientSecret) return

    const body = new URLSearchParams()
    body.set('client_key', this.clientKey)
    body.set('client_secret', this.clientSecret)
    body.set('token', accessToken)

    await fetch(this.revokeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
  }

  private async requestToken(body: URLSearchParams): Promise<TikTokTokenResponse> {
    if (!this.clientKey || !this.clientSecret) {
      throw new Error('Missing TikTok OAuth client configuration')
    }

    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })

    const payload = await response.json()
    if (!response.ok) {
      this.logger.error(`TikTok token request failed (${response.status}): ${JSON.stringify(payload)}`)
      throw new Error('TikTok token request failed')
    }

    return payload as TikTokTokenResponse
  }

  toPublicMediaUrl(imageUrl: string) {
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl
    }
    const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`
    return `${this.publicUrl.replace(/\/$/, '')}${path}`
  }

  async publishPhoto(content: string, imageUrl: string, accessToken: string) {
    const publicImageUrl = this.toPublicMediaUrl(imageUrl)
    const creatorInfo = await this.queryCreatorInfo(accessToken)
    const privacyLevel = creatorInfo.privacy_level_options?.includes('PUBLIC_TO_EVERYONE')
      ? 'PUBLIC_TO_EVERYONE'
      : creatorInfo.privacy_level_options?.[0] ?? 'SELF_ONLY'

    const initResponse = await this.apiPost<{ publish_id?: string }>(
      '/v2/post/publish/content/init/',
      accessToken,
      {
        media_type: 'PHOTO',
        post_mode: 'DIRECT_POST',
        post_info: {
          title: content.slice(0, 90),
          description: content.slice(0, 4000),
          privacy_level: privacyLevel,
          disable_comment: false,
          auto_add_music: true,
          brand_content_toggle: false,
          brand_organic_toggle: false,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          photo_cover_index: 0,
          photo_images: [publicImageUrl],
        },
      },
    )

    if (initResponse.error?.code && initResponse.error.code !== 'ok') {
      return { success: false as const, reason: initResponse.error.code }
    }

    const publishId = initResponse.data?.publish_id
    if (!publishId) {
      return { success: false as const, reason: 'missing_publish_id' }
    }

    const status = await this.pollPublishStatus(accessToken, publishId)
    return status.success
      ? { success: true as const, publishId }
      : { success: false as const, reason: status.reason ?? 'publish_failed' }
  }

  private async queryCreatorInfo(accessToken: string) {
    const response = await this.apiPost<{ privacy_level_options?: string[] }>(
      '/v2/post/publish/creator_info/query/',
      accessToken,
      {},
    )
    return response.data ?? { privacy_level_options: ['SELF_ONLY'] }
  }

  private async pollPublishStatus(accessToken: string, publishId: string) {
    for (let attempt = 0; attempt < 12; attempt++) {
      await new Promise((r) => setTimeout(r, attempt === 0 ? 2000 : 5000))

      const response = await this.apiPost<{ status?: string; fail_reason?: string }>(
        '/v2/post/publish/status/fetch/',
        accessToken,
        { publish_id: publishId },
      )

      if (response.error?.code && response.error.code !== 'ok') {
        return { success: false, reason: response.error.code }
      }

      const status = response.data?.status
      if (status === 'PUBLISH_COMPLETE') return { success: true }
      if (status === 'FAILED') {
        return { success: false, reason: response.data?.fail_reason ?? 'FAILED' }
      }
    }

    return { success: false, reason: 'publish_timeout' }
  }

  private async apiPost<T>(path: string, accessToken: string, body: unknown): Promise<TikTokApiResponse<T>> {
    const response = await fetch(`${this.apiBase}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify(body),
    })

    return (await response.json()) as TikTokApiResponse<T>
  }
}
