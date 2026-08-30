"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REFRESH_TOKEN_CONFIG = exports.RefreshTokenDtoSchema = void 0;
// enterprise-ai-agent-platform/apps/api/src/auth/dto/refresh-token.dto.ts
const zod_1 = require("zod");
/**
 * Refresh Token Request DTO
 * Validates token refresh requests
 */
exports.RefreshTokenDtoSchema = zod_1.z.object({
    refreshToken: zod_1.z.string()
        .min(10, 'Refresh token is required')
        .max(500, 'Refresh token too long'),
});
/**
 * Refresh Token Config
 */
exports.REFRESH_TOKEN_CONFIG = {
    expiresIn: '30d',
    maxRotationCount: 10, // Maximum times a token chain can be rotated
    rotationWindowMs: 5 * 60 * 1000, // 5 minutes - if token is used again within this window, suspect replay attack
    absoluteLifetime: 90 * 24 * 60 * 60 * 1000, // 90 days absolute maximum
};
//# sourceMappingURL=refresh-token.dto.js.map