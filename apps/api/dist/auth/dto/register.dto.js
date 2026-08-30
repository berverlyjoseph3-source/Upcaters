"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NAME_VALIDATION = exports.PASSWORD_VALIDATION = exports.EMAIL_VALIDATION = exports.RegisterDtoSchema = void 0;
// enterprise-ai-agent-platform/apps/api/src/auth/dto/register.dto.ts
const zod_1 = require("zod");
/**
 * Registration Request DTO
 * Validates new user registration data
 */
exports.RegisterDtoSchema = zod_1.z.object({
    email: zod_1.z.string()
        .min(1, 'Email is required')
        .max(255, 'Email must not exceed 255 characters')
        .email('Please provide a valid email address')
        .transform(val => val.toLowerCase().trim()),
    name: zod_1.z.string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name must not exceed 100 characters')
        .regex(/^[a-zA-Z\s\-']+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
        .optional(),
    password: zod_1.z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(100, 'Password must not exceed 100 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: zod_1.z.string()
        .min(1, 'Please confirm your password'),
    acceptTerms: zod_1.z.boolean()
        .refine(val => val === true, 'You must accept the Terms of Service and Privacy Policy'),
    acceptMarketing: zod_1.z.boolean()
        .optional()
        .default(false),
    referralCode: zod_1.z.string()
        .max(50, 'Referral code too long')
        .optional()
        .nullable(),
    planId: zod_1.z.enum(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'])
        .optional()
        .default('FREE'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});
/**
 * Email Validation Rules
 */
exports.EMAIL_VALIDATION = {
    // Disposable email domains (commonly used for abuse)
    disposableDomains: [
        'tempmail.com', '10minutemail.com', 'guerrillamail.com',
        'mailinator.com', 'yopmail.com', 'throwawaymail.com',
        'temp-mail.org', 'fakeinbox.com', 'getnada.com'
    ],
    // Allowed email providers (empty = all allowed)
    allowedProviders: [], // Empty means all providers allowed
    // Max length
    maxLength: 255,
    // Min length
    minLength: 5,
};
/**
 * Password Validation Rules
 */
exports.PASSWORD_VALIDATION = {
    minLength: 8,
    maxLength: 100,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    // Common passwords to reject
    commonPasswords: [
        'password123', 'admin123', '12345678', 'qwerty123',
        'letmein123', 'welcome123', 'passw0rd', '123456789',
        'password1', 'abc123456', 'admin1234', 'welcome1'
    ],
};
/**
 * Name Validation Rules
 */
exports.NAME_VALIDATION = {
    minLength: 2,
    maxLength: 100,
    allowedPattern: /^[a-zA-Z\s\-']+$/,
    reservedNames: ['admin', 'root', 'system', 'test', 'user'],
};
//# sourceMappingURL=register.dto.js.map