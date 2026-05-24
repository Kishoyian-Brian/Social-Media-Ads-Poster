"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
const mail_service_1 = require("../mail/mail.service");
const bcrypt = __importStar(require("bcrypt"));
const OTP_TTL_MS = 10 * 60 * 1000;
let AuthService = AuthService_1 = class AuthService {
    constructor(prisma, jwtService, mailService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.mailService = mailService;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    generateOtp() {
        return (0, crypto_1.randomInt)(100000, 1000000).toString();
    }
    buildUserResponse(user) {
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            xConnected: Boolean(user.xAccessToken),
            tiktokConnected: Boolean(user.tiktokAccessToken),
        };
    }
    async register(dto) {
        const email = dto.email.trim().toLowerCase();
        const existing = await this.prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });
        if (existing) {
            throw new common_1.ConflictException('Email already registered.');
        }
        const code = this.generateOtp();
        const otpHash = await bcrypt.hash(code, 10);
        const passwordHash = await bcrypt.hash(dto.password, 10);
        const expiresAt = new Date(Date.now() + OTP_TTL_MS);
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
        });
        try {
            const mailResult = await this.mailService.sendOtpEmail(email, code, 'registration');
            if (!mailResult.delivered && mailResult.devLogged) {
                this.logger.warn(`Registration OTP for ${email} was not emailed (SMTP not configured). Check server logs.`);
            }
        }
        catch {
            throw new common_1.ServiceUnavailableException('Could not send verification email. Please try again later or contact support.');
        }
        return {
            message: 'Verification code sent to your email.',
            email,
            otpSent: true,
        };
    }
    async verifyRegister(dto) {
        const email = dto.email.trim().toLowerCase();
        const pending = await this.prisma.pendingRegistration.findUnique({ where: { email } });
        if (!pending) {
            throw new common_1.BadRequestException('No pending registration found. Please register again.');
        }
        if (pending.expiresAt < new Date()) {
            await this.prisma.pendingRegistration.delete({ where: { email } });
            throw new common_1.BadRequestException('Verification code expired. Please register again.');
        }
        const otpValid = await bcrypt.compare(dto.code, pending.otpHash);
        if (!otpValid) {
            throw new common_1.UnauthorizedException('Invalid verification code.');
        }
        const existing = await this.prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });
        if (existing) {
            await this.prisma.pendingRegistration.delete({ where: { email } });
            throw new common_1.ConflictException('Email already registered.');
        }
        const user = await this.prisma.user.create({
            data: {
                name: pending.name,
                email: pending.email,
                password: pending.passwordHash,
            },
        });
        await this.prisma.pendingRegistration.delete({ where: { email } });
        return {
            token: this.jwtService.sign({ id: user.id, email: user.email }),
            user: this.buildUserResponse(user),
        };
    }
    async login(dto) {
        const email = dto.email.trim().toLowerCase();
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
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials.');
        }
        const passwordMatches = await bcrypt.compare(dto.password, user.password);
        if (!passwordMatches) {
            throw new common_1.UnauthorizedException('Invalid credentials.');
        }
        return {
            token: this.jwtService.sign({ id: user.id, email: user.email }),
            user: this.buildUserResponse(user),
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        mail_service_1.MailService])
], AuthService);
