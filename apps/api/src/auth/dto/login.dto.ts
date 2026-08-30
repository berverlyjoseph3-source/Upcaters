// enterprise-ai-agent-platform/apps/api/src/auth/dto/login.dto.ts
import { z } from 'zod';

/**
 * Login Request DTO
 * Validates user login credentials
 */
export const LoginDtoSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .max(255, 'Email must not exceed 255 characters')
    .email('Please provide a valid email address')
    .transform(val => val.toLowerCase().trim()),
  
  password: z.string()
    .min(1, 'Password is required')
    .max(100, 'Password must not exceed 100 characters'),
  
  rememberMe: z.boolean()
    .optional()
    .default(false),
});

export type LoginDto = z.infer < typeof LoginDtoSchema > ;

/**
 * Login Response DTO
 */
export interface LoginResponseDto {
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
  code ? : string;
}

/**
 * Login Validation Result
 */
export interface LoginValidationResult {
  valid: boolean;
  user ? : {
    id: string;
    email: string;
    name: string | null;
    role: string;
    planId: string;
    isActive: boolean;
  };
  error ? : string;
  remainingAttempts ? : number;
  blockedUntil ? : Date;
}

/**
 * Login Attempt Tracking
 */
export interface LoginAttempt {
  count: number;
  firstAttemptAt: Date;
  lastAttemptAt: Date;
  blockedUntil: Date | null;
  ipAddress ? : string;
  userAgent ? : string;
}

/**
 * Login Rate Limit Config
 */
export const LOGIN_RATE_LIMIT = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  blockDurationMs: 30 * 60 * 1000, // 30 minutes block after max attempts
};

/**
 * Login Device Info
 */
export interface LoginDeviceInfo {
  ipAddress: string;
  userAgent: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'bot' | 'unknown';
  browser ? : string;
  os ? : string;
  location ? : string;
}

/**
 * Login History Entry
 */
export interface LoginHistoryEntry {
  id: string;
  userId: string;
  success: boolean;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  deviceType: string;
  location ? : string;
  failureReason ? : string;
}

/**
 * Session Info after login
 */
export interface LoginSessionInfo {
  sessionId: string;
  createdAt: Date;
  expiresAt: Date;
  deviceType: string;
  ipAddress: string;
  location ? : string;
}