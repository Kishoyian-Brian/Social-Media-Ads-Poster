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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const users_service_1 = require("./users.service");
const x_service_1 = require("../integrations/x.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
let UsersController = class UsersController {
    constructor(usersService, xService, jwtService, configService) {
        this.usersService = usersService;
        this.xService = xService;
        this.jwtService = jwtService;
        this.configService = configService;
    }
    findOne(id) {
        return this.usersService.findById(id);
    }
    async getXOAuthUrl(req) {
        const state = this.jwtService.sign({ id: req.user.id, type: 'x_oauth' }, { secret: this.configService.get('JWT_SECRET') ?? 'dev-secret', expiresIn: '10m' });
        return { url: this.xService.getOAuthUrl(state) };
    }
    async handleXCallback(code, state, res) {
        const redirectTarget = this.configService.get('X_OAUTH_FRONTEND_REDIRECT') ?? 'http://localhost:5173/dashboard';
        if (!code || !state) {
            return res.redirect(`${redirectTarget}?connected=0`);
        }
        try {
            const payload = await this.jwtService.verifyAsync(state, {
                secret: this.configService.get('JWT_SECRET') ?? 'dev-secret',
            });
            if (payload.type !== 'x_oauth') {
                return res.redirect(`${redirectTarget}?connected=0`);
            }
            const tokenResponse = await this.xService.exchangeCode(code);
            await this.usersService.updateXToken(payload.id, tokenResponse.access_token);
            return res.redirect(`${redirectTarget}?connected=1`);
        }
        catch (error) {
            return res.redirect(`${redirectTarget}?connected=0`);
        }
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "findOne", null);
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
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        x_service_1.XService,
        jwt_1.JwtService,
        config_1.ConfigService])
], UsersController);
