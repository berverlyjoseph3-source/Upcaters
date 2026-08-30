// enterprise-ai-agent-platform/apps/api/tests/setup.ts
import { prisma } from '../src/db/client';
import { RedisInitService } from '../src/services/redis-init.service';
import { logger } from '../src/utils/logger';

// Suppress console logs during tests
beforeAll(async () => {
  // Silence logger during tests
  jest.spyOn(logger, 'info').mockImplementation(() => {});
  jest.spyOn(logger, 'debug').mockImplementation(() => {});
  jest.spyOn(logger, 'warn').mockImplementation(() => {});
  jest.spyOn(logger, 'error').mockImplementation(() => {});
  
  // Initialize Redis for tests
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  RedisInitService.initialize(redisUrl);
  
  // Clear test data before all tests
  await prisma.$executeRaw`TRUNCATE TABLE users CASCADE;`;
});

afterAll(async () => {
  // Clear test data after all tests
  await prisma.$executeRaw`TRUNCATE TABLE users CASCADE;`;
  
  // Disconnect database
  await prisma.$disconnect();
  
  // Close Redis connection
  await RedisInitService.disconnect();
  
  // Restore console logs
  jest.restoreAllMocks();
});

// Global test timeout
jest.setTimeout(30000);