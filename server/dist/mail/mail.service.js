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
        this.from = this.config.get('SMTP_FROM') ?? 'noreply@social-manager.app';
        this.smtpConfigured = Boolean(this.config.get('SMTP_HOST'));
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
        if (!this.smtpConfigured) {
            this.logger.warn(`SMTP not configured. OTP for ${to}: ${code}`);
            return { delivered: false, devLogged: true };
        }
        const transporter = nodemailer_1.default.createTransport({
            host: this.config.get('SMTP_HOST'),
            port: Number(this.config.get('SMTP_PORT') ?? 587),
            secure: this.config.get('SMTP_SECURE') === 'true',
            auth: {
                user: this.config.get('SMTP_USER'),
                pass: this.config.get('SMTP_PASS'),
            },
        });
        await transporter.sendMail({ from: this.from, to, subject, text, html });
        return { delivered: true, devLogged: false };
    }
};
exports.MailService = MailService;
exports.MailService = MailService = MailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MailService);
