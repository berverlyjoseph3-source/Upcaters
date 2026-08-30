// enterprise-ai-agent-platform/apps/api/src/auth/dto/refresh-token.dto.ts
import { z } from 'zod';

/**
 * Refresh Token Request DTO
 * Validates token refresh requests
 */
export const RefreshTokenDtoSchema = z.object({
  refreshToken: z.string()
    .min(10, 'Refresh token is required')
    .max(500, 'Refresh token too long'),
});

export type RefreshTokenDto = z.infer < typeof RefreshTokenDtoSchema > ;

/**
 * Refresh Token Response DTO
 */
export interface RefreshTokenResponseDto {
  success: boolean;
  data ? : {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: {
      id: string;
      email: string;
      name: string | null;
      planId: string;
      role: string;
    };
  };
  error ? : string;
  code ? : string;
}

/**
 * Refresh Token Validation Result
 */
export interface RefreshTokenValidationResult {
  valid: boolean;
  userId ? : string;
  sessionId ? : string;
  error ? : string;
  needsReauthentication ? : boolean;
}

/**
 * Token Rotation Info
 */
export interface TokenRotationInfo {
  previousTokenId: string;
  newTokenId: string;
  rotatedAt: Date;
  rotationCount: number;
  reason: 'expiry' | 'manual' | 'security';
}

/**
 * Refresh Token Payload
 */
export interface RefreshTokenPayload {
  sub: string; // User ID
  email: string;
  role: string;
  planId: string;
  type: 'refresh';
  jti: string; // Token ID for revocation
  sessionId: string; // Associated session ID
  rotationCount: number;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

/**
 * Refresh Token Config
 */
export const REFRESH_TOKEN_CONFIG = {
  expiresIn: '30d',
  maxRotationCount: 10, // Maximum times a token chain can be rotated
  rotationWindowMs: 5 * 60 * 1000, // 5 minutes - if token is used again within this window, suspect replay attack
  absoluteLifetime: 90 * 24 * 60 * 60 * 1000, // 90 days absolute maximum
};

/**
 * Token Blacklist Entry
 */
export interface TokenBlacklistEntry {
  tokenId: string;
  revokedAt: Date;
  revokedReason: 'logout' | 'refresh' | 'security' | 'admin';
  expiresAt: Date;
}

/**
 * Refresh Request Context
 */
export interface RefreshRequestContext {
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  previousRefreshTokenId ? : string;
}