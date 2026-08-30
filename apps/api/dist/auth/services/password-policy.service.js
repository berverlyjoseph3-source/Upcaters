"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordPolicyService = void 0;
// enterprise-ai-agent-platform/apps/api/src/auth/services/password-policy.service.ts
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
const client_1 = require("../../db/client");
const logger_1 = require("../../utils/logger");
const auth_config_1 = require("../../config/auth.config");
const PASSWORD_POLICY = {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxRepeatingChars: 3,
    maxSequentialChars: 4,
    preventCommonPasswords: true,
    preventUserInfoInPassword: true,
    historyCount: 5,
    maxAgeDays: 90,
    expiryWarningDays: 14,
    minAgeHours: 1,
    breachCheckEnabled: false,
};
// Common passwords list (abbreviated - use full list in production)
const COMMON_PASSWORDS = new Set([
    'password', 'password123', '12345678', 'qwerty123',
    'admin123', 'letmein123', 'welcome123', 'passw0rd',
    '123456789', 'password1', 'abc123456', 'admin1234',
    'welcome1', 'monkey123', 'dragon123', 'master123',
    '123123123', 'qwerty123', 'letmein1', 'trustno1',
    'sunshine1', 'iloveyou1', 'princess1', 'football1',
    'baseball1', 'shadow123', 'michael1', 'superman1',
    'batman123', 'access123', 'flower123', 'hello1234',
    'charlie1', 'donald1', 'thomas123', 'jennifer1',
]);
class PasswordPolicyService {
    /**
     * Validate password against all policies
     */
    static validatePassword(password, userInfo) {
        const errors = [];
        const feedback = [];
        let score = 0;
        // Length checks
        if (password.length < PASSWORD_POLICY.minLength) {
            errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters`);
        }
        else {
            score += 1;
            if (password.length >= 12)
                score += 1;
            if (password.length >= 16)
                score += 1;
        }
        if (password.length > PASSWORD_POLICY.maxLength) {
            errors.push(`Password must not exceed ${PASSWORD_POLICY.maxLength} characters`);
        }
        // Character type checks
        if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }
        else if (/[A-Z]/.test(password)) {
            score += 1;
        }
        if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }
        else if (/[a-z]/.test(password)) {
            score += 1;
        }
        if (PASSWORD_POLICY.requireNumbers && !/[0-9]/.test(password)) {
            errors.push('Password must contain at least one number');
        }
        else if (/[0-9]/.test(password)) {
            score += 1;
        }
        if (PASSWORD_POLICY.requireSpecialChars && !/[^A-Za-z0-9]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }
        else if (/[^A-Za-z0-9]/.test(password)) {
            score += 1;
        }
        // Check for repeating characters
        if (PASSWORD_POLICY.maxRepeatingChars > 0) {
            const repeatingRegex = new RegExp(`(.)\\1{${PASSWORD_POLICY.maxRepeatingChars},}`);
            if (repeatingRegex.test(password)) {
                errors.push(`Password must not contain more than ${PASSWORD_POLICY.maxRepeatingChars} repeating characters in a row`);
            }
        }
        // Check for sequential characters
        if (PASSWORD_POLICY.maxSequentialChars > 0) {
            if (this.hasSequentialChars(password, PASSWORD_POLICY.maxSequentialChars)) {
                errors.push(`Password must not contain more than ${PASSWORD_POLICY.maxSequentialChars} sequential characters`);
            }
        }
        // Check for common passwords
        if (PASSWORD_POLICY.preventCommonPasswords && COMMON_PASSWORDS.has(password.toLowerCase())) {
            errors.push('Password is too common. Please choose a stronger password.');
        }
        // Check if password contains user info
        if (PASSWORD_POLICY.preventUserInfoInPassword && userInfo) {
            const lowerPassword = password.toLowerCase();
            if (userInfo.email) {
                const emailParts = userInfo.email.split('@')[0].toLowerCase();
                if (emailParts.length > 3 && lowerPassword.includes(emailParts)) {
                    errors.push('Password must not contain your email address');
                }
            }
            if (userInfo.name) {
                const nameParts = userInfo.name.toLowerCase().split(/\s+/);
                for (const part of nameParts) {
                    if (part.length > 3 && lowerPassword.includes(part)) {
                        errors.push('Password must not contain your name');
                        break;
                    }
                }
            }
        }
        // Determine strength
        let strength = 'weak';
        if (score >= 6)
            strength = 'very_strong';
        else if (score >= 5)
            strength = 'strong';
        else if (score >= 4)
            strength = 'good';
        else if (score >= 3)
            strength = 'fair';
        // Generate feedback
        if (score < 3) {
            feedback.push('Add more character types (uppercase, numbers, symbols)');
            feedback.push('Make your password longer (12+ characters recommended)');
        }
        else if (score < 5) {
            feedback.push('Consider making your password longer for better security');
        }
        return {
            valid: errors.length === 0,
            errors,
            strength,
            score,
            feedback,
        };
    }
    /**
     * Check for sequential characters
     */
    static hasSequentialChars(password, maxSequential) {
        const sequences = [
            'abcdefghijklmnopqrstuvwxyz',
            'zyxwvutsrqponmlkjihgfedcba',
            '0123456789',
            '9876543210',
            'qwertyuiop',
            'poiuytrewq',
            'asdfghjkl',
            'lkjhgfdsa',
            'zxcvbnm',
            'mnbvcxz',
        ];
        const lowerPassword = password.toLowerCase();
        for (const seq of sequences) {
            for (let i = 0; i <= seq.length - maxSequential; i++) {
                const fragment = seq.substring(i, i + maxSequential);
                if (lowerPassword.includes(fragment)) {
                    return true;
                }
            }
        }
        return false;
    }
    /**
     * Check password against history
     */
    static async checkPasswordHistory(userId, newPassword) {
        try {
            const history = await client_1.prisma.$queryRaw `
        SELECT password_hash as hash, created_at 
        FROM password_history 
        WHERE user_id = ${userId} 
        ORDER BY created_at DESC 
        LIMIT ${PASSWORD_POLICY.historyCount}
      `;
            for (const entry of history) {
                const isMatch = await bcrypt_1.default.compare(newPassword, entry.hash);
                if (isMatch) {
                    return {
                        allowed: false,
                        error: `Password cannot be the same as your last ${PASSWORD_POLICY.historyCount} passwords`,
                    };
                }
            }
            return { allowed: true };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to check password history');
            return { allowed: true }; // Allow on error to prevent lockout
        }
    }
    /**
     * Check if password needs to be changed (age policy)
     */
    static async checkPasswordAge(userId) {
        try {
            const result = await client_1.prisma.$queryRaw `
        SELECT last_password_change as last_changed 
        FROM users 
        WHERE id = ${userId}
      `;
            if (!result || result.length === 0) {
                return { expired: false, warning: false };
            }
            const lastChanged = new Date(result[0].last_changed);
            const now = new Date();
            const daysSinceChange = Math.floor((now.getTime() - lastChanged.getTime()) / (1000 * 60 * 60 * 24));
            const daysRemaining = PASSWORD_POLICY.maxAgeDays - daysSinceChange;
            const expired = daysSinceChange >= PASSWORD_POLICY.maxAgeDays;
            const warning = daysRemaining <= PASSWORD_POLICY.expiryWarningDays && daysRemaining > 0;
            return {
                expired,
                warning,
                daysRemaining: Math.max(0, daysRemaining),
                lastChanged,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to check password age');
            return { expired: false, warning: false };
        }
    }
    /**
     * Check minimum password age (prevent rapid changes)
     */
    static async checkMinPasswordAge(userId) {
        try {
            const result = await client_1.prisma.$queryRaw `
        SELECT last_password_change as last_changed 
        FROM users 
        WHERE id = ${userId}
      `;
            if (!result || result.length === 0) {
                return { allowed: true };
            }
            const lastChanged = new Date(result[0].last_changed);
            const hoursSinceChange = (Date.now() - lastChanged.getTime()) / (1000 * 60 * 60);
            if (hoursSinceChange < PASSWORD_POLICY.minAgeHours) {
                const hoursRemaining = Math.ceil(PASSWORD_POLICY.minAgeHours - hoursSinceChange);
                return {
                    allowed: false,
                    hoursRemaining,
                    error: `Please wait ${hoursRemaining} hour(s) before changing your password again`,
                };
            }
            return { allowed: true };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to check min password age');
            return { allowed: true };
        }
    }
    /**
     * Record password change in history
     */
    static async recordPasswordChange(userId, newPasswordHash) {
        try {
            // Add to history
            await client_1.prisma.$executeRaw `
        INSERT INTO password_history (id, user_id, password_hash, created_at)
        VALUES (${crypto_1.default.randomBytes(16).toString('hex')}, ${userId}, ${newPasswordHash}, NOW())
      `;
            // Update last change timestamp
            await client_1.prisma.$executeRaw `
        UPDATE users SET last_password_change = NOW(), updated_at = NOW()
        WHERE id = ${userId}
      `;
            // Trim history beyond retention
            await client_1.prisma.$executeRaw `
        DELETE FROM password_history 
        WHERE user_id = ${userId} 
          AND id NOT IN (
            SELECT id FROM password_history 
            WHERE user_id = ${userId} 
            ORDER BY created_at DESC 
            LIMIT ${PASSWORD_POLICY.historyCount}
          )
      `;
            logger_1.logger.info({ userId }, 'Password change recorded in history');
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to record password change');
        }
    }
    /**
     * Hash password
     */
    static async hashPassword(password) {
        const salt = await bcrypt_1.default.genSalt(auth_config_1.authConfig.password.bcryptRounds);
        return await bcrypt_1.default.hash(password, salt);
    }
    /**
     * Complete password change validation
     */
    static async validatePasswordChange(userId, currentPassword, newPassword, userInfo) {
        const errors = [];
        // Validate new password strength
        const validationResult = this.validatePassword(newPassword, userInfo);
        if (!validationResult.valid) {
            return { valid: false, errors: validationResult.errors, passwordValid: validationResult };
        }
        // Check password history
        const historyCheck = await this.checkPasswordHistory(userId, newPassword);
        if (!historyCheck.allowed) {
            errors.push(historyCheck.error);
        }
        // Check minimum age
        const minAgeCheck = await this.checkMinPasswordAge(userId);
        if (!minAgeCheck.allowed) {
            errors.push(minAgeCheck.error);
        }
        // Verify current password
        const user = await client_1.prisma.user.findUnique({
            where: { id: userId },
            select: { passwordHash: true },
        });
        if (user?.passwordHash) {
            const isCurrentValid = await bcrypt_1.default.compare(currentPassword, user.passwordHash);
            if (!isCurrentValid) {
                errors.push('Current password is incorrect');
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            passwordValid: validationResult,
        };
    }
    /**
     * Get password policy for display
     */
    static getPolicy() {
        return { ...PASSWORD_POLICY };
    }
    /**
     * Get users with expiring passwords
     */
    static async getUsersWithExpiringPasswords() {
        try {
            const warningDate = new Date();
            warningDate.setDate(warningDate.getDate() + PASSWORD_POLICY.expiryWarningDays);
            const expiredDate = new Date();
            expiredDate.setDate(expiredDate.getDate() - PASSWORD_POLICY.maxAgeDays);
            const users = await client_1.prisma.$queryRaw `
        SELECT id, email, last_password_change 
        FROM users 
        WHERE is_active = true 
          AND last_password_change <= ${warningDate}
          AND last_password_change >= ${expiredDate}
        ORDER BY last_password_change ASC
      `;
            return users.map(u => ({
                userId: u.id,
                email: u.email,
                daysRemaining: Math.floor((PASSWORD_POLICY.maxAgeDays * 24 * 60 * 60 * 1000 -
                    (Date.now() - new Date(u.last_password_change).getTime())) /
                    (1000 * 60 * 60 * 24)),
            }));
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to get users with expiring passwords');
            return [];
        }
    }
}
exports.PasswordPolicyService = PasswordPolicyService;
//# sourceMappingURL=password-policy.service.js.map