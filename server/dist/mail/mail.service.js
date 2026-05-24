"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var MailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer_1 = __importDefault(require("nodemailer"));
let MailService = MailService_1 = class MailService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(MailService_1.name);
        const host = this.cleanEnv(this.config.get('SMTP_HOST') ?? this.config.get('MAIL_HOST'));
        const user = this.cleanEnv(this.config.get('SMTP_USER') ?? this.config.get('MAIL_USER'));
        this.resendApiKey = this.cleanEnv(this.config.get('RESEND_API_KEY'));
        this.from =
            this.cleanEnv(this.config.get('SMTP_FROM') ??
                this.config.get('MAIL_FROM') ??
                this.config.get('RESEND_FROM')) ??
                user ??
                'onboarding@resend.dev';
        this.smtpUser = user;
        this.smtpPass = this.cleanEnv(this.config.get('SMTP_PASS') ?? this.config.get('MAIL_PASS'));
        this.smtpConfigured = Boolean(host && user && this.smtpPass);
        this.useGmailPreset = host === 'smtp.gmail.com' || host === 'smtp.googlemail.com';
        this.smtpHost = host;
        this.smtpPort = Number(this.config.get('SMTP_PORT') ?? this.config.get('MAIL_PORT') ?? 587);
        this.smtpSecure =
            this.config.get('SMTP_SECURE') === 'true' ||
                this.config.get('MAIL_SECURE') === 'true';
        if (this.resendApiKey) {
            this.logger.log('Email: using Resend HTTP API (works on Render free tier)');
        }
        else if (this.smtpConfigured) {
            this.logger.log(`Email: using SMTP (${host})`);
        }
        else {
            this.logger.warn('Email not configured. Set RESEND_API_KEY (recommended on Render) or SMTP_* / MAIL_* vars.');
        }
    }
    cleanEnv(value) {
        if (!value)
            return undefined;
        const trimmed = value.trim().replace(/^["']|["']$/g, '');
        return trimmed || undefined;
    }
    normalizeAppPassword(pass) {
        if (!pass)
            return pass;
        return pass.replace(/\s+/g, '');
    }
    async sendOtpEmail(to, code, purpose) {
        const subject = purpose === 'registration' ? 'Verify your Social Manager account' : 'Your Social Manager login code';
        const intro = purpose === 'registration'
            ? 'Use this code to complete your registration:'
            : 'Use this code to sign in to your account:';
        const text = `${intro}\n\n${code}\n\nThis code expires in 10 minutes. If you did not request this, you can ignore this email.`;
        const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
        <p>${intro}</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 24px 0;">${code}</p>
        <p style="color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
      </div>
    `;
        if (this.resendApiKey) {
            await this.sendViaResend(to, subject, html, text);
            return { delivered: true, devLogged: false };
        }
        if (!this.smtpConfigured) {
            this.logger.warn(`SMTP not configured. OTP for ${to}: ${code}`);
            return { delivered: false, devLogged: true };
        }
        try {
            const pass = this.normalizeAppPassword(this.smtpPass);
            const transporter = this.useGmailPreset && this.smtpUser && pass
                ? nodemailer_1.default.createTransport({
                    service: 'gmail',
                    auth: { user: this.smtpUser, pass },
                })
                : nodemailer_1.default.createTransport({
                    host: this.smtpHost,
                    port: this.smtpPort,
                    secure: this.smtpSecure,
                    auth: {
                        user: this.smtpUser,
                        pass,
                    },
                    tls: { minVersion: 'TLSv1.2' },
                });
            await transporter.sendMail({
                from: this.from,
                to,
                subject,
                text,
                html,
            });
            return { delivered: true, devLogged: false };
        }
        catch (error) {
            this.logger.error(`Failed to send OTP email to ${to}`, error);
            throw error;
        }
    }
    async sendViaResend(to, subject, html, text) {
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
        });
        if (!response.ok) {
            const body = await response.text();
            this.logger.error(`Resend API error ${response.status}: ${body}`);
            throw new Error(`Resend failed: ${response.status}`);
        }
    }
};
exports.MailService = MailService;
exports.MailService = MailService = MailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MailService);
