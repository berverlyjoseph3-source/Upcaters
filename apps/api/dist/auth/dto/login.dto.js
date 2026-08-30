"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOGIN_RATE_LIMIT = exports.LoginDtoSchema = void 0;
// enterprise-ai-agent-platform/apps/api/src/auth/dto/login.dto.ts
const zod_1 = require("zod");
/**
 * Login Request DTO
 * Validates user login credentials
 */
exports.LoginDtoSchema = zod_1.z.object({
    email: zod_1.z.string()
        .min(1, 'Email is required')
        .max(255, 'Email must not exceed 255 characters')
        .email('Please provide a valid email address')
        .transform(val => val.toLowerCase().trim()),
    password: zod_1.z.string()
        .min(1, 'Password is required')
        .max(100, 'Password must not exceed 100 characters'),
    rememberMe: zod_1.z.boolean()
        .optional()
        .default(false),
});
/**
 * Login Rate Limit Config
 */
exports.LOGIN_RATE_LIMIT = {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 30 * 60 * 1000, // 30 minutes block after max attempts
};
//# sourceMappingURL=login.dto.js.map