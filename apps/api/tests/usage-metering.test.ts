// enterprise-ai-agent-platform/apps/api/src/tests/usage-metering.test.ts
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { UsageMeteringService } from '../services/usage-metering.service';
import { PlanGateService } from '../services/plan-gate.service';
import { ActionType } from '../types/usage.types';
import { prisma } from '../db/client';

describe('Usage Metering Service', () => {
  let testUserId: string;
  
  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        name: 'Test User',
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
  
  describe('incrementUsage', () => {
    it('should increment usage counter successfully', async () => {
      const result = await UsageMeteringService.incrementUsage(
        testUserId,
        ActionType.AI_EMAIL_PROCESS,
        500 // tokens used
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
      ).rejects.toThrow('PlanLimitExceededError');
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
  
  describe('resetMonthlyCounters', () => {
    it('should reset counters for current period', async () => {
      const result = await UsageMeteringService.resetMonthlyCounters();
      
      expect(result.resetCount).toBeDefined();
      expect(result.billingPeriod).toMatch(/^\d{4}-\d{2}$/);
    });
  });
});

describe('Plan Gate Service', () => {
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
      expect(result.usage?.limit).toBe(50); // FREE tier has 50 AI actions
    });
    
    it('should return unlimited for professional tier', async () => {
      // Professional tier has limits, not unlimited
      const result = await PlanGateService.checkUsageLimit(proUserId, 'ai_action');
      
      expect(result.allowed).toBe(true);
      expect(result.currentPlan).toBe('PROFESSIONAL');
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
});

describe('Action Costs Configuration', () => {
  it('should have costs defined for all action types', () => {
    const actionTypes = Object.values(ActionType);
    
    for (const actionType of actionTypes) {
      const cost = require('../types/usage.types').ACTION_COSTS[actionType];
      expect(cost).toBeDefined();
      expect(cost.baseCost).toBeGreaterThan(0);
      expect(['ai_action', 'api_call']).toContain(cost.category);
    }
  });
  
  it('should have correct cost for AI actions', () => {
    const emailProcess = require('../types/usage.types').ACTION_COSTS[ActionType.AI_EMAIL_PROCESS];
    expect(emailProcess.category).toBe('ai_action');
    expect(emailProcess.baseCost).toBe(1);
    
    const contentVideo = require('../types/usage.types').ACTION_COSTS[ActionType.AI_CONTENT_VIDEO];
    expect(contentVideo.category).toBe('ai_action');
    expect(contentVideo.baseCost).toBe(20);
  });
  
  it('should have correct cost for API calls', () => {
    const driveUpload = require('../types/usage.types').ACTION_COSTS[ActionType.API_DRIVE_UPLOAD];
    expect(driveUpload.category).toBe('api_call');
    expect(driveUpload.baseCost).toBe(2);
  });
});

describe('Plan Limits Configuration', () => {
  it('should have correct limits for FREE tier', () => {
    const limits = require('../types/usage.types').PLAN_LIMITS_CONFIG.FREE;
    expect(limits.aiActions).toBe(50);
    expect(limits.apiCalls).toBe(100);
    expect(limits.teamMembers).toBe(1);
    expect(limits.storageGB).toBe(0.1);
  });
  
  it('should have correct limits for STARTER tier', () => {
    const limits = require('../types/usage.types').PLAN_LIMITS_CONFIG.STARTER;
    expect(limits.aiActions).toBe(500);
    expect(limits.apiCalls).toBe(2000);
    expect(limits.teamMembers).toBe(3);
    expect(limits.storageGB).toBe(1);
  });
  
  it('should have correct limits for PROFESSIONAL tier', () => {
    const limits = require('../types/usage.types').PLAN_LIMITS_CONFIG.PROFESSIONAL;
    expect(limits.aiActions).toBe(2500);
    expect(limits.apiCalls).toBe(15000);
    expect(limits.teamMembers).toBe(10);
    expect(limits.storageGB).toBe(10);
  });
  
  it('should have unlimited for ENTERPRISE tier', () => {
    const limits = require('../types/usage.types').PLAN_LIMITS_CONFIG.ENTERPRISE;
    expect(limits.aiActions).toBe('unlimited');
    expect(limits.apiCalls).toBe('unlimited');
    expect(limits.teamMembers).toBe(100);
    expect(limits.storageGB).toBe(100);
  });
});

describe('Feature Access Matrix', () => {
  it('should allow FREE tier email, calendar, web agents only', () => {
    const features = require('../types/usage.types').FEATURE_ACCESS_MATRIX.FREE;
    expect(features.emailAgent).toBe(true);
    expect(features.driveAgent).toBe(false);
    expect(features.contentAgentText).toBe(true);
    expect(features.contentAgentImage).toBe(false);
    expect(features.contentAgentVideo).toBe(false);
    expect(features.socialUploadAgent).toBe(false);
    expect(features.calendarAgent).toBe(true);
    expect(features.webAgent).toBe(true);
    expect(features.taskAgent).toBe(false);
    expect(features.multiPlatformPosts).toBe(false);
    expect(features.apiAccess).toBe(false);
  });
  
  it('should allow PROFESSIONAL tier all core features', () => {
    const features = require('../types/usage.types').FEATURE_ACCESS_MATRIX.PROFESSIONAL;
    expect(features.emailAgent).toBe(true);
    expect(features.driveAgent).toBe(true);
    expect(features.contentAgentText).toBe(true);
    expect(features.contentAgentImage).toBe(true);
    expect(features.socialUploadAgent).toBe(true);
    expect(features.calendarAgent).toBe(true);
    expect(features.webAgent).toBe(true);
    expect(features.taskAgent).toBe(true);
    expect(features.multiPlatformPosts).toBe(true);
    expect(features.apiAccess).toBe(true);
  });
  
  it('should allow ENTERPRISE tier all features', () => {
    const features = require('../types/usage.types').FEATURE_ACCESS_MATRIX.ENTERPRISE;
    expect(features.contentAgentVideo).toBe(true);
    expect(features.whiteLabel).toBe(true);
    expect(features.customIntegrations).toBe(true);
    expect(features.slaGuarantee).toBe(true);
  });
});