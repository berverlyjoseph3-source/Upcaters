"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateApiKeyDtoSchema = exports.ResetPasswordDtoSchema = exports.ForgotPasswordDtoSchema = exports.ChangePasswordDtoSchema = exports.GoogleOAuthCallbackDtoSchema = exports.RefreshTokenDtoSchema = exports.RegisterDtoSchema = exports.LoginDtoSchema = void 0;
// enterprise-ai-agent-platform/apps/api/src/auth/dto/auth.dto.ts
const zod_1 = require("zod");
// Login DTO
exports.LoginDtoSchema = zod_1.z.object({
    email: zod_1.z.string()
        .email('Invalid email format')
        .min(1, 'Email is required')
        .max(255, 'Email too long')
        .transform(val => val.toLowerCase()),
    password: zod_1.z.string()
        .min(1, 'Password is required')
        .max(100, 'Password too long'),
    rememberMe: zod_1.z.boolean().optional().default(false),
});
// Register DTO
exports.RegisterDtoSchema = zod_1.z.object({
    email: zod_1.z.string()
        .email('Invalid email format')
        .min(1, 'Email is required')
        .max(255, 'Email too long')
        .transform(val => val.toLowerCase()),
    name: zod_1.z.string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name too long')
        .optional(),
    password: zod_1.z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(100, 'Password too long')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: zod_1.z.string(),
    acceptTerms: zod_1.z.boolean().refine(val => val === true, 'You must accept the terms and conditions'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});
// Refresh Token DTO
exports.RefreshTokenDtoSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token is required'),
});
// Google OAuth Callback DTO
exports.GoogleOAuthCallbackDtoSchema = zod_1.z.object({
    code: zod_1.z.string().min(1, 'Authorization code is required'),
    redirectUri: zod_1.z.string().url().optional(),
});
// Change Password DTO
exports.ChangePasswordDtoSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1, 'Current password is required'),
    newPassword: zod_1.z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(100, 'Password too long')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmNewPassword: zod_1.z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "New passwords don't match",
    path: ["confirmNewPassword"],
});
// Forgot Password DTO
exports.ForgotPasswordDtoSchema = zod_1.z.object({
    email: zod_1.z.string()
        .email('Invalid email format')
        .transform(val => val.toLowerCase()),
});
// Reset Password DTO
exports.ResetPasswordDtoSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Reset token is required'),
    newPassword: zod_1.z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(100, 'Password too long')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmNewPassword: zod_1.z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords don't match",
    path: ["confirmNewPassword"],
});
// API Key Create DTO
exports.CreateApiKeyDtoSchema = zod_1.z.object({
    name: zod_1.z.string()
        .min(1, 'Name is required')
        .max(100, 'Name too long'),
    permissions: zod_1.z.array(zod_1.z.string()).min(1, 'At least one permission is required'),
    rateLimit: zod_1.z.number().int().min(10).max(10000).optional(),
    expiresAt: zod_1.z.string().datetime().optional(),
});
//# sourceMappingURL=auth.dto.js.map