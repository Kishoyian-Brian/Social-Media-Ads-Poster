import { Module } from '@nestjs/common'
import { PostsService } from './posts.service'
import { PostsController } from './posts.controller'
import { PrismaModule } from '../prisma/prisma.module'
import { XService } from '../integrations/x.service'
import { UsersModule } from '../users/users.module'

@Module({
  imports: [PrismaModule, UsersModule],
  providers: [PostsService, XService],
  controllers: [PostsController],
})
export class PostsModule {}
