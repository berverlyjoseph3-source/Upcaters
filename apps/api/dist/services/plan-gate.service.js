"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanGateService = void 0;
// enterprise-ai-agent-platform/apps/api/src/services/plan-gate.service.ts
const client_1 = require("../db/client");
const logger_1 = require("../utils/logger");
const usage_types_1 = require("../types/usage.types");
const usage_metering_service_1 = require("./usage-metering.service");
class PlanGateService {
    /**
     * Get user's current plan with caching
     * Now always returns numeric limits (no 'unlimited')
     */
    static async getUserPlan(userId) {
        // Check cache
        const cached = this.planCache.get(userId);
        if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL * 1000) {
            const planConfig = usage_types_1.PLAN_LIMITS_CONFIG[cached.planId] || usage_types_1.PLAN_LIMITS_CONFIG.FREE;
            const overageConfig = usage_types_1.OVERAGE_PRICING_CONFIG[cached.planId] || usage_types_1.OVERAGE_PRICING_CONFIG.FREE;
            return {
                planId: cached.planId,
                features: usage_types_1.FEATURE_ACCESS_MATRIX[cached.planId] || usage_types_1.FEATURE_ACCESS_MATRIX.FREE,
                limits: {
                    aiActions: planConfig.aiActions,
                    apiCalls: planConfig.apiCalls,
                    teamMembers: planConfig.teamMembers,
                    storageGB: planConfig.storageGB,
                },
                overagePricing: overageConfig,
            };
        }
        // Fetch from database
        const user = await client_1.prisma.user.findUnique({
            where: { id: userId },
            select: { planId: true },
        });
        const planId = user?.planId || 'FREE';
        const planConfig = usage_types_1.PLAN_LIMITS_CONFIG[planId] || usage_types_1.PLAN_LIMITS_CONFIG.FREE;
        const overageConfig = usage_types_1.OVERAGE_PRICING_CONFIG[planId] || usage_types_1.OVERAGE_PRICING_CONFIG.FREE;
        // Update cache
        this.planCache.set(userId, { planId, cachedAt: Date.now() });
        return {
            planId,
            features: usage_types_1.FEATURE_ACCESS_MATRIX[planId] || usage_types_1.FEATURE_ACCESS_MATRIX.FREE,
            limits: {
                aiActions: planConfig.aiActions,
                apiCalls: planConfig.apiCalls,
                teamMembers: planConfig.teamMembers,
                storageGB: planConfig.storageGB,
            },
            overagePricing: overageConfig,
        };
    }
    /**
     * Clear user's plan from cache (call after plan change)
     */
    static clearUserPlanCache(userId) {
        this.planCache.delete(userId);
        logger_1.logger.debug({ userId }, 'User plan cache cleared');
    }
    /**
     * Clear all plan caches (call after bulk plan changes)
     */
    static clearAllPlanCaches() {
        this.planCache.clear();
        logger_1.logger.info('All plan caches cleared');
    }
    /**
     * Check if user has access to a specific feature
     */
    static async checkFeatureAccess(userId, feature) {
        try {
            const { planId, features } = await this.getUserPlan(userId);
            const hasAccess = features[feature];
            // Determine required plan for this feature
            let requiredPlan;
            for (const [plan, access] of Object.entries(usage_types_1.FEATURE_ACCESS_MATRIX)) {
                if (access[feature] === true) {
                    requiredPlan = plan;
                    break;
                }
            }
            if (!hasAccess) {
                logger_1.logger.warn({ userId, planId, feature, requiredPlan }, 'Feature access denied by plan');
                return {
                    allowed: false,
                    currentPlan: planId,
                    requiredPlan: requiredPlan || 'PROFESSIONAL',
                    feature,
                    upgradeUrl: `${process.env.APP_URL}/billing/upgrade`,
                    error: `Feature "${feature}" is not available on your ${planId} plan. Please upgrade to ${requiredPlan || 'PROFESSIONAL'} or higher.`,
                };
            }
            return {
                allowed: true,
                currentPlan: planId,
                upgradeUrl: `${process.env.APP_URL}/billing/upgrade`,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId, feature }, 'Failed to check feature access');
            return {
                allowed: false,
                currentPlan: 'FREE',
                upgradeUrl: `${process.env.APP_URL}/billing/upgrade`,
                error: 'Failed to verify plan access',
            };
        }
    }
    /**
     * Check if user has reached usage limit for a specific category
     * Now supports overage awareness — never blocks, just warns
     */
    static async checkUsageLimit(userId, category, increment = 1) {
        try {
            const { planId, limits, overagePricing } = await this.getUserPlan(userId);
            const limit = category === 'ai_action' ? limits.aiActions : limits.apiCalls;
            const currentUsage = await usage_metering_service_1.UsageMeteringService.getCurrentUsage(userId);
            const used = category === 'ai_action' ? currentUsage.aiActions : currentUsage.apiCalls;
            const remaining = limit - used;
            const resetDate = usage_metering_service_1.UsageMeteringService.getBillingPeriodEndDate();
            const isOverLimit = used >= limit;
            const willExceedLimit = used + increment > limit;
            // Always allow — overage pricing handles excess
            // But warn the user
            if (isOverLimit || willExceedLimit) {
                const overageRate = category === 'ai_action'
                    ? overagePricing.aiAction
                    : overagePricing.apiCall;
                logger_1.logger.info({
                    userId,
                    planId,
                    category,
                    used,
                    limit,
                    overageRate,
                    isOverLimit
                }, 'User in overage territory');
                // Still allow the action but inform about overage
                return {
                    allowed: true,
                    currentPlan: planId,
                    upgradeUrl: `${process.env.APP_URL}/billing/upgrade`,
                    usage: {
                        used,
                        limit,
                        remaining: remaining > 0 ? remaining : 0,
                        resetDate,
                        overagePricing,
                        isOverLimit: true,
                    },
                    error: isOverLimit
                        ? `${category === 'ai_action' ? 'AI Actions' : 'API Calls'} limit reached. You are now in overage territory ($${overageRate.toFixed(3)}/${category === 'ai_action' ? 'action' : 'call'}).`
                        : `${category === 'ai_action' ? 'AI Actions' : 'API Calls'} limit approaching. Overage pricing will apply after ${limit} actions.`,
                };
            }
            return {
                allowed: true,
                currentPlan: planId,
                upgradeUrl: `${process.env.APP_URL}/billing/upgrade`,
                usage: {
                    used,
                    limit,
                    remaining,
                    resetDate,
                    overagePricing,
                },
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId, category }, 'Failed to check usage limit');
            return {
                allowed: true, // Allow on error to prevent blocking legitimate usage
                currentPlan: 'FREE',
                upgradeUrl: `${process.env.APP_URL}/billing/upgrade`,
                error: 'Failed to verify usage limits — proceeding with caution',
            };
        }
    }
    /**
     * Get the minimum plan required for a feature
     */
    static getRequiredPlanForFeature(feature) {
        for (const [plan, access] of Object.entries(usage_types_1.FEATURE_ACCESS_MATRIX)) {
            if (access[feature] === true) {
                return plan;
            }
        }
        return 'PROFESSIONAL';
    }
    /**
     * Get all features available for a plan
     */
    static getFeaturesForPlan(planId) {
        return usage_types_1.FEATURE_ACCESS_MATRIX[planId] || usage_types_1.FEATURE_ACCESS_MATRIX.FREE;
    }
    /**
     * Compare two plans to see if upgrade is needed
     */
    static isUpgradeNeeded(currentPlan, requiredPlan) {
        const planOrder = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM'];
        const currentIndex = planOrder.indexOf(currentPlan);
        const requiredIndex = planOrder.indexOf(requiredPlan);
        return currentIndex < requiredIndex;
    }
    /**
     * Get next plan tier for upgrade recommendation
     */
    static getNextPlanTier(currentPlan) {
        const planOrder = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
        const currentIndex = planOrder.indexOf(currentPlan);
        if (currentIndex === -1 || currentIndex === planOrder.length - 1) {
            return null;
        }
        return planOrder[currentIndex + 1];
    }
    /**
     * Get overage pricing for a specific plan
     */
    static getOveragePricing(planId) {
        return usage_types_1.OVERAGE_PRICING_CONFIG[planId] || usage_types_1.OVERAGE_PRICING_CONFIG.FREE;
    }
    /**
     * Calculate potential overage cost for a usage level
     */
    static calculateOverageCost(planId, aiActionsUsed, apiCallsUsed) {
        const limits = usage_types_1.PLAN_LIMITS_CONFIG[planId] || usage_types_1.PLAN_LIMITS_CONFIG.FREE;
        const pricing = this.getOveragePricing(planId);
        const aiOverage = Math.max(0, aiActionsUsed - limits.aiActions);
        const apiOverage = Math.max(0, apiCallsUsed - limits.apiCalls);
        return (aiOverage * pricing.aiAction) + (apiOverage * pricing.apiCall);
    }
    /**
     * Check multiple features at once
     */
    static async checkMultipleFeatures(userId, features) {
        const { planId } = await this.getUserPlan(userId);
        const missingFeatures = [];
        let highestRequiredPlan = 'FREE';
        for (const feature of features) {
            const hasAccess = usage_types_1.FEATURE_ACCESS_MATRIX[planId]?.[feature] || false;
            if (!hasAccess) {
                missingFeatures.push(feature);
                const requiredPlan = this.getRequiredPlanForFeature(feature);
                if (this.isUpgradeNeeded(highestRequiredPlan, requiredPlan)) {
                    highestRequiredPlan = requiredPlan;
                }
            }
        }
        return {
            allowed: missingFeatures.length === 0,
            missingFeatures,
            requiredPlan: highestRequiredPlan,
        };
    }
    /**
     * Get usage percentage for dashboard display
     * Now includes overage awareness
     */
    static async getUsagePercentage(userId) {
        const { limits } = await this.getUserPlan(userId);
        const currentUsage = await usage_metering_service_1.UsageMeteringService.getCurrentUsage(userId);
        const getColor = (percentage, isOverLimit) => {
            if (isOverLimit)
                return 'red';
            if (percentage >= 90)
                return 'red';
            if (percentage >= 70)
                return 'yellow';
            return 'green';
        };
        const aiActionsLimit = limits.aiActions;
        const apiCallsLimit = limits.apiCalls;
        const aiPercentage = aiActionsLimit > 0 ? (currentUsage.aiActions / aiActionsLimit) * 100 : 0;
        const apiPercentage = apiCallsLimit > 0 ? (currentUsage.apiCalls / apiCallsLimit) * 100 : 0;
        const aiIsOverLimit = currentUsage.aiActions > aiActionsLimit;
        const apiIsOverLimit = currentUsage.apiCalls > apiCallsLimit;
        return {
            aiActions: {
                used: currentUsage.aiActions,
                limit: aiActionsLimit,
                percentage: Math.min(aiPercentage, 100),
                color: getColor(aiPercentage, aiIsOverLimit),
                isOverLimit: aiIsOverLimit,
            },
            apiCalls: {
                used: currentUsage.apiCalls,
                limit: apiCallsLimit,
                percentage: Math.min(apiPercentage, 100),
                color: getColor(apiPercentage, apiIsOverLimit),
                isOverLimit: apiIsOverLimit,
            },
        };
    }
    /**
     * Check if user should be warned about approaching limits
     */
    static async shouldWarnAboutUsage(userId) {
        const usage = await this.getUsagePercentage(userId);
        const maxPercentage = Math.max(usage.aiActions.percentage, usage.apiCalls.percentage);
        if (usage.aiActions.isOverLimit || usage.apiCalls.isOverLimit) {
            const { overagePricing } = await this.getUserPlan(userId);
            return {
                shouldWarn: true,
                warningType: 'over_limit',
                message: `You have exceeded your plan limits. Overage charges apply: $${overagePricing.aiAction}/AI action, $${overagePricing.apiCall}/API call.`,
                usagePercentage: maxPercentage,
            };
        }
        if (maxPercentage >= 80) {
            return {
                shouldWarn: true,
                warningType: 'approaching',
                message: `You have used ${Math.round(maxPercentage)}% of your plan limits. Consider upgrading to avoid overage charges.`,
                usagePercentage: maxPercentage,
            };
        }
        return {
            shouldWarn: false,
            warningType: 'none',
            usagePercentage: maxPercentage,
            message: 'Usage is within normal limits.',
        };
    }
}
exports.PlanGateService = PlanGateService;
PlanGateService.CACHE_TTL = 300; // 5 minutes
PlanGateService.planCache = new Map();
//# sourceMappingURL=plan-gate.service.js.map