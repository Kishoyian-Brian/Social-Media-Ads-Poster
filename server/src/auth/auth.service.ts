import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../prisma/prisma.service'
// import { MailService } from '../mail/mail.service'
import { RegisterDto } from './dto/register.dto'
// import { VerifyRegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import * as bcrypt from 'bcrypt'

// const OTP_TTL_MS = 10 * 60 * 1000

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    // private mailService: MailService,
  ) {}

  private buildUserResponse(user: {
    id: string
    name: string
    email: string
    xAccessToken: string | null
    tiktokAccessToken: string | null
  }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      xConnected: Boolean(user.xAccessToken),
      tiktokConnected: Boolean(user.tiktokAccessToken),
    }
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase()
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })
    if (existing) {
      throw new ConflictException('Email already registered.')
    }

    const passwordHash = await bcrypt.hash(dto.password, 10)

    await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email,
        password: passwordHash,
      },
    })

    // Email OTP (disabled — enable when SMTP/Resend is configured)
    // const code = randomInt(100000, 1000000).toString()
    // await this.prisma.pendingRegistration.upsert({ ... })
    // await this.mailService.sendOtpEmail(email, code, 'registration')

    return {
      message: 'Account created. Please sign in.',
    }
  }

  // async verifyRegister(dto: VerifyRegisterDto) { ... }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase()
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        xAccessToken: true,
        tiktokAccessToken: true,
      },
    })
    if (!user) {
      throw new UnauthorizedException('Invalid credentials.')
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password)
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials.')
    }

    return {
      token: this.jwtService.sign({ id: user.id, email: user.email }),
      user: this.buildUserResponse(user),
    }
  }
}
