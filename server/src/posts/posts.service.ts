import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreatePostDto } from './dto/create-post.dto'
import { XService } from '../integrations/x.service'
import { TikTokService } from '../integrations/tiktok.service'
import { UsersService } from '../users/users.service'

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name)

  constructor(
    private prisma: PrismaService,
    private xService: XService,
    private tiktokService: TikTokService,
    private usersService: UsersService,
  ) {}

  async create(userId: string, dto: CreatePostDto) {
    const post = await this.prisma.post.create({
      data: {
        content: dto.content,
        imageUrl: dto.imageUrl,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        userId,
      },
    })

    const results: Record<string, string> = {}

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { xAccessToken: true },
    })

    if (user?.xAccessToken) {
      const xResult = await this.xService.publishAd(dto.content, dto.imageUrl, user.xAccessToken)
      if (xResult.success) {
        results.x = 'sent'
      } else {
        const detail =
          'status' in xResult && xResult.status != null
            ? `${xResult.reason ?? 'unknown'}:${xResult.status}`
            : (xResult.reason ?? 'unknown')
        results.x = `failed:${detail}`
      }
    } else {
      results.x = 'skipped:not_connected'
    }

    if (dto.imageUrl) {
      const tiktokToken = await this.usersService.getValidTikTokAccessToken(userId)
      if (tiktokToken) {
        const tiktokResult = await this.tiktokService.publishPhoto(
          dto.content,
          dto.imageUrl,
          tiktokToken,
        )
        results.tiktok = tiktokResult.success ? 'sent' : `failed:${tiktokResult.reason ?? 'unknown'}`
      } else {
        results.tiktok = 'skipped:not_connected'
      }
    } else {
      results.tiktok = 'skipped:no_image'
    }

    const attempts = Object.values(results).filter((v) => !v.startsWith('skipped'))
    const successes = attempts.filter((v) => v === 'sent')

    if (successes.length > 0) {
      return this.prisma.post.update({
        where: { id: post.id },
        data: {
          status: 'sent',
          publishedAt: new Date(),
          platformResults: results,
          failReason: null,
        },
      })
    }

    if (attempts.length === 0) {
      return this.prisma.post.update({
        where: { id: post.id },
        data: {
          status: 'pending',
          platformResults: results,
          failReason: 'Connect X or TikTok to publish',
        },
      })
    }

    return this.prisma.post.update({
      where: { id: post.id },
      data: {
        status: 'failed',
        platformResults: results,
        failReason: Object.entries(results)
          .map(([k, v]) => `${k}: ${v.replace(/^(failed|skipped):/, '')}`)
          .join('; '),
      },
    })
  }

  findAllForUser(userId: string) {
    return this.prisma.post.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  }
}
