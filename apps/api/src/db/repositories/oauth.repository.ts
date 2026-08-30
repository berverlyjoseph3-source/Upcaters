// enterprise-ai-agent-platform/apps/api/src/db/repositories/oauth.repository.ts
import { Prisma, OAuthProvider, SyncStatus } from '@prisma/client';
import { prisma, withTransaction } from '../client';
import { logger } from '../../utils/logger';
import * as crypto from 'crypto';

export interface OAuthConnectionInput {
  userId: string;
  provider: OAuthProvider;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
  providerUserId?: string;
  providerEmail?: string;
  webhookUrl?: string;
}

export interface OAuthTokenUpdate {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
  lastSyncedAt?: Date;
  syncStatus?: SyncStatus;
  syncError?: string;
}

export class OAuthRepository {
  private static readonly ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';
  private static readonly ALGORITHM = 'aes-256-gcm';

  /**
   * Encrypt sensitive token data
   */
  private static encryptToken(token: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        this.ALGORITHM,
        Buffer.from(this.ENCRYPTION_KEY, 'hex'),
        iv
      );
      
      let encrypted = cipher.update(token, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Format: iv:authTag:encrypted
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      logger.error({ error }, 'Failed to encrypt token');
      throw error;
    }
  }

  /**
   * Decrypt sensitive token data
   */
  private static decryptToken(encryptedToken: string): string {
    try {
      const [ivHex, authTagHex, encrypted] = encryptedToken.split(':');
      
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv(
        this.ALGORITHM,
        Buffer.from(this.ENCRYPTION_KEY, 'hex'),
        iv
      );
      
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error({ error }, 'Failed to decrypt token');
      throw error;
    }
  }

  /**
   * Create or update OAuth connection
   */
  static async upsertConnection(data: OAuthConnectionInput): Promise<{ id: string; provider: OAuthProvider }> {
    try {
      const encryptedAccessToken = this.encryptToken(data.accessToken);
      const encryptedRefreshToken = data.refreshToken ? this.encryptToken(data.refreshToken) : null;

      const connection = await prisma.oAuthConnection.upsert({
        where: {
          userId_provider: {
            userId: data.userId,
            provider: data.provider,
          },
        },
        update: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt: data.expiresAt,
          scope: data.scope,
          providerUserId: data.providerUserId,
          providerEmail: data.providerEmail,
          webhookUrl: data.webhookUrl,
          syncStatus: SyncStatus.PENDING,
          updatedAt: new Date(),
        },
        create: {
          userId: data.userId,
          provider: data.provider,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt: data.expiresAt,
          scope: data.scope,
          providerUserId: data.providerUserId,
          providerEmail: data.providerEmail,
          webhookUrl: data.webhookUrl,
          syncStatus: SyncStatus.PENDING,
        },
        select: {
          id: true,
          provider: true,
        },
      });

      logger.info({
        connectionId: connection.id,
        userId: data.userId,
        provider: data.provider,
      }, 'OAuth connection upserted');

      return connection;
    } catch (error) {
      logger.error({ error, data }, 'Failed to upsert OAuth connection');
      throw error;
    }
  }

  /**
   * Get OAuth connection for a user
   */
  static async getConnection(userId: string, provider: OAuthProvider) {
    try {
      const connection = await prisma.oAuthConnection.findUnique({
        where: {
          userId_provider: {
            userId,
            provider,
          },
        },
      });

      if (!connection) return null;

      // Decrypt tokens
      return {
        ...connection,
        accessToken: this.decryptToken(connection.accessToken),
        refreshToken: connection.refreshToken ? this.decryptToken(connection.refreshToken) : null,
      };
    } catch (error) {
      logger.error({ error, userId, provider }, 'Failed to get OAuth connection');
      throw error;
    }
  }

  /**
   * Get all OAuth connections for a user
   */
  static async getUserConnections(userId: string) {
    try {
      const connections = await prisma.oAuthConnection.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      // Decrypt tokens for each connection
      return connections.map(conn => ({
        ...conn,
        accessToken: this.decryptToken(conn.accessToken),
        refreshToken: conn.refreshToken ? this.decryptToken(conn.refreshToken) : null,
      }));
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get user OAuth connections');
      throw error;
    }
  }

  /**
   * Update connection tokens
   */
  static async updateTokens(
    userId: string,
    provider: OAuthProvider,
    tokens: OAuthTokenUpdate
  ): Promise<void> {
    try {
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (tokens.accessToken) {
        updateData.accessToken = this.encryptToken(tokens.accessToken);
      }
      if (tokens.refreshToken) {
        updateData.refreshToken = this.encryptToken(tokens.refreshToken);
      }
      if (tokens.expiresAt) updateData.expiresAt = tokens.expiresAt;
      if (tokens.scope) updateData.scope = tokens.scope;
      if (tokens.lastSyncedAt) updateData.lastSyncedAt = tokens.lastSyncedAt;
      if (tokens.syncStatus) updateData.syncStatus = tokens.syncStatus;
      if (tokens.syncError) updateData.syncError = tokens.syncError;

      await prisma.oAuthConnection.update({
        where: {
          userId_provider: {
            userId,
            provider,
          },
        },
        data: updateData,
      });

      logger.info({ userId, provider }, 'OAuth tokens updated');
    } catch (error) {
      logger.error({ error, userId, provider }, 'Failed to update OAuth tokens');
      throw error;
    }
  }

  /**
   * Update sync status
   */
  static async updateSyncStatus(
    userId: string,
    provider: OAuthProvider,
    status: SyncStatus,
    error?: string
  ): Promise<void> {
    try {
      await prisma.oAuthConnection.update({
        where: {
          userId_provider: {
            userId,
            provider,
          },
        },
        data: {
          syncStatus: status,
          syncError: error,
          lastSyncedAt: status === SyncStatus.SUCCESS ? new Date() : undefined,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error({ error, userId, provider, status }, 'Failed to update sync status');
      throw error;
    }
  }

  /**
   * Delete OAuth connection
   */
  static async deleteConnection(userId: string, provider: OAuthProvider): Promise<void> {
    try {
      await prisma.oAuthConnection.delete({
        where: {
          userId_provider: {
            userId,
            provider,
          },
        },
      });

      logger.info({ userId, provider }, 'OAuth connection deleted');
    } catch (error) {
      logger.error({ error, userId, provider }, 'Failed to delete OAuth connection');
      throw error;
    }
  }

  /**
   * Get connections that need token refresh
   */
  static async getConnectionsNeedingRefresh(
    minutesBeforeExpiry: number = 5
  ): Promise<Array<{ userId: string; provider: OAuthProvider; refreshToken: string }>> {
    try {
      const expiryThreshold = new Date();
      expiryThreshold.setMinutes(expiryThreshold.getMinutes() + minutesBeforeExpiry);

      const connections = await prisma.oAuthConnection.findMany({
        where: {
          expiresAt: { lte: expiryThreshold },
          refreshToken: { not: null },
        },
        select: {
          userId: true,
          provider: true,
          refreshToken: true,
        },
      });

      return connections.map(conn => ({
        userId: conn.userId,
        provider: conn.provider,
        refreshToken: conn.refreshToken ? this.decryptToken(conn.refreshToken) : '',
      }));
    } catch (error) {
      logger.error({ error }, 'Failed to get connections needing refresh');
      throw error;
    }
  }

  /**
   * Get connection by provider user ID
   */
  static async getConnectionByProviderUserId(
    provider: OAuthProvider,
    providerUserId: string
  ) {
    try {
      const connection = await prisma.oAuthConnection.findFirst({
        where: {
          provider,
          providerUserId,
        },
      });

      if (!connection) return null;

      return {
        ...connection,
        accessToken: this.decryptToken(connection.accessToken),
        refreshToken: connection.refreshToken ? this.decryptToken(connection.refreshToken) : null,
      };
    } catch (error) {
      logger.error({ error, provider, providerUserId }, 'Failed to get connection by provider user ID');
      throw error;
    }
  }

  /**
   * Validate if connection is still valid
   */
  static async isConnectionValid(userId: string, provider: OAuthProvider): Promise<boolean> {
    try {
      const connection = await prisma.oAuthConnection.findUnique({
        where: {
          userId_provider: {
            userId,
            provider,
          },
        },
        select: {
          expiresAt: true,
          syncStatus: true,
          refreshToken: true,
        },
      });

      if (!connection) return false;
      if (connection.syncStatus === SyncStatus.ERROR) return false;
      if (connection.expiresAt && connection.expiresAt < new Date()) {
        // Expired but has refresh token - can be refreshed
        return !!connection.refreshToken;
      }

      return true;
    } catch (error) {
      logger.error({ error, userId, provider }, 'Failed to validate connection');
      return false;
    }
  }
}