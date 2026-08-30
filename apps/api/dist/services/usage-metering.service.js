"use strict";
// enterprise-ai-agent-platform/apps/api/src/services/usage-metering.service.ts
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
exports.UsageMeteringService = exports.RateLimitWarning = exports.UsageTrackingError = exports.PlanLimitExceededError = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const client_1 = require("../db/client");
const logger_1 = require("../utils/logger");
const usage_types_1 = require("../types/usage.types");
// ============================================
// Custom Error Classes
// ============================================
class PlanLimitExceededError extends Error {
    constructor(category, used, limit, resetDate, overageCost, upgradeUrl) {
        super(`${category} limit exceeded: ${used}/${limit} (overage cost: $${overageCost.toFixed(4)})`);
        this.category = category;
        this.used = used;
        this.limit = limit;
        this.resetDate = resetDate;
        this.overageCost = overageCost;
        this.upgradeUrl = upgradeUrl;
        this.name = 'PlanLimitExceededError';
    }
}
exports.PlanLimitExceededError = PlanLimitExceededError;
class UsageTrackingError extends Error {
    constructor(message, userId, actionType, originalError) {
        super(message);
        this.userId = userId;
        this.actionType = actionType;
        this.originalError = originalError;
        this.name = 'UsageTrackingError';
    }
}
exports.UsageTrackingError = UsageTrackingError;
class RateLimitWarning extends Error {
    constructor(message, remaining, resetTime) {
        super(message);
        this.remaining = remaining;
        this.resetTime = resetTime;
        this.name = 'RateLimitWarning';
    }
}
exports.RateLimitWarning = RateLimitWarning;
// ============================================
// Usage Metering Service
// ============================================
class UsageMeteringService {
    /**
     * Initialize Redis connection
     */
    static initRedis(redisUrl) {
        if (!this.redis) {
            this.redis = new ioredis_1.default(redisUrl, {
                retryStrategy: (times) => Math.min(times * 50, 2000),
                maxRetriesPerRequest: 3,
                enableOfflineQueue: true,
            });
            this.redis.on('error', (error) => {
                logger_1.logger.error({ error }, 'Usage metering Redis error');
            });
            this.redis.on('connect', () => {
                logger_1.logger.info('Usage metering Redis connected');
                // Retry any failed increments
                this.retryFailedIncrements();
            });
            logger_1.logger.info('Usage metering Redis client initialized');
        }
    }
    /**
     * Get Redis client
     */
    static getRedis() {
        if (!this.redis) {
            throw new Error('Redis not initialized. Call initRedis first.');
        }
        return this.redis;
    }
    /**
     * Check if Redis is available
     */
    static isRedisAvailable() {
        return this.redis?.status === 'ready';
    }
    // ============================================
    // Billing Period Utilities
    // ============================================
    /**
     * Get current billing period key (YYYY-MM)
     */
    static getCurrentBillingPeriod() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    /**
     * Get billing period end date
     */
    static getBillingPeriodEndDate() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }
    /**
     * Get days remaining in billing period
     */
    static getDaysRemaining() {
        const endDate = this.getBillingPeriodEndDate();
        const now = new Date();
        const diffTime = endDate.getTime() - now.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    // ============================================
    // Redis Key Generation
    // ============================================
    static getRedisKey(userId, actionType, billingPeriod) {
        return `${this.USAGE_KEY_PREFIX}${userId}:${billingPeriod}:${actionType}`;
    }
    static getCategoryKey(userId, category, billingPeriod) {
        return `${this.USAGE_KEY_PREFIX}${userId}:${billingPeriod}:category:${category}`;
    }
    static getOverageKey(userId, category, billingPeriod) {
        return `${this.OVERAGE_KEY_PREFIX}${userId}:${billingPeriod}:category:${category}`;
    }
    static getImageOverageKey(userId, billingPeriod) {
        return `${this.OVERAGE_KEY_PREFIX}${userId}:${billingPeriod}:image`;
    }
    static getVideoOverageKey(userId, billingPeriod) {
        return `${this.OVERAGE_KEY_PREFIX}${userId}:${billingPeriod}:video`;
    }
    // ============================================
    // Plan Limits
    // ============================================
    static async getUserPlanLimits(userId) {
        const user = await client_1.prisma.user.findUnique({
            where: { id: userId },
            select: { planId: true },
        });
        if (!user) {
            throw new Error(`User not found: ${userId}`);
        }
        const limits = usage_types_1.PLAN_LIMITS_CONFIG[user.planId] || usage_types_1.PLAN_LIMITS_CONFIG.FREE;
        const overagePricing = usage_types_1.OVERAGE_PRICING_CONFIG[user.planId] ||
            usage_types_1.OVERAGE_PRICING_CONFIG.FREE;
        return {
            planId: user.planId,
            aiActions: limits.aiActions,
            apiCalls: limits.apiCalls,
            overagePricing,
        };
    }
    // ============================================
    // Core Usage Increment
    // ============================================
    /**
     * Increment usage counter — call BEFORE executing any agent action.
     * Supports overage tracking when user exceeds plan limits.
     */
    static async incrementUsage(userId, actionType, tokensUsed = 0) {
        try {
            const actionCost = usage_types_1.ACTION_COSTS[actionType];
            if (!actionCost) {
                logger_1.logger.warn({ userId, actionType }, 'Unknown action type for usage metering');
                return {
                    success: false,
                    actionType,
                    cost: 0,
                    newTotal: 0,
                    remaining: 0,
                    wasAtLimit: false,
                };
            }
            const billingPeriod = this.getCurrentBillingPeriod();
            // Calculate cost
            let cost = actionCost.baseCost;
            if (actionCost.tokenMultiplier && tokensUsed > 0) {
                cost += Math.ceil(tokensUsed * actionCost.tokenMultiplier);
            }
            if (this.isRedisAvailable()) {
                return await this.redisIncrementUsage(userId, actionType, actionCost, cost, tokensUsed, billingPeriod);
            }
            // Fallback: direct DB increment
            return await this.dbIncrementUsage(userId, actionType, actionCost, cost, tokensUsed, billingPeriod);
        }
        catch (error) {
            // ENHANCEMENT: Track failed increments for retry
            this.trackFailedIncrement(userId, actionType, 0, tokensUsed);
            logger_1.logger.error({ error, userId, actionType }, 'Failed to increment usage');
            // Return graceful degradation
            return {
                success: true, // Don't block the user
                actionType,
                cost: 0,
                newTotal: 0,
                remaining: 999,
                wasAtLimit: false,
                degraded: true,
            };
        }
    }
    /**
     * Redis-based usage increment
     */
    static async redisIncrementUsage(userId, actionType, actionCost, cost, tokensUsed, billingPeriod) {
        const redis = this.getRedis();
        const key = this.getRedisKey(userId, actionType, billingPeriod);
        const categoryKey = this.getCategoryKey(userId, actionCost.category, billingPeriod);
        const overageKey = this.getOverageKey(userId, actionCost.category, billingPeriod);
        // Get current usage
        const [currentActionCount, currentCategoryTotal, limits] = await Promise.all([
            redis.get(key),
            redis.get(categoryKey),
            this.getUserPlanLimits(userId),
        ]);
        const actionCount = currentActionCount
            ? parseInt(currentActionCount, 10)
            : 0;
        const categoryTotal = currentCategoryTotal
            ? parseInt(currentCategoryTotal, 10)
            : 0;
        const limit = actionCost.category === 'ai_action'
            ? limits.aiActions
            : limits.apiCalls;
        // Calculate new totals
        const newTotal = categoryTotal + cost;
        const remaining = limit - newTotal;
        const isOverage = categoryTotal >= limit;
        const willExceedLimit = newTotal > limit;
        // Atomic Redis transaction
        const multi = redis.multi();
        multi.incrby(key, cost);
        multi.incrby(categoryKey, cost);
        multi.expire(key, this.CACHE_TTL_SECONDS);
        multi.expire(categoryKey, this.CACHE_TTL_SECONDS);
        // Track overage
        if (isOverage || willExceedLimit) {
            const overageAmount = isOverage
                ? cost
                : newTotal - limit;
            multi.incrby(overageKey, overageAmount > 0 ? overageAmount : 0);
            multi.expire(overageKey, this.CACHE_TTL_SECONDS);
            // Track image/video overage separately
            if (actionType === usage_types_1.ActionType.AI_CONTENT_IMAGE) {
                const imageKey = this.getImageOverageKey(userId, billingPeriod);
                multi.incrby(imageKey, 1);
                multi.expire(imageKey, this.CACHE_TTL_SECONDS);
            }
            else if (actionType === usage_types_1.ActionType.AI_CONTENT_VIDEO) {
                const videoKey = this.getVideoOverageKey(userId, billingPeriod);
                multi.incrby(videoKey, 1);
                multi.expire(videoKey, this.CACHE_TTL_SECONDS);
            }
            const overageRate = actionCost.category === 'ai_action'
                ? limits.overagePricing.aiAction
                : limits.overagePricing.apiCall;
            const overageCostUsd = overageAmount * overageRate;
            logger_1.logger.info({
                userId,
                actionType,
                category: actionCost.category,
                overageAmount,
                overageCostUsd,
                overageRate,
                planId: limits.planId,
            }, 'Usage tracked in overage territory');
        }
        await multi.exec();
        // Async persist to DB
        this.persistToDatabase(userId, actionType, cost, tokensUsed, billingPeriod).catch((err) => {
            logger_1.logger.error({ error: err, userId, actionType }, 'Failed to persist usage to database');
        });
        return {
            success: true,
            actionType,
            cost,
            newTotal,
            remaining: remaining > 0 ? remaining : 0,
            wasAtLimit: remaining <= 0,
            isOverage: isOverage || willExceedLimit,
        };
    }
    /**
     * DB-based usage increment (fallback when Redis unavailable)
     */
    static async dbIncrementUsage(userId, actionType, actionCost, cost, tokensUsed, billingPeriod) {
        const limits = await this.getUserPlanLimits(userId);
        // Get current usage from DB
        const currentUsage = await client_1.prisma.usageLog.aggregate({
            where: {
                userId,
                billingPeriod,
                actionType: {
                    startsWith: actionCost.category === 'ai_action' ? 'ai_' : 'api_',
                },
            },
            _sum: { count: true },
        });
        const currentTotal = currentUsage._sum.count || 0;
        const limit = actionCost.category === 'ai_action'
            ? limits.aiActions
            : limits.apiCalls;
        const newTotal = currentTotal + cost;
        const remaining = limit - newTotal;
        // Upsert usage log
        await client_1.prisma.usageLog.upsert({
            where: {
                userId_billingPeriod_actionType: {
                    userId,
                    billingPeriod,
                    actionType,
                },
            },
            update: {
                count: { increment: cost },
                tokensUsed: { increment: tokensUsed },
                updatedAt: new Date(),
            },
            create: {
                userId,
                billingPeriod,
                actionType,
                count: cost,
                tokensUsed,
                costUsd: cost * 0.001,
            },
        });
        return {
            success: true,
            actionType,
            cost,
            newTotal,
            remaining: remaining > 0 ? remaining : 0,
            wasAtLimit: remaining <= 0,
        };
    }
    // ============================================
    // ENHANCEMENT: Failed Increment Tracking
    // ============================================
    /**
     * Track failed increments for retry
     */
    static trackFailedIncrement(userId, actionType, cost, tokensUsed) {
        this.failedIncrements.push({
            userId,
            actionType,
            cost,
            tokensUsed,
            timestamp: Date.now(),
        });
        // Keep only last 1000 failed increments
        if (this.failedIncrements.length > 1000) {
            this.failedIncrements = this.failedIncrements.slice(-500);
        }
    }
    /**
     * Retry failed increments
     */
    static async retryFailedIncrements() {
        if (this.failedIncrements.length === 0)
            return;
        const toRetry = [...this.failedIncrements];
        this.failedIncrements = [];
        let successCount = 0;
        let failCount = 0;
        for (const item of toRetry) {
            try {
                await this.persistToDatabase(item.userId, item.actionType, item.cost, item.tokensUsed, this.getCurrentBillingPeriod());
                successCount++;
            }
            catch (error) {
                this.failedIncrements.push(item);
                failCount++;
            }
        }
        logger_1.logger.info({ successCount, failCount }, 'Retried failed usage increments');
    }
    /**
     * Get count of pending failed increments
     */
    static getFailedIncrementCount() {
        return this.failedIncrements.length;
    }
    // ============================================
    // Database Persistence
    // ============================================
    static async persistToDatabase(userId, actionType, cost, tokensUsed, billingPeriod) {
        try {
            await client_1.prisma.usageLog.upsert({
                where: {
                    userId_billingPeriod_actionType: {
                        userId,
                        billingPeriod,
                        actionType,
                    },
                },
                update: {
                    count: { increment: cost },
                    tokensUsed: { increment: tokensUsed },
                    updatedAt: new Date(),
                },
                create: {
                    userId,
                    billingPeriod,
                    actionType,
                    count: cost,
                    tokensUsed,
                    costUsd: cost * 0.001,
                },
            });
        }
        catch (error) {
            logger_1.logger.error({ error, userId, actionType }, 'Failed to persist usage to database');
            throw error;
        }
    }
    // ============================================
    // Usage Checks
    // ============================================
    /**
     * Check if user is within limits BEFORE executing an action
     */
    static async checkLimit(userId, actionType, tokensUsed = 0) {
        try {
            const actionCost = usage_types_1.ACTION_COSTS[actionType];
            if (!actionCost) {
                throw new Error(`Unknown action type: ${actionType}`);
            }
            const billingPeriod = this.getCurrentBillingPeriod();
            const limits = await this.getUserPlanLimits(userId);
            let used;
            if (this.isRedisAvailable()) {
                const redis = this.getRedis();
                const categoryKey = this.getCategoryKey(userId, actionCost.category, billingPeriod);
                const currentTotal = await redis.get(categoryKey);
                used = currentTotal ? parseInt(currentTotal, 10) : 0;
            }
            else {
                // Fallback to DB
                const dbUsage = await client_1.prisma.usageLog.aggregate({
                    where: {
                        userId,
                        billingPeriod,
                        actionType: {
                            startsWith: actionCost.category === 'ai_action'
                                ? 'ai_'
                                : 'api_',
                        },
                    },
                    _sum: { count: true },
                });
                used = dbUsage._sum.count || 0;
            }
            // Calculate cost
            let cost = actionCost.baseCost;
            if (actionCost.tokenMultiplier && tokensUsed > 0) {
                cost += Math.ceil(tokensUsed * actionCost.tokenMultiplier);
            }
            const limit = actionCost.category === 'ai_action'
                ? limits.aiActions
                : limits.apiCalls;
            const resetDate = this.getBillingPeriodEndDate();
            const remaining = limit - used;
            const overagePrice = actionCost.category === 'ai_action'
                ? limits.overagePricing.aiAction
                : limits.overagePricing.apiCall;
            return {
                allowed: true, // Always allow — overage handles excess
                category: actionCost.category,
                used,
                limit,
                remaining: remaining > 0 ? remaining : 0,
                resetDate,
                upgradeUrl: `${process.env.APP_URL}/billing/upgrade`,
                overagePrice: remaining <= 0 ? overagePrice : undefined,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId, actionType }, 'Failed to check usage limit');
            throw error;
        }
    }
    // ============================================
    // ENHANCEMENT: Pre-Execution Cost Check
    // ============================================
    /**
     * Check if a user can afford an execution before it runs.
     * Returns estimated cost, overage, and upgrade recommendation.
     */
    static async canAffordExecution(userId, estimatedTokens, estimatedCost) {
        try {
            const usage = await this.getCurrentUsage(userId);
            const limits = await this.getUserPlanLimits(userId);
            const estimatedAiActions = Math.ceil(estimatedTokens / 500);
            const estimatedApiCalls = 2; // Conservative estimate
            const newAiActions = usage.aiActions + estimatedAiActions;
            const newApiCalls = usage.apiCalls + estimatedApiCalls;
            const aiOverage = Math.max(0, newAiActions - limits.aiActions);
            const apiOverage = Math.max(0, newApiCalls - limits.apiCalls);
            const overageCost = aiOverage * limits.overagePricing.aiAction +
                apiOverage * limits.overagePricing.apiCall;
            let recommendation;
            // Check if upgrading would save money
            if (overageCost > 10) {
                const plans = ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
                const currentPlanIndex = plans.indexOf(limits.planId);
                if (currentPlanIndex < plans.length - 1) {
                    const nextPlanId = plans[currentPlanIndex + 1];
                    const nextPlanConfig = usage_types_1.PLAN_LIMITS_CONFIG[nextPlanId];
                    const nextPlanOverage = usage_types_1.OVERAGE_PRICING_CONFIG[nextPlanId];
                    const nextPlanAiOverage = Math.max(0, newAiActions - nextPlanConfig.aiActions);
                    const nextPlanApiOverage = Math.max(0, newApiCalls - nextPlanConfig.apiCalls);
                    const nextPlanOverageCost = nextPlanAiOverage *
                        (nextPlanOverage?.aiAction || 0.05) +
                        nextPlanApiOverage *
                            (nextPlanOverage?.apiCall || 0.01);
                    if (nextPlanOverageCost < overageCost * 0.5) {
                        const savings = overageCost - nextPlanOverageCost;
                        recommendation = {
                            planId: nextPlanId,
                            planName: nextPlanId === 'STARTER'
                                ? 'Starter'
                                : nextPlanId === 'PROFESSIONAL'
                                    ? 'Professional'
                                    : 'Enterprise',
                            savings,
                            upgradeUrl: `${process.env.APP_URL}/billing/upgrade?plan=${nextPlanId.toLowerCase()}`,
                        };
                    }
                }
            }
            let reason;
            if (overageCost > 0) {
                reason = `This execution will incur approximately $${overageCost.toFixed(4)} in overage charges`;
            }
            return {
                allowed: true,
                estimatedCost: estimatedCost + overageCost,
                estimatedTokens,
                currentUsage: usage,
                limits: {
                    aiActions: limits.aiActions,
                    apiCalls: limits.apiCalls,
                },
                remainingAfter: {
                    aiActions: Math.max(0, limits.aiActions - newAiActions),
                    apiCalls: Math.max(0, limits.apiCalls - newApiCalls),
                },
                overageCost,
                overagePricing: limits.overagePricing,
                reason,
                recommendation,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Pre-execution cost check failed');
            return {
                allowed: true,
                estimatedCost: 0,
                estimatedTokens: 0,
                currentUsage: { aiActions: 0, apiCalls: 0 },
                limits: { aiActions: 0, apiCalls: 0 },
                remainingAfter: { aiActions: 0, apiCalls: 0 },
                overageCost: 0,
                overagePricing: {
                    aiAction: 0.05,
                    apiCall: 0.01,
                    imageGeneration: 0.1,
                    videoGeneration: 1.0,
                },
            };
        }
    }
    // ============================================
    // Usage Statistics
    // ============================================
    /**
     * Get real-time usage stats with overage tracking
     */
    static async getUsageStats(userId) {
        try {
            const billingPeriod = this.getCurrentBillingPeriod();
            const limits = await this.getUserPlanLimits(userId);
            let aiActions = 0;
            let apiCalls = 0;
            let aiOverage = 0;
            let apiOverage = 0;
            let byActionType = {};
            let byAgent = {};
            if (this.isRedisAvailable()) {
                const redis = this.getRedis();
                const aiActionsKey = this.getCategoryKey(userId, 'ai_action', billingPeriod);
                const apiCallsKey = this.getCategoryKey(userId, 'api_call', billingPeriod);
                const aiOverageKey = this.getOverageKey(userId, 'ai_action', billingPeriod);
                const apiOverageKey = this.getOverageKey(userId, 'api_call', billingPeriod);
                const [aiActionsUsed, apiCallsUsed, aiOverageAmount, apiOverageAmount,] = await Promise.all([
                    redis.get(aiActionsKey),
                    redis.get(apiCallsKey),
                    redis.get(aiOverageKey),
                    redis.get(apiOverageKey),
                ]);
                aiActions = aiActionsUsed
                    ? parseInt(aiActionsUsed, 10)
                    : 0;
                apiCalls = apiCallsUsed
                    ? parseInt(apiCallsUsed, 10)
                    : 0;
                aiOverage = aiOverageAmount
                    ? parseInt(aiOverageAmount, 10)
                    : 0;
                apiOverage = apiOverageAmount
                    ? parseInt(apiOverageAmount, 10)
                    : 0;
                // Get detailed breakdown
                const pattern = `${this.USAGE_KEY_PREFIX}${userId}:${billingPeriod}:*`;
                const keys = await redis.keys(pattern);
                for (const key of keys) {
                    if (key.includes(':category:') ||
                        key.includes(':overage:'))
                        continue;
                    const count = await redis.get(key);
                    if (count) {
                        const actionTypeKey = key.split(':').pop();
                        const actionCostConfig = usage_types_1.ACTION_COSTS[actionTypeKey];
                        if (actionCostConfig) {
                            const numericCount = parseInt(count, 10);
                            byActionType[actionTypeKey] = {
                                count: numericCount,
                                cost: numericCount,
                                category: actionCostConfig.category,
                            };
                            const agent = actionTypeKey.split('_')[1] || 'other';
                            if (!byAgent[agent]) {
                                byAgent[agent] = { count: 0, cost: 0 };
                            }
                            byAgent[agent].count += numericCount;
                            byAgent[agent].cost += numericCount;
                        }
                    }
                }
            }
            else {
                // Fallback to DB
                const usageLogs = await client_1.prisma.usageLog.findMany({
                    where: { userId, billingPeriod },
                });
                for (const log of usageLogs) {
                    byActionType[log.actionType] = {
                        count: log.count,
                        cost: Number(log.costUsd || 0),
                        category: log.actionType.startsWith('ai_')
                            ? 'ai_action'
                            : 'api_call',
                    };
                    if (log.actionType.startsWith('ai_')) {
                        aiActions += log.count;
                    }
                    else {
                        apiCalls += log.count;
                    }
                    const agent = log.actionType.split('_')[1] || 'other';
                    if (!byAgent[agent]) {
                        byAgent[agent] = { count: 0, cost: 0 };
                    }
                    byAgent[agent].count += log.count;
                    byAgent[agent].cost += Number(log.costUsd || 0);
                }
            }
            // Historical data
            const historical = await this.getHistoricalUsage(userId);
            // Top actions
            const topActions = Object.entries(byActionType)
                .map(([actionTypeKey, data]) => ({
                actionType: actionTypeKey,
                count: data.count,
                cost: data.cost,
            }))
                .sort((a, b) => b.cost - a.cost)
                .slice(0, 10);
            // Period info
            const startDate = new Date();
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
            const endDate = this.getBillingPeriodEndDate();
            const daysRemaining = this.getDaysRemaining();
            const aiActionsLimit = limits.aiActions;
            const apiCallsLimit = limits.apiCalls;
            const aiPercentage = aiActionsLimit > 0
                ? (aiActions / aiActionsLimit) * 100
                : 0;
            const apiPercentage = apiCallsLimit > 0
                ? (apiCalls / apiCallsLimit) * 100
                : 0;
            const percentageUsed = Math.max(aiPercentage, apiPercentage);
            // Overage estimate
            const overageEstimate = aiOverage * limits.overagePricing.aiAction +
                apiOverage * limits.overagePricing.apiCall;
            return {
                currentPeriod: {
                    period: billingPeriod,
                    startDate,
                    endDate,
                    daysRemaining,
                    aiActionsUsed: aiActions,
                    aiActionsLimit,
                    apiCallsUsed: apiCalls,
                    apiCallsLimit,
                    percentageUsed,
                    isOverLimit: aiActions > aiActionsLimit ||
                        apiCalls > apiCallsLimit,
                    overageEstimate: overageEstimate > 0
                        ? overageEstimate
                        : undefined,
                },
                byActionType,
                byAgent,
                historical,
                topActions,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to get usage stats');
            throw error;
        }
    }
    /**
     * Get historical usage
     */
    static async getHistoricalUsage(userId, months = 6) {
        try {
            const currentPeriod = this.getCurrentBillingPeriod();
            const [year, month] = currentPeriod.split('-');
            const currentDate = new Date(parseInt(year), parseInt(month) - 1);
            const periods = [];
            for (let i = 0; i < months; i++) {
                const date = new Date(currentDate);
                date.setMonth(currentDate.getMonth() - i);
                periods.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
            }
            const usageLogs = await client_1.prisma.usageLog.groupBy({
                by: ['billingPeriod'],
                where: {
                    userId,
                    billingPeriod: { in: periods },
                },
                _sum: {
                    count: true,
                    costUsd: true,
                },
            });
            // Separate AI actions from API calls
            const aiUsageLogs = await client_1.prisma.usageLog.groupBy({
                by: ['billingPeriod'],
                where: {
                    userId,
                    billingPeriod: { in: periods },
                    actionType: { startsWith: 'ai_' },
                },
                _sum: { count: true },
            });
            const apiUsageLogs = await client_1.prisma.usageLog.groupBy({
                by: ['billingPeriod'],
                where: {
                    userId,
                    billingPeriod: { in: periods },
                    actionType: { startsWith: 'api_' },
                },
                _sum: { count: true },
            });
            const aiMap = new Map(aiUsageLogs.map((l) => [
                l.billingPeriod,
                l._sum.count || 0,
            ]));
            const apiMap = new Map(apiUsageLogs.map((l) => [
                l.billingPeriod,
                l._sum.count || 0,
            ]));
            const result = [];
            for (const period of periods.reverse()) {
                const periodData = usageLogs.find((log) => log.billingPeriod === period);
                result.push({
                    month: period,
                    aiActions: aiMap.get(period) || 0,
                    apiCalls: apiMap.get(period) || 0,
                    totalCost: Number(periodData?._sum.costUsd || 0),
                });
            }
            return result;
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to get historical usage');
            return [];
        }
    }
    /**
     * Get current usage (simplified)
     */
    static async getCurrentUsage(userId) {
        try {
            const billingPeriod = this.getCurrentBillingPeriod();
            if (this.isRedisAvailable()) {
                const redis = this.getRedis();
                const aiActionsKey = this.getCategoryKey(userId, 'ai_action', billingPeriod);
                const apiCallsKey = this.getCategoryKey(userId, 'api_call', billingPeriod);
                const [aiActions, apiCalls] = await Promise.all([
                    redis.get(aiActionsKey),
                    redis.get(apiCallsKey),
                ]);
                return {
                    aiActions: aiActions ? parseInt(aiActions, 10) : 0,
                    apiCalls: apiCalls ? parseInt(apiCalls, 10) : 0,
                };
            }
            // DB fallback
            const [aiUsage, apiUsage] = await Promise.all([
                client_1.prisma.usageLog.aggregate({
                    where: {
                        userId,
                        billingPeriod,
                        actionType: { startsWith: 'ai_' },
                    },
                    _sum: { count: true },
                }),
                client_1.prisma.usageLog.aggregate({
                    where: {
                        userId,
                        billingPeriod,
                        actionType: { startsWith: 'api_' },
                    },
                    _sum: { count: true },
                }),
            ]);
            return {
                aiActions: aiUsage._sum.count || 0,
                apiCalls: apiUsage._sum.count || 0,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to get current usage');
            return { aiActions: 0, apiCalls: 0 };
        }
    }
    // ============================================
    // Overage Tracking
    // ============================================
    /**
     * Get current overage charges
     */
    static async getCurrentOverage(userId) {
        try {
            const billingPeriod = this.getCurrentBillingPeriod();
            const limits = await this.getUserPlanLimits(userId);
            if (this.isRedisAvailable()) {
                const redis = this.getRedis();
                const [aiOverageAmount, apiOverageAmount, imageOverageAmount, videoOverageAmount,] = await Promise.all([
                    redis.get(this.getOverageKey(userId, 'ai_action', billingPeriod)),
                    redis.get(this.getOverageKey(userId, 'api_call', billingPeriod)),
                    redis.get(this.getImageOverageKey(userId, billingPeriod)),
                    redis.get(this.getVideoOverageKey(userId, billingPeriod)),
                ]);
                const aiOverage = aiOverageAmount
                    ? parseInt(aiOverageAmount, 10)
                    : 0;
                const apiOverage = apiOverageAmount
                    ? parseInt(apiOverageAmount, 10)
                    : 0;
                const imageOverage = imageOverageAmount
                    ? parseInt(imageOverageAmount, 10)
                    : 0;
                const videoOverage = videoOverageAmount
                    ? parseInt(videoOverageAmount, 10)
                    : 0;
                return {
                    aiOverages: aiOverage,
                    apiOverages: apiOverage,
                    aiOverageCost: aiOverage * limits.overagePricing.aiAction,
                    apiOverageCost: apiOverage * limits.overagePricing.apiCall,
                    totalOverageCost: aiOverage * limits.overagePricing.aiAction +
                        apiOverage * limits.overagePricing.apiCall +
                        imageOverage *
                            limits.overagePricing.imageGeneration +
                        videoOverage *
                            limits.overagePricing.videoGeneration,
                    imageOverageAmount: imageOverage,
                    imageOverageCost: imageOverage *
                        limits.overagePricing.imageGeneration,
                    videoOverageAmount: videoOverage,
                    videoOverageCost: videoOverage *
                        limits.overagePricing.videoGeneration,
                    planId: limits.planId,
                    overagePricing: limits.overagePricing,
                };
            }
            // DB fallback
            return {
                aiOverages: 0,
                apiOverages: 0,
                aiOverageCost: 0,
                apiOverageCost: 0,
                totalOverageCost: 0,
                planId: limits.planId,
                overagePricing: limits.overagePricing,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to get current overage');
            return {
                aiOverages: 0,
                apiOverages: 0,
                aiOverageCost: 0,
                apiOverageCost: 0,
                totalOverageCost: 0,
                planId: 'FREE',
                overagePricing: {
                    aiAction: 0,
                    apiCall: 0,
                    imageGeneration: 0,
                    videoGeneration: 0,
                },
            };
        }
    }
    // ============================================
    // ENHANCEMENT: Usage Alert Thresholds
    // ============================================
    /**
     * Get usage alert thresholds for notification
     */
    static async getUsageAlertThresholds(userId, warningThreshold = 80, criticalThreshold = 95) {
        const usage = await this.getCurrentUsage(userId);
        const limits = await this.getUserPlanLimits(userId);
        const aiPercentage = limits.aiActions > 0
            ? (usage.aiActions / limits.aiActions) * 100
            : 0;
        const apiPercentage = limits.apiCalls > 0
            ? (usage.apiCalls / limits.apiCalls) * 100
            : 0;
        const maxPercentage = Math.max(aiPercentage, apiPercentage);
        return {
            warning: warningThreshold,
            critical: criticalThreshold,
            overLimit: usage.aiActions > limits.aiActions ||
                usage.apiCalls > limits.apiCalls,
        };
    }
    // ============================================
    // Batch Operations
    // ============================================
    /**
     * Batch increment usage for multiple users
     */
    static async batchIncrementUsage(increments) {
        const results = [];
        for (const inc of increments) {
            try {
                const result = await this.incrementUsage(inc.userId, inc.actionType, inc.tokensUsed || 0);
                results.push({
                    userId: inc.userId,
                    success: result.success,
                    actionType: inc.actionType,
                    cost: result.cost,
                });
            }
            catch (error) {
                results.push({
                    userId: inc.userId,
                    success: false,
                    actionType: inc.actionType,
                    cost: 0,
                    error: error instanceof Error
                        ? error.message
                        : 'Unknown error',
                });
            }
        }
        return results;
    }
    // ============================================
    // Monthly Reset
    // ============================================
    /**
     * Reset all counters at billing cycle rollover
     */
    static async resetMonthlyCounters() {
        try {
            const billingPeriod = this.getCurrentBillingPeriod();
            if (this.isRedisAvailable()) {
                const redis = this.getRedis();
                const pattern = `${this.USAGE_KEY_PREFIX}*:${billingPeriod}:*`;
                const keys = await redis.keys(pattern);
                if (keys.length === 0) {
                    return { resetCount: 0, billingPeriod };
                }
                const deleted = await redis.del(...keys);
                logger_1.logger.info({ billingPeriod, deletedCount: deleted }, 'Monthly usage counters reset');
                return { resetCount: deleted, billingPeriod };
            }
            return { resetCount: 0, billingPeriod };
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to reset monthly counters');
            throw error;
        }
    }
    // ============================================
    // Stripe Usage Reporting
    // ============================================
    /**
     * Report usage to Stripe
     */
    static async reportStripeUsage(userId) {
        try {
            const user = await client_1.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    stripeCustomerId: true,
                    planId: true,
                },
            });
            if (!user?.stripeCustomerId) {
                return;
            }
            if (user.planId === 'FREE') {
                return;
            }
            const stats = await this.getUsageStats(userId);
            const overage = await this.getCurrentOverage(userId);
            const report = {
                userId,
                stripeCustomerId: user.stripeCustomerId,
                billingPeriod: this.getCurrentBillingPeriod(),
                aiActionsUsed: stats.currentPeriod.aiActionsUsed,
                apiCallsUsed: stats.currentPeriod.apiCallsUsed,
                timestamp: new Date(),
            };
            // Queue for async processing
            const { usageReportQueue } = await Promise.resolve().then(() => __importStar(require('../queues/usage-report.job')));
            await usageReportQueue.add('report-stripe-usage', {
                ...report,
                overage,
            });
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to report Stripe usage');
        }
    }
    /**
     * Batch report for all users
     */
    static async batchReportStripeUsage() {
        const users = await client_1.prisma.user.findMany({
            where: {
                planId: { not: 'FREE' },
                stripeCustomerId: { not: null },
                isActive: true,
            },
            select: { id: true },
        });
        let reported = 0;
        let failed = 0;
        for (const user of users) {
            try {
                await this.reportStripeUsage(user.id);
                reported++;
            }
            catch (error) {
                logger_1.logger.error({ error, userId: user.id }, 'Failed to report usage for user');
                failed++;
            }
        }
        logger_1.logger.info({ reported, failed }, 'Batch Stripe usage reporting completed');
        return { reported, failed };
    }
}
exports.UsageMeteringService = UsageMeteringService;
UsageMeteringService.redis = null;
UsageMeteringService.USAGE_KEY_PREFIX = 'usage:';
UsageMeteringService.OVERAGE_KEY_PREFIX = 'overage:';
UsageMeteringService.CACHE_TTL_SECONDS = 3600; // 1 hour
UsageMeteringService.SYNC_BATCH_SIZE = 100;
// ENHANCEMENT: Track failed increments for retry
UsageMeteringService.failedIncrements = [];
//# sourceMappingURL=usage-metering.service.js.map