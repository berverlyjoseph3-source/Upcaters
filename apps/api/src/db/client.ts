// enterprise-ai-agent-platform/apps/api/src/db/client.ts
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Singleton pattern for Prisma Client
let prismaClient: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!prismaClient) {
    prismaClient = new PrismaClient({
      log:
        process.env.NODE_ENV === 'development'
          ? [
              { emit: 'event', level: 'query' },
              { emit: 'stdout', level: 'info' },
              { emit: 'stdout', level: 'warn' },
              { emit: 'stdout', level: 'error' },
            ]
          : [{ emit: 'stdout', level: 'error' }],
    });

    // Log queries in development
    if (process.env.NODE_ENV === 'development') {
      prismaClient.$on('query' as never, (e: any) => {
        logger.debug({
          msg: 'Database Query',
          query: e.query,
          params: e.params,
          duration: `${e.duration}ms`,
        });
      });
    }

    // Handle connection errors
    prismaClient.$on('error' as never, (e: any) => {
      logger.error({
        msg: 'Prisma Client Error',
        error: e.message,
        target: e.target,
      });
    });
  }

  return prismaClient;
}

// Export a singleton instance
export const prisma = getPrismaClient();

// Transaction helper for multi-table operations
export async function withTransaction<T>(
  callback: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    return callback(tx as PrismaClient);
  });
}

// Batch operation helper
export async function batchOperation<T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  batchSize: number = 100
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(operation));
    results.push(...batchResults);
  }
  
  return results;
}