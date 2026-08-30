// enterprise-ai-agent-platform/apps/api/src/auth/guards/api-key-auth.guard.ts
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { authConfig } from '../../config/auth.config';
import { PLAN_LIMITS } from '../../db/types/database.types';

export interface ApiKeyRequest extends Request {
  apiKeyUser?: {
    id: string;
    email: string;
    planId: string;
    permissions: string[];
    rateLimit: number;
  };
}

// ============================================
// API Key Configuration
// ============================================

interface ApiKeyRotationPolicy {
  maxAgeDays: number;           // Maximum age before forced rotation
  rotationWarningDays: number;   // Days before expiry to warn user
  minRotationIntervalHours: number; // Minimum time between rotations
  maxRotationsPerDay: number;    // Maximum rotations allowed per day
}

interface ApiKeyRecord {
  id: string;
  userId: string;
  keyHash: string;
  keyPrefix: string;
  name: string;
  permissions: string[];
  rateLimit: number;
  lastUsedAt: Date | null;
  lastRotatedAt: Date | null;
  rotationCount: number;
  expiresAt: Date;
  isActive: boolean;
  createdAt: Date;
  revokedAt: Date | null;
  revokedReason?: string;
}

const API_KEY_ROTATION_POLICY: ApiKeyRotationPolicy = {
  maxAgeDays: 90,
  rotationWarningDays: 14,
  minRotationIntervalHours: 24,
  maxRotationsPerDay: 3,
};

// ============================================
// Rate limiting for API key operations
// ============================================

interface ApiKeyRateLimitRecord {
  count: number;
  windowStart: number;
  lastRequest: number;
}

const keyOperationLimits = new Map<string, ApiKeyRateLimitRecord>();
const KEY_OPERATION_WINDOW_MS = 3600000; // 1 hour
const MAX_KEY_OPERATIONS_PER_WINDOW = 5;

export class ApiKeyAuthGuard {
  /**
   * Extract API key from request headers
   * Supports: X-API-Key header or Authorization: Bearer <api-key>
   */
  static extractApiKey(req: Request): string | null {
    // Check X-API-Key header first
    const apiKeyHeader = req.headers['x-api-key'];
    if (apiKeyHeader && typeof apiKeyHeader === 'string') {
      const trimmed = apiKeyHeader.trim();
      if (trimmed.startsWith('ak_') && trimmed.length >= 10) {
        logger.debug({ method: 'header' }, 'API key extracted from X-API-Key header');
        return trimmed;
      }
    }

    // Check Authorization header with Bearer scheme
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token.startsWith('ak_') && token.length >= 10) {
        logger.debug({ method: 'bearer' }, 'API key extracted from Bearer token');
        return token;
      }
    }

    // Check query parameter (for GET requests only, less secure)
    if (req.method === 'GET') {
      const apiKeyQuery = req.query.api_key;
      if (apiKeyQuery && typeof apiKeyQuery === 'string') {
        const trimmed = apiKeyQuery.trim();
        if (trimmed.startsWith('ak_') && trimmed.length >= 10) {
          logger.warn({ 
            method: 'query', 
            ip: req.ip, 
            path: req.path 
          }, 'API key provided in query parameter - this is less secure');
          return trimmed;
        }
      }
    }

    return null;
  }

  /**
   * Validate API key format
   */
  static isValidFormat(apiKey: string): boolean {
    return /^ak_[a-f0-9]{64}$/.test(apiKey);
  }

  /**
   * Hash API key for storage comparison
   */
  static hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Extract prefix from API key
   */
  static getPrefix(apiKey: string): string {
    return apiKey.substring(0, 8);
  }

  /**
   * Check rate limit for API key operations (generation, rotation)
   */
  private static checkKeyOperationLimit(userId: string): { allowed: boolean; remaining: number; resetAfter: number } {
    const now = Date.now();
    const record = keyOperationLimits.get(userId);

    if (!record || now - record.windowStart > KEY_OPERATION_WINDOW_MS) {
      keyOperationLimits.set(userId, {
        count: 1,
        windowStart: now,
        lastRequest: now,
      });
      return { allowed: true, remaining: MAX_KEY_OPERATIONS_PER_WINDOW - 1, resetAfter: KEY_OPERATION_WINDOW_MS };
    }

    if (record.count >= MAX_KEY_OPERATIONS_PER_WINDOW) {
      const resetAfter = KEY_OPERATION_WINDOW_MS - (now - record.windowStart);
      return { allowed: false, remaining: 0, resetAfter: Math.ceil(resetAfter / 1000) };
    }

    record.count++;
    record.lastRequest = now;

    return {
      allowed: true,
      remaining: MAX_KEY_OPERATIONS_PER_WINDOW - record.count,
      resetAfter: Math.ceil((KEY_OPERATION_WINDOW_MS - (now - record.windowStart)) / 1000),
    };
  }

  /**
   * Validate API key and return associated user
   */
  static async validateApiKey(apiKey: string, req?: Request): Promise<{
    valid: boolean;
    user?: {
      id: string;
      email: string;
      planId: string;
      permissions: string[];
      rateLimit: number;
      apiKeyId?: string;
      warnings?: string[];
    };
    error?: string;
  }> {
    try {
      // Validate format first
      if (!this.isValidFormat(apiKey)) {
        logger.warn({ apiKeyPrefix: apiKey.substring(0, 8) }, 'Invalid API key format');
        return { valid: false, error: 'Invalid API key format' };
      }

      const keyHash = this.hashApiKey(apiKey);
      const keyPrefix = this.getPrefix(apiKey);

      // Find active API key
      const keyRecord = await prisma.$queryRaw<ApiKeyRecord[]>`
        SELECT * FROM api_keys 
        WHERE key_hash = ${keyHash} 
          AND key_prefix = ${keyPrefix}
          AND is_active = true
          AND expires_at > NOW()
      `;

      if (!keyRecord || keyRecord.length === 0) {
        logger.warn({ apiKeyPrefix: keyPrefix }, 'Invalid or expired API key');
        
        // Check if key exists but is expired
        const expiredKey = await prisma.$queryRaw<ApiKeyRecord[]>`
          SELECT * FROM api_keys 
          WHERE key_hash = ${keyHash}
            AND is_active = true
            AND expires_at <= NOW()
        `;

        if (expiredKey && expiredKey.length > 0) {
          return { valid: false, error: 'API key has expired. Please generate a new key.' };
        }

        return { valid: false, error: 'Invalid API key' };
      }

      const key = keyRecord[0];

      // Check if user is active
      const user = await prisma.user.findUnique({
        where: { id: key.userId, isActive: true },
        select: { id: true, email: true, planId: true, role: true, metadata: true },
      });

      if (!user) {
        return { valid: false, error: 'User account not found or inactive' };
      }

      // Check plan access
      const planConfig = PLAN_LIMITS[user.planId as keyof typeof PLAN_LIMITS];
      if (!planConfig || !planConfig.features.apiAccess) {
        return { 
          valid: false, 
          error: `API access not available on ${user.planId} plan. Please upgrade to PROFESSIONAL or higher.` 
        };
      }

      // Check if key needs rotation warning
      const warnings: string[] = [];
      const now = new Date();
      const warningDate = new Date(key.expiresAt);
      warningDate.setDate(warningDate.getDate() - API_KEY_ROTATION_POLICY.rotationWarningDays);

      if (now >= warningDate && now < key.expiresAt) {
        const daysRemaining = Math.ceil((key.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        warnings.push(`API key expires in ${daysRemaining} day(s). Please rotate your key soon.`);
      }

      // Check if key has exceeded max age
      const maxAgeDate = new Date(key.createdAt);
      maxAgeDate.setDate(maxAgeDate.getDate() + API_KEY_ROTATION_POLICY.maxAgeDays);

      if (now > maxAgeDate) {
        warnings.push(`API key has exceeded maximum age of ${API_KEY_ROTATION_POLICY.maxAgeDays} days. Rotation recommended.`);
      }

      // Update last used timestamp and user metadata
      const updatePromises = [];

      updatePromises.push(
        prisma.$executeRaw`
          UPDATE api_keys SET last_used_at = NOW() WHERE id = ${key.id}
        `
      );

      // Track usage in user metadata
      const metadata = (user.metadata as any) || {};
      metadata.lastApiKeyUse = new Date().toISOString();
      metadata.lastApiKeyIp = req?.ip;
      metadata.lastApiKeyUserAgent = req?.headers['user-agent']?.substring(0, 200);

      updatePromises.push(
        prisma.user.update({
          where: { id: user.id },
          data: { metadata },
        })
      );

      await Promise.all(updatePromises).catch(err => 
        logger.warn({ error: err.message }, 'Failed to update API key usage')
      );

      logger.info({ 
        userId: user.id, 
        planId: user.planId,
        apiKeyId: key.id,
        warningCount: warnings.length,
      }, 'API key validated successfully');

      return {
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          planId: user.planId,
          permissions: key.permissions || ['*'],
          rateLimit: key.rateLimit || authConfig.apiKey.rateLimitDefault,
          apiKeyId: key.id,
          warnings: warnings.length > 0 ? warnings : undefined,
        },
      };
    } catch (error) {
      logger.error({ error }, 'API key validation failed');
      return { valid: false, error: 'API key validation failed due to internal error' };
    }
  }

  /**
   * Check if API key has required permission
   */
  static hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    if (userPermissions.includes('*')) return true;
    if (userPermissions.includes(requiredPermission)) return true;
    
    const [requiredResource, requiredAction] = requiredPermission.split(':');
    for (const perm of userPermissions) {
      const [permResource, permAction] = perm.split(':');
      if (permResource === requiredResource && permAction === '*') return true;
    }
    
    return false;
  }

  /**
   * Generate new API key with rotation support
   */
  static async generateApiKey(
    userId: string,
    name: string,
    permissions: string[] = ['*'],
    rateLimit?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ apiKey: string; prefix: string; expiresAt: Date; warnings?: string[] } | { success: false; error: string }> {
    try {
      // Check rate limit for key generation
      const rateCheck = this.checkKeyOperationLimit(userId);
      if (!rateCheck.allowed) {
        return {
          success: false,
          error: `Rate limit exceeded. You can generate ${MAX_KEY_OPERATIONS_PER_WINDOW} keys per hour. Please wait ${rateCheck.resetAfter} seconds.`,
        };
      }

      // Check existing active keys
      const existingKeys = await prisma.$queryRaw<Array<{ count: string }>>`
        SELECT COUNT(*) as count FROM api_keys 
        WHERE user_id = ${userId} AND is_active = true
      `;

      const activeKeyCount = parseInt(existingKeys[0]?.count || '0');
      const MAX_ACTIVE_KEYS = 5;

      if (activeKeyCount >= MAX_ACTIVE_KEYS) {
        return {
          success: false,
          error: `Maximum of ${MAX_ACTIVE_KEYS} active API keys allowed. Please revoke an existing key first.`,
        };
      }

      // Validate user
      const user = await prisma.user.findUnique({
        where: { id: userId, isActive: true },
        select: { planId: true },
      });

      if (!user) {
        return { success: false, error: 'User not found or inactive' };
      }

      // Check plan allows API access
      const planConfig = PLAN_LIMITS[user.planId as keyof typeof PLAN_LIMITS];
      if (!planConfig || !planConfig.features.apiAccess) {
        return { success: false, error: 'API access not available on your current plan' };
      }

      // Generate new API key
      const randomBytes = crypto.randomBytes(32);
      const apiKey = `ak_${randomBytes.toString('hex')}`;
      const keyHash = this.hashApiKey(apiKey);
      const prefix = this.getPrefix(apiKey);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + API_KEY_ROTATION_POLICY.maxAgeDays);

      const permissionsToStore = permissions.includes('*') 
        ? ['*'] 
        : [...new Set(permissions)];

      // Store in database
      await prisma.$executeRaw`
        INSERT INTO api_keys (
          id, user_id, key_hash, key_prefix, name, 
          permissions, rate_limit, expires_at, created_at
        ) VALUES (
          ${randomBytes.toString('hex').substring(0, 16)},
          ${userId},
          ${keyHash},
          ${prefix},
          ${name},
          ${JSON.stringify(permissionsToStore)},
          ${rateLimit || authConfig.apiKey.rateLimitDefault},
          ${expiresAt},
          NOW()
        )
      `;

      // Update user metadata
      const userRecord = await prisma.user.findUnique({
        where: { id: userId },
        select: { metadata: true },
      });

      const metadata = (userRecord?.metadata as any) || {};
      metadata.lastApiKeyGenerated = new Date().toISOString();
      metadata.lastApiKeyGeneratedIp = ipAddress;
      metadata.lastApiKeyGeneratedUserAgent = userAgent;

      await prisma.user.update({
        where: { id: userId },
        data: { metadata },
      });

      // Log security event
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'api_key_generated',
          entityType: 'api_key',
          entityId: prefix,
          ipAddress,
          userAgent,
          metadata: { name, permissions: permissionsToStore, rateLimit } as any,
        },
      });

      logger.info({ userId, apiKeyPrefix: prefix, name }, 'New API key generated');

      return { apiKey, prefix, expiresAt };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to generate API key');
      return { success: false, error: 'Failed to generate API key' };
    }
  }

  /**
   * Rotate an existing API key
   */
  static async rotateApiKey(
    userId: string,
    currentKeyHash: string,
    name?: string,
    permissions?: string[],
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ newApiKey: string; prefix: string; expiresAt: Date } | { success: false; error: string }> {
    try {
      // Check rate limit for rotation
      const rateCheck = this.checkKeyOperationLimit(userId);
      if (!rateCheck.allowed) {
        return {
          success: false,
          error: `Rate limit exceeded. You can rotate keys ${MAX_KEY_OPERATIONS_PER_WINDOW} times per hour. Please wait ${rateCheck.resetAfter} seconds.`,
        };
      }

      // Find existing key
      const existingKey = await prisma.$queryRaw<ApiKeyRecord[]>`
        SELECT * FROM api_keys 
        WHERE user_id = ${userId} 
          AND key_hash = ${currentKeyHash}
          AND is_active = true
      `;

      if (!existingKey || existingKey.length === 0) {
        return { success: false, error: 'API key not found or already revoked' };
      }

      const key = existingKey[0];

      // Check minimum rotation interval
      if (key.lastRotatedAt) {
        const hoursSinceLastRotation = (Date.now() - new Date(key.lastRotatedAt).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastRotation < API_KEY_ROTATION_POLICY.minRotationIntervalHours) {
          return {
            success: false,
            error: `Please wait ${Math.ceil(API_KEY_ROTATION_POLICY.minRotationIntervalHours - hoursSinceLastRotation)} hours before rotating again.`,
          };
        }
      }

      // Check max rotations per day
      const todayRotations = await prisma.$queryRaw<Array<{ count: string }>>`
        SELECT COUNT(*) as count FROM api_keys 
        WHERE user_id = ${userId} 
          AND last_rotated_at >= CURRENT_DATE
      `;

      const rotationsToday = parseInt(todayRotations[0]?.count || '0');
      if (rotationsToday >= API_KEY_ROTATION_POLICY.maxRotationsPerDay) {
        return {
          success: false,
          error: `Maximum of ${API_KEY_ROTATION_POLICY.maxRotationsPerDay} rotations per day reached. Please try again tomorrow.`,
        };
      }

      // Generate new key
      const newRandomBytes = crypto.randomBytes(32);
      const newApiKey = `ak_${newRandomBytes.toString('hex')}`;
      const newKeyHash = this.hashApiKey(newApiKey);
      const newPrefix = this.getPrefix(newApiKey);

      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + API_KEY_ROTATION_POLICY.maxAgeDays);

      const permissionsToStore = permissions || key.permissions || ['*'];

      // Transaction: revoke old key, create new key
      await prisma.$transaction([
        prisma.$executeRaw`
          UPDATE api_keys 
          SET is_active = false, revoked_at = NOW(), revoked_reason = 'rotation'
          WHERE id = ${key.id}
        `,
        prisma.$executeRaw`
          INSERT INTO api_keys (
            id, user_id, key_hash, key_prefix, name, 
            permissions, rate_limit, last_rotated_at, rotation_count,
            expires_at, created_at
          ) VALUES (
            ${newRandomBytes.toString('hex').substring(0, 16)},
            ${userId},
            ${newKeyHash},
            ${newPrefix},
            ${name || key.name || 'Default'},
            ${JSON.stringify(permissionsToStore)},
            ${key.rateLimit || authConfig.apiKey.rateLimitDefault},
            NOW(),
            ${(key.rotationCount || 0) + 1},
            ${newExpiresAt},
            NOW()
          )
        `,
      ]);

      // Log security event
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'api_key_rotated',
          entityType: 'api_key',
          entityId: newPrefix,
          ipAddress,
          userAgent,
          metadata: { 
            oldPrefix: key.keyPrefix, 
            newPrefix,
            rotationCount: (key.rotationCount || 0) + 1,
          } as any,
        },
      });

      logger.info({ userId, oldPrefix: key.keyPrefix, newPrefix }, 'API key rotated successfully');

      return { newApiKey, prefix: newPrefix, expiresAt: newExpiresAt };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to rotate API key');
      return { success: false, error: 'Failed to rotate API key' };
    }
  }

  /**
   * Revoke API key
   */
  static async revokeApiKey(
    userId: string, 
    keyPrefix?: string,
    reason: string = 'manual',
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      let result;
      
      if (keyPrefix) {
        result = await prisma.$executeRaw`
          UPDATE api_keys 
          SET is_active = false, revoked_at = NOW(), revoked_reason = ${reason}
          WHERE user_id = ${userId} AND key_prefix = ${keyPrefix} AND is_active = true
        `;
      } else {
        // Revoke all keys
        result = await prisma.$executeRaw`
          UPDATE api_keys 
          SET is_active = false, revoked_at = NOW(), revoked_reason = ${reason}
          WHERE user_id = ${userId} AND is_active = true
        `;
      }

      // Log security event
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'api_key_revoked',
          entityType: 'api_key',
          entityId: keyPrefix || 'all',
          ipAddress,
          userAgent,
          metadata: { reason, revokedCount: result } as any,
        },
      });

      logger.info({ userId, keyPrefix: keyPrefix || 'all', reason, revokedCount: result }, 'API key(s) revoked');

      return { success: true };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to revoke API key');
      return { success: false, error: 'Failed to revoke API key' };
    }
  }

  /**
   * Get API key information for a user
   */
  static async getApiKeyInfo(userId: string): Promise<{
    activeKeys: Array<{
      id: string;
      name: string;
      prefix: string;
      permissions: string[];
      rateLimit: number;
      expiresAt: Date;
      createdAt: Date;
      lastUsedAt: Date | null;
      rotationCount: number;
      needsRotation: boolean;
      warnings: string[];
    }>;
    totalActiveKeys: number;
    maxActiveKeys: number;
    policy: ApiKeyRotationPolicy;
  }> {
    const keys = await prisma.$queryRaw<ApiKeyRecord[]>`
      SELECT * FROM api_keys 
      WHERE user_id = ${userId} AND is_active = true
      ORDER BY created_at DESC
    `;

    const now = new Date();
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + API_KEY_ROTATION_POLICY.rotationWarningDays);

    const activeKeys = keys.map(key => {
      const warnings: string[] = [];
      let needsRotation = false;

      if (key.expiresAt <= warningDate && key.expiresAt > now) {
        const daysRemaining = Math.ceil((key.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        warnings.push(`Expires in ${daysRemaining} day(s)`);
        needsRotation = true;
      }

      const maxAgeDate = new Date(key.createdAt);
      maxAgeDate.setDate(maxAgeDate.getDate() + API_KEY_ROTATION_POLICY.maxAgeDays);

      if (now > maxAgeDate) {
        warnings.push('Exceeded maximum key age');
        needsRotation = true;
      }

      return {
        id: key.id,
        name: key.name,
        prefix: key.keyPrefix,
        permissions: key.permissions,
        rateLimit: key.rateLimit,
        expiresAt: key.expiresAt,
        createdAt: key.createdAt,
        lastUsedAt: key.lastUsedAt,
        rotationCount: key.rotationCount || 0,
        needsRotation,
        warnings,
      };
    });

    return {
      activeKeys,
      totalActiveKeys: activeKeys.length,
      maxActiveKeys: 5,
      policy: API_KEY_ROTATION_POLICY,
    };
  }

  /**
   * Main middleware to authenticate API key
   */
  static async authenticate(
    req: ApiKeyRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const apiKey = this.extractApiKey(req);
      if (!apiKey) {
        res.status(401).json({
          success: false,
          error: 'API key required',
          code: 'API_KEY_REQUIRED',
          message: 'Please provide X-API-Key header or Bearer token',
        });
        return;
      }

      const validation = await this.validateApiKey(apiKey, req);
      if (!validation.valid) {
        res.status(401).json({
          success: false,
          error: validation.error,
          code: 'INVALID_API_KEY',
        });
        return;
      }

      // Attach user info to request
      req.apiKeyUser = validation.user;

      // Add warning headers if key needs rotation
      if (validation.user?.warnings && validation.user.warnings.length > 0) {
        res.setHeader('X-API-Key-Warning', validation.user.warnings.join('; '));
        res.setHeader('X-API-Key-Needs-Rotation', 'true');
      }

      logger.debug({
        userId: validation.user!.id,
        path: req.path,
        method: req.method,
      }, 'API key authenticated');

      next();
    } catch (error) {
      logger.error({ error }, 'API key auth guard error');
      res.status(500).json({
        success: false,
        error: 'Authentication failed',
        code: 'AUTH_ERROR',
      });
    }
  }

  /**
   * Middleware to check specific permission
   */
  static requirePermission(permission: string) {
    return async (req: ApiKeyRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.apiKeyUser) {
        await this.authenticate(req, res, () => {});
        if (!req.apiKeyUser) return;
      }

      const hasPermission = this.hasPermission(req.apiKeyUser.permissions, permission);
      if (!hasPermission) {
        logger.warn({
          userId: req.apiKeyUser.id,
          permission,
          userPermissions: req.apiKeyUser.permissions,
          path: req.path,
        }, 'API key missing required permission');

        res.status(403).json({
          success: false,
          error: `Missing required permission: ${permission}`,
          code: 'INSUFFICIENT_PERMISSIONS',
          requiredPermission: permission,
        });
        return;
      }

      next();
    };
  }

  /**
   * Middleware to check plan requirement for API access
   */
  static requirePlan(requiredPlan: string | string[]) {
    const allowedPlans = Array.isArray(requiredPlan) ? requiredPlan : [requiredPlan];
    
    return async (req: ApiKeyRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.apiKeyUser) {
        await this.authenticate(req, res, () => {});
        if (!req.apiKeyUser) return;
      }

      if (!allowedPlans.includes(req.apiKeyUser.planId)) {
        res.status(402).json({
          success: false,
          error: 'Plan upgrade required for this API endpoint',
          code: 'PLAN_UPGRADE_REQUIRED',
          currentPlan: req.apiKeyUser.planId,
          requiredPlans: allowedPlans,
          upgradeUrl: `${process.env.APP_URL}/billing/upgrade`,
        });
        return;
      }

      next();
    };
  }
}

// Express middleware wrappers
export const requireApiKey = (req: ApiKeyRequest, res: Response, next: NextFunction) =>
  ApiKeyAuthGuard.authenticate(req, res, next);

export const requireApiKeyPermission = (permission: string) =>
  ApiKeyAuthGuard.requirePermission(permission);

export const requireApiKeyPlan = (plans: string | string[]) =>
  ApiKeyAuthGuard.requirePlan(plans);