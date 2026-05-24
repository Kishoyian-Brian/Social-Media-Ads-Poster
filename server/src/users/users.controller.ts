import { Controller, Delete, Get, Logger, Param, Query, Request, Res, UseGuards } from '@nestjs/common'
import { Response } from 'express'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { UsersService } from './users.service'
import { XService } from '../integrations/x.service'
import { TikTokService } from '../integrations/tiktok.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { generatePkcePair } from '../common/utils/pkce.util'

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name)
  constructor(
    private usersService: UsersService,
    private xService: XService,
    private tiktokService: TikTokService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('x/oauth-url')
  async getXOAuthUrl(@Request() req: { user: { id: string } }) {
    const { codeVerifier, codeChallenge } = generatePkcePair()
    const state = this.jwtService.sign(
      { id: req.user.id, type: 'x_oauth', codeVerifier },
      {
        secret: this.configService.get<string>('JWT_SECRET') ?? 'dev-secret',
        expiresIn: '10m',
      },
    )

    return { url: this.xService.getOAuthUrl(state, codeChallenge) }
  }

  @Get('x/callback')
  async handleXCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const redirectTarget =
      this.configService.get<string>('X_OAUTH_FRONTEND_REDIRECT') ??
      'http://localhost:5173/dashboard'

    if (!code || !state) {
      return res.redirect(`${redirectTarget}?x_connected=0`)
    }

    try {
      const payload = (await this.jwtService.verifyAsync(state, {
        secret: this.configService.get<string>('JWT_SECRET') ?? 'dev-secret',
      })) as { id: string; type: string; codeVerifier?: string }

      if (payload.type !== 'x_oauth' || !payload.codeVerifier) {
        return res.redirect(`${redirectTarget}?x_connected=0`)
      }

      const tokenResponse = await this.xService.exchangeCode(code, payload.codeVerifier)
      await this.usersService.updateXToken(payload.id, tokenResponse)

      return res.redirect(`${redirectTarget}?x_connected=1`)
    } catch (error) {
      this.logger.error('X OAuth callback failed', error as Error)
      return res.redirect(`${redirectTarget}?x_connected=0`)
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('tiktok/oauth-url')
  getTikTokOAuthUrl(@Request() req: { user: { id: string } }) {
    const state = this.jwtService.sign(
      { id: req.user.id, type: 'tiktok_oauth' },
      {
        secret: this.configService.get<string>('JWT_SECRET') ?? 'dev-secret',
        expiresIn: '10m',
      },
    )

    return { url: this.tiktokService.getOAuthUrl(state) }
  }

  @Get('tiktok/callback')
  async handleTikTokCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const redirectTarget =
      this.configService.get<string>('TIKTOK_OAUTH_FRONTEND_REDIRECT') ??
      'http://localhost:5173/dashboard'

    if (!code || !state) {
      return res.redirect(`${redirectTarget}?tiktok_connected=0`)
    }

    try {
      const payload = (await this.jwtService.verifyAsync(state, {
        secret: this.configService.get<string>('JWT_SECRET') ?? 'dev-secret',
      })) as { id: string; type: string }

      if (payload.type !== 'tiktok_oauth') {
        return res.redirect(`${redirectTarget}?tiktok_connected=0`)
      }

      const tokenResponse = await this.tiktokService.exchangeCode(code)
      await this.usersService.saveTikTokTokens(payload.id, tokenResponse)

      return res.redirect(`${redirectTarget}?tiktok_connected=1`)
    } catch (error) {
      this.logger.error('TikTok OAuth callback failed', error as Error)
      return res.redirect(`${redirectTarget}?tiktok_connected=0`)
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete('tiktok/connection')
  async disconnectTikTok(@Request() req: { user: { id: string } }) {
    await this.usersService.disconnectTikTok(req.user.id)
    return { ok: true }
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id)
  }
}
