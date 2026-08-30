// enterprise-ai-agent-platform/apps/api/src/auth/dto/auth.dto.ts
import { z } from 'zod';

// Login DTO
export const LoginDtoSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .min(1, 'Email is required')
    .max(255, 'Email too long')
    .transform(val => val.toLowerCase()),
  password: z.string()
    .min(1, 'Password is required')
    .max(100, 'Password too long'),
  rememberMe: z.boolean().optional().default(false),
});

export type LoginDto = z.infer < typeof LoginDtoSchema > ;

// Register DTO
export const RegisterDtoSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .min(1, 'Email is required')
    .max(255, 'Email too long')
    .transform(val => val.toLowerCase()),
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long')
    .optional(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms and conditions'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type RegisterDto = z.infer < typeof RegisterDtoSchema > ;

// Refresh Token DTO
export const RefreshTokenDtoSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenDto = z.infer < typeof RefreshTokenDtoSchema > ;

// Google OAuth Callback DTO
export const GoogleOAuthCallbackDtoSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  redirectUri: z.string().url().optional(),
});

export type GoogleOAuthCallbackDto = z.infer < typeof GoogleOAuthCallbackDtoSchema > ;

// Change Password DTO
export const ChangePasswordDtoSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "New passwords don't match",
  path: ["confirmNewPassword"],
});

export type ChangePasswordDto = z.infer < typeof ChangePasswordDtoSchema > ;

// Forgot Password DTO
export const ForgotPasswordDtoSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .transform(val => val.toLowerCase()),
});

export type ForgotPasswordDto = z.infer < typeof ForgotPasswordDtoSchema > ;

// Reset Password DTO
export const ResetPasswordDtoSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "Passwords don't match",
  path: ["confirmNewPassword"],
});

export type ResetPasswordDto = z.infer < typeof ResetPasswordDtoSchema > ;

// API Key Create DTO
export const CreateApiKeyDtoSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long'),
  permissions: z.array(z.string()).min(1, 'At least one permission is required'),
  rateLimit: z.number().int().min(10).max(10000).optional(),
  expiresAt: z.string().datetime().optional(),
});

export type CreateApiKeyDto = z.infer < typeof CreateApiKeyDtoSchema > ;

// Response DTOs
export interface AuthResponse {
  success: boolean;
  data ? : {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: {
      id: string;
      email: string;
      name: string | null;
      avatarUrl: string | null;
      planId: string;
      role: string;
    };
  };
  error ? : string;
}

export interface ApiKeyResponse {
  id: string;
  name: string;
  key: string; // Only returned once at creation
  keyPrefix: string;
  permissions: string[];
  rateLimit: number;
  expiresAt: Date | null;
  createdAt: Date;
}

// Token Payload Interface
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: string;
  planId: string;
  type: 'access' | 'refresh';
  jti: string; // JWT ID for revocation
  sh?: string; // Session hash (access tokens) — sha256 of sessionId, truncated
  fh?: string; // Family hash (refresh tokens) — sha256 of familyId, truncated, for rotation tracking
  rc?: number; // Rotation count (refresh tokens)
  tb?: Record<string, unknown>; // Token binding (see TokenBinding in jwt.strategy.ts, cast at the call site)
  nbf?: number; // Standard JWT "not before" claim (unix seconds)
  iat ? : number;
  exp ? : number;
  iss ? : string;
  aud ? : string;
}

// Session Info Interface
export interface SessionInfo {
  id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  location: string | null;
  deviceType: string | null;
  isCurrent: boolean;
}