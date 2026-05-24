"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePkcePair = generatePkcePair;
const crypto_1 = require("crypto");
function generatePkcePair() {
    const codeVerifier = (0, crypto_1.randomBytes)(32).toString('base64url');
    const codeChallenge = (0, crypto_1.createHash)('sha256').update(codeVerifier).digest('base64url');
    return { codeVerifier, codeChallenge };
}
