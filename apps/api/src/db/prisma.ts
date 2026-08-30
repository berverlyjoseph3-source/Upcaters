// apps/api/src/db/prisma.ts
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
  errorFormat: 'pretty',
});

// Handle connection events
prisma.$on('query' as never, (e: any) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug({
      msg: 'Database Query',
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
    });
  }
});

prisma.$on('error', (e: any) => {
  logger.error({
    msg: 'Database Error',
    error: e.message,
    target: e.target,
  });
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export { prisma };