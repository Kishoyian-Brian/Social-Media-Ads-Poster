import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { randomInt } from 'crypto'
import { PrismaService } from '../prisma/prisma.service'
import { MailService } from '../mail/mail.service'
import { RegisterDto } from './dto/register.dto'
import { VerifyRegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import * as bcrypt from 'bcrypt'

const OTP_TTL_MS = 10 * 60 * 1000

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  private generateOtp() {
    return randomInt(100000, 1000000).toString()
  }

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
    const existing = await this.prisma.user.findUnique({ where: { email } })
    if (existing) {
      throw new ConflictException('Email already registered.')
    }

    const code = this.generateOtp()
    const otpHash = await bcrypt.hash(code, 10)
    const passwordHash = await bcrypt.hash(dto.password, 10)
    const expiresAt = new Date(Date.now() + OTP_TTL_MS)

    await this.prisma.pendingRegistration.upsert({
      where: { email },
      create: {
        name: dto.name.trim(),
        email,
        passwordHash,
        otpHash,
        expiresAt,
      },
      update: {
        name: dto.name.trim(),
        passwordHash,
        otpHash,
        expiresAt,
      },
    })

    const mailResult = await this.mailService.sendOtpEmail(email, code, 'registration')

    return {
      message: 'Verification code sent to your email.',
      email,
      otpSent: true,
    }
  }

  async verifyRegister(dto: VerifyRegisterDto) {
    const email = dto.email.trim().toLowerCase()
    const pending = await this.prisma.pendingRegistration.findUnique({ where: { email } })

    if (!pending) {
      throw new BadRequestException('No pending registration found. Please register again.')
    }

    if (pending.expiresAt < new Date()) {
      await this.prisma.pendingRegistration.delete({ where: { email } })
      throw new BadRequestException('Verification code expired. Please register again.')
    }

    const otpValid = await bcrypt.compare(dto.code, pending.otpHash)
    if (!otpValid) {
      throw new UnauthorizedException('Invalid verification code.')
    }

    const existing = await this.prisma.user.findUnique({ where: { email } })
    if (existing) {
      await this.prisma.pendingRegistration.delete({ where: { email } })
      throw new ConflictException('Email already registered.')
    }

    const user = await this.prisma.user.create({
      data: {
        name: pending.name,
        email: pending.email,
        password: pending.passwordHash,
      },
    })

    await this.prisma.pendingRegistration.delete({ where: { email } })

    return {
      token: this.jwtService.sign({ id: user.id, email: user.email }),
      user: this.buildUserResponse(user),
    }
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase()
    const user = await this.prisma.user.findUnique({ where: { email } })
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
