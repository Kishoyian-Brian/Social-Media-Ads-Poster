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
var PostsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const x_service_1 = require("../integrations/x.service");
const tiktok_service_1 = require("../integrations/tiktok.service");
const users_service_1 = require("../users/users.service");
let PostsService = PostsService_1 = class PostsService {
    constructor(prisma, xService, tiktokService, usersService) {
        this.prisma = prisma;
        this.xService = xService;
        this.tiktokService = tiktokService;
        this.usersService = usersService;
        this.logger = new common_1.Logger(PostsService_1.name);
    }
    async create(userId, dto) {
        const post = await this.prisma.post.create({
            data: {
                content: dto.content,
                imageUrl: dto.imageUrl,
                scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
                userId,
            },
        });
        const results = {};
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { xAccessToken: true },
        });
        if (user?.xAccessToken) {
            const xResult = await this.xService.publishAd(dto.content, dto.imageUrl, user.xAccessToken);
            results.x = xResult.success ? 'sent' : `failed:${xResult.reason ?? 'unknown'}`;
        }
        else {
            results.x = 'skipped:not_connected';
        }
        if (dto.imageUrl) {
            const tiktokToken = await this.usersService.getValidTikTokAccessToken(userId);
            if (tiktokToken) {
                const tiktokResult = await this.tiktokService.publishPhoto(dto.content, dto.imageUrl, tiktokToken);
                results.tiktok = tiktokResult.success ? 'sent' : `failed:${tiktokResult.reason ?? 'unknown'}`;
            }
            else {
                results.tiktok = 'skipped:not_connected';
            }
        }
        else {
            results.tiktok = 'skipped:no_image';
        }
        const attempts = Object.values(results).filter((v) => !v.startsWith('skipped'));
        const successes = attempts.filter((v) => v === 'sent');
        if (successes.length > 0) {
            return this.prisma.post.update({
                where: { id: post.id },
                data: {
                    status: 'sent',
                    publishedAt: new Date(),
                    platformResults: results,
                    failReason: null,
                },
            });
        }
        if (attempts.length === 0) {
            return this.prisma.post.update({
                where: { id: post.id },
                data: {
                    status: 'pending',
                    platformResults: results,
                    failReason: 'Connect X or TikTok to publish',
                },
            });
        }
        return this.prisma.post.update({
            where: { id: post.id },
            data: {
                status: 'failed',
                platformResults: results,
                failReason: Object.entries(results)
                    .map(([k, v]) => `${k}: ${v.replace('failed:', '')}`)
                    .join('; '),
            },
        });
    }
    findAllForUser(userId) {
        return this.prisma.post.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }
};
exports.PostsService = PostsService;
exports.PostsService = PostsService = PostsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        x_service_1.XService,
        tiktok_service_1.TikTokService,
        users_service_1.UsersService])
], PostsService);
