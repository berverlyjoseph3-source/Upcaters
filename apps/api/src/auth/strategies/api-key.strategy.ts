// enterprise-ai-agent-platform/apps/api/src/auth/strategies/api-key.strategy.ts
import { Request } from 'express';
import crypto from 'crypto';
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { authConfig } from '../../config/auth.config';
import { PLAN_LIMITS } from '../../db/types/database.types';

export interface ApiKeyStrategyResult {
  valid: boolean;
  user?: {
    id: string;
    email: string;
    planId: string;
    role: string;
    permissions: string[];
    rateLimit: number;
  };
  error?: string;
  remainingRequests?: number;
  resetAfter?: number;
}

interface ApiKeyRateLimit {
  count: number;
  windowStart: number;
  lastRequest: number;
}

// In-memory rate limiting store (production should use Redis)
const rateLimitStore = new Map<string, ApiKeyRateLimit>();

export class ApiKeyStrategy {
  /**
   * Extract API key from request
   * Supports multiple methods:
   * - X-API-Key header
   * - Authorization: Bearer <api-key>
   * - api_key query parameter (GET requests only, less secure)
   */
  static extractApiKey(req: Request): string | null {
    // Method 1: X-API-Key header (recommended)
    const apiKeyHeader = req.headers['x-api-key'];
    if (apiKeyHeader && typeof apiKeyHeader === 'string') {
      logger.debug({ method: 'header' }, 'API key extracted from X-API-Key header');
      return apiKeyHeader;
    }

    // Method 2: Authorization: Bearer <api-key>
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (token.startsWith('ak_')) {
        logger.debug({ method: 'bearer' }, 'API key extracted from Bearer token');
        return token;
      }
    }

    // Method 3: Query parameter (GET only, less secure)
    if (req.method === 'GET') {
      const apiKeyQuery = req.query.api_key;
      if (apiKeyQuery && typeof apiKeyQuery === 'string' && apiKeyQuery.startsWith('ak_')) {
        logger.warn({ 
          method: 'query', 
          ip: req.ip, 
          path: req.path 
        }, 'API key provided in query parameter - this is less secure');
        return apiKeyQuery;
      }
    }

    return null;
  }

  /**
   * Validate API key format
   */
  static isValidFormat(apiKey: string): boolean {
    // API keys must start with 'ak_' and be at least 10 characters
    if (!apiKey.startsWith('ak_')) {
      return false;
    }
    
    // Check length (ak_ + 64 hex chars = 67 chars)
    if (apiKey.length < 10 || apiKey.length > 200) {
      return false;
    }
    
    // Check for valid characters (alphanumeric + underscore)
    const validRegex = /^ak_[a-f0-9]+$/;
    return validRegex.test(apiKey);
  }

  /**
   * Hash API key for storage comparison
   */
  static hashApiKey(apiKey: string): string {
    return crypto.createHash(authConfig.apiKey.hashAlgorithm).update(apiKey).digest('hex');
  }

  /**
   * Check rate limit for API key
   */
  static async checkRateLimit(
    keyHash: string,
    limit: number,
    windowMs: number = 60000 // 1 minute default
  ): Promise<{ allowed: boolean; remaining: number; resetAfter: number }> {
    const now = Date.now();
    const record = rateLimitStore.get(keyHash);

    // Clean up old records periodically
    if (rateLimitStore.size > 1000) {
      for (const [k, v] of rateLimitStore.entries()) {
        if (now - v.windowStart > windowMs * 2) {
          rateLimitStore.delete(k);
        }
      }
    }

    if (!record) {
      // First request in window
      rateLimitStore.set(keyHash, {
        count: 1,
        windowStart: now,
        lastRequest: now,
      });
      
      return {
        allowed: true,
        remaining: limit - 1,
        resetAfter: windowMs,
      };
    }

    // Check if current window has expired
    if (now - record.windowStart >= windowMs) {
      // Reset window
      rateLimitStore.set(keyHash, {
        count: 1,
        windowStart: now,
        lastRequest: now,
      });
      
      return {
        allowed: true,
        remaining: limit - 1,
        resetAfter: windowMs,
      };
    }

    // Check if within limit
    if (record.count >= limit) {
      const resetAfter = windowMs - (now - record.windowStart);
      return {
        allowed: false,
        remaining: 0,
        resetAfter: Math.ceil(resetAfter / 1000), // Return in seconds
      };
    }

    // Increment counter
    record.count++;
    record.lastRequest = now;
    rateLimitStore.set(keyHash, record);

    return {
      allowed: true,
      remaining: limit - record.count,
      resetAfter: Math.ceil((windowMs - (now - record.windowStart)) / 1000),
    };
  }

  /**
   * Check if API key has required permission
   */
  static hasPermission(
    userPermissions: string[],
    requiredPermission: string
  ): boolean {
    // Wildcard permission allows everything
    if (userPermissions.includes('*')) {
      return true;
    }
    
    // Check exact permission
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }
    
    // Check pattern permissions (e.g., "email:*" matches "email:send")
    const [requiredResource, requiredAction] = requiredPermission.split(':');
    for (const perm of userPermissions) {
      const [permResource, permAction] = perm.split(':');
      if (permResource === requiredResource && permAction === '*') {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get user permissions from metadata
   */
  static getUserPermissions(metadata: any): string[] {
    if (metadata?.apiKeyPermissions && Array.isArray(metadata.apiKeyPermissions)) {
      return metadata.apiKeyPermissions;
    }
    
    // Default permissions based on plan
    const planId = metadata?.planId || 'FREE';
    const planConfig = PLAN_LIMITS[planId as keyof typeof PLAN_LIMITS];
    
    if (planConfig?.features.apiAccess) {
      return ['*']; // Full access for paid plans with API access
    }
    
    return []; // No API access for free tier
  }

  /**
   * Validate API key and return associated user
   */
  static async validateApiKey(apiKey: string): Promise<ApiKeyStrategyResult> {
    try {
      // Validate format first
      if (!this.isValidFormat(apiKey)) {
        logger.warn({ apiKeyPrefix: apiKey.substring(0, 8) }, 'Invalid API key format');
        return {
          valid: false,
          error: 'Invalid API key format. API keys should start with "ak_"',
        };
      }

      // Hash the API key for lookup
      const keyHash = this.hashApiKey(apiKey);

      // Find user with this API key
      const user = await prisma.user.findFirst({
        where: {
          apiKey: keyHash,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          planId: true,
          role: true,
          metadata: true,
          apiKeyPrefix: true,
        },
      });

      if (!user) {
        logger.warn({ apiKeyPrefix: apiKey.substring(0, 8) }, 'Invalid API key - user not found');
        return {
          valid: false,
          error: 'Invalid API key',
        };
      }

      // Verify prefix matches
      const providedPrefix = apiKey.substring(0, 8);
      if (user.apiKeyPrefix !== providedPrefix) {
        logger.warn({ 
          userId: user.id, 
          expectedPrefix: user.apiKeyPrefix, 
          providedPrefix 
        }, 'API key prefix mismatch');
        return {
          valid: false,
          error: 'Invalid API key',
        };
      }

      // Check if plan allows API access (PROFESSIONAL+ only)
      const planConfig = PLAN_LIMITS[user.planId as keyof typeof PLAN_LIMITS];
      if (!planConfig || !planConfig.features.apiAccess) {
        logger.warn({ 
          userId: user.id, 
          planId: user.planId 
        }, 'API access not allowed on current plan');
        return {
          valid: false,
          error: `API access not available on ${user.planId} plan. Please upgrade to PROFESSIONAL or higher.`,
        };
      }

      // Get permissions
      const permissions = this.getUserPermissions(user.metadata);
      const rateLimit = (user.metadata as any)?.apiKeyRateLimit || authConfig.apiKey.rateLimitDefault;

      // Check rate limit
      const rateLimitCheck = await this.checkRateLimit(keyHash, rateLimit);

      if (!rateLimitCheck.allowed) {
        logger.warn({ 
          userId: user.id, 
          limit: rateLimit,
          resetAfter: rateLimitCheck.resetAfter 
        }, 'API key rate limit exceeded');
        
        return {
          valid: false,
          error: `Rate limit exceeded. Limit: ${rateLimit} requests per minute.`,
          remainingRequests: 0,
          resetAfter: rateLimitCheck.resetAfter,
        };
      }

      // Update last used timestamp (async, don't block)
      const metadata = user.metadata as any;
      prisma.user.update({
        where: { id: user.id },
        data: {
          metadata: {
            ...metadata,
            lastApiKeyUse: new Date().toISOString(),
            lastApiKeyEndpoint: 'authenticated',
          },
        },
      }).catch(err => logger.warn({ error: err.message }, 'Failed to update API key last used'));

      logger.info({ 
        userId: user.id, 
        planId: user.planId,
        remainingRequests: rateLimitCheck.remaining 
      }, 'API key validated successfully');

      return {
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          planId: user.planId,
          role: user.role,
          permissions,
          rateLimit,
        },
        remainingRequests: rateLimitCheck.remaining,
        resetAfter: rateLimitCheck.resetAfter,
      };
    } catch (error) {
      logger.error({ error }, 'API key validation failed');
      return {
        valid: false,
        error: 'API key validation failed due to internal error',
      };
    }
  }

  /**
   * Authenticate request using API key
   */
  static async authenticate(req: Request): Promise<ApiKeyStrategyResult> {
    try {
      // Extract API key
      const apiKey = this.extractApiKey(req);
      if (!apiKey) {
        return {
          valid: false,
          error: 'API key required. Provide via X-API-Key header or Bearer token',
        };
      }

      // Validate API key
      const result = await this.validateApiKey(apiKey);
      
      if (result.valid && result.user) {
        // Add rate limit headers to response (will be set by the route handler)
        (req as any).apiKeyInfo = {
          userId: result.user.id,
          remaining: result.remainingRequests,
          resetAfter: result.resetAfter,
          limit: result.user.rateLimit,
        };
      }

      return result;
    } catch (error) {
      logger.error({ error }, 'API key authentication failed');
      return {
        valid: false,
        error: 'Authentication failed',
      };
    }
  }

  /**
   * Generate a new API key for a user
   */
  static generateApiKey(): { apiKey: string; hash: string; prefix: string } {
    const randomBytes = crypto.randomBytes(32);
    const apiKey = `ak_${randomBytes.toString('hex')}`;
    const hash = this.hashApiKey(apiKey);
    const prefix = apiKey.substring(0, 8);
    
    return { apiKey, hash, prefix };
  }

  /**
   * Revoke API key for a user
   */
  static async revokeApiKey(userId: string): Promise<boolean> {
    try {
      // Get current key hash to remove from rate limit store
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { apiKey: true },
      });
      
      if (user?.apiKey) {
        rateLimitStore.delete(user.apiKey);
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          apiKey: null,
          apiKeyPrefix: null,
        },
      });

      logger.info({ userId }, 'API key revoked');
      return true;
    } catch (error) {
      logger.error({ error, userId }, 'Failed to revoke API key');
      return false;
    }
  }

  /**
   * Get API key information for a user (without exposing the key)
   */
  static async getApiKeyInfo(userId: string): Promise<{
    hasApiKey: boolean;
    prefix?: string;
    createdAt?: Date;
    lastUsedAt?: Date;
    permissions?: string[];
    rateLimit?: number;
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          apiKeyPrefix: true,
          metadata: true,
          createdAt: true,
        },
      });

      if (!user || !user.apiKeyPrefix) {
        return { hasApiKey: false };
      }

      const metadata = user.metadata as any;
      
      return {
        hasApiKey: true,
        prefix: user.apiKeyPrefix,
        createdAt: metadata?.apiKeyCreatedAt ? new Date(metadata.apiKeyCreatedAt) : user.createdAt,
        lastUsedAt: metadata?.lastApiKeyUse ? new Date(metadata.lastApiKeyUse) : undefined,
        permissions: metadata?.apiKeyPermissions || ['*'],
        rateLimit: metadata?.apiKeyRateLimit || authConfig.apiKey.rateLimitDefault,
      };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get API key info');
      return { hasApiKey: false };
    }
  }

  /**
   * Update API key permissions
   */
  static async updatePermissions(
    userId: string,
    permissions: string[]
  ): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { metadata: true },
      });

      const metadata = (user?.metadata as any) || {};
      
      await prisma.user.update({
        where: { id: userId },
        data: {
          metadata: {
            ...metadata,
            apiKeyPermissions: permissions,
          },
        },
      });

      logger.info({ userId, permissions }, 'API key permissions updated');
      return true;
    } catch (error) {
      logger.error({ error, userId }, 'Failed to update API key permissions');
      return false;
    }
  }

  /**
   * Update API key rate limit
   */
  static async updateRateLimit(userId: string, rateLimit: number): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { metadata: true },
      });

      const metadata = (user?.metadata as any) || {};
      
      await prisma.user.update({
        where: { id: userId },
        data: {
          metadata: {
            ...metadata,
            apiKeyRateLimit: rateLimit,
          },
        },
      });

      logger.info({ userId, rateLimit }, 'API key rate limit updated');
      return true;
    } catch (error) {
      logger.error({ error, userId }, 'Failed to update API key rate limit');
      return false;
    }
  }
}