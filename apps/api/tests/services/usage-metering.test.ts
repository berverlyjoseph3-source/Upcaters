// enterprise-ai-agent-platform/apps/api/tests/services/usage-metering.test.ts
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { UsageMeteringService, PlanLimitExceededError } from '../../src/services/usage-metering.service';
import { PlanGateService } from '../../src/services/plan-gate.service';
import { ActionType } from '../../src/types/usage.types';
import { prisma } from '../../src/db/client';

describe('UsageMeteringService', () => {
  let testUserId: string;

  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `test-usage-${Date.now()}@example.com`,
        name: 'Usage Test User',
        planId: 'STARTER',
        isActive: true,
      },
    });
    testUserId = user.id;

    // Initialize Redis for testing
    UsageMeteringService.initRedis(process.env.REDIS_URL || 'redis://localhost:6379');
  });

  afterAll(async () => {
    // Clean up test user
    await prisma.user.delete({ where: { id: testUserId } });
  });

  describe('getCurrentBillingPeriod', () => {
    it('should return current billing period in YYYY-MM format', () => {
      const period = UsageMeteringService.getCurrentBillingPeriod();
      expect(period).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  describe('getBillingPeriodEndDate', () => {
    it('should return a date at the end of current month', () => {
      const endDate = UsageMeteringService.getBillingPeriodEndDate();
      expect(endDate).toBeInstanceOf(Date);
      expect(endDate.getMonth()).toBe(new Date().getMonth());
      expect(endDate.getDate()).toBeGreaterThanOrEqual(28);
    });
  });

  describe('incrementUsage', () => {
    it('should increment usage counter successfully', async () => {
      const result = await UsageMeteringService.incrementUsage(
        testUserId,
        ActionType.AI_EMAIL_PROCESS,
        500
      );

      expect(result.success).toBe(true);
      expect(result.actionType).toBe(ActionType.AI_EMAIL_PROCESS);
      expect(result.cost).toBeGreaterThan(0);
    });

    it('should throw PlanLimitExceededError when limit reached', async () => {
      // First, get the limit
      const limits = await PlanGateService.getUserPlan(testUserId);
      const limit = limits.limits.aiActions as number;

      // Increment many times to reach limit
      for (let i = 0; i < limit; i++) {
        await UsageMeteringService.incrementUsage(testUserId, ActionType.API_EMAIL_FETCH);
      }

      // This should throw
      await expect(
        UsageMeteringService.incrementUsage(testUserId, ActionType.API_EMAIL_FETCH)
      ).rejects.toThrow(PlanLimitExceededError);
    });
  });

  describe('checkLimit', () => {
    it('should return allowed when within limits', async () => {
      const result = await UsageMeteringService.checkLimit(
        testUserId,
        ActionType.AI_CONTENT_TEXT,
        1000
      );

      expect(result.allowed).toBe(true);
      expect(result.category).toBe('ai_action');
      expect(result.used).toBeDefined();
      expect(result.limit).toBeDefined();
    });

    it('should return correct remaining count', async () => {
      const result = await UsageMeteringService.checkLimit(
        testUserId,
        ActionType.API_EMAIL_SEND
      );

      expect(result.remaining).toBeGreaterThanOrEqual(0);
      expect(result.resetDate).toBeInstanceOf(Date);
    });
  });

  describe('getUsageStats', () => {
    it('should return usage statistics for user', async () => {
      const stats = await UsageMeteringService.getUsageStats(testUserId);

      expect(stats.currentPeriod).toBeDefined();
      expect(stats.currentPeriod.period).toMatch(/^\d{4}-\d{2}$/);
      expect(stats.currentPeriod.aiActionsUsed).toBeDefined();
      expect(stats.currentPeriod.apiCallsUsed).toBeDefined();
      expect(stats.byActionType).toBeDefined();
      expect(stats.byAgent).toBeDefined();
    });

    it('should include historical data', async () => {
      const stats = await UsageMeteringService.getUsageStats(testUserId);
      expect(Array.isArray(stats.historical)).toBe(true);
    });
  });

  describe('getCurrentUsage', () => {
    it('should return current usage totals', async () => {
      const usage = await UsageMeteringService.getCurrentUsage(testUserId);
      
      expect(usage).toHaveProperty('aiActions');
      expect(usage).toHaveProperty('apiCalls');
      expect(typeof usage.aiActions).toBe('number');
      expect(typeof usage.apiCalls).toBe('number');
    });
  });
});

describe('PlanGateService', () => {
  let freeUserId: string;
  let proUserId: string;

  beforeAll(async () => {
    // Create free tier user
    const freeUser = await prisma.user.create({
      data: {
        email: `free-${Date.now()}@example.com`,
        name: 'Free User',
        planId: 'FREE',
        isActive: true,
      },
    });
    freeUserId = freeUser.id;

    // Create professional tier user
    const proUser = await prisma.user.create({
      data: {
        email: `pro-${Date.now()}@example.com`,
        name: 'Pro User',
        planId: 'PROFESSIONAL',
        isActive: true,
      },
    });
    proUserId = proUser.id;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: freeUserId } });
    await prisma.user.delete({ where: { id: proUserId } });
  });

  describe('checkFeatureAccess', () => {
    it('should allow free user to access email agent', async () => {
      const result = await PlanGateService.checkFeatureAccess(freeUserId, 'emailAgent');
      expect(result.allowed).toBe(true);
      expect(result.currentPlan).toBe('FREE');
    });

    it('should deny free user access to drive agent', async () => {
      const result = await PlanGateService.checkFeatureAccess(freeUserId, 'driveAgent');
      expect(result.allowed).toBe(false);
      expect(result.currentPlan).toBe('FREE');
      expect(result.requiredPlan).toBe('STARTER');
    });

    it('should allow professional user access to API', async () => {
      const result = await PlanGateService.checkFeatureAccess(proUserId, 'apiAccess');
      expect(result.allowed).toBe(true);
      expect(result.currentPlan).toBe('PROFESSIONAL');
    });

    it('should deny professional user access to white-label', async () => {
      const result = await PlanGateService.checkFeatureAccess(proUserId, 'whiteLabel');
      expect(result.allowed).toBe(false);
      expect(result.requiredPlan).toBe('ENTERPRISE');
    });
  });

  describe('checkUsageLimit', () => {
    it('should return correct limit for free tier', async () => {
      const result = await PlanGateService.checkUsageLimit(freeUserId, 'ai_action');
      expect(result.allowed).toBe(true);
      expect(result.currentPlan).toBe('FREE');
      expect(result.usage?.limit).toBe(50);
    });
  });

  describe('getUsagePercentage', () => {
    it('should return usage percentage for dashboard', async () => {
      const percentage = await PlanGateService.getUsagePercentage(freeUserId);
      expect(percentage.aiActions).toBeDefined();
      expect(percentage.apiCalls).toBeDefined();
      expect(['green', 'yellow', 'red']).toContain(percentage.aiActions.color);
    });
  });

  describe('getRequiredPlanForFeature', () => {
    it('should return STARTER for driveAgent', () => {
      const requiredPlan = PlanGateService.getRequiredPlanForFeature('driveAgent');
      expect(requiredPlan).toBe('STARTER');
    });

    it('should return PROFESSIONAL for multiPlatformPosts', () => {
      const requiredPlan = PlanGateService.getRequiredPlanForFeature('multiPlatformPosts');
      expect(requiredPlan).toBe('PROFESSIONAL');
    });

    it('should return ENTERPRISE for whiteLabel', () => {
      const requiredPlan = PlanGateService.getRequiredPlanForFeature('whiteLabel');
      expect(requiredPlan).toBe('ENTERPRISE');
    });
  });

  describe('isUpgradeNeeded', () => {
    it('should return true when upgrading from FREE to STARTER', () => {
      const needed = PlanGateService.isUpgradeNeeded('FREE', 'STARTER');
      expect(needed).toBe(true);
    });

    it('should return false when staying on same plan', () => {
      const needed = PlanGateService.isUpgradeNeeded('PROFESSIONAL', 'PROFESSIONAL');
      expect(needed).toBe(false);
    });
  });

  describe('getNextPlanTier', () => {
    it('should return STARTER for FREE', () => {
      const nextPlan = PlanGateService.getNextPlanTier('FREE');
      expect(nextPlan).toBe('STARTER');
    });

    it('should return PROFESSIONAL for STARTER', () => {
      const nextPlan = PlanGateService.getNextPlanTier('STARTER');
      expect(nextPlan).toBe('PROFESSIONAL');
    });

    it('should return ENTERPRISE for PROFESSIONAL', () => {
      const nextPlan = PlanGateService.getNextPlanTier('PROFESSIONAL');
      expect(nextPlan).toBe('ENTERPRISE');
    });
  });
});

describe('Action Costs Configuration', () => {
  it('should have costs defined for all action types', () => {
    const { ACTION_COSTS, ActionType } = require('../../src/types/usage.types');
    const actionTypes = Object.values(ActionType);
    
    for (const actionType of actionTypes) {
      const cost = ACTION_COSTS[actionType];
      expect(cost).toBeDefined();
      expect(cost.baseCost).toBeGreaterThan(0);
      expect(['ai_action', 'api_call']).toContain(cost.category);
    }
  });

  it('should have correct cost for AI actions', () => {
    const { ACTION_COSTS, ActionType } = require('../../src/types/usage.types');
    
    const emailProcess = ACTION_COSTS[ActionType.AI_EMAIL_PROCESS];
    expect(emailProcess.category).toBe('ai_action');
    expect(emailProcess.baseCost).toBe(1);
    
    const contentVideo = ACTION_COSTS[ActionType.AI_CONTENT_VIDEO];
    expect(contentVideo.category).toBe('ai_action');
    expect(contentVideo.baseCost).toBe(20);
  });
});

describe('Plan Limits Configuration', () => {
  it('should have correct limits for FREE tier', () => {
    const { PLAN_LIMITS_CONFIG } = require('../../src/types/usage.types');
    const limits = PLAN_LIMITS_CONFIG.FREE;
    expect(limits.aiActions).toBe(50);
    expect(limits.apiCalls).toBe(100);
    expect(limits.teamMembers).toBe(1);
    expect(limits.storageGB).toBe(0.1);
  });

  it('should have correct limits for STARTER tier', () => {
    const { PLAN_LIMITS_CONFIG } = require('../../src/types/usage.types');
    const limits = PLAN_LIMITS_CONFIG.STARTER;
    expect(limits.aiActions).toBe(500);
    expect(limits.apiCalls).toBe(2000);
    expect(limits.teamMembers).toBe(3);
    expect(limits.storageGB).toBe(1);
  });

  it('should have unlimited for ENTERPRISE tier', () => {
    const { PLAN_LIMITS_CONFIG } = require('../../src/types/usage.types');
    const limits = PLAN_LIMITS_CONFIG.ENTERPRISE;
    expect(limits.aiActions).toBe('unlimited');
    expect(limits.apiCalls).toBe('unlimited');
    expect(limits.teamMembers).toBe(100);
    expect(limits.storageGB).toBe(100);
  });
});