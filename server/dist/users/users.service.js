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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const x_service_1 = require("../integrations/x.service");
const tiktok_service_1 = require("../integrations/tiktok.service");
let UsersService = class UsersService {
    constructor(prisma, xService, tiktokService) {
        this.prisma = prisma;
        this.xService = xService;
        this.tiktokService = tiktokService;
    }
    findById(id) {
        return this.prisma.user.findUnique({
            where: { id },
            select: { id: true, email: true, createdAt: true },
        });
    }
    findByIdWithToken(id) {
        return this.prisma.user.findUnique({
            where: { id },
            select: {
                xAccessToken: true,
                xRefreshToken: true,
                xTokenExpires: true,
                tiktokAccessToken: true,
                tiktokRefreshToken: true,
                tiktokTokenExpires: true,
            },
        });
    }
    findByEmail(email) {
        return this.prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, createdAt: true },
        });
    }
    updateXToken(userId, tokens) {
        const expiresAt = tokens.expires_in != null ? new Date(Date.now() + tokens.expires_in * 1000) : null;
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                xAccessToken: tokens.access_token,
                xRefreshToken: tokens.refresh_token ?? null,
                xTokenExpires: expiresAt,
            },
            select: { id: true, email: true, createdAt: true },
        });
    }
    async saveTikTokTokens(userId, tokens) {
        const existing = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { tiktokRefreshToken: true },
        });
        const expiresAt = tokens.expires_in != null ? new Date(Date.now() + tokens.expires_in * 1000) : null;
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                tiktokAccessToken: tokens.access_token,
                tiktokRefreshToken: tokens.refresh_token ?? existing?.tiktokRefreshToken ?? null,
                tiktokTokenExpires: expiresAt,
                tiktokOpenId: tokens.open_id ?? null,
            },
            select: { id: true, email: true, createdAt: true },
        });
    }
    async disconnectTikTok(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { tiktokAccessToken: true },
        });
        if (user?.tiktokAccessToken) {
            await this.tiktokService.revokeAccessToken(user.tiktokAccessToken).catch(() => { });
        }
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                tiktokAccessToken: null,
                tiktokRefreshToken: null,
                tiktokTokenExpires: null,
                tiktokOpenId: null,
            },
            select: { id: true, email: true, createdAt: true },
        });
    }
    async getValidTikTokAccessToken(userId) {
        const user = await this.findByIdWithToken(userId);
        if (!user?.tiktokAccessToken)
            return null;
        const stillValid = !user.tiktokTokenExpires || user.tiktokTokenExpires.getTime() > Date.now() + 60000;
        if (stillValid)
            return user.tiktokAccessToken;
        if (!user.tiktokRefreshToken)
            return user.tiktokAccessToken;
        try {
            const refreshed = await this.tiktokService.refreshAccessToken(user.tiktokRefreshToken);
            await this.saveTikTokTokens(userId, refreshed);
            return refreshed.access_token;
        }
        catch {
            return user.tiktokAccessToken;
        }
    }
    getConnectionFlags(userId) {
        return this.findByIdWithToken(userId).then((user) => ({
            xConnected: Boolean(user?.xAccessToken),
            tiktokConnected: Boolean(user?.tiktokAccessToken),
        }));
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        x_service_1.XService,
        tiktok_service_1.TikTokService])
], UsersService);
