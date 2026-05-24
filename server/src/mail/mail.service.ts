import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import nodemailer from 'nodemailer'

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private readonly from: string
  private readonly smtpConfigured: boolean
  private readonly smtpHost?: string
  private readonly smtpPort: number
  private readonly smtpSecure: boolean
  private readonly smtpUser?: string
  private readonly smtpPass?: string

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST') ?? this.config.get<string>('MAIL_HOST')
    const user = this.config.get<string>('SMTP_USER') ?? this.config.get<string>('MAIL_USER')
    this.from =
      this.config.get<string>('SMTP_FROM') ??
      this.config.get<string>('MAIL_FROM') ??
      user ??
      'noreply@social-manager.app'
    this.smtpConfigured = Boolean(host && user)
    this.smtpHost = host
    this.smtpPort = Number(
      this.config.get<string>('SMTP_PORT') ?? this.config.get<string>('MAIL_PORT') ?? 587,
    )
    this.smtpSecure =
      this.config.get<string>('SMTP_SECURE') === 'true' ||
      this.config.get<string>('MAIL_SECURE') === 'true'
    this.smtpUser = user
    this.smtpPass =
      this.config.get<string>('SMTP_PASS') ?? this.config.get<string>('MAIL_PASS')
  }

  async sendOtpEmail(to: string, code: string, purpose: 'registration' | 'login') {
    const subject =
      purpose === 'registration' ? 'Verify your Social Manager account' : 'Your Social Manager login code'
    const intro =
      purpose === 'registration'
        ? 'Use this code to complete your registration:'
        : 'Use this code to sign in to your account:'

    const text = `${intro}\n\n${code}\n\nThis code expires in 10 minutes. If you did not request this, you can ignore this email.`
    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
        <p>${intro}</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 24px 0;">${code}</p>
        <p style="color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
      </div>
    `

    if (!this.smtpConfigured) {
      this.logger.warn(`SMTP not configured. OTP for ${to}: ${code}`)
      return { delivered: false, devLogged: true }
    }

    try {
      const transporter = nodemailer.createTransport({
        host: this.smtpHost,
        port: this.smtpPort,
        secure: this.smtpSecure,
        auth: {
          user: this.smtpUser,
          pass: this.smtpPass,
        },
      })

      await transporter.sendMail({ from: this.from, to, subject, text, html })
      return { delivered: true, devLogged: false }
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${to}`, error)
      throw error
    }
  }
}
