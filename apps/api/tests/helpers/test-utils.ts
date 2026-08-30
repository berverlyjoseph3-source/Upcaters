// enterprise-ai-agent-platform/apps/api/tests/helpers/test-utils.ts
import { prisma } from '../../src/db/client';
import { AuthService } from '../../src/auth/services/auth.service';
import { v4 as uuidv4 } from 'uuid';

export interface TestUser {
  id: string;
  email: string;
  name: string;
  planId: string;
  accessToken: string;
  refreshToken: string;
}

export interface TestContext {
  user: TestUser;
  adminUser: TestUser;
  cleanups: (() => Promise < void > )[];
}

/**
 * Create a test user with optional plan
 */
export async function createTestUser(planId: string = 'FREE'): Promise < TestUser > {
  const email = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
  
  const user = await prisma.user.create({
    data: {
      email,
      name: 'Test User',
      planId,
      isActive: true,
    },
  });
  
  const accessToken = AuthService.generateAccessToken(user.id, user.email, user.role, user.planId);
  const refreshToken = AuthService.generateRefreshToken(user.id, user.email, user.role, user.planId);
  
  return {
    id: user.id,
    email: user.email,
    name: user.name || 'Test User',
    planId: user.planId,
    accessToken,
    refreshToken,
  };
}

/**
 * Create a test admin user
 */
export async function createTestAdmin(): Promise < TestUser > {
  const email = `admin-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
  
  const user = await prisma.user.create({
    data: {
      email,
      name: 'Test Admin',
      planId: 'ENTERPRISE',
      role: 'ADMIN',
      isActive: true,
    },
  });
  
  const accessToken = AuthService.generateAccessToken(user.id, user.email, user.role, user.planId);
  const refreshToken = AuthService.generateRefreshToken(user.id, user.email, user.role, user.planId);
  
  return {
    id: user.id,
    email: user.email,
    name: user.name || 'Test Admin',
    planId: user.planId,
    accessToken,
    refreshToken,
  };
}

/**
 * Create a test context with user and admin
 */
export async function createTestContext(): Promise < TestContext > {
  const cleanups: (() => Promise < void > )[] = [];
  
  const user = await createTestUser('PROFESSIONAL');
  cleanups.push(() => prisma.user.delete({ where: { id: user.id } }));
  
  const adminUser = await createTestAdmin();
  cleanups.push(() => prisma.user.delete({ where: { id: adminUser.id } }));
  
  return { user, adminUser, cleanups };
}

/**
 * Clean up test context
 */
export async function cleanupTestContext(context: TestContext): Promise < void > {
  for (const cleanup of context.cleanups) {
    await cleanup();
  }
}

/**
 * Generate random string
 */
export function randomString(length: number = 10): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Generate random email
 */
export function randomEmail(): string {
  return `test-${Date.now()}-${randomString(8)}@example.com`;
}

/**
 * Wait for specified time
 */
export function wait(ms: number): Promise < void > {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry async function until success or timeout
 */
export async function retry < T > (
  fn: () => Promise < T > ,
  maxAttempts: number = 5,
  delayMs: number = 1000
): Promise < T > {
  let lastError: Error;
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < maxAttempts - 1) {
        await wait(delayMs * Math.pow(2, i));
      }
    }
  }
  
  throw lastError!;
}

/**
 * Mock API response
 */
export function mockResponse < T > (data: T, status: number = 200): { status: number;data: T } {
  return { status, data };
}

/**
 * Create a mock request object
 */
export function mockRequest(body: any = {}, params: any = {}, query: any = {}): any {
  return {
    body,
    params,
    query,
    headers: {},
    get: (key: string) => undefined,
  };
}

/**
 * Create a mock response object
 */
export function mockResponse(): any {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  return res;
}

/**
 * Clear all test data from database
 */
export async function clearTestData(): Promise < void > {
  await prisma.agentExecution.deleteMany();
  await prisma.usageLog.deleteMany();
  await prisma.scheduledPost.deleteMany();
  await prisma.oAuthConnection.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany({
    where: { email: { contains: 'test-' } },
  });
}

/**
 * Generate test token
 */
export function generateTestToken(userId: string, email: string, role: string = 'USER', planId: string = 'FREE'): string {
  return AuthService.generateAccessToken(userId, email, role, planId);
}

/**
 * Create test agent execution log
 */
export async function createTestExecution(userId: string, agentType: string = 'EMAIL', status: string = 'SUCCESS'): Promise < any > {
  return await prisma.agentExecution.create({
    data: {
      userId,
      agentType: agentType as any,
      actionType: 'test_action',
      status: status as any,
      durationMs: 100,
      tokensUsed: 500,
      costUsd: 0.001,
    },
  });
}

/**
 * Create test usage log
 */
export async function createTestUsageLog(userId: string, actionType: string = 'ai_action', count: number = 1): Promise < any > {
  const billingPeriod = new Date().toISOString().slice(0, 7);
  
  return await prisma.usageLog.upsert({
    where: {
      userId_billingPeriod_actionType: {
        userId,
        billingPeriod,
        actionType,
      },
    },
    update: { count: { increment: count } },
    create: {
      userId,
      billingPeriod,
      actionType,
      count,
    },
  });
}