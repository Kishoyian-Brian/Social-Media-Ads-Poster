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
var TikTokService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let TikTokService = TikTokService_1 = class TikTokService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(TikTokService_1.name);
        this.clientKey = this.cleanEnv(this.config.get('TIKTOK_CLIENT_KEY'));
        this.clientSecret = this.cleanEnv(this.config.get('TIKTOK_CLIENT_SECRET'));
        this.redirectUri = this.cleanEnv(this.config.get('TIKTOK_OAUTH_REDIRECT_URI'));
        this.authUrl =
            this.config.get('TIKTOK_OAUTH_AUTHORIZE_URL') ??
                'https://www.tiktok.com/v2/auth/authorize';
        this.tokenUrl =
            this.config.get('TIKTOK_OAUTH_TOKEN_URL') ??
                'https://open.tiktokapis.com/v2/oauth/token/';
        this.revokeUrl =
            this.config.get('TIKTOK_OAUTH_REVOKE_URL') ??
                'https://open.tiktokapis.com/v2/oauth/revoke/';
        this.apiBase = this.config.get('TIKTOK_API_BASE') ?? 'https://open.tiktokapis.com';
        this.scopes = this.config.get('TIKTOK_OAUTH_SCOPES') ?? 'user.info.basic';
        this.publicUrl = this.config.get('PUBLIC_URL') ?? 'http://localhost:4000';
        if (!this.clientKey || !this.redirectUri) {
            this.logger.warn('TikTok OAuth is not fully configured.');
        }
        else if (!this.redirectUri.startsWith('https://')) {
            this.logger.warn('TikTok Web Login Kit requires an HTTPS redirect URI. Update TIKTOK_OAUTH_REDIRECT_URI after deploy.');
        }
        else {
            this.logger.log(`TikTok OAuth ready (redirect: ${this.redirectUri})`);
        }
    }
    cleanEnv(value) {
        return value?.trim().replace(/^["']|["']$/g, '');
    }
    getOAuthUrl(state) {
        if (!this.clientKey || !this.redirectUri) {
            throw new Error('Missing TikTok OAuth client configuration');
        }
        const params = new URLSearchParams({
            client_key: this.clientKey,
            response_type: 'code',
            scope: this.scopes,
            redirect_uri: this.redirectUri,
            state,
        });
        return `${this.authUrl.replace(/\/+$/, '')}?${params.toString()}`;
    }
    exchangeCode(code) {
        const body = new URLSearchParams();
        body.set('client_key', this.clientKey);
        body.set('client_secret', this.clientSecret);
        body.set('code', code);
        body.set('grant_type', 'authorization_code');
        body.set('redirect_uri', this.redirectUri);
        return this.requestToken(body);
    }
    refreshAccessToken(refreshToken) {
        const body = new URLSearchParams();
        body.set('client_key', this.clientKey);
        body.set('client_secret', this.clientSecret);
        body.set('grant_type', 'refresh_token');
        body.set('refresh_token', refreshToken);
        return this.requestToken(body);
    }
    async revokeAccessToken(accessToken) {
        if (!this.clientKey || !this.clientSecret)
            return;
        const body = new URLSearchParams();
        body.set('client_key', this.clientKey);
        body.set('client_secret', this.clientSecret);
        body.set('token', accessToken);
        await fetch(this.revokeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
        });
    }
    async requestToken(body) {
        if (!this.clientKey || !this.clientSecret) {
            throw new Error('Missing TikTok OAuth client configuration');
        }
        const response = await fetch(this.tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
        });
        const payload = await response.json();
        if (!response.ok) {
            this.logger.error(`TikTok token request failed (${response.status}): ${JSON.stringify(payload)}`);
            throw new Error('TikTok token request failed');
        }
        return payload;
    }
    toPublicMediaUrl(imageUrl) {
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            return imageUrl;
        }
        const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
        return `${this.publicUrl.replace(/\/$/, '')}${path}`;
    }
    async publishPhoto(content, imageUrl, accessToken) {
        const publicImageUrl = this.toPublicMediaUrl(imageUrl);
        const creatorInfo = await this.queryCreatorInfo(accessToken);
        const privacyLevel = creatorInfo.privacy_level_options?.includes('PUBLIC_TO_EVERYONE')
            ? 'PUBLIC_TO_EVERYONE'
            : creatorInfo.privacy_level_options?.[0] ?? 'SELF_ONLY';
        const initResponse = await this.apiPost('/v2/post/publish/content/init/', accessToken, {
            media_type: 'PHOTO',
            post_mode: 'DIRECT_POST',
            post_info: {
                title: content.slice(0, 90),
                description: content.slice(0, 4000),
                privacy_level: privacyLevel,
                disable_comment: false,
                auto_add_music: true,
                brand_content_toggle: false,
                brand_organic_toggle: false,
            },
            source_info: {
                source: 'PULL_FROM_URL',
                photo_cover_index: 0,
                photo_images: [publicImageUrl],
            },
        });
        if (initResponse.error?.code && initResponse.error.code !== 'ok') {
            return { success: false, reason: initResponse.error.code };
        }
        const publishId = initResponse.data?.publish_id;
        if (!publishId) {
            return { success: false, reason: 'missing_publish_id' };
        }
        const status = await this.pollPublishStatus(accessToken, publishId);
        return status.success
            ? { success: true, publishId }
            : { success: false, reason: status.reason ?? 'publish_failed' };
    }
    async queryCreatorInfo(accessToken) {
        const response = await this.apiPost('/v2/post/publish/creator_info/query/', accessToken, {});
        return response.data ?? { privacy_level_options: ['SELF_ONLY'] };
    }
    async pollPublishStatus(accessToken, publishId) {
        for (let attempt = 0; attempt < 12; attempt++) {
            await new Promise((r) => setTimeout(r, attempt === 0 ? 2000 : 5000));
            const response = await this.apiPost('/v2/post/publish/status/fetch/', accessToken, { publish_id: publishId });
            if (response.error?.code && response.error.code !== 'ok') {
                return { success: false, reason: response.error.code };
            }
            const status = response.data?.status;
            if (status === 'PUBLISH_COMPLETE')
                return { success: true };
            if (status === 'FAILED') {
                return { success: false, reason: response.data?.fail_reason ?? 'FAILED' };
            }
        }
        return { success: false, reason: 'publish_timeout' };
    }
    async apiPost(path, accessToken, body) {
        const response = await fetch(`${this.apiBase}${path}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json; charset=UTF-8',
            },
            body: JSON.stringify(body),
        });
        return (await response.json());
    }
};
exports.TikTokService = TikTokService;
exports.TikTokService = TikTokService = TikTokService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], TikTokService);
