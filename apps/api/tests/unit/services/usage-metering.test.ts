// enterprise-ai-agent-platform/apps/api/tests/unit/services/usage-metering.test.ts
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { UsageMeteringService, PlanLimitExceededError } from '../../../src/services/usage-metering.service';
import { PlanGateService } from '../../../src/services/plan-gate.service';
import { ActionType } from '../../../src/types/usage.types';
import { prisma } from '../../../src/db/client';

describe('UsageMeteringService', () => {
  let testUserId: string;
  let testUserEmail: string;

  beforeAll(async () => {
    testUserEmail = `test-usage-${Date.now()}@example.com`;
    
    const user = await prisma.user.create({
      data: {
        email: testUserEmail,
        name: 'Usage Test User',
        planId: 'STARTER',
        isActive: true,
      },
    });
    testUserId = user.id;

    UsageMeteringService.initRedis(process.env.REDIS_URL || 'redis://localhost:6379');
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
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
      expect(result.newTotal).toBeGreaterThan(0);
    });

    it('should increment multiple times correctly', async () => {
      const initial = await UsageMeteringService.getCurrentUsage(testUserId);
      
      await UsageMeteringService.incrementUsage(testUserId, ActionType.API_EMAIL_SEND);
      await UsageMeteringService.incrementUsage(testUserId, ActionType.API_EMAIL_SEND);
      
      const after = await UsageMeteringService.getCurrentUsage(testUserId);
      expect(after.apiCalls).toBe(initial.apiCalls + 2);
    });

    it('should throw PlanLimitExceededError when limit reached', async () => {
      const limits = await PlanGateService.getUserPlan(testUserId);
      const limit = limits.limits.aiActions as number;

      for (let i = 0; i < limit; i++) {
        await UsageMeteringService.incrementUsage(testUserId, ActionType.API_EMAIL_FETCH);
      }

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
      expect(result.remaining).toBeGreaterThanOrEqual(0);
    });

    it('should return correct remaining count', async () => {
      const result = await UsageMeteringService.checkLimit(
        testUserId,
        ActionType.API_EMAIL_SEND
      );

      expect(result.remaining).toBeGreaterThanOrEqual(0);
      expect(result.resetDate).toBeInstanceOf(Date);
    });

    it('should return not allowed when limit exceeded', async () => {
      const limits = await PlanGateService.getUserPlan(testUserId);
      const limit = limits.limits.aiActions as number;
      
      for (let i = 0; i < limit; i++) {
        await UsageMeteringService.incrementUsage(testUserId, ActionType.API_EMAIL_FETCH);
      }
      
      const result = await UsageMeteringService.checkLimit(
        testUserId,
        ActionType.API_EMAIL_FETCH
      );
      
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
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
      expect(stats.topActions).toBeDefined();
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
      expect(usage.aiActions).toBeGreaterThanOrEqual(0);
      expect(usage.apiCalls).toBeGreaterThanOrEqual(0);
    });
  });

  describe('resetMonthlyCounters', () => {
    it('should reset counters for current period', async () => {
      const result = await UsageMeteringService.resetMonthlyCounters();
      
      expect(result.resetCount).toBeDefined();
      expect(result.billingPeriod).toMatch(/^\d{4}-\d{2}$/);
    });
  });
});

describe('PlanGateService', () => {
  let freeUserId: string;
  let proUserId: string;
  let enterpriseUserId: string;

  beforeAll(async () => {
    const freeUser = await prisma.user.create({
      data: {
        email: `free-${Date.now()}@example.com`,
        name: 'Free User',
        planId: 'FREE',
        isActive: true,
      },
    });
    freeUserId = freeUser.id;

    const proUser = await prisma.user.create({
      data: {
        email: `pro-${Date.now()}@example.com`,
        name: 'Pro User',
        planId: 'PROFESSIONAL',
        isActive: true,
      },
    });
    proUserId = proUser.id;

    const enterpriseUser = await prisma.user.create({
      data: {
        email: `enterprise-${Date.now()}@example.com`,
        name: 'Enterprise User',
        planId: 'ENTERPRISE',
        isActive: true,
      },
    });
    enterpriseUserId = enterpriseUser.id;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: freeUserId } }).catch(() => {});
    await prisma.user.delete({ where: { id: proUserId } }).catch(() => {});
    await prisma.user.delete({ where: { id: enterpriseUserId } }).catch(() => {});
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

    it('should allow enterprise user access to white-label', async () => {
      const result = await PlanGateService.checkFeatureAccess(enterpriseUserId, 'whiteLabel');
      expect(result.allowed).toBe(true);
      expect(result.currentPlan).toBe('ENTERPRISE');
    });
  });

  describe('checkUsageLimit', () => {
    it('should return correct limit for free tier', async () => {
      const result = await PlanGateService.checkUsageLimit(freeUserId, 'ai_action');
      expect(result.allowed).toBe(true);
      expect(result.currentPlan).toBe('FREE');
      expect(result.usage?.limit).toBe(50);
    });

    it('should return unlimited for enterprise tier', async () => {
      const result = await PlanGateService.checkUsageLimit(enterpriseUserId, 'ai_action');
      expect(result.allowed).toBe(true);
      expect(result.currentPlan).toBe('ENTERPRISE');
      expect(result.usage?.limit).toBe('unlimited');
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

    it('should return false when downgrading', () => {
      const needed = PlanGateService.isUpgradeNeeded('PROFESSIONAL', 'FREE');
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

    it('should return null for ENTERPRISE', () => {
      const nextPlan = PlanGateService.getNextPlanTier('ENTERPRISE');
      expect(nextPlan).toBeNull();
    });
  });

  describe('getFeaturesForPlan', () => {
    it('should return correct features for FREE plan', () => {
      const features = PlanGateService.getFeaturesForPlan('FREE');
      expect(features.emailAgent).toBe(true);
      expect(features.driveAgent).toBe(false);
      expect(features.socialUploadAgent).toBe(false);
    });

    it('should return correct features for PROFESSIONAL plan', () => {
      const features = PlanGateService.getFeaturesForPlan('PROFESSIONAL');
      expect(features.emailAgent).toBe(true);
      expect(features.driveAgent).toBe(true);
      expect(features.apiAccess).toBe(true);
      expect(features.whiteLabel).toBe(false);
    });

    it('should return correct features for ENTERPRISE plan', () => {
      const features = PlanGateService.getFeaturesForPlan('ENTERPRISE');
      expect(features.whiteLabel).toBe(true);
      expect(features.customIntegrations).toBe(true);
      expect(features.slaGuarantee).toBe(true);
    });
  });
});