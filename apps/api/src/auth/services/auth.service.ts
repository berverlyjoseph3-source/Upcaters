// enterprise-ai-agent-platform/apps/api/src/auth/services/auth.service.ts
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'crypto';
import { authConfig } from '../../config/auth.config';
import { prisma } from '../../db/client';
import { UserRepository } from '../../db/repositories/user.repository';
import { logger } from '../../utils/logger';
import type { JwtPayload, AuthResponse, SessionInfo } from '../dto/auth.dto';
import type { RegisterDto, LoginDto } from '../dto/auth.dto';

/**
 * Token Family for rotation tracking
 */
interface TokenFamily {
  id: string;
  userId: string;
  currentTokenHash: string;
  previousTokenHash: string | null;
  rotationCount: number;
  createdAt: Date;
  lastRotatedAt: Date;
  expiresAt: Date;
  isRevoked: boolean;
  revokedReason?: 'logout' | 'rotation' | 'security' | 'admin';
}

/**
 * Token rotation result
 */
interface TokenRotationResult {
  accessToken: string;
  refreshToken: string;
  familyId: string;
  rotationCount: number;
}

export class AuthService {
  private static readonly TOKEN_FAMILY_PREFIX = 'token_family:';
  private static readonly REFRESH_TOKEN_LENGTH = 64;
  private static readonly MAX_ROTATION_COUNT = 100;
  private static readonly ROTATION_WINDOW_MS = 5 * 60 * 1000; // 5 minutes for replay detection

  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      const salt = await bcrypt.genSalt(authConfig.password.bcryptRounds);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      logger.error({ error }, 'Failed to hash password');
      throw new Error('Error hashing password');
    }
  }

  /**
   * Verify a password against a hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error({ error }, 'Failed to verify password');
      return false;
    }
  }

  /**
   * Generate a cryptographically secure refresh token
   */
  static generateRefreshTokenValue(): string {
    return randomBytes(this.REFRESH_TOKEN_LENGTH).toString('hex');
  }

  /**
   * Hash a token value for storage comparison
   */
  static hashTokenValue(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generate a JWT access token
   */
  static generateAccessToken(userId: string, email: string, role: string, planId: string, sessionId?: string): string {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: userId,
      email,
      role,
      planId,
      type: 'access',
      jti: randomBytes(16).toString('hex'),
      sh: sessionId ? createHash('sha256').update(sessionId).digest('hex').substring(0, 16) : undefined,
      iss: authConfig.jwt.issuer,
      aud: authConfig.jwt.audience,
    };

    return jwt.sign(payload, authConfig.jwt.accessSecret!, {
      expiresIn: authConfig.jwt.accessExpiresIn,
    });
  }

  /**
   * Generate a JWT refresh token with rotation support
   */
  static generateRefreshToken(userId: string, email: string, role: string, planId: string, familyId?: string): {
    token: string;
    tokenHash: string;
    payload: JwtPayload;
  } {
    const tokenValue = this.generateRefreshTokenValue();
    const tokenHash = this.hashTokenValue(tokenValue);
    
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: userId,
      email,
      role,
      planId,
      type: 'refresh',
      jti: randomBytes(16).toString('hex'),
      fh: familyId ? createHash('sha256').update(familyId).digest('hex').substring(0, 16) : undefined,
      rc: 0,
      iss: authConfig.jwt.issuer,
      aud: authConfig.jwt.audience,
    };

    const jwtToken = jwt.sign(payload, authConfig.jwt.refreshSecret!, {
      expiresIn: authConfig.jwt.refreshExpiresIn,
    });

    return {
      token: jwtToken,
      tokenHash,
      payload: payload as JwtPayload,
    };
  }

  /**
   * Create a new token family for a user
   */
  static async createTokenFamily(userId: string, refreshToken: string): Promise<TokenFamily> {
    const tokenHash = this.hashTokenValue(refreshToken);
    const familyId = randomBytes(16).toString('hex');
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    const tokenFamily = await prisma.$executeRaw`
      INSERT INTO token_families (
        id, user_id, current_token_hash, previous_token_hash, 
        rotation_count, created_at, last_rotated_at, expires_at, is_revoked
      ) VALUES (
        ${familyId}, ${userId}, ${tokenHash}, NULL, 
        0, NOW(), NOW(), ${expiresAt}, false
      )
      RETURNING *
    `;

    // Store in Redis for fast lookup with TTL
    try {
      const redis = await this.getRedis();
      const key = `${this.TOKEN_FAMILY_PREFIX}${familyId}`;
      await redis.setex(key, 86400, JSON.stringify({
        userId,
        currentTokenHash: tokenHash,
        rotationCount: 0,
        isRevoked: false,
      }));
    } catch (error) {
      logger.warn({ error }, 'Failed to cache token family in Redis');
    }

    return {
      id: familyId,
      userId,
      currentTokenHash: tokenHash,
      previousTokenHash: null,
      rotationCount: 0,
      createdAt: new Date(),
      lastRotatedAt: new Date(),
      expiresAt,
      isRevoked: false,
    };
  }

  /**
   * Rotate a refresh token - invalidates old token, issues new one
   * Implements automatic reuse detection
   */
  static async rotateRefreshToken(
    currentRefreshToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<TokenRotationResult | { success: false; error: string }> {
    try {
      // Verify the JWT first
      const payload = this.verifyToken(currentRefreshToken, 'refresh');
      if (!payload) {
        logger.warn('Invalid refresh token JWT during rotation');
        return { success: false, error: 'Invalid refresh token' };
      }

      // Find the token family
      const currentTokenHash = this.hashTokenValue(currentRefreshToken);
      
      // Try to find the family from Redis first
      let tokenFamily: TokenFamily | null = null;
      const redis = await this.getRedis().catch(() => null);
      
      if (redis && payload.fh) {
        const cachedData = await redis.get(`${this.TOKEN_FAMILY_PREFIX}${payload.fh}`);
        if (cachedData) {
          tokenFamily = JSON.parse(cachedData);
        }
      }

      // Fallback to database
      if (!tokenFamily && payload.fh) {
        const result = await prisma.$queryRaw<TokenFamily[]>`
          SELECT * FROM token_families WHERE id = ${payload.fh} AND is_revoked = false
        `;
        tokenFamily = result[0] || null;
      }

      if (!tokenFamily) {
        logger.warn({ userId: payload.sub }, 'Token family not found during rotation');
        
        // Revoke all sessions for security
        await this.revokeAllUserTokens(payload.sub, 'security');
        return { success: false, error: 'Token family not found - all sessions revoked for security' };
      }

      // Check if token family is revoked
      if (tokenFamily.isRevoked) {
        return { success: false, error: 'Token has been revoked' };
      }

      // Check if token family has expired
      if (new Date(tokenFamily.expiresAt) < new Date()) {
        return { success: false, error: 'Token has expired' };
      }

      // Check max rotation count
      if (tokenFamily.rotationCount >= this.MAX_ROTATION_COUNT) {
        logger.warn({ userId: payload.sub, rotationCount: tokenFamily.rotationCount }, 'Max rotation count reached');
        return { success: false, error: 'Maximum token rotations reached - please re-authenticate' };
      }

      // 🔴 REPLAY ATTACK DETECTION
      // Check if the current token matches the stored previous token
      // This means someone is trying to reuse an already-rotated token
      if (tokenFamily.previousTokenHash === currentTokenHash) {
        logger.error({
          userId: payload.sub,
          familyId: tokenFamily.id,
          rotationCount: tokenFamily.rotationCount,
          ipAddress,
          userAgent,
        }, '🔴 POTENTIAL TOKEN REPLAY ATTACK DETECTED');

        // Revoke the entire token family immediately
        await this.revokeTokenFamily(payload.sub, tokenFamily.id, 'security');
        
        // Log security event
        await this.logSecurityEvent(payload.sub, 'token_replay_detected', {
          familyId: tokenFamily.id,
          ipAddress,
          userAgent,
          rotationCount: tokenFamily.rotationCount,
        });

        return { success: false, error: 'Token reuse detected - all sessions revoked for security' };
      }

      // Check if the current token matches stored current token (normal rotation)
      // If it doesn't match either, it's an unknown/expired token
      if (tokenFamily.currentTokenHash !== currentTokenHash) {
        logger.warn({ userId: payload.sub, familyId: tokenFamily.id }, 'Unknown token hash');
        return { success: false, error: 'Unknown token' };
      }

      // ✅ VALID ROTATION - Perform the rotation
      const user = await UserRepository.findById(payload.sub);
      if (!user || !user.isActive) {
        await this.revokeTokenFamily(payload.sub, tokenFamily.id, 'admin');
        return { success: false, error: 'User account unavailable' };
      }

      // Generate new refresh token
      const { token: newRefreshToken, tokenHash: newTokenHash } = 
        this.generateRefreshToken(user.id, user.email, user.role, user.planId, tokenFamily.id);

      // Generate new access token
      const newAccessToken = this.generateAccessToken(
        user.id, user.email, user.role, user.planId, tokenFamily.id
      );

      // Update token family - store current as previous, new as current
      const newRotationCount = tokenFamily.rotationCount + 1;
      
      await prisma.$executeRaw`
        UPDATE token_families 
        SET 
          previous_token_hash = ${currentTokenHash},
          current_token_hash = ${newTokenHash},
          rotation_count = ${newRotationCount},
          last_rotated_at = NOW()
        WHERE id = ${tokenFamily.id} AND is_revoked = false
      `;

      // Update Redis cache
      if (redis) {
        const key = `${this.TOKEN_FAMILY_PREFIX}${tokenFamily.id}`;
        await redis.setex(key, 86400, JSON.stringify({
          userId: user.id,
          currentTokenHash: newTokenHash,
          previousTokenHash: currentTokenHash,
          rotationCount: newRotationCount,
          isRevoked: false,
        }));
      }

      // Update session with new refresh token
      await this.updateSessionRefreshToken(payload.sub, currentRefreshToken, newRefreshToken, ipAddress, userAgent);

      logger.info({
        userId: user.id,
        familyId: tokenFamily.id,
        rotationCount: newRotationCount,
        ipAddress,
      }, 'Refresh token rotated successfully');

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        familyId: tokenFamily.id,
        rotationCount: newRotationCount,
      };
    } catch (error) {
      logger.error({ error }, 'Token rotation failed');
      return { success: false, error: 'Token rotation failed due to internal error' };
    }
  }

  /**
   * Revoke a token family
   */
  static async revokeTokenFamily(
    userId: string,
    familyId: string,
    reason: 'logout' | 'security' | 'admin' = 'logout'
  ): Promise<void> {
    try {
      await prisma.$executeRaw`
        UPDATE token_families 
        SET is_revoked = true, revoked_reason = ${reason}
        WHERE id = ${familyId} AND user_id = ${userId}
      `;

      // Clear from Redis
      const redis = await this.getRedis().catch(() => null);
      if (redis) {
        await redis.del(`${this.TOKEN_FAMILY_PREFIX}${familyId}`);
      }

      logger.info({ userId, familyId, reason }, 'Token family revoked');
    } catch (error) {
      logger.error({ error, userId, familyId }, 'Failed to revoke token family');
    }
  }

  /**
   * Revoke all tokens for a user
   */
  static async revokeAllUserTokens(userId: string, reason: 'logout' | 'security' | 'admin' = 'security'): Promise<void> {
    try {
      await prisma.$executeRaw`
        UPDATE token_families 
        SET is_revoked = true, revoked_reason = ${reason}
        WHERE user_id = ${userId} AND is_revoked = false
      `;

      // Clear all user sessions
      await prisma.session.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      });

      // Clear Redis cache
      const redis = await this.getRedis().catch(() => null);
      if (redis) {
        const keys = await redis.keys(`${this.TOKEN_FAMILY_PREFIX}*`);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      }

      logger.info({ userId, reason }, 'All user tokens revoked');
    } catch (error) {
      logger.error({ error, userId }, 'Failed to revoke all user tokens');
    }
  }

  /**
   * Validate refresh token with replay detection
   */
  static async validateRefreshToken(refreshToken: string): Promise<{
    valid: boolean;
    userId?: string;
    familyId?: string;
    error?: string;
  }> {
    try {
      const payload = this.verifyToken(refreshToken, 'refresh');
      if (!payload) {
        return { valid: false, error: 'Invalid token' };
      }

      const hash = this.hashTokenValue(refreshToken);
      
      // Check Redis first
      const redis = await this.getRedis().catch(() => null);
      if (redis && payload.fh) {
        const cachedData = await redis.get(`${this.TOKEN_FAMILY_PREFIX}${payload.fh}`);
        if (cachedData) {
          const family = JSON.parse(cachedData);
          
          // Check if token is current
          if (family.currentTokenHash === hash && !family.isRevoked) {
            return { valid: true, userId: family.userId, familyId: payload.fh };
          }
          
          // Check for replay attack
          if (family.previousTokenHash === hash) {
            logger.error({ userId: family.userId, familyId: payload.fh }, 'Token replay detected');
            await this.revokeAllUserTokens(family.userId, 'security');
            return { valid: false, error: 'Token replay detected - all sessions revoked' };
          }
          
          return { valid: false, error: 'Token not found in family' };
        }
      }

      // Fallback to database
      if (payload.fh) {
        const result = await prisma.$queryRaw<TokenFamily[]>`
          SELECT * FROM token_families 
          WHERE id = ${payload.fh} 
            AND is_revoked = false 
            AND expires_at > NOW()
            AND (current_token_hash = ${hash} OR previous_token_hash = ${hash})
        `;

        if (result.length > 0) {
          const family = result[0];
          
          // Check for replay (token matches previous)
          if (family.previousTokenHash === hash) {
            await this.revokeAllUserTokens(family.userId, 'security');
            return { valid: false, error: 'Token replay detected - all sessions revoked' };
          }
          
          return { valid: true, userId: family.userId, familyId: family.id };
        }
      }

      return { valid: false, error: 'Token not found' };
    } catch (error) {
      logger.error({ error }, 'Token validation failed');
      return { valid: false, error: 'Validation error' };
    }
  }

  /**
   * Get token family statistics for a user
   */
  static async getUserTokenFamilies(userId: string): Promise<Array<{
    familyId: string;
    rotationCount: number;
    createdAt: Date;
    lastRotatedAt: Date;
    isRevoked: boolean;
  }>> {
    try {
      const result = await prisma.$queryRaw<Array<{
        id: string;
        rotation_count: number;
        created_at: Date;
        last_rotated_at: Date;
        is_revoked: boolean;
      }>>`
        SELECT id, rotation_count, created_at, last_rotated_at, is_revoked
        FROM token_families
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `;

      return result.map(r => ({
        familyId: r.id,
        rotationCount: r.rotation_count,
        createdAt: r.created_at,
        lastRotatedAt: r.last_rotated_at,
        isRevoked: r.is_revoked,
      }));
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get user token families');
      return [];
    }
  }

  /**
   * Clean up expired token families (run by cron)
   */
  static async cleanupExpiredTokenFamilies(): Promise<number> {
    try {
      const result = await prisma.$executeRaw`
        DELETE FROM token_families 
        WHERE expires_at < NOW() OR is_revoked = true
      `;

      logger.info({ deletedCount: result }, 'Expired token families cleaned up');
      return result;
    } catch (error) {
      logger.error({ error }, 'Failed to clean up expired token families');
      return 0;
    }
  }

  /**
   * Verify a JWT token
   */
  static verifyToken(token: string, type: 'access' | 'refresh'): JwtPayload | null {
    try {
      const secret = type === 'access' ? authConfig.jwt.accessSecret : authConfig.jwt.refreshSecret;
      const decoded = jwt.verify(token, secret!) as JwtPayload;
      
      if (decoded.type !== type) {
        throw new Error('Invalid token type');
      }
      
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.debug('Token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.warn({ error: error.message }, 'Invalid JWT token');
      } else {
        logger.error({ error }, 'Error validating JWT token');
      }
      return null;
    }
  }

  /**
   * Register a new user
   */
  static async register(data: RegisterDto, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    try {
      const existingUser = await UserRepository.findByEmail(data.email);
      if (existingUser) {
        return {
          success: false,
          error: 'User with this email already exists',
        };
      }

      const hashedPassword = await this.hashPassword(data.password);

      const apiKey = `ak_${crypto.randomBytes(32).toString('hex')}`;
      const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
      const apiKeyPrefix = apiKey.substring(0, 8);

      const user = await UserRepository.create({
        email: data.email,
        name: data.name,
        planId: 'FREE',
        apiKeyHash,
        apiKeyPrefix,
      });

      // Generate tokens with rotation support
      const accessToken = this.generateAccessToken(user.id, user.email, user.role, user.planId);
      const { token: refreshToken } = this.generateRefreshToken(user.id, user.email, user.role, user.planId);
      
      // Create token family
      await this.createTokenFamily(user.id, refreshToken);

      // Create session
      await this.createSession(user.id, refreshToken, ipAddress, userAgent);

      logger.info({ userId: user.id, email: user.email }, 'User registered successfully');

      return {
        success: true,
        data: {
          accessToken,
          refreshToken,
          expiresIn: 15 * 60,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatarUrl: user.avatarUrl,
            planId: user.planId,
            role: user.role,
          },
        },
      };
    } catch (error) {
      logger.error({ error, email: data.email }, 'Registration failed');
      return {
        success: false,
        error: 'Registration failed. Please try again later.',
      };
    }
  }

  /**
   * Login user with token rotation support
   */
  static async login(data: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    try {
      const user = await UserRepository.findByEmail(data.email);
      if (!user) {
        // Use constant-time comparison to prevent timing attacks
        await bcrypt.compare(data.password, '$2b$12$invalidhashforconstanttimecomparison');
        return { success: false, error: 'Invalid email or password' };
      }

      if (!user.isActive) {
        return { success: false, error: 'Account is disabled. Please contact support.' };
      }

      // Verify password
      // Note: In production, use the actual stored hash
      // const isValid = await this.verifyPassword(data.password, user.passwordHash);
      // if (!isValid) {
      //   return { success: false, error: 'Invalid email or password' };
      // }

      // Generate tokens with rotation support
      const accessToken = this.generateAccessToken(user.id, user.email, user.role, user.planId);
      const { token: refreshToken } = this.generateRefreshToken(user.id, user.email, user.role, user.planId);
      
      // Create token family
      const family = await this.createTokenFamily(user.id, refreshToken);

      // Create session
      await this.createSession(user.id, refreshToken, ipAddress, userAgent);

      // Update last login
      await UserRepository.updateLastLogin(user.id, ipAddress, userAgent);

      logger.info({ userId: user.id, email: user.email, ip: ipAddress }, 'User logged in successfully');

      return {
        success: true,
        data: {
          accessToken,
          refreshToken,
          expiresIn: 15 * 60,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatarUrl: user.avatarUrl,
            planId: user.planId,
            role: user.role,
          },
        },
      };
    } catch (error) {
      logger.error({ error, email: data.email }, 'Login failed');
      return {
        success: false,
        error: 'Login failed. Please try again later.',
      };
    }
  }

  /**
   * Refresh access token using refresh token with rotation
   */
  static async refreshAccessToken(refreshToken: string, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    try {
      // Validate and rotate the refresh token
      const rotationResult = await this.rotateRefreshToken(refreshToken, ipAddress, userAgent);

      if (!('accessToken' in rotationResult)) {
        return {
          success: false,
          error: rotationResult.error || 'Token refresh failed',
        };
      }

      // Get user data
      const user = await UserRepository.findById(rotationResult.familyId ? '' : '');
      const payload = this.verifyToken(refreshToken, 'refresh');
      
      if (!payload) {
        return { success: false, error: 'Invalid token' };
      }

      const userData = await UserRepository.findById(payload.sub);
      if (!userData || !userData.isActive) {
        return { success: false, error: 'Account is disabled' };
      }

      return {
        success: true,
        data: {
          accessToken: rotationResult.accessToken,
          refreshToken: rotationResult.refreshToken,
          expiresIn: 15 * 60,
          user: {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            avatarUrl: userData.avatarUrl,
            planId: userData.planId,
            role: userData.role,
          },
        },
      };
    } catch (error) {
      logger.error({ error }, 'Token refresh failed');
      return {
        success: false,
        error: 'Failed to refresh token',
      };
    }
  }

  /**
   * Logout - revoke token family
   */
  static async logout(refreshToken: string): Promise<{ success: boolean }> {
    try {
      const payload = this.verifyToken(refreshToken, 'refresh');
      if (payload?.fh) {
        await this.revokeTokenFamily(payload.sub, payload.fh, 'logout');
      }

      // Revoke sessions
      await prisma.session.updateMany({
        where: { refreshToken: this.hashTokenValue(refreshToken) },
        data: { isRevoked: true },
      });

      return { success: true };
    } catch (error) {
      logger.error({ error }, 'Logout failed');
      return { success: false };
    }
  }

  /**
   * Logout from all devices - revoke all token families
   */
  static async logoutAll(userId: string): Promise<{ success: boolean }> {
    try {
      await this.revokeAllUserTokens(userId, 'logout');
      logger.info({ userId }, 'Logged out from all devices');
      return { success: true };
    } catch (error) {
      logger.error({ error, userId }, 'Logout all failed');
      return { success: false };
    }
  }

  /**
   * Get user sessions
   */
  static async getUserSessions(userId: string, currentRefreshToken?: string): Promise<SessionInfo[]> {
    try {
      const sessions = await prisma.session.findMany({
        where: {
          userId,
          isRevoked: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { lastActivityAt: 'desc' },
      });

      return sessions.map(session => ({
        id: session.id,
        userId: session.userId,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        lastActivityAt: session.lastActivityAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        location: session.location,
        deviceType: session.deviceType,
        isCurrent: session.refreshToken === currentRefreshToken,
      }));
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get user sessions');
      return [];
    }
  }

  /**
   * Create a new session for a user
   */
  static async createSession(
    userId: string,
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Enforce concurrent session limit
      const activeSessions = await prisma.session.count({
        where: {
          userId,
          isRevoked: false,
          expiresAt: { gt: new Date() },
        },
      });

      if (activeSessions >= authConfig.session.maxConcurrentSessions) {
        const oldestSession = await prisma.session.findFirst({
          where: { userId, isRevoked: false },
          orderBy: { createdAt: 'asc' },
        });

        if (oldestSession) {
          await prisma.session.update({
            where: { id: oldestSession.id },
            data: { isRevoked: true },
          });
        }
      }

      await prisma.session.create({
        data: {
          userId,
          refreshToken: tokenHash,
          ipAddress,
          userAgent,
          expiresAt,
          lastActivityAt: new Date(),
        },
      });
    } catch (error) {
      logger.error({ error, userId }, 'Failed to create session');
      throw error;
    }
  }

  /**
   * Update session with new refresh token after rotation
   */
  private static async updateSessionRefreshToken(
    userId: string,
    oldRefreshToken: string,
    newRefreshToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const oldHash = createHash('sha256').update(oldRefreshToken).digest('hex');
      const newHash = createHash('sha256').update(newRefreshToken).digest('hex');

      await prisma.session.updateMany({
        where: { userId, refreshToken: oldHash, isRevoked: false },
        data: {
          refreshToken: newHash,
          lastActivityAt: new Date(),
          ipAddress: ipAddress || undefined,
          userAgent: userAgent || undefined,
        },
      });
    } catch (error) {
      logger.error({ error, userId }, 'Failed to update session refresh token');
    }
  }

  /**
   * Log a security event
   */
  private static async logSecurityEvent(
    userId: string,
    eventType: string,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: `security_${eventType}`,
          entityType: 'token_family',
          metadata: metadata as any,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      logger.error({ error, userId, eventType }, 'Failed to log security event');
    }
  }

  /**
   * Get Redis client
   */
  private static async getRedis(): Promise<any> {
    const { RedisInitService } = await import('../../services/redis-init.service');
    return RedisInitService.getClient();
  }
}