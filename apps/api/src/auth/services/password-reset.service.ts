// enterprise-ai-agent-platform/apps/api/src/auth/services/password-reset.service.ts
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { addHours } from 'date-fns';
import { prisma } from '../../db/client';
import { UserRepository } from '../../db/repositories/user.repository';
import { logger } from '../../utils/logger';
import { authConfig } from '../../config/auth.config';
import { EmailService } from '../../services/email.service';

export interface PasswordResetResult {
  success: boolean;
  error?: string;
  message?: string;
}

export interface EmailVerificationResult {
  success: boolean;
  error?: string;
}

export class PasswordResetService {
  /**
   * Generate a secure random token
   */
  static generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash a token for storage (optional, for extra security)
   */
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Create password reset token for a user
   */
  static async createPasswordResetToken(email: string): Promise<PasswordResetResult> {
    try {
      // Find user by email
      const user = await UserRepository.findByEmail(email);
      if (!user) {
        // Don't reveal that user doesn't exist for security
        logger.info({ email }, 'Password reset requested for non-existent user');
        return {
          success: true,
          message: 'If an account exists with that email, you will receive a password reset link.',
        };
      }

      // Check if user has email/password auth (not just OAuth)
      if (!user.passwordHash) {
        logger.info({ userId: user.id, email }, 'Password reset requested for OAuth-only user');
        return {
          success: true,
          message: 'If an account exists with that email, you will receive a password reset link.',
        };
      }

      // Invalidate any existing reset tokens for this user
      await prisma.passwordResetToken.updateMany({
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
      const expiresAt = addHours(new Date(), 1); // 1 hour expiry

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      });

      // Send email with reset link
      const resetLink = `${process.env.APP_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
      
      await EmailService.sendPasswordResetEmail(
        email,
        user.name || email.split('@')[0],
        resetLink,
        1
      );

      logger.info({ userId: user.id, email }, 'Password reset token created and email sent');

      return {
        success: true,
        message: 'If an account exists with that email, you will receive a password reset link.',
      };
    } catch (error) {
      logger.error({ error, email }, 'Failed to create password reset token');
      return {
        success: false,
        error: 'Unable to process password reset request. Please try again later.',
      };
    }
  }

  /**
   * Reset password using token
   */
  static async resetPassword(token: string, newPassword: string): Promise<PasswordResetResult> {
    try {
      // Find valid token
      const resetToken = await prisma.passwordResetToken.findFirst({
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
        logger.warn({ tokenPrefix: token.substring(0, 8) }, 'Invalid or expired password reset token');
        return {
          success: false,
          error: 'Invalid or expired reset token. Please request a new password reset.',
        };
      }

      // Validate password strength
      const { LocalStrategy } = await import('../strategies/local.strategy');
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
      await prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          passwordHash: hashedPassword,
          updatedAt: new Date(),
        },
      });

      // Mark token as used
      await prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: {
          usedAt: new Date(),
        },
      });

      // Revoke all sessions for security (force re-login)
      await prisma.session.updateMany({
        where: {
          userId: resetToken.userId,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
        },
      });

      // Send confirmation email
      await EmailService.sendPasswordChangedEmail(
        resetToken.user.email,
        resetToken.user.name || resetToken.user.email.split('@')[0]
      );

      logger.info({ userId: resetToken.userId }, 'Password reset successfully');

      return {
        success: true,
        message: 'Password has been reset successfully. Please login with your new password.',
      };
    } catch (error) {
      logger.error({ error, tokenPrefix: token.substring(0, 8) }, 'Failed to reset password');
      return {
        success: false,
        error: 'Unable to reset password. Please try again later.',
      };
    }
  }

  /**
   * Create email verification token for new user
   */
  static async createEmailVerificationToken(userId: string, email: string): Promise<string | null> {
    try {
      // Invalidate existing tokens
      await prisma.emailVerificationToken.updateMany({
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
      const expiresAt = addHours(new Date(), 168); // 7 days expiry

      await prisma.emailVerificationToken.create({
        data: {
          userId,
          email,
          token,
          expiresAt,
        },
      });

      // Send verification email
      const verificationLink = `${process.env.APP_URL}/verify-email?token=${token}`;
      
      await EmailService.sendEmailVerification({
        to: email,
        verificationLink,
        expiresInDays: 7,
      });

      logger.info({ userId, email }, 'Email verification token created');

      return token;
    } catch (error) {
      logger.error({ error, userId, email }, 'Failed to create email verification token');
      return null;
    }
  }

  /**
   * Verify email using token
   */
  static async verifyEmail(token: string): Promise<EmailVerificationResult> {
    try {
      // Find valid token
      const verificationToken = await prisma.emailVerificationToken.findFirst({
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
        logger.warn({ tokenPrefix: token.substring(0, 8) }, 'Invalid or expired email verification token');
        return {
          success: false,
          error: 'Invalid or expired verification link. Please request a new one.',
        };
      }

      // Mark user as verified
      await prisma.user.update({
        where: { id: verificationToken.userId },
        data: {
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });

      // Mark token as used
      await prisma.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: {
          usedAt: new Date(),
        },
      });

      logger.info({ userId: verificationToken.userId, email: verificationToken.email }, 'Email verified successfully');

      return {
        success: true,
      };
    } catch (error) {
      logger.error({ error, tokenPrefix: token.substring(0, 8) }, 'Failed to verify email');
      return {
        success: false,
        error: 'Unable to verify email. Please try again later.',
      };
    }
  }

  /**
   * Resend email verification
   */
  static async resendVerification(email: string): Promise<PasswordResetResult> {
    try {
      const user = await UserRepository.findByEmail(email);
      
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
    } catch (error) {
      logger.error({ error, email }, 'Failed to resend verification');
      return {
        success: false,
        error: 'Unable to send verification email. Please try again later.',
      };
    }
  }

  /**
   * Change password for authenticated user
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<PasswordResetResult> {
    try {
      const user = await prisma.user.findUnique({
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
      const { LocalStrategy } = await import('../strategies/local.strategy');
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
      
      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: hashedPassword,
          updatedAt: new Date(),
        },
      });

      // Send confirmation email
      await EmailService.sendPasswordChangedEmail(
        user.email,
        user.name || user.email.split('@')[0]
      );

      logger.info({ userId }, 'Password changed successfully');

      return {
        success: true,
        message: 'Password changed successfully.',
      };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to change password');
      return {
        success: false,
        error: 'Unable to change password. Please try again later.',
      };
    }
  }

  /**
   * Clean up expired tokens (run by cron)
   */
  static async cleanupExpiredTokens(): Promise<{ passwordTokens: number; emailTokens: number }> {
    try {
      const now = new Date();
      
      const passwordTokensDeleted = await prisma.passwordResetToken.deleteMany({
        where: {
          expiresAt: { lt: now },
        },
      });
      
      const emailTokensDeleted = await prisma.emailVerificationToken.deleteMany({
        where: {
          expiresAt: { lt: now },
        },
      });
      
      logger.info({
        passwordTokens: passwordTokensDeleted.count,
        emailTokens: emailTokensDeleted.count,
      }, 'Expired tokens cleaned up');
      
      return {
        passwordTokens: passwordTokensDeleted.count,
        emailTokens: emailTokensDeleted.count,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to cleanup expired tokens');
      return { passwordTokens: 0, emailTokens: 0 };
    }
  }
}