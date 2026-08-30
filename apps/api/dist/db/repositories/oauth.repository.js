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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuthRepository = void 0;
// enterprise-ai-agent-platform/apps/api/src/db/repositories/oauth.repository.ts
const client_1 = require("@prisma/client");
const client_2 = require("../client");
const logger_1 = require("../../utils/logger");
const crypto = __importStar(require("crypto"));
class OAuthRepository {
    /**
     * Encrypt sensitive token data
     */
    static encryptToken(token) {
        try {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv(this.ALGORITHM, Buffer.from(this.ENCRYPTION_KEY, 'hex'), iv);
            let encrypted = cipher.update(token, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            const authTag = cipher.getAuthTag();
            // Format: iv:authTag:encrypted
            return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to encrypt token');
            throw error;
        }
    }
    /**
     * Decrypt sensitive token data
     */
    static decryptToken(encryptedToken) {
        try {
            const [ivHex, authTagHex, encrypted] = encryptedToken.split(':');
            const iv = Buffer.from(ivHex, 'hex');
            const authTag = Buffer.from(authTagHex, 'hex');
            const decipher = crypto.createDecipheriv(this.ALGORITHM, Buffer.from(this.ENCRYPTION_KEY, 'hex'), iv);
            decipher.setAuthTag(authTag);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to decrypt token');
            throw error;
        }
    }
    /**
     * Create or update OAuth connection
     */
    static async upsertConnection(data) {
        try {
            const encryptedAccessToken = this.encryptToken(data.accessToken);
            const encryptedRefreshToken = data.refreshToken ? this.encryptToken(data.refreshToken) : null;
            const connection = await client_2.prisma.oAuthConnection.upsert({
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
                    syncStatus: client_1.SyncStatus.PENDING,
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
                    syncStatus: client_1.SyncStatus.PENDING,
                },
                select: {
                    id: true,
                    provider: true,
                },
            });
            logger_1.logger.info({
                connectionId: connection.id,
                userId: data.userId,
                provider: data.provider,
            }, 'OAuth connection upserted');
            return connection;
        }
        catch (error) {
            logger_1.logger.error({ error, data }, 'Failed to upsert OAuth connection');
            throw error;
        }
    }
    /**
     * Get OAuth connection for a user
     */
    static async getConnection(userId, provider) {
        try {
            const connection = await client_2.prisma.oAuthConnection.findUnique({
                where: {
                    userId_provider: {
                        userId,
                        provider,
                    },
                },
            });
            if (!connection)
                return null;
            // Decrypt tokens
            return {
                ...connection,
                accessToken: this.decryptToken(connection.accessToken),
                refreshToken: connection.refreshToken ? this.decryptToken(connection.refreshToken) : null,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId, provider }, 'Failed to get OAuth connection');
            throw error;
        }
    }
    /**
     * Get all OAuth connections for a user
     */
    static async getUserConnections(userId) {
        try {
            const connections = await client_2.prisma.oAuthConnection.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            });
            // Decrypt tokens for each connection
            return connections.map(conn => ({
                ...conn,
                accessToken: this.decryptToken(conn.accessToken),
                refreshToken: conn.refreshToken ? this.decryptToken(conn.refreshToken) : null,
            }));
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to get user OAuth connections');
            throw error;
        }
    }
    /**
     * Update connection tokens
     */
    static async updateTokens(userId, provider, tokens) {
        try {
            const updateData = {
                updatedAt: new Date(),
            };
            if (tokens.accessToken) {
                updateData.accessToken = this.encryptToken(tokens.accessToken);
            }
            if (tokens.refreshToken) {
                updateData.refreshToken = this.encryptToken(tokens.refreshToken);
            }
            if (tokens.expiresAt)
                updateData.expiresAt = tokens.expiresAt;
            if (tokens.scope)
                updateData.scope = tokens.scope;
            if (tokens.lastSyncedAt)
                updateData.lastSyncedAt = tokens.lastSyncedAt;
            if (tokens.syncStatus)
                updateData.syncStatus = tokens.syncStatus;
            if (tokens.syncError)
                updateData.syncError = tokens.syncError;
            await client_2.prisma.oAuthConnection.update({
                where: {
                    userId_provider: {
                        userId,
                        provider,
                    },
                },
                data: updateData,
            });
            logger_1.logger.info({ userId, provider }, 'OAuth tokens updated');
        }
        catch (error) {
            logger_1.logger.error({ error, userId, provider }, 'Failed to update OAuth tokens');
            throw error;
        }
    }
    /**
     * Update sync status
     */
    static async updateSyncStatus(userId, provider, status, error) {
        try {
            await client_2.prisma.oAuthConnection.update({
                where: {
                    userId_provider: {
                        userId,
                        provider,
                    },
                },
                data: {
                    syncStatus: status,
                    syncError: error,
                    lastSyncedAt: status === client_1.SyncStatus.SUCCESS ? new Date() : undefined,
                    updatedAt: new Date(),
                },
            });
        }
        catch (error) {
            logger_1.logger.error({ error, userId, provider, status }, 'Failed to update sync status');
            throw error;
        }
    }
    /**
     * Delete OAuth connection
     */
    static async deleteConnection(userId, provider) {
        try {
            await client_2.prisma.oAuthConnection.delete({
                where: {
                    userId_provider: {
                        userId,
                        provider,
                    },
                },
            });
            logger_1.logger.info({ userId, provider }, 'OAuth connection deleted');
        }
        catch (error) {
            logger_1.logger.error({ error, userId, provider }, 'Failed to delete OAuth connection');
            throw error;
        }
    }
    /**
     * Get connections that need token refresh
     */
    static async getConnectionsNeedingRefresh(minutesBeforeExpiry = 5) {
        try {
            const expiryThreshold = new Date();
            expiryThreshold.setMinutes(expiryThreshold.getMinutes() + minutesBeforeExpiry);
            const connections = await client_2.prisma.oAuthConnection.findMany({
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
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to get connections needing refresh');
            throw error;
        }
    }
    /**
     * Get connection by provider user ID
     */
    static async getConnectionByProviderUserId(provider, providerUserId) {
        try {
            const connection = await client_2.prisma.oAuthConnection.findFirst({
                where: {
                    provider,
                    providerUserId,
                },
            });
            if (!connection)
                return null;
            return {
                ...connection,
                accessToken: this.decryptToken(connection.accessToken),
                refreshToken: connection.refreshToken ? this.decryptToken(connection.refreshToken) : null,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, provider, providerUserId }, 'Failed to get connection by provider user ID');
            throw error;
        }
    }
    /**
     * Validate if connection is still valid
     */
    static async isConnectionValid(userId, provider) {
        try {
            const connection = await client_2.prisma.oAuthConnection.findUnique({
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
            if (!connection)
                return false;
            if (connection.syncStatus === client_1.SyncStatus.ERROR)
                return false;
            if (connection.expiresAt && connection.expiresAt < new Date()) {
                // Expired but has refresh token - can be refreshed
                return !!connection.refreshToken;
            }
            return true;
        }
        catch (error) {
            logger_1.logger.error({ error, userId, provider }, 'Failed to validate connection');
            return false;
        }
    }
}
exports.OAuthRepository = OAuthRepository;
OAuthRepository.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';
OAuthRepository.ALGORITHM = 'aes-256-gcm';
//# sourceMappingURL=oauth.repository.js.map