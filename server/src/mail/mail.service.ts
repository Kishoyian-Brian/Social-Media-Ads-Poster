import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import nodemailer from 'nodemailer'

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private readonly from: string
  private readonly smtpConfigured: boolean

  constructor(private config: ConfigService) {
    this.from = this.config.get<string>('SMTP_FROM') ?? 'noreply@social-manager.app'
    this.smtpConfigured = Boolean(this.config.get<string>('SMTP_HOST'))
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
        host: this.config.get<string>('SMTP_HOST'),
        port: Number(this.config.get<string>('SMTP_PORT') ?? 587),
        secure: this.config.get<string>('SMTP_SECURE') === 'true',
        auth: {
          user: this.config.get<string>('SMTP_USER'),
          pass: this.config.get<string>('SMTP_PASS'),
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
