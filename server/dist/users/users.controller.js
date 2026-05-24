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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var UsersController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const users_service_1 = require("./users.service");
const x_service_1 = require("../integrations/x.service");
const tiktok_service_1 = require("../integrations/tiktok.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const pkce_util_1 = require("../common/utils/pkce.util");
let UsersController = UsersController_1 = class UsersController {
    constructor(usersService, xService, tiktokService, jwtService, configService) {
        this.usersService = usersService;
        this.xService = xService;
        this.tiktokService = tiktokService;
        this.jwtService = jwtService;
        this.configService = configService;
        this.logger = new common_1.Logger(UsersController_1.name);
    }
    async getXOAuthUrl(req) {
        const { codeVerifier, codeChallenge } = (0, pkce_util_1.generatePkcePair)();
        const state = this.jwtService.sign({ id: req.user.id, type: 'x_oauth', codeVerifier }, {
            secret: this.configService.get('JWT_SECRET') ?? 'dev-secret',
            expiresIn: '10m',
        });
        return { url: this.xService.getOAuthUrl(state, codeChallenge) };
    }
    async handleXCallback(code, state, res) {
        const redirectTarget = this.configService.get('X_OAUTH_FRONTEND_REDIRECT') ??
            'http://localhost:5173/dashboard';
        if (!code || !state) {
            return res.redirect(`${redirectTarget}?x_connected=0`);
        }
        try {
            const payload = (await this.jwtService.verifyAsync(state, {
                secret: this.configService.get('JWT_SECRET') ?? 'dev-secret',
            }));
            if (payload.type !== 'x_oauth' || !payload.codeVerifier) {
                return res.redirect(`${redirectTarget}?x_connected=0`);
            }
            const tokenResponse = await this.xService.exchangeCode(code, payload.codeVerifier);
            await this.usersService.updateXToken(payload.id, tokenResponse);
            return res.redirect(`${redirectTarget}?x_connected=1`);
        }
        catch (error) {
            this.logger.error('X OAuth callback failed', error);
            return res.redirect(`${redirectTarget}?x_connected=0`);
        }
    }
    getTikTokOAuthUrl(req) {
        const state = this.jwtService.sign({ id: req.user.id, type: 'tiktok_oauth' }, {
            secret: this.configService.get('JWT_SECRET') ?? 'dev-secret',
            expiresIn: '10m',
        });
        return { url: this.tiktokService.getOAuthUrl(state) };
    }
    async handleTikTokCallback(code, state, res) {
        const redirectTarget = this.configService.get('TIKTOK_OAUTH_FRONTEND_REDIRECT') ??
            'http://localhost:5173/dashboard';
        if (!code || !state) {
            return res.redirect(`${redirectTarget}?tiktok_connected=0`);
        }
        try {
            const payload = (await this.jwtService.verifyAsync(state, {
                secret: this.configService.get('JWT_SECRET') ?? 'dev-secret',
            }));
            if (payload.type !== 'tiktok_oauth') {
                return res.redirect(`${redirectTarget}?tiktok_connected=0`);
            }
            const tokenResponse = await this.tiktokService.exchangeCode(code);
            await this.usersService.saveTikTokTokens(payload.id, tokenResponse);
            return res.redirect(`${redirectTarget}?tiktok_connected=1`);
        }
        catch (error) {
            this.logger.error('TikTok OAuth callback failed', error);
            return res.redirect(`${redirectTarget}?tiktok_connected=0`);
        }
    }
    async disconnectTikTok(req) {
        await this.usersService.disconnectTikTok(req.user.id);
        return { ok: true };
    }
    findOne(id) {
        return this.usersService.findById(id);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('x/oauth-url'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getXOAuthUrl", null);
__decorate([
    (0, common_1.Get)('x/callback'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "handleXCallback", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('tiktok/oauth-url'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getTikTokOAuthUrl", null);
__decorate([
    (0, common_1.Get)('tiktok/callback'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "handleTikTokCallback", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Delete)('tiktok/connection'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "disconnectTikTok", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "findOne", null);
exports.UsersController = UsersController = UsersController_1 = __decorate([
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        x_service_1.XService,
        tiktok_service_1.TikTokService,
        jwt_1.JwtService,
        config_1.ConfigService])
], UsersController);
