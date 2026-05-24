import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import nodemailer from 'nodemailer'

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private readonly from: string
  private readonly resendApiKey?: string
  private readonly smtpConfigured: boolean
  private readonly useGmailPreset: boolean
  private readonly smtpHost?: string
  private readonly smtpPort: number
  private readonly smtpSecure: boolean
  private readonly smtpUser?: string
  private readonly smtpPass?: string

  constructor(private config: ConfigService) {
    const host = this.cleanEnv(
      this.config.get<string>('SMTP_HOST') ?? this.config.get<string>('MAIL_HOST'),
    )
    const user = this.cleanEnv(
      this.config.get<string>('SMTP_USER') ?? this.config.get<string>('MAIL_USER'),
    )
    this.resendApiKey = this.cleanEnv(this.config.get<string>('RESEND_API_KEY'))
    this.from =
      this.cleanEnv(
        this.config.get<string>('SMTP_FROM') ??
          this.config.get<string>('MAIL_FROM') ??
          this.config.get<string>('RESEND_FROM'),
      ) ??
      user ??
      'onboarding@resend.dev'
    this.smtpUser = user
    this.smtpPass = this.cleanEnv(
      this.config.get<string>('SMTP_PASS') ?? this.config.get<string>('MAIL_PASS'),
    )
    this.smtpConfigured = Boolean(host && user && this.smtpPass)
    this.useGmailPreset = host === 'smtp.gmail.com' || host === 'smtp.googlemail.com'
    this.smtpHost = host
    this.smtpPort = Number(
      this.config.get<string>('SMTP_PORT') ?? this.config.get<string>('MAIL_PORT') ?? 587,
    )
    this.smtpSecure =
      this.config.get<string>('SMTP_SECURE') === 'true' ||
      this.config.get<string>('MAIL_SECURE') === 'true'

    if (this.resendApiKey) {
      this.logger.log('Email: using Resend HTTP API (works on Render free tier)')
    } else if (this.smtpConfigured) {
      this.logger.log(`Email: using SMTP (${host})`)
    } else {
      this.logger.warn(
        'Email not configured. Set RESEND_API_KEY (recommended on Render) or SMTP_* / MAIL_* vars.',
      )
    }
  }

  private cleanEnv(value?: string) {
    if (!value) return undefined
    const trimmed = value.trim().replace(/^["']|["']$/g, '')
    return trimmed || undefined
  }

  private normalizeAppPassword(pass?: string) {
    if (!pass) return pass
    return pass.replace(/\s+/g, '')
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

    if (this.resendApiKey) {
      await this.sendViaResend(to, subject, html, text)
      return { delivered: true, devLogged: false }
    }

    if (!this.smtpConfigured) {
      this.logger.warn(`SMTP not configured. OTP for ${to}: ${code}`)
      return { delivered: false, devLogged: true }
    }

    try {
      const pass = this.normalizeAppPassword(this.smtpPass)
      const transporter =
        this.useGmailPreset && this.smtpUser && pass
          ? nodemailer.createTransport({
              service: 'gmail',
              auth: { user: this.smtpUser, pass },
            })
          : nodemailer.createTransport({
              host: this.smtpHost,
              port: this.smtpPort,
              secure: this.smtpSecure,
              auth: {
                user: this.smtpUser,
                pass,
              },
              tls: { minVersion: 'TLSv1.2' },
            })

      await transporter.sendMail({
        from: this.from,
        to,
        subject,
        text,
        html,
      })
      return { delivered: true, devLogged: false }
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${to}`, error)
      throw error
    }
  }

  private async sendViaResend(to: string, subject: string, html: string, text: string) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: [to],
        subject,
        html,
        text,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      this.logger.error(`Resend API error ${response.status}: ${body}`)
      throw new Error(`Resend failed: ${response.status}`)
    }
  }
}
