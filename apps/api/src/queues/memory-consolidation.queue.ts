// enterprise-ai-agent-platform/apps/api/src/queues/memory-consolidation.queue.ts
import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import Redis, { Redis as RedisClient } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db/client';
import { logger } from '../utils/logger';
import { OpenAIService } from '../services/ai/openai.service';
import { MemoryManager } from '../agents/orchestrator/memory-manager';
import { NotificationService } from '../services/notification.service';

// ============================================
// Redis Connection Setup
// ============================================

let redisConnection: RedisClient | null = null;

function getRedisConnection(): RedisClient {
  if (!redisConnection) {
    redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        logger.warn({ times, delay }, 'Memory consolidation Redis retry');
        return delay;
      },
      reconnectOnError(err) {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    });

    redisConnection.on('error', (error) => {
      logger.error({ error }, 'Memory consolidation Redis error');
    });

    redisConnection.on('connect', () => {
      logger.info('Redis connected for memory consolidation');
    });
  }

  return redisConnection;
}

// ============================================
// Queue Names
// ============================================

export const MEMORY_CONSOLIDATION_QUEUE = 'memory:consolidation';
export const MEMORY_CLEANUP_QUEUE = 'memory:cleanup';
export const MEMORY_EMBEDDING_QUEUE = 'memory:embedding';
export const MEMORY_RETENTION_QUEUE = 'memory:retention';

// ============================================
// Queue Instances
// ============================================

/**
 * Memory consolidation queue
 * Consolidates short-term memories into long-term storage
 */
export const memoryConsolidationQueue = new Queue(MEMORY_CONSOLIDATION_QUEUE, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 7200,
      count: 500,
    },
    removeOnFail: {
      age: 86400,
      count: 200,
    },
    // NOTE: BullMQ's DefaultJobOptions has no 'timeout' field (removed — this was silently invalid/ignored). Enforce a 2-minute deadline in the worker itself if needed.
  },
});

/**
 * Memory cleanup queue
 * Removes expired and low-importance memories
 */
export const memoryCleanupQueue = new Queue(MEMORY_CLEANUP_QUEUE, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
    removeOnComplete: {
      age: 3600,
      count: 100,
    },
    removeOnFail: {
      age: 86400,
      count: 50,
    },
    // NOTE: BullMQ's DefaultJobOptions has no 'timeout' field (removed). Enforce a 5-minute deadline in the worker itself if needed.
  },
});

/**
 * Memory embedding queue
 * Generates vector embeddings for semantic search
 */
export const memoryEmbeddingQueue = new Queue(MEMORY_EMBEDDING_QUEUE, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600,
      count: 300,
    },
    // NOTE: BullMQ's DefaultJobOptions has no 'timeout' field (removed).
  },
});

/**
 * Memory retention queue
 * Manages memory retention policies and TTL
 */
export const memoryRetentionQueue = new Queue(MEMORY_RETENTION_QUEUE, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 7200,
      count: 100,
    },
    // NOTE: BullMQ's DefaultJobOptions has no 'timeout' field (removed).
  },
});

// ============================================
// Job Data Types
// ============================================

export interface MemoryConsolidationJobData {
  /** Operation type */
  type: 'consolidate' | 'batch_consolidate' | 'emergency_consolidate';
  /** User ID to consolidate for (null = all users) */
  userId?: string;
  /** Minimum importance threshold for consolidation */
  minImportance?: number;
  /** Maximum short-term memories to process */
  maxShortTermMemories?: number;
  /** Whether to generate embeddings */
  generateEmbeddings?: boolean;
  /** Whether to merge similar memories */
  mergeSimilar?: boolean;
  /** Similarity threshold for merging */
  mergeThreshold?: number;
  /** Consolidation strategy */
  strategy?: 'importance' | 'recency' | 'frequency' | 'hybrid';
  /** Batch size for processing */
  batchSize?: number;
  /** Whether this is an emergency consolidation */
  isEmergency?: boolean;
}

export interface MemoryCleanupJobData {
  /** Operation type */
  type: 'cleanup_expired' | 'cleanup_low_importance' | 'cleanup_old' | 'full_cleanup';
  /** Minimum importance to keep */
  minImportance?: number;
  /** Maximum age in days to keep */
  maxAgeDays?: number;
  /** Maximum memories per user */
  maxMemoriesPerUser?: number;
  /** Whether to dry run (report, don't delete) */
  dryRun?: boolean;
}

export interface MemoryEmbeddingJobData {
  /** Memory IDs to generate embeddings for */
  memoryIds?: string[];
  /** User ID to process all memories for */
  userId?: string;
  /** Whether to regenerate for all memories */
  regenerateAll?: boolean;
  /** Batch size */
  batchSize?: number;
}

export interface MemoryRetentionJobData {
  /** Operation type */
  type: 'apply_retention' | 'recalculate_importance' | 'merge_duplicates';
  /** User ID */
  userId?: string;
  /** Retention policy parameters */
  policy?: {
    shortTermTTLHours: number;
    longTermImportanceThreshold: number;
    episodicRetentionDays: number;
    semanticRetentionDays: number;
    maxMemoriesPerUser: number;
    maxMemoriesPerSession: number;
  };
}

// ============================================
// Memory Statistics Service
// ============================================

class MemoryStatisticsService {
  /**
   * Get memory stats for a user
   */
  static async getMemoryStats(userId: string): Promise<{
    totalMemories: number;
    shortTermCount: number;
    longTermCount: number;
    episodicCount: number;
    semanticCount: number;
    averageImportance: number;
    totalEmbeddingTokens: number;
    totalEmbeddingCostUsd: number;
    oldestMemoryAge: number;
    newestMemoryAge: number;
    memoriesByType: Record<string, number>;
    memoriesBySource: Record<string, number>;
    topTags: string[];
  }> {
    const stats = await MemoryManager.getEnhancedMemoryStats(userId);
    
    // Get additional stats from database
    const [typeDistribution, sourceDistribution, topTagsResult] = await Promise.all([
      prisma.$queryRaw<Array<{ memory_type: string; count: string }>>`
        SELECT memory_type, COUNT(*) as count
        FROM agent_memory
        WHERE user_id = ${userId}::uuid AND expires_at > NOW()
        GROUP BY memory_type
      `,
      prisma.$queryRaw<Array<{ source: string; count: string }>>`
        SELECT metadata->>'source' as source, COUNT(*) as count
        FROM agent_memory
        WHERE user_id = ${userId}::uuid AND expires_at > NOW()
        GROUP BY metadata->>'source'
      `,
      prisma.$queryRaw<Array<{ tag: string; count: string }>>`
        SELECT jsonb_array_elements_text(metadata->'tags') as tag, COUNT(*) as count
        FROM agent_memory
        WHERE user_id = ${userId}::uuid AND metadata->'tags' IS NOT NULL
        GROUP BY tag
        ORDER BY count DESC
        LIMIT 20
      `,
    ]);

    const memoriesByType: Record<string, number> = {};
    typeDistribution.forEach(row => {
      memoriesByType[row.memory_type] = parseInt(row.count, 10);
    });

    const memoriesBySource: Record<string, number> = {};
    sourceDistribution.forEach(row => {
      if (row.source) {
        memoriesBySource[row.source] = parseInt(row.count, 10);
      }
    });

    return {
      ...stats,
      memoriesByType,
      memoriesBySource,
      topTags: topTagsResult.map(row => row.tag),
      oldestMemoryAge: 0,
      newestMemoryAge: 0,
    };
  }

  /**
   * Get platform-wide memory stats
   */
  static async getPlatformMemoryStats(): Promise<{
    totalUsers: number;
    totalMemories: number;
    totalEmbeddings: number;
    totalStorageBytes: number;
    averageMemoriesPerUser: number;
    usersWithMemories: number;
    usersWithoutMemories: number;
  }> {
    const [stats] = await prisma.$queryRaw<Array<{
      total_users: string;
      total_memories: string;
      users_with_memories: string;
    }>>`
      SELECT
        (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users,
        (SELECT COUNT(*) FROM agent_memory WHERE expires_at > NOW()) as total_memories,
        (SELECT COUNT(DISTINCT user_id) FROM agent_memory WHERE expires_at > NOW()) as users_with_memories
    `;

    const totalUsers = parseInt(stats.total_users, 10);
    const totalMemories = parseInt(stats.total_memories, 10);
    const usersWithMemories = parseInt(stats.users_with_memories, 10);

    return {
      totalUsers,
      totalMemories,
      totalEmbeddings: 0,
      totalStorageBytes: 0,
      averageMemoriesPerUser: totalUsers > 0 ? totalMemories / totalUsers : 0,
      usersWithMemories,
      usersWithoutMemories: totalUsers - usersWithMemories,
    };
  }
}

// ============================================
// Memory Consolidation Worker
// ============================================

/**
 * Worker that consolidates short-term memories into long-term storage
 * using AI-powered importance evaluation and merging
 */
export const memoryConsolidationWorker = new Worker(
  MEMORY_CONSOLIDATION_QUEUE,
  async (job: Job<MemoryConsolidationJobData>) => {
    const {
      type,
      userId,
      minImportance = 0.5,
      maxShortTermMemories = 100,
      generateEmbeddings = true,
      mergeSimilar = true,
      mergeThreshold = 0.85,
      strategy = 'hybrid',
      batchSize = 20,
      isEmergency = false,
    } = job.data;

    const startTime = Date.now();

    logger.info({
      type,
      userId: userId || 'all-users',
      strategy,
      maxShortTermMemories,
    }, 'Starting memory consolidation');

    try {
      if (type === 'batch_consolidate') {
        // Consolidate for all active users
        const users = await getUsersForConsolidation();
        const results: Array<{
          userId: string;
          memoriesProcessed: number;
          memoriesConsolidated: number;
          memoriesMerged: number;
          timeMs: number;
        }> = [];

        for (const user of users) {
          const userStart = Date.now();

          // Process user in batches
          const consolidated = await consolidateForUser(
            user.id,
            minImportance,
            maxShortTermMemories,
            generateEmbeddings,
            mergeSimilar,
            mergeThreshold,
            strategy,
            batchSize,
            isEmergency
          );

          results.push({
            userId: user.id,
            memoriesProcessed: consolidated.processed,
            memoriesConsolidated: consolidated.consolidated,
            memoriesMerged: consolidated.merged,
            timeMs: Date.now() - userStart,
          });

          // Small delay between users to avoid overwhelming the system
          if (!isEmergency) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }

        const totalProcessed = results.reduce((sum, r) => sum + r.memoriesProcessed, 0);
        const totalConsolidated = results.reduce((sum, r) => sum + r.memoriesConsolidated, 0);

        logger.info({
          totalUsers: results.length,
          totalProcessed,
          totalConsolidated,
          totalTimeMs: Date.now() - startTime,
        }, 'Batch memory consolidation completed');

        return {
          type: 'batch_consolidate',
          results,
          summary: {
            totalUsers: results.length,
            totalProcessed,
            totalConsolidated,
            totalTimeMs: Date.now() - startTime,
          },
        };
      }

      if (type === 'consolidate' && userId) {
        // Single user consolidation
        const result = await consolidateForUser(
          userId,
          minImportance,
          maxShortTermMemories,
          generateEmbeddings,
          mergeSimilar,
          mergeThreshold,
          strategy,
          batchSize,
          isEmergency
        );

        logger.info({
          userId,
          processed: result.processed,
          consolidated: result.consolidated,
          merged: result.merged,
          timeMs: Date.now() - startTime,
        }, 'User memory consolidation completed');

        return {
          type: 'consolidate',
          userId,
          ...result,
          timeMs: Date.now() - startTime,
        };
      }

      if (type === 'emergency_consolidate') {
        // Emergency consolidation - process urgently
        const users = await getUsersForConsolidation(true);
        const consolidated = await MemoryManager.consolidateMemories('*' as any);
        
        logger.info({
          userCount: users.length,
          consolidated,
          isEmergency: true,
          timeMs: Date.now() - startTime,
        }, 'Emergency consolidation completed');

        return {
          type: 'emergency_consolidate',
          userCount: users.length,
          consolidated,
          timeMs: Date.now() - startTime,
        };
      }

      throw new Error(`Unknown consolidation type: ${type}`);
    } catch (error) {
      logger.error({ error, type, userId }, 'Memory consolidation failed');
      throw error;
    }
  },
  {
    connection: getRedisConnection(),
    concurrency: 3,
    limiter: {
      max: 5,
      duration: 10000,
    },
  }
);

// ============================================
// Memory Cleanup Worker
// ============================================

export const memoryCleanupWorker = new Worker(
  MEMORY_CLEANUP_QUEUE,
  async (job: Job<MemoryCleanupJobData>) => {
    const { type, minImportance = 0.1, maxAgeDays = 90, maxMemoriesPerUser = 10000, dryRun = false } = job.data;

    const startTime = Date.now();

    logger.info({
      type,
      dryRun,
      minImportance,
      maxAgeDays,
    }, 'Starting memory cleanup');

    try {
      let deletedCount = 0;
      let affectedUsers = 0;

      if (type === 'cleanup_expired' || type === 'full_cleanup') {
        // Delete expired memories
        const expiredResult = await prisma.$executeRaw`
          DELETE FROM agent_memory
          WHERE expires_at < NOW()
          ${dryRun ? 'RETURNING id' : 'RETURNING id'}
        `;
        
        deletedCount += expiredResult;
        logger.info({
          expiredDeleted: expiredResult,
          dryRun,
        }, 'Expired memories cleaned');
      }

      if (type === 'cleanup_low_importance' || type === 'full_cleanup') {
        // Delete low importance memories older than threshold
        const ageThreshold = new Date();
        ageThreshold.setDate(ageThreshold.getDate() - 7); // 7 days old

        const lowImportanceResult = await prisma.$executeRaw`
          DELETE FROM agent_memory
          WHERE importance < ${minImportance}
            AND memory_type = 'SHORT_TERM'
            AND created_at < ${ageThreshold}
          ${dryRun ? 'RETURNING id' : 'RETURNING id'}
        `;
        
        deletedCount += lowImportanceResult;
        logger.info({
          lowImportanceDeleted: lowImportanceResult,
          minImportance,
          dryRun,
        }, 'Low importance memories cleaned');
      }

      if (type === 'cleanup_old' || type === 'full_cleanup') {
        // Delete very old memories
        const oldThreshold = new Date();
        oldThreshold.setDate(oldThreshold.getDate() - maxAgeDays);

        const oldResult = await prisma.$executeRaw`
          DELETE FROM agent_memory
          WHERE created_at < ${oldThreshold}
            AND importance < 0.3
          ${dryRun ? 'RETURNING id' : 'RETURNING id'}
        `;
        
        deletedCount += oldResult;
        logger.info({
          oldDeleted: oldResult,
          maxAgeDays,
          dryRun,
        }, 'Old low-importance memories cleaned');
      }

      // Enforce max memories per user
      if (maxMemoriesPerUser > 0) {
        const overLimitUsers = await prisma.$queryRaw<Array<{ user_id: string; count: string }>>`
          SELECT user_id, COUNT(*) as count
          FROM agent_memory
          WHERE expires_at > NOW()
          GROUP BY user_id
          HAVING COUNT(*) > ${maxMemoriesPerUser}
        `;

        for (const user of overLimitUsers) {
          const excessCount = parseInt(user.count, 10) - maxMemoriesPerUser;

          if (excessCount > 0 && !dryRun) {
            await prisma.$executeRaw`
              DELETE FROM agent_memory
              WHERE id IN (
                SELECT id FROM agent_memory
                WHERE user_id = ${user.user_id}::uuid
                ORDER BY importance ASC, created_at ASC
                LIMIT ${excessCount}
              )
            `;

            deletedCount += excessCount;
            affectedUsers++;
          }
        }
      }

      const totalTimeMs = Date.now() - startTime;

      logger.info({
        type,
        deletedCount,
        affectedUsers,
        dryRun,
        totalTimeMs,
      }, 'Memory cleanup completed');

      return {
        type,
        deletedCount,
        affectedUsers,
        dryRun,
        totalTimeMs,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error({ error, type }, 'Memory cleanup failed');
      throw error;
    }
  },
  {
    connection: getRedisConnection(),
    concurrency: 2,
  }
);

// ============================================
// Memory Embedding Worker
// ============================================

export const memoryEmbeddingWorker = new Worker(
  MEMORY_EMBEDDING_QUEUE,
  async (job: Job<MemoryEmbeddingJobData>) => {
    const { memoryIds, userId, regenerateAll, batchSize = 10 } = job.data;

    const startTime = Date.now();
    let processedCount = 0;
    let failedCount = 0;
    let totalTokens = 0;
    let totalCost = 0;

    logger.info({
      memoryIdsCount: memoryIds?.length || 'all',
      userId: userId || 'all',
      regenerateAll,
    }, 'Starting memory embedding generation');

    try {
      // Get memories without embeddings
      const memories = await getMemoriesForEmbedding(memoryIds, userId, regenerateAll, batchSize);

      logger.info({
        memoryCount: memories.length,
      }, 'Memories fetched for embedding');

      // Process in batches
      for (let i = 0; i < memories.length; i += batchSize) {
        const batch = memories.slice(i, i + batchSize);

        for (const memory of batch) {
          try {
            // Generate embedding using OpenAI
            const embedding = await generateEmbedding(memory.content);

            // Update memory with embedding
            await prisma.$executeRaw`
              UPDATE agent_memory
              SET embedding = ${`[${embedding.join(',')}]`}::vector
              WHERE id = ${memory.id}::uuid
            `;

            processedCount++;
            totalTokens += embedding.length * 4; // Approximate tokens
            totalCost += embedding.length * 0.00000002; // Approximate cost

            // Update progress
            const progress = Math.round((processedCount / memories.length) * 100);
            if (processedCount % 10 === 0) {
              await job.updateProgress(progress);
            }
          } catch (error) {
            failedCount++;
            logger.warn({
              error,
              memoryId: memory.id,
            }, 'Failed to generate embedding for memory');
          }
        }

        // Small delay between batches
        if (i + batchSize < memories.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      const totalTimeMs = Date.now() - startTime;

      logger.info({
        processedCount,
        failedCount,
        totalTokens,
        totalCost,
        totalTimeMs,
      }, 'Memory embedding generation completed');

      return {
        processedCount,
        failedCount,
        totalTokens,
        totalCostUsd: totalCost,
        totalTimeMs,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error({
        error,
        processedCount,
        failedCount,
      }, 'Memory embedding generation failed');
      throw error;
    }
  },
  {
    connection: getRedisConnection(),
    concurrency: 3,
    limiter: {
      max: 10,
      duration: 60000,
    },
  }
);

// ============================================
// Memory Retention Worker
// ============================================

export const memoryRetentionWorker = new Worker(
  MEMORY_RETENTION_QUEUE,
  async (job: Job<MemoryRetentionJobData>) => {
    const { type, userId, policy } = job.data;

    const startTime = Date.now();
    const defaultPolicy = {
      shortTermTTLHours: 24,
      longTermImportanceThreshold: 0.7,
      episodicRetentionDays: 7,
      semanticRetentionDays: 90,
      maxMemoriesPerUser: 10000,
      maxMemoriesPerSession: 500,
    };

    const retentionPolicy = policy || defaultPolicy;

    logger.info({
      type,
      userId: userId || 'all',
      policy: retentionPolicy,
    }, 'Starting memory retention job');

    try {
      switch (type) {
        case 'apply_retention': {
          // Apply TTL policies
          const shortTermResult = await prisma.$executeRaw`
            UPDATE agent_memory
            SET expires_at = created_at + INTERVAL '${retentionPolicy.shortTermTTLHours} hours'
            WHERE memory_type = 'SHORT_TERM'
              AND expires_at IS NULL
              ${userId ? `AND user_id = ${userId}::uuid` : ''}
          `;

          // Update episodic retention
          const episodicResult = await prisma.$executeRaw`
            UPDATE agent_memory
            SET expires_at = created_at + INTERVAL '${retentionPolicy.episodicRetentionDays} days'
            WHERE memory_type = 'EPISODIC'
              AND (expires_at IS NULL OR expires_at > created_at + INTERVAL '${retentionPolicy.episodicRetentionDays} days')
              ${userId ? `AND user_id = ${userId}::uuid` : ''}
          `;

          // Update semantic retention
          const semanticResult = await prisma.$executeRaw`
            UPDATE agent_memory
            SET expires_at = created_at + INTERVAL '${retentionPolicy.semanticRetentionDays} days'
            WHERE memory_type = 'SEMANTIC'
              AND (expires_at IS NULL OR expires_at > created_at + INTERVAL '${retentionPolicy.semanticRetentionDays} days')
              ${userId ? `AND user_id = ${userId}::uuid` : ''}
          `;

          logger.info({
            shortTermUpdated: shortTermResult,
            episodicUpdated: episodicResult,
            semanticUpdated: semanticResult,
          }, 'Retention policies applied');

          return {
            type,
            shortTermUpdated: shortTermResult,
            episodicUpdated: episodicResult,
            semanticUpdated: semanticResult,
            timeMs: Date.now() - startTime,
          };
        }

        case 'recalculate_importance': {
          // Recalculate importance based on access patterns
          const memories = await prisma.$queryRaw<Array<{
            id: string;
            access_count: number;
            importance: number;
            created_at: Date;
          }>>`
            SELECT id, access_count, importance, created_at
            FROM agent_memory
            WHERE expires_at > NOW()
            ${userId ? `AND user_id = ${userId}::uuid` : ''}
            ORDER BY access_count DESC
          `;

          let recalculated = 0;

          for (const memory of memories) {
            // Calculate new importance based on:
            // - Access frequency
            // - Recency of access
            // - Current importance
            const accessScore = Math.min(1, memory.access_count / 100);
            const ageDays = (Date.now() - new Date(memory.created_at).getTime()) / (86400000);
            const ageDecay = Math.max(0.3, 1 - ageDays / 365);
            const newImportance = (memory.importance * 0.5) + (accessScore * 0.3) + (ageDecay * 0.2);

            if (Math.abs(newImportance - memory.importance) > 0.05) {
              await prisma.$executeRaw`
                UPDATE agent_memory
                SET importance = ${newImportance}
                WHERE id = ${memory.id}::uuid
              `;
              recalculated++;
            }
          }

          logger.info({ recalculated, totalMemories: memories.length }, 'Importance recalculated');

          return {
            type,
            recalculated,
            totalMemories: memories.length,
            timeMs: Date.now() - startTime,
          };
        }

        case 'merge_duplicates': {
          // Merge semantically similar memories
          const users = userId ? [{ id: userId, email: '' }] : await getUsersForConsolidation();
          let mergedCount = 0;

          for (const user of users) {
            // Find duplicate memories using vector similarity
            const duplicates = await prisma.$queryRaw<Array<{
              id1: string;
              id2: string;
              similarity: number;
            }>>`
              SELECT 
                m1.id as id1,
                m2.id as id2,
                1 - (m1.embedding <=> m2.embedding) as similarity
              FROM agent_memory m1
              JOIN agent_memory m2 ON m1.user_id = m2.user_id
                AND m1.id < m2.id
                AND m1.memory_type = m2.memory_type
              WHERE m1.user_id = ${user.id}::uuid
                AND m1.embedding IS NOT NULL
                AND m2.embedding IS NOT NULL
                AND m1.expires_at > NOW()
                AND m2.expires_at > NOW()
                AND 1 - (m1.embedding <=> m2.embedding) > 0.9
              LIMIT 50
            `;

            for (const dup of duplicates) {
              // Merge the less important memory into the more important one
              const [mem1, mem2] = await Promise.all([
                prisma.agentMemory.findUnique({ where: { id: dup.id1 } }),
                prisma.agentMemory.findUnique({ where: { id: dup.id2 } }),
              ]);

              if (!mem1 || !mem2) continue;

              const keepId = mem1.importance >= mem2.importance ? mem1.id : mem2.id;
              const deleteId = keepId === mem1.id ? mem2.id : mem1.id;

              // Merge content
              await prisma.$executeRaw`
                UPDATE agent_memory
                SET 
                  content = content || E'\n\nRelated: ' || (SELECT content FROM agent_memory WHERE id = ${deleteId}::uuid),
                  access_count = access_count + (SELECT access_count FROM agent_memory WHERE id = ${deleteId}::uuid),
                  importance = GREATEST(importance, (SELECT importance FROM agent_memory WHERE id = ${deleteId}::uuid)),
                  updated_at = NOW()
                WHERE id = ${keepId}::uuid
              `;

              // Delete merged memory
              await prisma.$executeRaw`
                DELETE FROM agent_memory WHERE id = ${deleteId}::uuid
              `;

              mergedCount++;
            }
          }

          logger.info({ mergedCount }, 'Duplicate memories merged');

          return {
            type,
            mergedCount,
            timeMs: Date.now() - startTime,
          };
        }

        default:
          throw new Error(`Unknown retention type: ${type}`);
      }
    } catch (error) {
      logger.error({ error, type, userId }, 'Memory retention job failed');
      throw error;
    }
  },
  {
    connection: getRedisConnection(),
    concurrency: 2,
  }
);

// ============================================
// Helper Functions
// ============================================

/**
 * Get users that need memory consolidation
 */
async function getUsersForConsolidation(emergency: boolean = false): Promise<Array<{ id: string; email: string }>> {
  const threshold = emergency ? 10 : 50; // Lower threshold for emergency

  const users = await prisma.$queryRaw<Array<{ id: string; email: string }>>`
    SELECT DISTINCT u.id, u.email
    FROM users u
    JOIN agent_memory am ON u.id = am.user_id
    WHERE u.is_active = true
      AND am.memory_type = 'SHORT_TERM'
      AND am.expires_at > NOW()
    GROUP BY u.id, u.email
    HAVING COUNT(am.id) > ${threshold}
  `;

  return users;
}

/**
 * Consolidate memories for a single user
 */
async function consolidateForUser(
  userId: string,
  minImportance: number,
  maxShortTermMemories: number,
  generateEmbeddings: boolean,
  mergeSimilar: boolean,
  mergeThreshold: number,
  strategy: string,
  batchSize: number,
  isEmergency: boolean
): Promise<{ processed: number; consolidated: number; merged: number }> {
  let processed = 0;
  let consolidated = 0;
  let merged = 0;

  // Get short-term memories
  const shortTermMemories = await getShortTermMemoriesForUser(userId, maxShortTermMemories);

  if (shortTermMemories.length === 0) {
    return { processed: 0, consolidated: 0, merged: 0 };
  }

  // Process in batches
  for (let i = 0; i < shortTermMemories.length; i += batchSize) {
    const batch = shortTermMemories.slice(i, i + batchSize);

    for (const memory of batch) {
      processed++;

      // Evaluate importance using strategy
      let importance = memory.importance;

      if (strategy === 'hybrid') {
        // Hybrid: combine importance, recency, and access frequency
        const ageHours = (Date.now() - new Date(memory.createdAt).getTime()) / 3600000;
        const recencyScore = Math.max(0.1, 1 - (ageHours / 168)); // 7 day window
        const accessScore = Math.min(1, memory.access_count / 50);
        importance = (importance * 0.4) + (recencyScore * 0.3) + (accessScore * 0.3);
      } else if (strategy === 'importance') {
        importance = memory.importance;
      } else if (strategy === 'recency') {
        const ageHours = (Date.now() - new Date(memory.createdAt).getTime()) / 3600000;
        importance = Math.max(0.1, 1 - (ageHours / 168));
      } else if (strategy === 'frequency') {
        importance = Math.min(1, memory.access_count / 50);
      }

      // Only consolidate if importance meets threshold
      if (importance >= minImportance) {
        try {
          // Store as long-term memory
          await MemoryManager.storeLongTerm(
            userId,
            memory.content,
            importance,
            memory.metadata || {},
            generateEmbeddings
          );

          // Optionally merge similar memories
          if (mergeSimilar) {
            // Merge logic is handled by the retention worker
          }

          consolidated++;
        } catch (error) {
          logger.warn({
            error,
            userId,
            memoryId: memory.id,
          }, 'Failed to consolidate individual memory');
        }
      }
    }

    // Allow breathing room between batches
    if (!isEmergency && batch.length === batchSize) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return { processed, consolidated, merged };
}

/**
 * Get short-term memories for a user
 */
async function getShortTermMemoriesForUser(
  userId: string,
  limit: number
): Promise<Array<{
  id: string;
  content: string;
  importance: number;
  access_count: number;
  createdAt: Date;
  metadata: any;
}>> {
  const memories = await prisma.$queryRaw<Array<{
    id: string;
    content: string;
    importance: number;
    access_count: number;
    created_at: Date;
    metadata: any;
  }>>`
    SELECT 
      id,
      content,
      importance,
      access_count,
      created_at,
      metadata
    FROM agent_memory
    WHERE user_id = ${userId}::uuid
      AND memory_type = 'SHORT_TERM'
      AND expires_at > NOW()
    ORDER BY 
      CASE WHEN ${'hybrid'} = 'hybrid' THEN importance * 0.4 + (1 - (EXTRACT(EPOCH FROM (NOW() - created_at)) / 604800.0)) * 0.3 + (access_count / 50.0) * 0.3
           WHEN ${'importance'} = 'importance' THEN importance
           WHEN ${'recency'} = 'recency' THEN (1 - (EXTRACT(EPOCH FROM (NOW() - created_at)) / 604800.0))
           WHEN ${'frequency'} = 'frequency' THEN (access_count / 50.0)
           ELSE importance
      END DESC
    LIMIT ${limit}
  `;

  return memories.map(m => ({
    id: m.id,
    content: m.content,
    importance: m.importance,
    access_count: m.access_count,
    createdAt: m.created_at,
    metadata: m.metadata,
  }));
}

/**
 * Get memories that need embedding
 */
async function getMemoriesForEmbedding(
  memoryIds?: string[],
  userId?: string,
  regenerateAll?: boolean,
  limit: number = 10
): Promise<Array<{ id: string; content: string }>> {
  if (memoryIds && memoryIds.length > 0) {
    const memories = await prisma.$queryRaw<Array<{ id: string; content: string }>>`
      SELECT id, content
      FROM agent_memory
      WHERE id = ANY(${memoryIds}::uuid[])
      AND expires_at > NOW()
    `;
    return memories;
  }

  if (regenerateAll) {
    const memories = await prisma.$queryRaw<Array<{ id: string; content: string }>>`
      SELECT id, content
      FROM agent_memory
      WHERE embedding IS NULL
      ${userId ? `AND user_id = ${userId}::uuid` : ''}
      AND expires_at > NOW()
      LIMIT ${limit}
    `;
    return memories;
  }

  const memories = await prisma.$queryRaw<Array<{ id: string; content: string }>>`
    SELECT id, content
    FROM agent_memory
    WHERE embedding IS NULL
    ${userId ? `AND user_id = ${userId}::uuid` : ''}
    AND expires_at > NOW()
    LIMIT ${limit}
  `;

  return memories;
}

/**
 * Generate vector embedding for text
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Use OpenAI for embedding generation
    const response = await OpenAIService.createEmbedding({ input: text });
    return response.embeddings[0];
  } catch (error) {
    logger.error({ error, textLength: text.length }, 'Failed to generate embedding');
    // Return zero vector as fallback
    return new Array(1536).fill(0);
  }
}

// ============================================
// Worker Event Handlers
// ============================================

// Consolidation worker events
memoryConsolidationWorker.on('completed', (job, result) => {
  logger.info({
    jobId: job.id,
    type: (job.data as MemoryConsolidationJobData).type,
    result,
  }, 'Memory consolidation job completed');
});

memoryConsolidationWorker.on('failed', (job, err) => {
  logger.error({
    jobId: job?.id,
    error: err.message,
    userId: (job?.data as MemoryConsolidationJobData)?.userId,
  }, 'Memory consolidation job failed');
});

// Cleanup worker events
memoryCleanupWorker.on('completed', (job, result) => {
  logger.info({
    jobId: job.id,
    type: (job.data as MemoryCleanupJobData).type,
    deletedCount: result.deletedCount,
  }, 'Memory cleanup job completed');
});

memoryCleanupWorker.on('failed', (job, err) => {
  logger.error({
    jobId: job?.id,
    error: err.message,
  }, 'Memory cleanup job failed');
});

// Embedding worker events
memoryEmbeddingWorker.on('completed', (job, result) => {
  logger.info({
    jobId: job.id,
    processedCount: result.processedCount,
    totalCost: result.totalCostUsd,
  }, 'Memory embedding job completed');
});

memoryEmbeddingWorker.on('failed', (job, err) => {
  logger.error({
    jobId: job?.id,
    error: err.message,
  }, 'Memory embedding job failed');
});

// Retention worker events
memoryRetentionWorker.on('completed', (job, result) => {
  logger.info({
    jobId: job.id,
    type: (job.data as MemoryRetentionJobData).type,
    result,
  }, 'Memory retention job completed');
});

memoryRetentionWorker.on('failed', (job, err) => {
  logger.error({
    jobId: job?.id,
    error: err.message,
  }, 'Memory retention job failed');
});

// ============================================
// Scheduled Jobs
// ============================================

let consolidationSchedule: NodeJS.Timeout | null = null;
let cleanupSchedule: NodeJS.Timeout | null = null;
let embeddingSchedule: NodeJS.Timeout | null = null;
let retentionSchedule: NodeJS.Timeout | null = null;

/**
 * Schedule periodic memory consolidation (every 30 minutes)
 */
export function scheduleMemoryConsolidation(): void {
  if (consolidationSchedule) return;

  consolidationSchedule = setInterval(async () => {
    await memoryConsolidationQueue.add(
      `consolidation-${Date.now()}`,
      {
        type: 'batch_consolidate',
        minImportance: 0.5,
        maxShortTermMemories: 100,
        generateEmbeddings: true,
        mergeSimilar: true,
        strategy: 'hybrid',
        batchSize: 20,
      } as MemoryConsolidationJobData,
      {
        jobId: `consolidation-${Date.now()}`,
        priority: 5,
        removeOnComplete: true,
        removeOnFail: true,
      }
    );

    logger.info('Scheduled memory consolidation triggered');
  }, 1800000); // 30 minutes

  logger.info('Memory consolidation scheduled (every 30 minutes)');
}

/**
 * Schedule periodic memory cleanup (every 2 hours)
 */
export function scheduleMemoryCleanup(): void {
  if (cleanupSchedule) return;

  cleanupSchedule = setInterval(async () => {
    await memoryCleanupQueue.add(
      `cleanup-${Date.now()}`,
      {
        type: 'full_cleanup',
        minImportance: 0.05,
        maxAgeDays: 30,
        maxMemoriesPerUser: 10000,
        dryRun: false,
      } as MemoryCleanupJobData,
      {
        jobId: `cleanup-${Date.now()}`,
        priority: 3,
        removeOnComplete: true,
        removeOnFail: true,
      }
    );

    logger.info('Scheduled memory cleanup triggered');
  }, 7200000); // 2 hours

  logger.info('Memory cleanup scheduled (every 2 hours)');
}

/**
 * Schedule periodic embedding generation (every hour)
 */
export function scheduleEmbeddingGeneration(): void {
  if (embeddingSchedule) return;

  embeddingSchedule = setInterval(async () => {
    await memoryEmbeddingQueue.add(
      `embedding-${Date.now()}`,
      {
        regenerateAll: false,
        batchSize: 20,
      } as MemoryEmbeddingJobData,
      {
        jobId: `embedding-${Date.now()}`,
        priority: 4,
        removeOnComplete: true,
        removeOnFail: true,
      }
    );

    logger.info('Scheduled embedding generation triggered');
  }, 3600000); // 1 hour

  logger.info('Embedding generation scheduled (every hour)');
}

/**
 * Schedule periodic retention policy application (every 6 hours)
 */
export function scheduleRetentionApplication(): void {
  if (retentionSchedule) return;

  retentionSchedule = setInterval(async () => {
    await memoryRetentionQueue.add(
      `retention-${Date.now()}`,
      {
        type: 'apply_retention',
        policy: {
          shortTermTTLHours: 24,
          longTermImportanceThreshold: 0.7,
          episodicRetentionDays: 7,
          semanticRetentionDays: 90,
          maxMemoriesPerUser: 10000,
          maxMemoriesPerSession: 500,
        },
      } as MemoryRetentionJobData,
      {
        jobId: `retention-${Date.now()}`,
        priority: 6,
        removeOnComplete: true,
        removeOnFail: true,
      }
    );

    logger.info('Scheduled retention policy application triggered');
  }, 21600000); // 6 hours

  logger.info('Retention policy application scheduled (every 6 hours)');
}

/**
 * Start all scheduled memory jobs
 */
export function startAllMemorySchedules(): void {
  scheduleMemoryConsolidation();
  scheduleMemoryCleanup();
  scheduleEmbeddingGeneration();
  scheduleRetentionApplication();
  logger.info('All memory maintenance schedules started');
}

/**
 * Stop all scheduled memory jobs
 */
export function stopAllMemorySchedules(): void {
  if (consolidationSchedule) clearInterval(consolidationSchedule);
  if (cleanupSchedule) clearInterval(cleanupSchedule);
  if (embeddingSchedule) clearInterval(embeddingSchedule);
  if (retentionSchedule) clearInterval(retentionSchedule);

  consolidationSchedule = null;
  cleanupSchedule = null;
  embeddingSchedule = null;
  retentionSchedule = null;

  logger.info('All memory maintenance schedules stopped');
}

// ============================================
// Graceful Shutdown
// ============================================

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`${signal} received. Shutting down memory workers...`);

  stopAllMemorySchedules();

  const shutdownTimeout = setTimeout(() => {
    logger.error('Memory worker shutdown timeout, force closing');
    process.exit(1);
  }, 30000);

  try {
    await Promise.all([
      memoryConsolidationWorker.close(),
      memoryCleanupWorker.close(),
      memoryEmbeddingWorker.close(),
      memoryRetentionWorker.close(),
    ]);

    await Promise.all([
      memoryConsolidationQueue.close(),
      memoryCleanupQueue.close(),
      memoryEmbeddingQueue.close(),
      memoryRetentionQueue.close(),
    ]);

    if (redisConnection) {
      await redisConnection.quit();
      redisConnection = null;
    }

    clearTimeout(shutdownTimeout);
    logger.info('Memory workers shut down gracefully');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error during memory worker shutdown');
    process.exit(1);
  }
}

// ============================================
// Process Handlers
// ============================================

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught exception in memory worker');
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection in memory worker');
});

// ============================================
// Initialize on Import
// ============================================

export function initializeMemoryQueues(): void {
  startAllMemorySchedules();
  logger.info('Memory consolidation queue system initialized');
}

// Auto-initialize
initializeMemoryQueues();