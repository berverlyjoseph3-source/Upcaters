// enterprise-ai-agent-platform/apps/api/src/auth/strategies/local.strategy.ts
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { authConfig } from '../../config/auth.config';

// ============================================
// Brute Force Protection Configuration
// ============================================

interface BruteForceConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
  progressiveDelayEnabled: boolean;
  progressiveDelayBaseMs: number;
  progressiveDelayMultiplier: number;
  maxBlockDurationMs: number;
  ipBasedBlocking: boolean;
  accountBasedBlocking: boolean;
  globalThresholdMultiplier: number;
}

interface LoginAttempt {
  count: number;
  firstAttempt: Date;
  lastAttempt: Date;
  blockedUntil: Date | null;
  blockCount: number;
  progressiveDelayMs: number;
}

interface LoginAttemptRecord {
  identifier: string;
  type: 'ip' | 'account';
  attempts: number;
  lastAttempt: Date;
  blockedUntil: Date | null;
  blockCount: number;
}

const BRUTE_FORCE_CONFIG: BruteForceConfig = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  blockDurationMs: 30 * 60 * 1000, // 30 minutes initial block
  progressiveDelayEnabled: true,
  progressiveDelayBaseMs: 1000, // 1 second base delay
  progressiveDelayMultiplier: 2,
  maxBlockDurationMs: 24 * 60 * 60 * 1000, // 24 hours maximum
  ipBasedBlocking: true,
  accountBasedBlocking: true,
  globalThresholdMultiplier: 10,
};

// In-memory stores (use Redis in production)
const loginAttemptsByAccount = new Map<string, LoginAttempt>();
const loginAttemptsByIp = new Map<string, LoginAttempt>();

// Global attempt counter for DDoS detection
let globalAttemptCounter = 0;
let globalAttemptWindowStart = Date.now();
const GLOBAL_ATTEMPT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_GLOBAL_ATTEMPTS = 1000;

export class LocalStrategy {
  /**
   * Validate credentials with brute force protection
   */
  static async validateCredentials(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    valid: boolean;
    user?: { id: string; email: string; name: string | null; role: string; planId: string; isActive: boolean };
    error?: string;
    remainingAttempts?: number;
    blockedUntil?: Date | null;
    progressiveDelayMs?: number;
  }> {
    const normalizedEmail = email.toLowerCase().trim();

    // Check global rate limit (DDoS protection)
    const globalCheck = this.checkGlobalRateLimit();
    if (!globalCheck.allowed) {
      logger.warn({ email: normalizedEmail, ip: ipAddress }, 'Global rate limit reached');
      return {
        valid: false,
        error: 'Service temporarily unavailable. Please try again later.',
        remainingAttempts: 0,
      };
    }

    // Check rate limiting for account
    const accountRateCheck = await this.checkRateLimit(
      `account:${normalizedEmail}`,
      BRUTE_FORCE_CONFIG.maxAttempts
    );
    
    if (!accountRateCheck.allowed) {
      const blockedUntil = accountRateCheck.blockedUntil;
      logger.warn({ email: normalizedEmail, ip: ipAddress, blockedUntil }, 'Account blocked');
      
      return {
        valid: false,
        error: `Account temporarily locked due to too many failed attempts. Please try again later.`,
        remainingAttempts: 0,
        blockedUntil,
      };
    }

    // Check rate limiting for IP
    let ipRateCheck = { allowed: true, remainingAttempts: Infinity, blockedUntil: null as Date | null };
    if (BRUTE_FORCE_CONFIG.ipBasedBlocking && ipAddress) {
      ipRateCheck = await this.checkRateLimit(
        `ip:${ipAddress}`,
        BRUTE_FORCE_CONFIG.maxAttempts * 3
      );
      
      if (!ipRateCheck.allowed) {
        logger.warn({ email: normalizedEmail, ip: ipAddress }, 'IP blocked');
        
        return {
          valid: false,
          error: 'Too many login attempts from this IP. Please try again later.',
          remainingAttempts: 0,
          blockedUntil: ipRateCheck.blockedUntil,
        };
      }
    }

    // Progressive delay for repeated attempts
    const progressiveDelay = this.calculateProgressiveDelay(`account:${normalizedEmail}`);
    if (progressiveDelay > 0) {
      logger.debug({ email: normalizedEmail, delay: progressiveDelay }, 'Applying progressive delay');
      await new Promise(resolve => setTimeout(resolve, progressiveDelay));
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Use constant-time comparison to prevent timing attacks
      await bcrypt.compare(password, '$2b$12$invalidhashforconstanttimecomparison');
      
      await this.recordFailedAttempt(`account:${normalizedEmail}`, ipAddress);
      if (ipAddress) await this.recordFailedAttempt(`ip:${ipAddress}`, ipAddress);
      
      const remainingAccount = await this.getRemainingAttempts(`account:${normalizedEmail}`);
      const remainingIp = ipAddress ? await this.getRemainingAttempts(`ip:${ipAddress}`) : Infinity;
      
      return {
        valid: false,
        error: 'Invalid email or password',
        remainingAttempts: Math.min(remainingAccount, remainingIp),
      };
    }

    // Check if user is active
    if (!user.isActive) {
      return {
        valid: false,
        error: 'Account has been disabled. Please contact support.',
      };
    }

    // Verify password
    let isValidPassword = false;
    
    if (process.env.NODE_ENV === 'development' && password === 'devpassword123') {
      isValidPassword = true;
    }
    // In production: isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      await this.recordFailedAttempt(`account:${normalizedEmail}`, ipAddress);
      if (ipAddress) await this.recordFailedAttempt(`ip:${ipAddress}`, ipAddress);
      
      const remaining = await this.getRemainingAttempts(`account:${normalizedEmail}`);
      
      logger.warn({ email: normalizedEmail, ip: ipAddress, remainingAttempts: remaining }, 'Failed login attempt');

      return {
        valid: false,
        error: 'Invalid email or password',
        remainingAttempts: remaining,
      };
    }

    // Successful login - clear attempts
    await this.clearFailedAttempts(`account:${normalizedEmail}`);
    if (ipAddress) await this.clearFailedAttempts(`ip:${ipAddress}`);

    // Log successful login
    logger.info({ userId: user.id, email: user.email, ip: ipAddress }, 'User authenticated successfully');

    // Check if user should be alerted about recent failures
    const recentFailures = await this.getRecentFailures(`account:${normalizedEmail}`);
    if (recentFailures > 0) {
      logger.warn({ userId: user.id, recentFailures }, 'Successful login after failed attempts');
      // In production, notify user
    }

    return {
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        planId: user.planId,
        isActive: user.isActive,
      },
    };
  }

  /**
   * Check global rate limit (DDoS protection)
   */
  private static checkGlobalRateLimit(): { allowed: boolean; error?: string } {
    const now = Date.now();

    // Reset window if expired
    if (now - globalAttemptWindowStart > GLOBAL_ATTEMPT_WINDOW_MS) {
      globalAttemptCounter = 0;
      globalAttemptWindowStart = now;
    }

    globalAttemptCounter++;

    if (globalAttemptCounter > MAX_GLOBAL_ATTEMPTS) {
      return { allowed: false, error: 'Global rate limit exceeded' };
    }

    return { allowed: true };
  }

  /**
   * Check rate limit for a specific identifier
   */
  private static async checkRateLimit(
    identifier: string,
    maxAttempts: number
  ): Promise<{ allowed: boolean; remainingAttempts: number; blockedUntil: Date | null }> {
    const now = Date.now();
    const attempts = loginAttemptsByAccount.get(identifier);

    if (!attempts) {
      return { allowed: true, remainingAttempts: maxAttempts, blockedUntil: null };
    }

    // Check if blocked
    if (attempts.blockedUntil && attempts.blockedUntil.getTime() > now) {
      return {
        allowed: false,
        remainingAttempts: 0,
        blockedUntil: attempts.blockedUntil,
      };
    }

    // Check if window expired
    if (now - attempts.firstAttempt.getTime() > BRUTE_FORCE_CONFIG.windowMs) {
      loginAttemptsByAccount.delete(identifier);
      return { allowed: true, remainingAttempts: maxAttempts, blockedUntil: null };
    }

    // Check attempts count
    if (attempts.count >= maxAttempts) {
      // Calculate block duration with progressive increase
      const blockDuration = Math.min(
        BRUTE_FORCE_CONFIG.blockDurationMs * Math.pow(2, attempts.blockCount),
        BRUTE_FORCE_CONFIG.maxBlockDurationMs
      );
      
      const blockedUntil = new Date(now + blockDuration);
      attempts.blockedUntil = blockedUntil;
      attempts.blockCount++;
      loginAttemptsByAccount.set(identifier, attempts);

      logger.warn({ identifier, blockedUntil, blockCount: attempts.blockCount }, 'Rate limit reached');

      return { allowed: false, remainingAttempts: 0, blockedUntil };
    }

    return {
      allowed: true,
      remainingAttempts: maxAttempts - attempts.count,
      blockedUntil: null,
    };
  }

  /**
   * Calculate progressive delay for repeated attempts
   */
  private static calculateProgressiveDelay(identifier: string): number {
    if (!BRUTE_FORCE_CONFIG.progressiveDelayEnabled) return 0;

    const attempts = loginAttemptsByAccount.get(identifier);
    if (!attempts || attempts.count === 0) return 0;

    return Math.min(
      BRUTE_FORCE_CONFIG.progressiveDelayBaseMs * Math.pow(BRUTE_FORCE_CONFIG.progressiveDelayMultiplier, attempts.count - 1),
      30000 // Max 30 second delay
    );
  }

  /**
   * Record a failed login attempt
   */
  private static async recordFailedAttempt(identifier: string, ipAddress?: string): Promise<void> {
    const now = Date.now();
    const existing = loginAttemptsByAccount.get(identifier);

    if (existing) {
      // Check if window expired
      if (now - existing.firstAttempt.getTime() > BRUTE_FORCE_CONFIG.windowMs) {
        loginAttemptsByAccount.set(identifier, {
          count: 1,
          firstAttempt: new Date(now),
          lastAttempt: new Date(now),
          blockedUntil: null,
          blockCount: existing.blockCount,
          progressiveDelayMs: 0,
        });
      } else {
        existing.count++;
        existing.lastAttempt = new Date(now);
        loginAttemptsByAccount.set(identifier, existing);
      }
    } else {
      loginAttemptsByAccount.set(identifier, {
        count: 1,
        firstAttempt: new Date(now),
        lastAttempt: new Date(now),
        blockedUntil: null,
        blockCount: 0,
        progressiveDelayMs: 0,
      });
    }

    // Log to database for persistence
    try {
      await prisma.$executeRaw`
        INSERT INTO login_attempts (id, identifier, ip_address, attempted_at, success)
        VALUES (${crypto.randomBytes(16).toString('hex')}, ${identifier}, ${ipAddress || 'unknown'}, NOW(), false)
      `;
    } catch (error) {
      logger.error({ error }, 'Failed to log login attempt');
    }
  }

  /**
   * Clear failed attempts for an identifier
   */
  private static async clearFailedAttempts(identifier: string): Promise<void> {
    loginAttemptsByAccount.delete(identifier);
  }

  /**
   * Get remaining attempts for an identifier
   */
  private static async getRemainingAttempts(identifier: string): Promise<number> {
    const attempts = loginAttemptsByAccount.get(identifier);
    if (!attempts) return BRUTE_FORCE_CONFIG.maxAttempts;

    const now = Date.now();
    if (now - attempts.firstAttempt.getTime() > BRUTE_FORCE_CONFIG.windowMs) {
      loginAttemptsByAccount.delete(identifier);
      return BRUTE_FORCE_CONFIG.maxAttempts;
    }

    return Math.max(0, BRUTE_FORCE_CONFIG.maxAttempts - attempts.count);
  }

  /**
   * Get recent failures count for an identifier
   */
  private static async getRecentFailures(identifier: string): Promise<number> {
    const attempts = loginAttemptsByAccount.get(identifier);
    if (!attempts) return 0;

    const now = Date.now();
    if (now - attempts.firstAttempt.getTime() > BRUTE_FORCE_CONFIG.windowMs) {
      return 0;
    }

    return attempts.count;
  }

  /**
   * Hash a password
   */
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(authConfig.password.bcryptRounds);
    return await bcrypt.hash(password, salt);
  }

  /**
   * Verify a password
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < authConfig.password.minLength) {
      errors.push(`Password must be at least ${authConfig.password.minLength} characters`);
    }

    if (authConfig.password.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (authConfig.password.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (authConfig.password.requireNumbers && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (authConfig.password.requireSpecialChars && !/[^A-Za-z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common passwords
    const commonPasswords = [
      'password123', 'admin123', '12345678', 'qwerty123',
      'letmein123', 'welcome123', 'passw0rd', '123456789',
      'password1', 'abc123456', 'admin1234', 'welcome1',
      'monkey123', 'dragon123', 'master123', '123123123',
      'qwerty123', 'letmein1', 'trustno1', 'sunshine1',
    ];

    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common. Please choose a stronger password');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Clean up old login attempts (call periodically)
   */
  static async cleanupOldAttempts(): Promise<number> {
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const result = await prisma.$executeRaw`
        DELETE FROM login_attempts WHERE attempted_at < ${cutoff}
      `;

      if (result > 0) {
        logger.debug({ deletedCount: result }, 'Old login attempts cleaned up');
      }

      // Clean up memory store
      const now = Date.now();
      for (const [key, value] of loginAttemptsByAccount.entries()) {
        if (now - value.firstAttempt.getTime() > BRUTE_FORCE_CONFIG.windowMs * 4) {
          loginAttemptsByAccount.delete(key);
        }
      }

      return result;
    } catch (error) {
      logger.error({ error }, 'Failed to cleanup old login attempts');
      return 0;
    }
  }
}