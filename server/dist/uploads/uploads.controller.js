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
exports.UploadsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const crypto_1 = require("crypto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const uploads_service_1 = require("./uploads.service");
const config_1 = require("@nestjs/config");
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
let UploadsController = class UploadsController {
    constructor(uploadsService, configService) {
        this.uploadsService = uploadsService;
        this.configService = configService;
    }
    async upload(file, req) {
        await this.uploadsService.ensureUploadDir();
        const publicBase = this.configService.get('PUBLIC_URL') ?? `${req.protocol}://localhost:4000`;
        const path = `/uploads/${file.filename}`;
        return { url: `${publicBase}${path}`, path };
    }
};
exports.UploadsController = UploadsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: (_req, _file, cb) => {
                cb(null, (0, path_1.join)(process.cwd(), 'uploads'));
            },
            filename: (_req, file, cb) => {
                const ext = (0, path_1.extname)(file.originalname) || '.jpg';
                cb(null, `${(0, crypto_1.randomUUID)()}${ext}`);
            },
        }),
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            if (!ALLOWED_MIME.has(file.mimetype)) {
                cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
                return;
            }
            cb(null, true);
        },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UploadsController.prototype, "upload", null);
exports.UploadsController = UploadsController = __decorate([
    (0, common_1.Controller)('uploads'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [uploads_service_1.UploadsService,
        config_1.ConfigService])
], UploadsController);
