import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common'
import { CreatePostDto } from './dto/create-post.dto'
import { PostsService } from './posts.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private postsService: PostsService) {}

  @Post()
  create(@Request() req: { user: { id: string } }, @Body() dto: CreatePostDto) {
    return this.postsService.create(req.user.id, dto)
  }

  @Get()
  findAll(@Request() req: { user: { id: string } }) {
    return this.postsService.findAllForUser(req.user.id)
  }
}
