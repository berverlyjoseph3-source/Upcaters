"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordResetService = void 0;
// enterprise-ai-agent-platform/apps/api/src/auth/services/password-reset.service.ts
const crypto_1 = __importDefault(require("crypto"));
const date_fns_1 = require("date-fns");
const client_1 = require("../../db/client");
const user_repository_1 = require("../../db/repositories/user.repository");
const logger_1 = require("../../utils/logger");
const email_service_1 = require("../../services/email.service");
class PasswordResetService {
    /**
     * Generate a secure random token
     */
    static generateToken() {
        return crypto_1.default.randomBytes(32).toString('hex');
    }
    /**
     * Hash a token for storage (optional, for extra security)
     */
    static hashToken(token) {
        return crypto_1.default.createHash('sha256').update(token).digest('hex');
    }
    /**
     * Create password reset token for a user
     */
    static async createPasswordResetToken(email) {
        try {
            // Find user by email
            const user = await user_repository_1.UserRepository.findByEmail(email);
            if (!user) {
                // Don't reveal that user doesn't exist for security
                logger_1.logger.info({ email }, 'Password reset requested for non-existent user');
                return {
                    success: true,
                    message: 'If an account exists with that email, you will receive a password reset link.',
                };
            }
            // Check if user has email/password auth (not just OAuth)
            if (!user.passwordHash) {
                logger_1.logger.info({ userId: user.id, email }, 'Password reset requested for OAuth-only user');
                return {
                    success: true,
                    message: 'If an account exists with that email, you will receive a password reset link.',
                };
            }
            // Invalidate any existing reset tokens for this user
            await client_1.prisma.passwordResetToken.updateMany({
                where: {
                    userId: user.id,
                    usedAt: null,
                    expiresAt: { gt: new Date() },
                },
                data: {
                    expiresAt: new Date(), // Expire existing tokens
                },
            });
            // Create new reset token
            const token = this.generateToken();
            const expiresAt = (0, date_fns_1.addHours)(new Date(), 1); // 1 hour expiry
            await client_1.prisma.passwordResetToken.create({
                data: {
                    userId: user.id,
                    token,
                    expiresAt,
                },
            });
            // Send email with reset link
            const resetLink = `${process.env.APP_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
            await email_service_1.EmailService.sendPasswordResetEmail(email, user.name || email.split('@')[0], resetLink, 1);
            logger_1.logger.info({ userId: user.id, email }, 'Password reset token created and email sent');
            return {
                success: true,
                message: 'If an account exists with that email, you will receive a password reset link.',
            };
        }
        catch (error) {
            logger_1.logger.error({ error, email }, 'Failed to create password reset token');
            return {
                success: false,
                error: 'Unable to process password reset request. Please try again later.',
            };
        }
    }
    /**
     * Reset password using token
     */
    static async resetPassword(token, newPassword) {
        try {
            // Find valid token
            const resetToken = await client_1.prisma.passwordResetToken.findFirst({
                where: {
                    token,
                    usedAt: null,
                    expiresAt: { gt: new Date() },
                },
                include: {
                    user: true,
                },
            });
            if (!resetToken) {
                logger_1.logger.warn({ tokenPrefix: token.substring(0, 8) }, 'Invalid or expired password reset token');
                return {
                    success: false,
                    error: 'Invalid or expired reset token. Please request a new password reset.',
                };
            }
            // Validate password strength
            const { LocalStrategy } = await Promise.resolve().then(() => __importStar(require('../strategies/local.strategy')));
            const passwordValidation = LocalStrategy.validatePasswordStrength(newPassword);
            if (!passwordValidation.valid) {
                return {
                    success: false,
                    error: passwordValidation.errors[0],
                };
            }
            // Hash new password
            const hashedPassword = await LocalStrategy.hashPassword(newPassword);
            // Update user password
            await client_1.prisma.user.update({
                where: { id: resetToken.userId },
                data: {
                    passwordHash: hashedPassword,
                    updatedAt: new Date(),
                },
            });
            // Mark token as used
            await client_1.prisma.passwordResetToken.update({
                where: { id: resetToken.id },
                data: {
                    usedAt: new Date(),
                },
            });
            // Revoke all sessions for security (force re-login)
            await client_1.prisma.session.updateMany({
                where: {
                    userId: resetToken.userId,
                    isRevoked: false,
                },
                data: {
                    isRevoked: true,
                },
            });
            // Send confirmation email
            await email_service_1.EmailService.sendPasswordChangedEmail(resetToken.user.email, resetToken.user.name || resetToken.user.email.split('@')[0]);
            logger_1.logger.info({ userId: resetToken.userId }, 'Password reset successfully');
            return {
                success: true,
                message: 'Password has been reset successfully. Please login with your new password.',
            };
        }
        catch (error) {
            logger_1.logger.error({ error, tokenPrefix: token.substring(0, 8) }, 'Failed to reset password');
            return {
                success: false,
                error: 'Unable to reset password. Please try again later.',
            };
        }
    }
    /**
     * Create email verification token for new user
     */
    static async createEmailVerificationToken(userId, email) {
        try {
            // Invalidate existing tokens
            await client_1.prisma.emailVerificationToken.updateMany({
                where: {
                    userId,
                    usedAt: null,
                    expiresAt: { gt: new Date() },
                },
                data: {
                    expiresAt: new Date(),
                },
            });
            // Create new verification token
            const token = this.generateToken();
            const expiresAt = (0, date_fns_1.addHours)(new Date(), 168); // 7 days expiry
            await client_1.prisma.emailVerificationToken.create({
                data: {
                    userId,
                    email,
                    token,
                    expiresAt,
                },
            });
            // Send verification email
            const verificationLink = `${process.env.APP_URL}/verify-email?token=${token}`;
            await email_service_1.EmailService.sendEmailVerification({
                to: email,
                verificationLink,
                expiresInDays: 7,
            });
            logger_1.logger.info({ userId, email }, 'Email verification token created');
            return token;
        }
        catch (error) {
            logger_1.logger.error({ error, userId, email }, 'Failed to create email verification token');
            return null;
        }
    }
    /**
     * Verify email using token
     */
    static async verifyEmail(token) {
        try {
            // Find valid token
            const verificationToken = await client_1.prisma.emailVerificationToken.findFirst({
                where: {
                    token,
                    usedAt: null,
                    expiresAt: { gt: new Date() },
                },
                include: {
                    user: true,
                },
            });
            if (!verificationToken) {
                logger_1.logger.warn({ tokenPrefix: token.substring(0, 8) }, 'Invalid or expired email verification token');
                return {
                    success: false,
                    error: 'Invalid or expired verification link. Please request a new one.',
                };
            }
            // Mark user as verified
            await client_1.prisma.user.update({
                where: { id: verificationToken.userId },
                data: {
                    isEmailVerified: true,
                    emailVerifiedAt: new Date(),
                },
            });
            // Mark token as used
            await client_1.prisma.emailVerificationToken.update({
                where: { id: verificationToken.id },
                data: {
                    usedAt: new Date(),
                },
            });
            logger_1.logger.info({ userId: verificationToken.userId, email: verificationToken.email }, 'Email verified successfully');
            return {
                success: true,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, tokenPrefix: token.substring(0, 8) }, 'Failed to verify email');
            return {
                success: false,
                error: 'Unable to verify email. Please try again later.',
            };
        }
    }
    /**
     * Resend email verification
     */
    static async resendVerification(email) {
        try {
            const user = await user_repository_1.UserRepository.findByEmail(email);
            if (!user) {
                return {
                    success: true,
                    message: 'If an account exists with that email, a verification link has been sent.',
                };
            }
            if (user.isEmailVerified) {
                return {
                    success: false,
                    error: 'Email is already verified. Please login to your account.',
                };
            }
            await this.createEmailVerificationToken(user.id, user.email);
            return {
                success: true,
                message: 'A new verification link has been sent to your email address.',
            };
        }
        catch (error) {
            logger_1.logger.error({ error, email }, 'Failed to resend verification');
            return {
                success: false,
                error: 'Unable to send verification email. Please try again later.',
            };
        }
    }
    /**
     * Change password for authenticated user
     */
    static async changePassword(userId, currentPassword, newPassword) {
        try {
            const user = await client_1.prisma.user.findUnique({
                where: { id: userId },
                select: { passwordHash: true, email: true, name: true },
            });
            if (!user || !user.passwordHash) {
                return {
                    success: false,
                    error: 'Account does not have a password set. Use "Forgot Password" to create one.',
                };
            }
            // Verify current password
            const { LocalStrategy } = await Promise.resolve().then(() => __importStar(require('../strategies/local.strategy')));
            const isValid = await LocalStrategy.verifyPassword(currentPassword, user.passwordHash);
            if (!isValid) {
                return {
                    success: false,
                    error: 'Current password is incorrect.',
                };
            }
            // Validate new password strength
            const passwordValidation = LocalStrategy.validatePasswordStrength(newPassword);
            if (!passwordValidation.valid) {
                return {
                    success: false,
                    error: passwordValidation.errors[0],
                };
            }
            // Hash and update new password
            const hashedPassword = await LocalStrategy.hashPassword(newPassword);
            await client_1.prisma.user.update({
                where: { id: userId },
                data: {
                    passwordHash: hashedPassword,
                    updatedAt: new Date(),
                },
            });
            // Send confirmation email
            await email_service_1.EmailService.sendPasswordChangedEmail(user.email, user.name || user.email.split('@')[0]);
            logger_1.logger.info({ userId }, 'Password changed successfully');
            return {
                success: true,
                message: 'Password changed successfully.',
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to change password');
            return {
                success: false,
                error: 'Unable to change password. Please try again later.',
            };
        }
    }
    /**
     * Clean up expired tokens (run by cron)
     */
    static async cleanupExpiredTokens() {
        try {
            const now = new Date();
            const passwordTokensDeleted = await client_1.prisma.passwordResetToken.deleteMany({
                where: {
                    expiresAt: { lt: now },
                },
            });
            const emailTokensDeleted = await client_1.prisma.emailVerificationToken.deleteMany({
                where: {
                    expiresAt: { lt: now },
                },
            });
            logger_1.logger.info({
                passwordTokens: passwordTokensDeleted.count,
                emailTokens: emailTokensDeleted.count,
            }, 'Expired tokens cleaned up');
            return {
                passwordTokens: passwordTokensDeleted.count,
                emailTokens: emailTokensDeleted.count,
            };
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to cleanup expired tokens');
            return { passwordTokens: 0, emailTokens: 0 };
        }
    }
}
exports.PasswordResetService = PasswordResetService;
//# sourceMappingURL=password-reset.service.js.map