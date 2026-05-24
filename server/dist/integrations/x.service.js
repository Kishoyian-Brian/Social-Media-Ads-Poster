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
var XService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.XService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let XService = XService_1 = class XService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(XService_1.name);
        this.bearerToken = this.config.get('X_BEARER_TOKEN');
        this.apiUrl = this.config.get('X_API_URL') ?? 'https://api.twitter.com/2/tweets';
        this.clientId = this.config.get('X_CLIENT_ID');
        this.clientSecret = this.config.get('X_CLIENT_SECRET');
        this.redirectUri = this.config.get('X_OAUTH_REDIRECT_URI');
        this.authUrl = this.config.get('X_OAUTH_AUTHORIZE_URL') ?? 'https://twitter.com/i/oauth2/authorize';
        this.tokenUrl = this.config.get('X_OAUTH_TOKEN_URL') ?? 'https://api.twitter.com/2/oauth2/token';
        this.scopes = this.config.get('X_OAUTH_SCOPES') ?? 'tweet.read tweet.write users.read offline.access';
    }
    getOAuthUrl(state, codeChallenge) {
        if (!this.clientId || !this.redirectUri) {
            throw new Error('Missing X OAuth client configuration');
        }
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            scope: this.scopes,
            state,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
        });
        return `${this.authUrl}?${params.toString()}`;
    }
    async exchangeCode(code, codeVerifier) {
        if (!this.clientId || !this.clientSecret || !this.redirectUri) {
            throw new Error('Missing X OAuth client configuration');
        }
        const body = new URLSearchParams();
        body.set('grant_type', 'authorization_code');
        body.set('code', code);
        body.set('redirect_uri', this.redirectUri);
        body.set('client_id', this.clientId);
        body.set('client_secret', this.clientSecret);
        body.set('code_verifier', codeVerifier);
        const response = await fetch(this.tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        });
        const payload = await response.json();
        if (!response.ok) {
            this.logger.error(`X token exchange failed (${response.status}): ${JSON.stringify(payload)}`);
            throw new Error('Failed to exchange X OAuth code');
        }
        return payload;
    }
    async publishAd(content, imageUrl, userToken) {
        const token = userToken ?? this.bearerToken;
        if (!token) {
            this.logger.warn('No X token available for publish. Skipping X publish.');
            return { success: false, reason: 'missing_token' };
        }
        const body = { text: content };
        if (imageUrl) {
            body.media = { media_urls: [imageUrl] };
        }
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });
            const payload = await response.text();
            if (!response.ok) {
                this.logger.error(`X publish failed (${response.status}): ${payload}`);
                return { success: false, reason: 'http_error', status: response.status, payload };
            }
            this.logger.log(`X publish succeeded: ${payload}`);
            return { success: true, data: JSON.parse(payload) };
        }
        catch (error) {
            this.logger.error('X publish exception', error);
            return { success: false, reason: 'exception', error: String(error) };
        }
    }
};
exports.XService = XService;
exports.XService = XService = XService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], XService);
