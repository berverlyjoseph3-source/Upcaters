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
exports.oauthRefreshWorker = exports.oauthRefreshQueue = void 0;
exports.scheduleTokenRefresh = scheduleTokenRefresh;
exports.refreshExpiringTokens = refreshExpiringTokens;
exports.initOAuthRefreshScheduler = initOAuthRefreshScheduler;
exports.cleanupExpiredConnections = cleanupExpiredConnections;
// enterprise-ai-agent-platform/apps/api/src/queues/oauth-refresh.job.ts
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const client_1 = require("../db/client");
const oauth_repository_1 = require("../db/repositories/oauth.repository");
const logger_1 = require("../utils/logger");
const client_2 = require("@prisma/client");
// Initialize Redis connection
const redisConnection = new ioredis_1.default(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 50, 2000),
});
// Queue name
const OAUTH_REFRESH_QUEUE = 'oauth-token-refresh';
// Create queue
exports.oauthRefreshQueue = new bullmq_1.Queue(OAUTH_REFRESH_QUEUE, {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    },
});
/**
 * Schedule token refresh for a specific connection
 */
async function scheduleTokenRefresh(userId, provider, refreshInSeconds) {
    await exports.oauthRefreshQueue.add(`refresh-${userId}-${provider}`, {
        userId,
        provider,
    }, {
        delay: refreshInSeconds * 1000,
        jobId: `refresh-${userId}-${provider}`,
    });
    logger_1.logger.debug({ userId, provider, refreshInSeconds }, 'Token refresh scheduled');
}
/**
 * Refresh OAuth tokens for all expiring connections
 */
async function refreshExpiringTokens() {
    try {
        // Find connections expiring in less than 1 hour
        const expiringThreshold = new Date();
        expiringThreshold.setHours(expiringThreshold.getHours() + 1);
        const connections = await client_1.prisma.oAuthConnection.findMany({
            where: {
                expiresAt: {
                    lte: expiringThreshold,
                    gt: new Date(),
                },
                refreshToken: { not: null },
                syncStatus: { not: client_2.SyncStatus.ERROR },
            },
        });
        logger_1.logger.info({ count: connections.length }, 'Found expiring OAuth tokens');
        for (const connection of connections) {
            await exports.oauthRefreshQueue.add(`refresh-${connection.userId}-${connection.provider}`, {
                userId: connection.userId,
                provider: connection.provider,
            }, {
                jobId: `refresh-${connection.userId}-${connection.provider}`,
            });
        }
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Failed to schedule expiring token refreshes');
    }
}
/**
 * Worker to process token refresh jobs
 */
exports.oauthRefreshWorker = new bullmq_1.Worker(OAUTH_REFRESH_QUEUE, async (job) => {
    const { userId, provider } = job.data;
    logger_1.logger.info({ userId, provider }, 'Starting OAuth token refresh');
    try {
        const connection = await oauth_repository_1.OAuthRepository.getConnection(userId, provider);
        if (!connection) {
            logger_1.logger.warn({ userId, provider }, 'Connection not found for refresh');
            return;
        }
        if (!connection.refreshToken) {
            logger_1.logger.warn({ userId, provider }, 'No refresh token available');
            await oauth_repository_1.OAuthRepository.updateSyncStatus(userId, provider, client_2.SyncStatus.ERROR, 'No refresh token');
            return;
        }
        // Refresh token based on provider
        let newAccessToken;
        let newRefreshToken;
        let expiresIn;
        switch (provider) {
            case client_2.OAuthProvider.GOOGLE_GMAIL:
            case client_2.OAuthProvider.GOOGLE_DRIVE:
            case client_2.OAuthProvider.GOOGLE_CALENDAR:
            case client_2.OAuthProvider.GOOGLE_TASKS: {
                const { GoogleOAuthService } = await Promise.resolve().then(() => __importStar(require('../auth/services/google-oauth.service')));
                const result = await GoogleOAuthService.refreshAccessToken(connection.refreshToken);
                newAccessToken = result.access_token;
                expiresIn = result.expires_in;
                break;
            }
            case client_2.OAuthProvider.LINKEDIN: {
                const { LinkedInOAuthService } = await Promise.resolve().then(() => __importStar(require('../auth/services/linkedin-oauth.service')));
                const result = await LinkedInOAuthService.refreshAccessToken(connection.refreshToken);
                newAccessToken = result.access_token;
                expiresIn = result.expires_in;
                break;
            }
            case client_2.OAuthProvider.FACEBOOK:
            case client_2.OAuthProvider.INSTAGRAM: {
                const { FacebookOAuthService } = await Promise.resolve().then(() => __importStar(require('../auth/services/facebook-oauth.service')));
                // Facebook long-lived tokens last 60 days, no refresh needed
                logger_1.logger.info({ userId, provider }, 'Facebook token refresh not needed (60-day tokens)');
                return;
            }
            case client_2.OAuthProvider.X_TWITTER: {
                const { TwitterOAuthService } = await Promise.resolve().then(() => __importStar(require('../auth/services/twitter-oauth.service')));
                const result = await TwitterOAuthService.refreshAccessToken(connection.refreshToken);
                newAccessToken = result.access_token;
                newRefreshToken = result.refresh_token;
                expiresIn = result.expires_in;
                break;
            }
            default:
                logger_1.logger.warn({ provider }, 'Unknown provider for token refresh');
                return;
        }
        // Update tokens in database
        const newExpiresAt = new Date(Date.now() + expiresIn * 1000);
        await oauth_repository_1.OAuthRepository.updateTokens(userId, provider, {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken || connection.refreshToken,
            expiresAt: newExpiresAt,
            syncStatus: client_2.SyncStatus.SUCCESS,
        });
        // Schedule next refresh
        const refreshInSeconds = expiresIn - 3600; // Refresh 1 hour before expiry
        if (refreshInSeconds > 0) {
            await scheduleTokenRefresh(userId, provider, refreshInSeconds);
        }
        logger_1.logger.info({ userId, provider, expiresIn }, 'OAuth tokens refreshed successfully');
    }
    catch (error) {
        logger_1.logger.error({ error, userId, provider }, 'Failed to refresh OAuth token');
        await oauth_repository_1.OAuthRepository.updateSyncStatus(userId, provider, client_2.SyncStatus.ERROR, String(error));
        // Schedule retry in 1 hour
        await scheduleTokenRefresh(userId, provider, 3600);
        throw error;
    }
}, {
    connection: redisConnection,
    concurrency: 5,
});
// Handle worker events
exports.oauthRefreshWorker.on('completed', (job) => {
    logger_1.logger.info({ jobId: job.id, data: job.data }, 'Token refresh job completed');
});
exports.oauthRefreshWorker.on('failed', (job, err) => {
    logger_1.logger.error({ jobId: job?.id, error: err.message }, 'Token refresh job failed');
});
exports.oauthRefreshWorker.on('error', (err) => {
    logger_1.logger.error({ error: err }, 'OAuth refresh worker error');
});
/**
 * Initialize the OAuth refresh scheduler
 */
async function initOAuthRefreshScheduler() {
    // Run initial scan for expiring tokens
    await refreshExpiringTokens();
    // Schedule periodic scans (every hour)
    setInterval(async () => {
        await refreshExpiringTokens();
    }, 60 * 60 * 1000);
    logger_1.logger.info('OAuth token refresh scheduler initialized');
}
/**
 * Clean up expired OAuth connections
 */
async function cleanupExpiredConnections() {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        // Find connections that expired more than 30 days ago with no refresh token
        const expiredConnections = await client_1.prisma.oAuthConnection.findMany({
            where: {
                expiresAt: { lt: thirtyDaysAgo },
                refreshToken: null,
            },
        });
        // Delete them (user will need to reconnect)
        for (const connection of expiredConnections) {
            await client_1.prisma.oAuthConnection.delete({
                where: { id: connection.id },
            });
            logger_1.logger.info({ userId: connection.userId, provider: connection.provider }, 'Deleted expired OAuth connection');
        }
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Failed to cleanup expired connections');
    }
}
// Graceful shutdown
process.on('SIGTERM', async () => {
    await exports.oauthRefreshWorker.close();
    await exports.oauthRefreshQueue.close();
    await redisConnection.quit();
    logger_1.logger.info('OAuth refresh worker shut down');
});
//# sourceMappingURL=oauth-refresh.job.js.map