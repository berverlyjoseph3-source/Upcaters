// enterprise-ai-agent-platform/apps/api/src/queues/oauth-refresh.job.ts
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { prisma } from '../db/client';
import { OAuthRepository } from '../db/repositories/oauth.repository';
import { logger } from '../utils/logger';
import { OAuthProvider, SyncStatus } from '@prisma/client';

// Initialize Redis connection
const redisConnection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

// Queue name
const OAUTH_REFRESH_QUEUE = 'oauth-token-refresh';

// Create queue
export const oauthRefreshQueue = new Queue(OAUTH_REFRESH_QUEUE, {
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
export async function scheduleTokenRefresh(
  userId: string,
  provider: OAuthProvider,
  refreshInSeconds: number
): Promise < void > {
  await oauthRefreshQueue.add(
    `refresh-${userId}-${provider}`,
    {
      userId,
      provider,
    },
    {
      delay: refreshInSeconds * 1000,
      jobId: `refresh-${userId}-${provider}`,
    }
  );
  logger.debug({ userId, provider, refreshInSeconds }, 'Token refresh scheduled');
}

/**
 * Refresh OAuth tokens for all expiring connections
 */
export async function refreshExpiringTokens(): Promise < void > {
  try {
    // Find connections expiring in less than 1 hour
    const expiringThreshold = new Date();
    expiringThreshold.setHours(expiringThreshold.getHours() + 1);
    
    const connections = await prisma.oAuthConnection.findMany({
      where: {
        expiresAt: {
          lte: expiringThreshold,
          gt: new Date(),
        },
        refreshToken: { not: null },
        syncStatus: { not: SyncStatus.ERROR },
      },
    });
    
    logger.info({ count: connections.length }, 'Found expiring OAuth tokens');
    
    for (const connection of connections) {
      await oauthRefreshQueue.add(
        `refresh-${connection.userId}-${connection.provider}`,
        {
          userId: connection.userId,
          provider: connection.provider,
        },
        {
          jobId: `refresh-${connection.userId}-${connection.provider}`,
        }
      );
    }
  } catch (error) {
    logger.error({ error }, 'Failed to schedule expiring token refreshes');
  }
}

/**
 * Worker to process token refresh jobs
 */
export const oauthRefreshWorker = new Worker(
  OAUTH_REFRESH_QUEUE,
  async (job: Job) => {
    const { userId, provider } = job.data;
    
    logger.info({ userId, provider }, 'Starting OAuth token refresh');
    
    try {
      const connection = await OAuthRepository.getConnection(userId, provider);
      
      if (!connection) {
        logger.warn({ userId, provider }, 'Connection not found for refresh');
        return;
      }
      
      if (!connection.refreshToken) {
        logger.warn({ userId, provider }, 'No refresh token available');
        await OAuthRepository.updateSyncStatus(userId, provider, SyncStatus.ERROR, 'No refresh token');
        return;
      }
      
      // Refresh token based on provider
      let newAccessToken: string;
      let newRefreshToken: string | undefined;
      let expiresIn: number;
      
      switch (provider) {
        case OAuthProvider.GOOGLE_GMAIL:
        case OAuthProvider.GOOGLE_DRIVE:
        case OAuthProvider.GOOGLE_CALENDAR:
        case OAuthProvider.GOOGLE_TASKS: {
          const { GoogleOAuthService } = await import('../auth/services/google-oauth.service');
          const result = await GoogleOAuthService.refreshAccessToken(connection.refreshToken);
          newAccessToken = result.access_token;
          expiresIn = result.expires_in;
          break;
        }
        
        case OAuthProvider.LINKEDIN: {
          const { LinkedInOAuthService } = await import('../auth/services/linkedin-oauth.service');
          const result = await LinkedInOAuthService.refreshAccessToken(connection.refreshToken);
          newAccessToken = result.access_token;
          expiresIn = result.expires_in;
          break;
        }
        
        case OAuthProvider.FACEBOOK:
        case OAuthProvider.INSTAGRAM: {
          const { FacebookOAuthService } = await import('../auth/services/facebook-oauth.service');
          // Facebook long-lived tokens last 60 days, no refresh needed
          logger.info({ userId, provider }, 'Facebook token refresh not needed (60-day tokens)');
          return;
        }
        
        case OAuthProvider.X_TWITTER: {
          const { TwitterOAuthService } = await import('../auth/services/twitter-oauth.service');
          const result = await TwitterOAuthService.refreshAccessToken(connection.refreshToken);
          newAccessToken = result.access_token;
          newRefreshToken = result.refresh_token;
          expiresIn = result.expires_in;
          break;
        }
        
        default:
          logger.warn({ provider }, 'Unknown provider for token refresh');
          return;
      }
      
      // Update tokens in database
      const newExpiresAt = new Date(Date.now() + expiresIn * 1000);
      
      await OAuthRepository.updateTokens(userId, provider, {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken || connection.refreshToken,
        expiresAt: newExpiresAt,
        syncStatus: SyncStatus.SUCCESS,
      });
      
      // Schedule next refresh
      const refreshInSeconds = expiresIn - 3600; // Refresh 1 hour before expiry
      if (refreshInSeconds > 0) {
        await scheduleTokenRefresh(userId, provider, refreshInSeconds);
      }
      
      logger.info({ userId, provider, expiresIn }, 'OAuth tokens refreshed successfully');
      
    } catch (error) {
      logger.error({ error, userId, provider }, 'Failed to refresh OAuth token');
      
      await OAuthRepository.updateSyncStatus(userId, provider, SyncStatus.ERROR, String(error));
      
      // Schedule retry in 1 hour
      await scheduleTokenRefresh(userId, provider, 3600);
      
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

// Handle worker events
oauthRefreshWorker.on('completed', (job) => {
  logger.info({ jobId: job.id, data: job.data }, 'Token refresh job completed');
});

oauthRefreshWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err.message }, 'Token refresh job failed');
});

oauthRefreshWorker.on('error', (err) => {
  logger.error({ error: err }, 'OAuth refresh worker error');
});

/**
 * Initialize the OAuth refresh scheduler
 */
export async function initOAuthRefreshScheduler(): Promise < void > {
  // Run initial scan for expiring tokens
  await refreshExpiringTokens();
  
  // Schedule periodic scans (every hour)
  setInterval(async () => {
    await refreshExpiringTokens();
  }, 60 * 60 * 1000);
  
  logger.info('OAuth token refresh scheduler initialized');
}

/**
 * Clean up expired OAuth connections
 */
export async function cleanupExpiredConnections(): Promise < void > {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Find connections that expired more than 30 days ago with no refresh token
    const expiredConnections = await prisma.oAuthConnection.findMany({
      where: {
        expiresAt: { lt: thirtyDaysAgo },
        refreshToken: null,
      },
    });
    
    // Delete them (user will need to reconnect)
    for (const connection of expiredConnections) {
      await prisma.oAuthConnection.delete({
        where: { id: connection.id },
      });
      logger.info({ userId: connection.userId, provider: connection.provider }, 'Deleted expired OAuth connection');
    }
  } catch (error) {
    logger.error({ error }, 'Failed to cleanup expired connections');
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await oauthRefreshWorker.close();
  await oauthRefreshQueue.close();
  await redisConnection.quit();
  logger.info('OAuth refresh worker shut down');
});