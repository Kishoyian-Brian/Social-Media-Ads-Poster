import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { UsersService } from './users.service'
import { UsersController } from './users.controller'
import { PrismaModule } from '../prisma/prisma.module'
import { XService } from '../integrations/x.service'
import { TikTokService } from '../integrations/tiktok.service'

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') ?? 'dev-secret',
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [UsersService, XService, TikTokService],
  controllers: [UsersController],
  exports: [UsersService, TikTokService],
})
export class UsersModule {}
