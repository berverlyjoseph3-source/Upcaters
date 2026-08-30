"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MFAService = void 0;
// enterprise-ai-agent-platform/apps/api/src/auth/services/mfa.service.ts
const crypto_1 = __importDefault(require("crypto"));
const client_1 = require("../../db/client");
const logger_1 = require("../../utils/logger");
const otplib_1 = require("otplib");
const qrcode_1 = __importDefault(require("qrcode"));
const MFA_CONFIG = {
    issuer: 'AI Agent Platform',
    algorithm: 'SHA1',
    digits: 6,
    step: 30,
    window: 1,
    backupCodesCount: 10,
    backupCodeLength: 8,
    recoveryCodeLength: 16,
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 30,
};
// ============================================
// MFA Service
// ============================================
class MFAService {
    /**
     * Generate a new TOTP secret for user
     */
    static async setupMFA(userId, userEmail) {
        try {
            // Check if MFA already enabled
            const existingMFa = await client_1.prisma.$queryRaw `
        SELECT COUNT(*) as count FROM user_mfa 
        WHERE user_id = ${userId} AND is_enabled = true
      `;
            if (parseInt(existingMFa[0]?.count || '0') > 0) {
                throw new Error('MFA is already enabled. Disable it first before setting up again.');
            }
            // Generate TOTP secret
            const secret = otplib_1.authenticator.generateSecret();
            // Generate QR code URL
            const otpauthUrl = otplib_1.authenticator.keyuri(userEmail, MFA_CONFIG.issuer, secret);
            const qrCodeUrl = await qrcode_1.default.toDataURL(otpauthUrl);
            // Generate backup codes
            const backupCodes = [];
            const backupCodeHashes = [];
            for (let i = 0; i < MFA_CONFIG.backupCodesCount; i++) {
                const code = this.generateBackupCode();
                const hash = this.hashCode(code);
                backupCodes.push(code);
                backupCodeHashes.push({ code, hash });
            }
            // Generate recovery code
            const recoveryCode = this.generateRecoveryCode();
            const recoveryCodeHash = this.hashCode(recoveryCode);
            // Store in database
            await client_1.prisma.$executeRaw `
        INSERT INTO user_mfa (
          id, user_id, secret, backup_codes, recovery_code_hash,
          is_enabled, created_at, updated_at
        ) VALUES (
          ${crypto_1.default.randomBytes(16).toString('hex')},
          ${userId},
          ${secret},
          ${JSON.stringify(backupCodeHashes.map(b => ({ hash: b.hash, used: false })))},
          ${recoveryCodeHash},
          true,
          NOW(),
          NOW()
        )
      `;
            // Log security event
            await client_1.prisma.auditLog.create({
                data: {
                    userId,
                    action: 'mfa_enabled',
                    entityType: 'user_mfa',
                    metadata: { backupCodesCount: MFA_CONFIG.backupCodesCount },
                },
            });
            logger_1.logger.info({ userId }, 'MFA setup completed');
            return {
                secret,
                qrCodeUrl,
                backupCodes,
                recoveryCode,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to setup MFA');
            throw error;
        }
    }
    /**
     * Verify TOTP code
     */
    static async verifyTOTP(userId, token, ipAddress) {
        try {
            // Check lockout
            const lockoutCheck = await this.checkLockout(userId);
            if (!lockoutCheck.allowed) {
                return {
                    valid: false,
                    lockedUntil: lockoutCheck.lockedUntil,
                    remainingAttempts: 0,
                    error: `Account locked due to too many failed MFA attempts. Try again after ${lockoutCheck.minutesRemaining} minutes.`,
                };
            }
            // Get user MFA data
            const mfaData = await client_1.prisma.$queryRaw `
        SELECT id, secret, backup_codes, failed_attempts 
        FROM user_mfa 
        WHERE user_id = ${userId} AND is_enabled = true
      `;
            if (!mfaData || mfaData.length === 0) {
                return { valid: false, error: 'MFA not configured' };
            }
            const mfa = mfaData[0];
            const backupCodes = typeof mfa.backup_codes === 'string'
                ? JSON.parse(mfa.backup_codes)
                : mfa.backup_codes;
            // Try TOTP first
            try {
                const isValidTOTP = otplib_1.authenticator.verify({
                    token,
                    secret: mfa.secret,
                });
                if (isValidTOTP) {
                    // Reset failed attempts on success
                    await this.resetFailedAttempts(userId);
                    logger_1.logger.info({ userId, method: 'totp' }, 'MFA verification successful');
                    return { valid: true, remainingAttempts: MFA_CONFIG.maxFailedAttempts };
                }
            }
            catch (totpError) {
                logger_1.logger.warn({ totpError, userId }, 'TOTP verification error');
            }
            // Try backup codes
            const validBackupCode = backupCodes.find(b => !b.used && this.hashCode(token) === b.hash);
            if (validBackupCode) {
                // Mark backup code as used
                await this.markBackupCodeUsed(userId, token);
                // Reset failed attempts
                await this.resetFailedAttempts(userId);
                logger_1.logger.info({ userId, method: 'backup_code' }, 'MFA verification successful with backup code');
                return {
                    valid: true,
                    usedBackupCode: true,
                    remainingAttempts: MFA_CONFIG.maxFailedAttempts,
                };
            }
            // Failed attempt
            await this.recordFailedAttempt(userId, ipAddress);
            const remainingAttempts = MFA_CONFIG.maxFailedAttempts - (mfa.failed_attempts + 1);
            logger_1.logger.warn({ userId, remainingAttempts }, 'MFA verification failed');
            if (remainingAttempts <= 0) {
                await this.lockAccount(userId);
                return {
                    valid: false,
                    remainingAttempts: 0,
                    lockedUntil: new Date(Date.now() + MFA_CONFIG.lockoutDurationMinutes * 60 * 1000),
                    error: 'Account locked due to too many failed MFA attempts.',
                };
            }
            return {
                valid: false,
                remainingAttempts,
                error: 'Invalid verification code. Please try again.',
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'MFA verification failed');
            return { valid: false, error: 'Verification failed due to internal error' };
        }
    }
    /**
     * Verify recovery code (for account recovery)
     */
    static async verifyRecoveryCode(userId, recoveryCode) {
        try {
            const mfaData = await client_1.prisma.$queryRaw `
        SELECT recovery_code_hash FROM user_mfa 
        WHERE user_id = ${userId} AND is_enabled = true
      `;
            if (!mfaData || mfaData.length === 0) {
                return { valid: false, error: 'MFA not configured' };
            }
            const isValid = this.hashCode(recoveryCode) === mfaData[0].recovery_code_hash;
            if (isValid) {
                // Disable MFA on recovery
                await this.disableMFA(userId, 'recovery_code');
                logger_1.logger.info({ userId }, 'MFA disabled via recovery code');
                return { valid: true };
            }
            logger_1.logger.warn({ userId }, 'Invalid recovery code attempt');
            return { valid: false, error: 'Invalid recovery code' };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Recovery code verification failed');
            return { valid: false, error: 'Verification failed due to internal error' };
        }
    }
    /**
     * Disable MFA for a user
     */
    static async disableMFA(userId, reason = 'manual') {
        try {
            await client_1.prisma.$executeRaw `
        UPDATE user_mfa SET is_enabled = false, disabled_at = NOW(), disabled_reason = ${reason}
        WHERE user_id = ${userId} AND is_enabled = true
      `;
            await client_1.prisma.auditLog.create({
                data: {
                    userId,
                    action: 'mfa_disabled',
                    entityType: 'user_mfa',
                    metadata: { reason },
                },
            });
            logger_1.logger.info({ userId, reason }, 'MFA disabled');
            return true;
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to disable MFA');
            return false;
        }
    }
    /**
     * Check if MFA is enabled for user
     */
    static async isEnabled(userId) {
        try {
            const result = await client_1.prisma.$queryRaw `
        SELECT COUNT(*) as count FROM user_mfa 
        WHERE user_id = ${userId} AND is_enabled = true
      `;
            return parseInt(result[0]?.count || '0') > 0;
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to check MFA status');
            return false;
        }
    }
    /**
     * Get remaining backup codes count
     */
    static async getRemainingBackupCodes(userId) {
        try {
            const mfaData = await client_1.prisma.$queryRaw `
        SELECT backup_codes FROM user_mfa 
        WHERE user_id = ${userId} AND is_enabled = true
      `;
            if (!mfaData || mfaData.length === 0)
                return 0;
            const backupCodes = typeof mfaData[0].backup_codes === 'string'
                ? JSON.parse(mfaData[0].backup_codes)
                : mfaData[0].backup_codes;
            return backupCodes.filter(b => !b.used).length;
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to get remaining backup codes');
            return 0;
        }
    }
    /**
     * Regenerate backup codes
     */
    static async regenerateBackupCodes(userId) {
        try {
            const backupCodes = [];
            const backupCodeHashes = [];
            for (let i = 0; i < MFA_CONFIG.backupCodesCount; i++) {
                const code = this.generateBackupCode();
                const hash = this.hashCode(code);
                backupCodes.push(code);
                backupCodeHashes.push({ code, hash });
            }
            await client_1.prisma.$executeRaw `
        UPDATE user_mfa 
        SET backup_codes = ${JSON.stringify(backupCodeHashes.map(b => ({ hash: b.hash, used: false })))},
            updated_at = NOW()
        WHERE user_id = ${userId} AND is_enabled = true
      `;
            logger_1.logger.info({ userId }, 'Backup codes regenerated');
            return backupCodes;
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to regenerate backup codes');
            throw error;
        }
    }
    // ============================================
    // Private Helpers
    // ============================================
    /**
     * Generate a backup code
     */
    static generateBackupCode() {
        return crypto_1.default.randomBytes(MFA_CONFIG.backupCodeLength / 2)
            .toString('hex')
            .toUpperCase()
            .match(/.{1,4}/g)
            .join('-');
    }
    /**
     * Generate a recovery code
     */
    static generateRecoveryCode() {
        return crypto_1.default.randomBytes(MFA_CONFIG.recoveryCodeLength / 2)
            .toString('hex')
            .toUpperCase();
    }
    /**
     * Hash a code for storage
     */
    static hashCode(code) {
        return crypto_1.default.createHash('sha256').update(code).digest('hex');
    }
    /**
     * Mark a backup code as used
     */
    static async markBackupCodeUsed(userId, usedCode) {
        const mfaData = await client_1.prisma.$queryRaw `
      SELECT backup_codes FROM user_mfa 
      WHERE user_id = ${userId} AND is_enabled = true
    `;
        if (!mfaData || mfaData.length === 0)
            return;
        const backupCodes = typeof mfaData[0].backup_codes === 'string'
            ? JSON.parse(mfaData[0].backup_codes)
            : mfaData[0].backup_codes;
        const codeToMark = backupCodes.find(b => this.hashCode(usedCode) === b.hash);
        if (codeToMark) {
            codeToMark.used = true;
            codeToMark.usedAt = new Date();
        }
        await client_1.prisma.$executeRaw `
      UPDATE user_mfa 
      SET backup_codes = ${JSON.stringify(backupCodes)}, updated_at = NOW()
      WHERE user_id = ${userId} AND is_enabled = true
    `;
    }
    /**
     * Check if account is locked
     */
    static async checkLockout(userId) {
        const mfaData = await client_1.prisma.$queryRaw `
      SELECT locked_until FROM user_mfa 
      WHERE user_id = ${userId} AND is_enabled = true
    `;
        if (!mfaData || mfaData.length === 0)
            return { allowed: true };
        const lockedUntil = mfaData[0].locked_until;
        if (lockedUntil && new Date(lockedUntil) > new Date()) {
            const minutesRemaining = Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / (1000 * 60));
            return { allowed: false, lockedUntil: new Date(lockedUntil), minutesRemaining };
        }
        return { allowed: true };
    }
    /**
     * Record a failed MFA attempt
     */
    static async recordFailedAttempt(userId, ipAddress) {
        await client_1.prisma.$executeRaw `
      UPDATE user_mfa 
      SET failed_attempts = failed_attempts + 1,
          last_failed_at = NOW(),
          last_failed_ip = ${ipAddress || 'unknown'},
          updated_at = NOW()
      WHERE user_id = ${userId} AND is_enabled = true
    `;
    }
    /**
     * Reset failed attempts
     */
    static async resetFailedAttempts(userId) {
        await client_1.prisma.$executeRaw `
      UPDATE user_mfa 
      SET failed_attempts = 0, locked_until = NULL, updated_at = NOW()
      WHERE user_id = ${userId} AND is_enabled = true
    `;
    }
    /**
     * Lock account after too many failed attempts
     */
    static async lockAccount(userId) {
        const lockedUntil = new Date(Date.now() + MFA_CONFIG.lockoutDurationMinutes * 60 * 1000);
        await client_1.prisma.$executeRaw `
      UPDATE user_mfa 
      SET locked_until = ${lockedUntil}, updated_at = NOW()
      WHERE user_id = ${userId} AND is_enabled = true
    `;
        await client_1.prisma.auditLog.create({
            data: {
                userId,
                action: 'mfa_locked',
                entityType: 'user_mfa',
                metadata: { lockedUntil: lockedUntil.toISOString() },
            },
        });
        logger_1.logger.warn({ userId, lockedUntil }, 'Account locked due to failed MFA attempts');
    }
}
exports.MFAService = MFAService;
//# sourceMappingURL=mfa.service.js.map