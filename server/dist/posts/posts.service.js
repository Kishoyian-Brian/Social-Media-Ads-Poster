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
let PostsService = PostsService_1 = class PostsService {
    constructor(prisma, xService) {
        this.prisma = prisma;
        this.xService = xService;
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
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { xAccessToken: true },
        });
        if (!user?.xAccessToken) {
            this.logger.warn(`User ${userId} is not connected to X. Saving post without publishing.`);
            return post;
        }
        const publishResult = await this.xService.publishAd(dto.content, dto.imageUrl, user.xAccessToken);
        if (publishResult.success) {
            this.logger.log(`Published post to X for user ${userId}`);
            return this.prisma.post.update({
                where: { id: post.id },
                data: { status: 'sent' },
            });
        }
        this.logger.warn(`Post saved but X publish skipped or failed for user ${userId}: ${publishResult.reason}`);
        return post;
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
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, x_service_1.XService])
], PostsService);
