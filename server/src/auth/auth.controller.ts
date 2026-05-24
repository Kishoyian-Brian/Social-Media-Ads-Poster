import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { UsersService } from '../users/users.service'
import { PrismaService } from '../prisma/prisma.service'

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private prisma: PrismaService,
  ) {}

  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.authService.register(body)
  }

  // @Post('verify-register')
  // verifyRegister(@Body() body: VerifyRegisterDto) {
  //   return this.authService.verifyRegister(body)
  // }

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body)
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Request() req: { user: { id: string; email: string } }) {
    const [user, flags] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, name: true, email: true },
      }),
      this.usersService.getConnectionFlags(req.user.id),
    ])

    return {
      user: {
        id: user!.id,
        name: user!.name,
        email: user!.email,
        ...flags,
      },
    }
  }
}
