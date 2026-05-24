import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { XService } from '../integrations/x.service'
import { TikTokService, TikTokTokenResponse } from '../integrations/tiktok.service'

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private xService: XService,
    private tiktokService: TikTokService,
  ) {}

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, createdAt: true },
    })
  }

  findByIdWithToken(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        xAccessToken: true,
        xRefreshToken: true,
        xTokenExpires: true,
        tiktokAccessToken: true,
        tiktokRefreshToken: true,
        tiktokTokenExpires: true,
      },
    })
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, createdAt: true },
    })
  }

  updateXToken(
    userId: string,
    tokens: { access_token: string; refresh_token?: string; expires_in?: number },
  ) {
    const expiresAt =
      tokens.expires_in != null ? new Date(Date.now() + tokens.expires_in * 1000) : null

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        xAccessToken: tokens.access_token,
        xRefreshToken: tokens.refresh_token ?? null,
        xTokenExpires: expiresAt,
      },
      select: { id: true, email: true, createdAt: true },
    })
  }

  async saveTikTokTokens(userId: string, tokens: TikTokTokenResponse) {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tiktokRefreshToken: true },
    })

    const expiresAt =
      tokens.expires_in != null ? new Date(Date.now() + tokens.expires_in * 1000) : null

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        tiktokAccessToken: tokens.access_token,
        tiktokRefreshToken: tokens.refresh_token ?? existing?.tiktokRefreshToken ?? null,
        tiktokTokenExpires: expiresAt,
        tiktokOpenId: tokens.open_id ?? null,
      },
      select: { id: true, email: true, createdAt: true },
    })
  }

  async disconnectTikTok(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tiktokAccessToken: true },
    })

    if (user?.tiktokAccessToken) {
      await this.tiktokService.revokeAccessToken(user.tiktokAccessToken).catch(() => {})
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        tiktokAccessToken: null,
        tiktokRefreshToken: null,
        tiktokTokenExpires: null,
        tiktokOpenId: null,
      },
      select: { id: true, email: true, createdAt: true },
    })
  }

  async getValidTikTokAccessToken(userId: string): Promise<string | null> {
    const user = await this.findByIdWithToken(userId)
    if (!user?.tiktokAccessToken) return null

    const stillValid =
      !user.tiktokTokenExpires || user.tiktokTokenExpires.getTime() > Date.now() + 60_000

    if (stillValid) return user.tiktokAccessToken
    if (!user.tiktokRefreshToken) return user.tiktokAccessToken

    try {
      const refreshed = await this.tiktokService.refreshAccessToken(user.tiktokRefreshToken)
      await this.saveTikTokTokens(userId, refreshed)
      return refreshed.access_token
    } catch {
      return user.tiktokAccessToken
    }
  }

  getConnectionFlags(userId: string) {
    return this.findByIdWithToken(userId).then((user) => ({
      xConnected: Boolean(user?.xAccessToken),
      tiktokConnected: Boolean(user?.tiktokAccessToken),
    }))
  }
}
