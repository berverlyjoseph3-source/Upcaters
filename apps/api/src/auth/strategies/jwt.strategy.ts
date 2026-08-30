// enterprise-ai-agent-platform/apps/api/src/auth/strategies/jwt.strategy.ts
import { Request } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { authConfig } from '../../config/auth.config';
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import type { JwtPayload } from '../dto/auth.dto';

// ============================================
// JWT Configuration
// ============================================

interface JWTValidationOptions {
  validateAudience?: boolean;
  validateIssuer?: boolean;
  validateExpiration?: boolean;
  validateNotBefore?: boolean;
  validateTokenBinding?: boolean;
  clockTolerance?: number;
}

const DEFAULT_VALIDATION_OPTIONS: JWTValidationOptions = {
  validateAudience: true,
  validateIssuer: true,
  validateExpiration: true,
  validateNotBefore: true,
  validateTokenBinding: true,
  clockTolerance: 30, // 30 seconds tolerance
};

// ============================================
// Token Binding
// ============================================

interface TokenBinding {
  sessionHash: string;
  ipHash: string;
  userAgentHash: string;
  issuedAt: number;
}

export class JwtStrategy {
  /**
   * Extract JWT from Authorization header, cookie, or query
   */
  static extractTokenFromRequest(req: Request): string | null {
    // Method 1: Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token.length > 0) {
        return token;
      }
    }

    // Method 2: HTTP-only cookie
    if (req.cookies?.access_token) {
      return req.cookies.access_token;
    }

    // Method 3: Query parameter (for WebSocket connections, less secure)
    if (req.query?.token && typeof req.query.token === 'string') {
      logger.warn({ 
        method: 'query', 
        ip: req.ip, 
        path: req.path 
      }, 'JWT provided in query parameter - less secure');
      return req.query.token;
    }

    return null;
  }

  /**
   * Generate token binding hash
   */
  static generateTokenBinding(sessionId: string, ipAddress: string, userAgent: string): TokenBinding {
    return {
      sessionHash: crypto.createHash('sha256').update(sessionId).digest('hex').substring(0, 16),
      ipHash: crypto.createHash('sha256').update(ipAddress).digest('hex').substring(0, 16),
      userAgentHash: crypto.createHash('sha256').update(userAgent).digest('hex').substring(0, 16),
      issuedAt: Math.floor(Date.now() / 1000),
    };
  }

  /**
   * Verify token binding
   */
  static verifyTokenBinding(
    payload: JwtPayload,
    currentIp: string,
    currentUserAgent: string
  ): boolean {
    if (!payload.tb) return true; // No binding present (legacy token)

    const binding = payload.tb as TokenBinding;
    
    const currentIpHash = crypto.createHash('sha256').update(currentIp).digest('hex').substring(0, 16);
    const currentUaHash = crypto.createHash('sha256').update(currentUserAgent).digest('hex').substring(0, 16);

    // Check IP binding (allow same /24 subnet for mobile users)
    if (binding.ipHash !== currentIpHash) {
      // For mobile users, IP can change - warn but don't reject
      logger.warn({
        expectedIpHash: binding.ipHash,
        actualIpHash: currentIpHash,
      }, 'Token IP binding mismatch');
      
      // Still allow if user agent matches
      return binding.userAgentHash === currentUaHash;
    }

    // Check user agent binding
    if (binding.userAgentHash !== currentUaHash) {
      logger.warn({
        expectedUaHash: binding.userAgentHash,
        actualUaHash: currentUaHash,
      }, 'Token user agent binding mismatch');
      return false;
    }

    return true;
  }

  /**
   * Validate and decode JWT token
   */
  static validateToken(
    token: string,
    options: JWTValidationOptions = DEFAULT_VALIDATION_OPTIONS
  ): JwtPayload | null {
    try {
      // First decode without verification to check structure
      const decoded = jwt.decode(token, { complete: true });
      
      if (!decoded || !decoded.header) {
        logger.warn('Invalid JWT structure');
        return null;
      }

      // Check algorithm
      if (decoded.header.alg !== 'HS256' && decoded.header.alg !== 'HS512') {
        logger.warn({ alg: decoded.header.alg }, 'Invalid JWT algorithm');
        return null;
      }

      // Verify token
      const verifyOptions: jwt.VerifyOptions = {
        algorithms: ['HS256', 'HS512'],
        issuer: options.validateIssuer ? authConfig.jwt.issuer : undefined,
        audience: options.validateAudience ? authConfig.jwt.audience : undefined,
        clockTolerance: options.clockTolerance,
      };

      const payload = jwt.verify(token, authConfig.jwt.accessSecret!, verifyOptions) as JwtPayload;

      // Validate token type
      if (payload.type !== 'access') {
        logger.warn({ tokenType: payload.type }, 'Invalid token type - expected access token');
        return null;
      }

      // Check if token has been revoked (check session)
      if (payload.sh) {
        // Session hash check - verify session is still active
        const sessionValid = this.verifySessionHash(payload.sh, payload.sub);
        if (!sessionValid) {
          logger.warn({ userId: payload.sub }, 'Token session revoked');
          return null;
        }
      }

      // Check expiration
      if (options.validateExpiration && payload.exp) {
        const currentTime = Math.floor(Date.now() / 1000);
        if (payload.exp < currentTime) {
          logger.debug({ 
            tokenId: payload.jti, 
            expiredAt: new Date(payload.exp * 1000).toISOString() 
          }, 'Token expired');
          return null;
        }
      }

      // Check not before
      if (options.validateNotBefore && payload.nbf) {
        const currentTime = Math.floor(Date.now() / 1000);
        if (payload.nbf > currentTime + (options.clockTolerance || 0)) {
          logger.warn({ 
            tokenId: payload.jti, 
            nbf: new Date(payload.nbf * 1000).toISOString() 
          }, 'Token not yet valid');
          return null;
        }
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.debug({ expiredAt: error.expiredAt }, 'Token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.warn({ error: error.message }, 'Invalid JWT token');
      } else if (error instanceof jwt.NotBeforeError) {
        logger.warn({ date: error.date }, 'Token not yet active');
      } else {
        logger.error({ error }, 'Error validating JWT token');
      }
      return null;
    }
  }

  /**
   * Verify session hash
   */
  private static verifySessionHash(sessionHash: string, userId: string): boolean {
    // In production, check against active sessions
    // For now, return true (will be implemented with Redis session store)
    return true;
  }

  /**
   * Authenticate request
   */
  static async authenticate(req: Request): Promise<{
    valid: boolean;
    user?: {
      id: string;
      email: string;
      role: string;
      planId: string;
    };
    error?: string;
    errorCode?: string;
  }> {
    try {
      const token = this.extractTokenFromRequest(req);
      if (!token) {
        return {
          valid: false,
          error: 'No authentication token provided',
          errorCode: 'NO_TOKEN',
        };
      }

      const payload = this.validateToken(token);
      if (!payload) {
        return {
          valid: false,
          error: 'Invalid or expired token',
          errorCode: 'INVALID_TOKEN',
        };
      }

      // Verify token binding
      if (DEFAULT_VALIDATION_OPTIONS.validateTokenBinding && payload.tb) {
        const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';
        
        const bindingValid = this.verifyTokenBinding(payload, ipAddress, userAgent);
        if (!bindingValid) {
          logger.warn({ userId: payload.sub }, 'Token binding verification failed');
          return {
            valid: false,
            error: 'Token binding verification failed',
            errorCode: 'TOKEN_BINDING_FAILED',
          };
        }
      }

      // Verify user exists and is active
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          role: true,
          planId: true,
          isActive: true,
        },
      });

      if (!user) {
        return {
          valid: false,
          error: 'User not found',
          errorCode: 'USER_NOT_FOUND',
        };
      }

      if (!user.isActive) {
        return {
          valid: false,
          error: 'Account is disabled',
          errorCode: 'ACCOUNT_DISABLED',
        };
      }

      logger.debug({ userId: user.id, tokenId: payload.jti }, 'JWT authentication successful');

      return {
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          planId: user.planId,
        },
      };
    } catch (error) {
      logger.error({ error }, 'JWT authentication failed');
      return {
        valid: false,
        error: 'Authentication failed',
        errorCode: 'AUTH_ERROR',
      };
    }
  }

  /**
   * Check if token is about to expire (for proactive refresh)
   */
  static isTokenExpiringSoon(token: string, thresholdSeconds: number = 300): boolean {
    try {
      const decoded = jwt.decode(token) as JwtPayload;
      if (!decoded || !decoded.exp) return false;

      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = decoded.exp - currentTime;

      return timeUntilExpiry > 0 && timeUntilExpiry < thresholdSeconds;
    } catch (error) {
      logger.error({ error }, 'Failed to check token expiry');
      return false;
    }
  }

  /**
   * Get remaining time on token in seconds
   */
  static getTokenRemainingTime(token: string): number {
    try {
      const decoded = jwt.decode(token) as JwtPayload;
      if (!decoded || !decoded.exp) return 0;

      const currentTime = Math.floor(Date.now() / 1000);
      return Math.max(0, decoded.exp - currentTime);
    } catch (error) {
      logger.error({ error }, 'Failed to get token remaining time');
      return 0;
    }
  }

  /**
   * Decode token without verification
   */
  static decodeToken(token: string): Partial<JwtPayload> | null {
    try {
      const decoded = jwt.decode(token) as JwtPayload;
      if (!decoded) return null;

      return {
        sub: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        planId: decoded.planId,
        jti: decoded.jti,
        type: decoded.type,
        exp: decoded.exp,
        iat: decoded.iat,
        iss: decoded.iss,
        aud: decoded.aud,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to decode token');
      return null;
    }
  }

  /**
   * Check if token is blacklisted
   */
  static async isTokenBlacklisted(tokenId: string): Promise<boolean> {
    try {
      const result = await prisma.$queryRaw<Array<{ count: string }>>`
        SELECT COUNT(*) as count FROM token_blacklist 
        WHERE token_id = ${tokenId} AND expires_at > NOW()
      `;
      
      return parseInt(result[0]?.count || '0') > 0;
    } catch (error) {
      logger.error({ error, tokenId }, 'Failed to check token blacklist');
      return false;
    }
  }

  /**
   * Blacklist a token
   */
  static async blacklistToken(tokenId: string, reason: string, expiresAt?: Date): Promise<void> {
    try {
      const expiryDate = expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days default

      await prisma.$executeRaw`
        INSERT INTO token_blacklist (id, token_id, reason, expires_at, created_at)
        VALUES (${crypto.randomBytes(16).toString('hex')}, ${tokenId}, ${reason}, ${expiryDate}, NOW())
        ON CONFLICT (token_id) DO NOTHING
      `;
    } catch (error) {
      logger.error({ error, tokenId }, 'Failed to blacklist token');
    }
  }

  /**
   * Clean up expired blacklisted tokens
   */
  static async cleanupBlacklistedTokens(): Promise<number> {
    try {
      const result = await prisma.$executeRaw`
        DELETE FROM token_blacklist WHERE expires_at < NOW()
      `;
      
      if (result > 0) {
        logger.debug({ deletedCount: result }, 'Expired blacklisted tokens cleaned up');
      }
      
      return result;
    } catch (error) {
      logger.error({ error }, 'Failed to cleanup blacklisted tokens');
      return 0;
    }
  }
}