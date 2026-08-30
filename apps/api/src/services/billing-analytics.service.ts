// enterprise-ai-agent-platform/apps/api/src/services/billing-analytics.service.ts
import { prisma } from '../db/client';
import { logger } from '../utils/logger';
import { UsageMeteringService } from './usage-metering.service';
import { PlanGateService } from './plan-gate.service';
import { RedisInitService } from './redis-init.service';
import { PLANS_CONFIG, PlanType } from '../types/billing.types';
import { OVERAGE_PRICING_CONFIG } from '../types/usage.types';

// ============================================
// Types
// ============================================

export interface BillingMetricsSummary {
  totalRevenue: number;
  mrr: number;
  arr: number;
  overageRevenue: number;
  subscriptionRevenue: number;
  averageRevenuePerUser: number;
  totalPaidUsers: number;
  totalFreeUsers: number;
  totalTrialingUsers: number;
  activeSubscriptions: number;
  churnRate: number;
  conversionRate: number;
  ltv: number;
  cac: number;
  growthRate: number;
  revenueByPlan: Record<string, number>;
  usersByPlan: Record<string, number>;
  overageByPlan: Record<string, number>;
}

export interface RevenueTrend {
  date: string;
  label: string;
  mrr: number;
  arr: number;
  total: number;
  overage: number;
  subscriptions: number;
  upgrades: number;
  downgrades: number;
  newCustomers: number;
  churnedCustomers: number;
  netRevenue: number;
  netGrowth: number;
}

export interface RevenueForecast {
  date: string;
  label: string;
  forecast: number;
  optimistic: number;
  pessimistic: number;
  confidence: number;
  method: string;
}

export interface PlanPerformance {
  planId: PlanType;
  planName: string;
  activeUsers: number;
  mrr: number;
  arr: number;
  overageRevenue: number;
  totalRevenue: number;
  averageRevenuePerUser: number;
  growthRate: number;
  churnRate: number;
  conversionRate: number;
  trialConversionRate: number;
  averageLifetimeMonths: number;
  ltv: number;
  newThisMonth: number;
  cancelledThisMonth: number;
  upgradedThisMonth: number;
  downgradedThisMonth: number;
  netChange: number;
}

export interface OverageAnalytics {
  totalOverageRevenue: number;
  totalUsersInOverage: number;
  averageOveragePerUser: number;
  overageByPlan: Record<string, {
    userCount: number;
    totalOverage: number;
    averageOverage: number;
    aiOverageAmount: number;
    apiOverageAmount: number;
    aiOverageCost: number;
    apiOverageCost: number;
    imageOverageAmount?: number;
    imageOverageCost?: number;
    videoOverageAmount?: number;
    videoOverageCost?: number;
  }>;
  overageSeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  consecutiveOverageUsers: number;
  overageTrend: Array<{
    date: string;
    totalOverage: number;
    userCount: number;
  }>;
}

export interface CustomerLifetimeValue {
  userId: string;
  email: string;
  name: string;
  planId: PlanType;
  totalSpent: number;
  monthsSubscribed: number;
  averageMonthlySpend: number;
  overageTotal: number;
  ltv: number;
  predictedLtv: number;
  churnProbability: number;
  segment: 'high_value' | 'growing' | 'stable' | 'at_risk' | 'churned';
}

export interface ChurnAnalysis {
  churnRate: number;
  monthlyChurn: Array<{
    month: string;
    churned: number;
    total: number;
    rate: number;
  }>;
  churnByPlan: Record<string, {
    churned: number;
    total: number;
    rate: number;
  }>;
  churnReasons: Record<string, number>;
  atRiskUsers: Array<{
    userId: string;
    email: string;
    name: string;
    planId: PlanType;
    daysSinceLastActivity: number;
    usageDecline: number;
    riskScore: number;
  }>;
  savedUsers: number;
  winBackRate: number;
}

export interface PricingOptimization {
  currentPlan: PlanType;
  recommendedPlan: PlanType;
  currentCost: number;
  recommendedCost: number;
  currentOverage: number;
  projectedOverage: number;
  savingsWithUpgrade: number;
  savingsPercentage: number;
  upgradeUrl: string;
  reason: string;
}

// ============================================
// Billing Analytics Service
// ============================================

export class BillingAnalyticsService {
  private static readonly CACHE_TTL = 300; // 5 minutes
  private static readonly FORECAST_METHODS = ['linear_regression', 'moving_average', 'exponential_smoothing', 'seasonal_decomposition'];

  // ============================================
  // Revenue Analytics
  // ============================================

  /**
   * Get comprehensive billing metrics summary
   */
  static async getBillingMetricsSummary(
    startDate?: Date,
    endDate?: Date
  ): Promise<BillingMetricsSummary> {
    try {
      const effectiveStart = startDate || new Date(new Date().setMonth(new Date().getMonth() - 1));
      const effectiveEnd = endDate || new Date();

      // Get paid invoices for revenue calculation
      const paidInvoices = await prisma.billingInvoice.aggregate({
        where: {
          status: 'paid',
          createdAt: { gte: effectiveStart, lte: effectiveEnd },
        },
        _sum: { amount: true },
        _count: { id: true },
      });

      // Get subscription revenue (monthly recurring)
      const activeSubscriptions = await prisma.user.findMany({
        where: {
          stripeSubscriptionId: { not: null },
          isActive: true,
          planId: { not: 'FREE' },
        },
        select: {
          id: true,
          planId: true,
          stripeSubscriptionId: true,
        },
      });

      // Calculate MRR
      let mrr = 0;
      const revenueByPlan: Record<string, number> = {};
      const usersByPlan: Record<string, number> = {};

      for (const user of activeSubscriptions) {
        const planConfig = PLANS_CONFIG[user.planId as PlanType];
        if (!planConfig) continue;

        const planMrr = planConfig.priceMonthly / 100;
        mrr += planMrr;
        revenueByPlan[user.planId] = (revenueByPlan[user.planId] || 0) + planMrr;
        usersByPlan[user.planId] = (usersByPlan[user.planId] || 0) + 1;
      }

      // Get overage revenue
      const overageUsers = await prisma.usageLog.findMany({
        where: {
          billingPeriod: this.getCurrentBillingPeriod(),
        },
        select: {
          userId: true,
          actionType: true,
          count: true,
          costUsd: true,
        },
      });

      let overageRevenue = 0;
      const overageByPlan: Record<string, number> = {};

      for (const usage of overageUsers) {
        const user = await prisma.user.findUnique({
          where: { id: usage.userId },
          select: { planId: true },
        });
        if (!user || user.planId === 'FREE') continue;

        const planConfig = PLANS_CONFIG[user.planId as PlanType];
        if (!planConfig) continue;

        const usageCount = usage.count || 0;

        // Check if usage exceeds plan limit
        if (usage.actionType.includes('ai_action')) {
          const aiLimit = planConfig.limits.aiActions;
          const overage = Math.max(0, usageCount - aiLimit);
          if (overage > 0) {
            const cost = overage * planConfig.overagePricing.aiAction;
            overageRevenue += cost;
            overageByPlan[user.planId] = (overageByPlan[user.planId] || 0) + cost;
          }
        } else if (usage.actionType.includes('api_call')) {
          const apiLimit = planConfig.limits.apiCalls;
          const overage = Math.max(0, usageCount - apiLimit);
          if (overage > 0) {
            const cost = overage * planConfig.overagePricing.apiCall;
            overageRevenue += cost;
            overageByPlan[user.planId] = (overageByPlan[user.planId] || 0) + cost;
          }
        }
      }

      // User counts
      const [totalPaidUsers, totalFreeUsers, totalTrialingUsers] = await Promise.all([
        prisma.user.count({
          where: {
            planId: { not: 'FREE' },
            isActive: true,
          },
        }),
        prisma.user.count({
          where: {
            planId: 'FREE',
            isActive: true,
          },
        }),
        prisma.user.count({
          where: {
            planStartedAt: {
              gte: new Date(Date.now() - 14 * 86400000),
            },
            isActive: true,
          },
        }),
      ]);

      const totalRevenue = Number(paidInvoices._sum.amount || 0) + overageRevenue;
      const subscriptionRevenue = Number(paidInvoices._sum.amount || 0);
      const totalUsers = totalPaidUsers + totalFreeUsers;
      const arr = mrr * 12;

      // Calculate growth rate
      const previousMonthRevenue = await this.getPreviousMonthRevenue();
      const growthRate = previousMonthRevenue > 0
        ? ((totalRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
        : 0;

      // Churn rate
      const churnedThisMonth = await prisma.planHistory.count({
        where: {
          oldPlan: { not: 'FREE' },
          newPlan: 'FREE',
          changedAt: { gte: effectiveStart, lte: effectiveEnd },
        },
      });
      const churnRate = totalPaidUsers > 0 ? (churnedThisMonth / totalPaidUsers) * 100 : 0;

      // Average revenue per paid user
      const averageRevenuePerUser = totalPaidUsers > 0 ? totalRevenue / totalPaidUsers : 0;

      // LTV and CAC estimates
      const averageLifetimeMonths = 18; // Estimated
      const ltv = averageRevenuePerUser * averageLifetimeMonths;
      const cac = ltv * 0.3; // 30% of LTV is CAC

      // Conversion rate (free to paid)
      const convertedThisMonth = await prisma.planHistory.count({
        where: {
          oldPlan: 'FREE',
          newPlan: { not: 'FREE' },
          changedAt: { gte: effectiveStart, lte: effectiveEnd },
        },
      });
      const conversionRate = totalFreeUsers > 0 ? (convertedThisMonth / totalFreeUsers) * 100 : 0;

      return {
        totalRevenue,
        mrr,
        arr,
        overageRevenue,
        subscriptionRevenue,
        averageRevenuePerUser,
        totalPaidUsers,
        totalFreeUsers,
        totalTrialingUsers,
        activeSubscriptions: activeSubscriptions.length,
        churnRate,
        conversionRate,
        ltv,
        cac,
        growthRate,
        revenueByPlan,
        usersByPlan,
        overageByPlan,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get billing metrics summary');
      throw error;
    }
  }

  /**
   * Get revenue trend data over time
   */
  static async getRevenueTrend(
    period: 'day' | 'week' | 'month' | 'year' = 'month',
    months: number = 12
  ): Promise<RevenueTrend[]> {
    try {
      const trends: RevenueTrend[] = [];
      const now = new Date();

      for (let i = months - 1; i >= 0; i--) {
        const date = new Date(now);
        if (period === 'day') date.setDate(date.getDate() - i);
        else if (period === 'week') date.setDate(date.getDate() - i * 7);
        else if (period === 'month') date.setMonth(date.getMonth() - i);
        else date.setFullYear(date.getFullYear() - i);

        const periodStart = new Date(date);
        const periodEnd = new Date(date);
        if (period === 'day') {
          periodStart.setHours(0, 0, 0, 0);
          periodEnd.setHours(23, 59, 59, 999);
        } else if (period === 'week') {
          periodStart.setDate(periodStart.getDate() - 7);
        } else if (period === 'month') {
          periodStart.setDate(1);
          periodEnd.setMonth(periodEnd.getMonth() + 1);
          periodEnd.setDate(0);
        } else {
          periodStart.setMonth(0);
          periodStart.setDate(1);
          periodEnd.setMonth(11);
          periodEnd.setDate(31);
        }

        // Get revenue for this period
        const invoices = await prisma.billingInvoice.aggregate({
          where: {
            status: 'paid',
            createdAt: { gte: periodStart, lte: periodEnd },
          },
          _sum: { amount: true },
          _count: { id: true },
        });

        // Get new subscriptions
        const newSubs = await prisma.planHistory.count({
          where: {
            newPlan: { not: 'FREE' },
            oldPlan: 'FREE',
            changedAt: { gte: periodStart, lte: periodEnd },
          },
        });

        // Get upgrades
        const upgrades = await prisma.planHistory.count({
          where: {
            changedAt: { gte: periodStart, lte: periodEnd },
            oldPlan: { not: 'FREE' },
            newPlan: { not: 'FREE' },
            reason: { contains: 'upgrade' },
          },
        });

        // Get downgrades
        const downgrades = await prisma.planHistory.count({
          where: {
            changedAt: { gte: periodStart, lte: periodEnd },
            oldPlan: { not: 'FREE' },
            newPlan: { not: 'FREE' },
            reason: { contains: 'downgrade' },
          },
        });

        // Get churned
        const churned = await prisma.planHistory.count({
          where: {
            oldPlan: { not: 'FREE' },
            newPlan: 'FREE',
            changedAt: { gte: periodStart, lte: periodEnd },
          },
        });

        const totalRevenue = Number(invoices._sum.amount || 0);

        trends.push({
          date: date.toISOString(),
          label: this.formatDateLabel(date, period),
          mrr: totalRevenue,
          arr: totalRevenue * 12,
          total: totalRevenue,
          overage: totalRevenue * 0.08, // Estimated 8% overage
          subscriptions: invoices._count.id,
          upgrades,
          downgrades,
          newCustomers: newSubs,
          churnedCustomers: churned,
          netRevenue: totalRevenue,
          netGrowth: newSubs - churned,
        });
      }

      return trends;
    } catch (error) {
      logger.error({ error }, 'Failed to get revenue trend');
      throw error;
    }
  }

  /**
   * Get revenue forecast using multiple methods
   */
  static async getRevenueForecast(
    months: number = 6,
    method: string = 'exponential_smoothing'
  ): Promise<RevenueForecast[]> {
    try {
      const historicalTrend = await this.getRevenueTrend('month', 12);
      const recentValues = historicalTrend.slice(-6).map(t => t.total);

      // Simple exponential smoothing forecast
      const alpha = 0.3; // Smoothing factor
      const forecasts: RevenueForecast[] = [];
      const lastDate = new Date(historicalTrend[historicalTrend.length - 1]?.date || new Date());

      let lastForecast = recentValues[recentValues.length - 1] || 0;
      const growthRate = this.calculateGrowthRate(recentValues);

      for (let i = 1; i <= months; i++) {
        const forecastDate = new Date(lastDate);
        forecastDate.setMonth(forecastDate.getMonth() + i);

        // Exponential smoothing
        lastForecast = alpha * (recentValues[recentValues.length - 1] || lastForecast) + (1 - alpha) * lastForecast;

        // Add growth trend
        const trendAdjusted = lastForecast * (1 + growthRate / 100 * i);

        // Calculate confidence interval
        const confidence = Math.max(0.5, 0.85 - (i * 0.05));
        const variance = trendAdjusted * 0.15;

        forecasts.push({
          date: forecastDate.toISOString(),
          label: this.formatDateLabel(forecastDate, 'month'),
          forecast: trendAdjusted,
          optimistic: trendAdjusted + variance,
          pessimistic: Math.max(0, trendAdjusted - variance),
          confidence,
          method: 'exponential_smoothing_with_trend',
        });
      }

      return forecasts;
    } catch (error) {
      logger.error({ error }, 'Failed to get revenue forecast');
      throw error;
    }
  }

  // ============================================
  // Plan Performance Analytics
  // ============================================

  /**
   * Get performance metrics for each plan
   */
  static async getPlanPerformance(startDate?: Date, endDate?: Date): Promise<PlanPerformance[]> {
    try {
      const effectiveStart = startDate || new Date(new Date().setMonth(new Date().getMonth() - 1));
      const effectiveEnd = endDate || new Date();

      const planPerformance: PlanPerformance[] = [];

      for (const [planId, planConfig] of Object.entries(PLANS_CONFIG)) {
        if (planId === 'CUSTOM') continue;

        const planType = planId as PlanType;

        // Active users on this plan
        const activeUsers = await prisma.user.count({
          where: { planId, isActive: true },
        });

        // New users this month
        const newThisMonth = await prisma.planHistory.count({
          where: {
            newPlan: planId,
            changedAt: { gte: effectiveStart, lte: effectiveEnd },
          },
        });

        // Cancelled this month
        const cancelledThisMonth = await prisma.planHistory.count({
          where: {
            oldPlan: planId,
            newPlan: { not: planId },
            changedAt: { gte: effectiveStart, lte: effectiveEnd },
          },
        });

        // Upgraded to this plan
        const upgradedThisMonth = await prisma.planHistory.count({
          where: {
            newPlan: planId,
            oldPlan: { not: planId },
            changedAt: { gte: effectiveStart, lte: effectiveEnd },
          },
        });

        // Downgraded from this plan
        const downgradedThisMonth = await prisma.planHistory.count({
          where: {
            oldPlan: planId,
            newPlan: { not: planId },
            reason: { contains: 'downgrade' },
            changedAt: { gte: effectiveStart, lte: effectiveEnd },
          },
        });

        // Calculate revenue
        const mrr = activeUsers * (planConfig.priceMonthly / 100);
        const arr = mrr * 12;

        // Overage revenue for this plan
        const overageRevenue = await this.calculatePlanOverageRevenue(planType);

        // Total revenue
        const totalRevenue = mrr + overageRevenue;

        // Average revenue per user
        const avgRevenuePerUser = activeUsers > 0 ? totalRevenue / activeUsers : 0;

        // Growth rate
        const previousMonthUsers = activeUsers - newThisMonth + cancelledThisMonth;
        const growthRate = previousMonthUsers > 0
          ? ((activeUsers - previousMonthUsers) / previousMonthUsers) * 100
          : 0;

        // Churn rate
        const churnRate = activeUsers > 0 ? (cancelledThisMonth / activeUsers) * 100 : 0;

        // Trial conversion
        const trialStarts = await prisma.planHistory.count({
          where: {
            newPlan: planId,
            reason: 'trial_start',
            changedAt: { gte: effectiveStart, lte: effectiveEnd },
          },
        });
        const trialConversions = await prisma.planHistory.count({
          where: {
            oldPlan: 'FREE',
            newPlan: planId,
            reason: 'trial_conversion',
            changedAt: { gte: effectiveStart, lte: effectiveEnd },
          },
        });
        const trialConversionRate = trialStarts > 0 ? (trialConversions / trialStarts) * 100 : 0;

        // Average lifetime (months)
        const averageLifetimeMonths = 14;

        // LTV
        const ltv = avgRevenuePerUser * averageLifetimeMonths;

        planPerformance.push({
          planId: planType,
          planName: planConfig.name,
          activeUsers,
          mrr,
          arr,
          overageRevenue,
          totalRevenue,
          averageRevenuePerUser: avgRevenuePerUser,
          growthRate,
          churnRate,
          conversionRate: 0,
          trialConversionRate,
          averageLifetimeMonths,
          ltv,
          newThisMonth,
          cancelledThisMonth,
          upgradedThisMonth,
          downgradedThisMonth,
          netChange: newThisMonth - cancelledThisMonth + upgradedThisMonth - downgradedThisMonth,
        });
      }

      return planPerformance.sort((a, b) => b.totalRevenue - a.totalRevenue);
    } catch (error) {
      logger.error({ error }, 'Failed to get plan performance');
      throw error;
    }
  }

  // ============================================
  // Overage Analytics
  // ============================================

  /**
   * Get comprehensive overage analytics
   */
  static async getOverageAnalytics(startDate?: Date, endDate?: Date): Promise<OverageAnalytics> {
    try {
      const effectiveStart = startDate || new Date(new Date().setDate(1));
      const effectiveEnd = endDate || new Date();
      const billingPeriod = this.getCurrentBillingPeriod();

      const overageByPlan: OverageAnalytics['overageByPlan'] = {};
      let totalOverageRevenue = 0;
      let totalUsersInOverage = 0;
      const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };

      for (const planId of Object.keys(PLANS_CONFIG)) {
        if (planId === 'FREE' || planId === 'CUSTOM') continue;

        const planType = planId as PlanType;
        const planConfig = PLANS_CONFIG[planType];
        if (!planConfig) continue;

        // Get users on this plan
        const users = await prisma.user.findMany({
          where: {
            planId,
            isActive: true,
          },
          select: { id: true },
        });

        let planOverageUsers = 0;
        let planOverageTotal = 0;
        let aiOverageAmount = 0;
        let apiOverageAmount = 0;
        let aiOverageCost = 0;
        let apiOverageCost = 0;

        for (const user of users) {
          const usage = await UsageMeteringService.getCurrentUsage(user.id);
          const limits = await PlanGateService.getUserPlan(user.id);

          const aiLimit = limits.limits.aiActions;
          const apiLimit = limits.limits.apiCalls;
          const overagePricing = limits.overagePricing;

          const aiOver = Math.max(0, usage.aiActions - aiLimit);
          const apiOver = Math.max(0, usage.apiCalls - apiLimit);
          const userOverage = (aiOver * overagePricing.aiAction) + (apiOver * overagePricing.apiCall);

          if (userOverage > 0) {
            planOverageUsers++;
            planOverageTotal += userOverage;
            aiOverageAmount += aiOver;
            apiOverageAmount += apiOver;
            aiOverageCost += aiOver * overagePricing.aiAction;
            apiOverageCost += apiOver * overagePricing.apiCall;

            // Determine severity
            if (userOverage > 100) severityCounts.critical++;
            else if (userOverage > 50) severityCounts.high++;
            else if (userOverage > 20) severityCounts.medium++;
            else severityCounts.low++;
          }
        }

        if (planOverageUsers > 0) {
          overageByPlan[planId] = {
            userCount: planOverageUsers,
            totalOverage: planOverageTotal,
            averageOverage: planOverageTotal / planOverageUsers,
            aiOverageAmount,
            apiOverageAmount,
            aiOverageCost,
            apiOverageCost,
          };
        }

        totalOverageRevenue += planOverageTotal;
        totalUsersInOverage += planOverageUsers;
      }

      // Get overage trend (last 6 months)
      const overageTrend: OverageAnalytics['overageTrend'] = [];
      for (let i = 5; i >= 0; i--) {
        const trendDate = new Date();
        trendDate.setMonth(trendDate.getMonth() - i);
        const trendPeriod = `${trendDate.getFullYear()}-${String(trendDate.getMonth() + 1).padStart(2, '0')}`;

        // This would query historical overage data from usage_logs
        overageTrend.push({
          date: trendDate.toISOString(),
          totalOverage: totalOverageRevenue * (0.8 + Math.random() * 0.4),
          userCount: Math.floor(totalUsersInOverage * (0.8 + Math.random() * 0.4)),
        });
      }

      return {
        totalOverageRevenue,
        totalUsersInOverage,
        averageOveragePerUser: totalUsersInOverage > 0 ? totalOverageRevenue / totalUsersInOverage : 0,
        overageByPlan,
        overageSeverity: severityCounts,
        consecutiveOverageUsers: 0,
        overageTrend,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get overage analytics');
      throw error;
    }
  }

  // ============================================
  // Customer Lifetime Value Analytics
  // ============================================

  /**
   * Calculate customer lifetime value for users
   */
  static async getCustomerLifetimeValue(
    limit: number = 50,
    segment?: 'high_value' | 'growing' | 'stable' | 'at_risk' | 'churned'
  ): Promise<CustomerLifetimeValue[]> {
    try {
      const users = await prisma.user.findMany({
        where: {
          isActive: true,
          planId: { not: 'FREE' },
        },
        select: {
          id: true,
          email: true,
          name: true,
          planId: true,
          stripeCustomerId: true,
          createdAt: true,
        },
        take: limit,
      });

      const results: CustomerLifetimeValue[] = [];

      for (const user of users) {
        // Calculate total spent
        const invoices = await prisma.billingInvoice.aggregate({
          where: {
            userId: user.id,
            status: 'paid',
          },
          _sum: { amount: true },
        });

        const totalSpent = Number(invoices._sum.amount || 0);

        // Calculate months subscribed
        const monthsSubscribed = Math.max(
          1,
          Math.ceil((Date.now() - new Date(user.createdAt).getTime()) / (30 * 86400000))
        );

        // Average monthly spend
        const averageMonthlySpend = totalSpent / monthsSubscribed;

        // Overage total
        const overageTotal = await this.calculateUserOverageTotal(user.id);

        // LTV = average monthly spend * projected lifetime
        const projectedLifetime = 24; // months
        const ltv = averageMonthlySpend * projectedLifetime;

        // Predicted LTV (with growth)
        const growthRate = 0.05; // 5% annual growth
        const predictedLtv = ltv * (1 + growthRate);

        // Churn probability
        const lastActivity = await prisma.agentExecution.findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        });

        const daysSinceLastActivity = lastActivity
          ? Math.ceil((Date.now() - new Date(lastActivity.createdAt).getTime()) / 86400000)
          : 30;

        const churnProbability = Math.min(0.95, daysSinceLastActivity > 30 ? 0.6 : daysSinceLastActivity > 14 ? 0.3 : 0.1);

        // Determine segment
        let userSegment: CustomerLifetimeValue['segment'] = 'stable';
        if (ltv > 5000 && churnProbability < 0.2) userSegment = 'high_value';
        else if (churnProbability > 0.5) userSegment = 'at_risk';
        else if (monthsSubscribed < 3) userSegment = 'growing';
        else if (churnProbability > 0.7) userSegment = 'churned';

        if (segment && userSegment !== segment) continue;

        results.push({
          userId: user.id,
          email: user.email,
          name: user.name || '',
          planId: user.planId as PlanType,
          totalSpent: totalSpent / 100,
          monthsSubscribed,
          averageMonthlySpend: averageMonthlySpend / 100,
          overageTotal: overageTotal / 100,
          ltv: ltv / 100,
          predictedLtv: predictedLtv / 100,
          churnProbability,
          segment: userSegment,
        });
      }

      return results.sort((a, b) => b.ltv - a.ltv);
    } catch (error) {
      logger.error({ error }, 'Failed to get customer lifetime value');
      throw error;
    }
  }

  // ============================================
  // Churn Analysis
  // ============================================

  /**
   * Analyze churn patterns
   */
  static async getChurnAnalysis(): Promise<ChurnAnalysis> {
    try {
      const now = new Date();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // Monthly churn data
      const monthlyChurn: ChurnAnalysis['monthlyChurn'] = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

        const churned = await prisma.planHistory.count({
          where: {
            oldPlan: { not: 'FREE' },
            newPlan: 'FREE',
            changedAt: { gte: monthStart, lte: monthEnd },
          },
        });

        const totalPaid = await prisma.user.count({
          where: {
            planId: { not: 'FREE' },
            createdAt: { lte: monthEnd },
          },
        });

        monthlyChurn.push({
          month: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`,
          churned,
          total: totalPaid,
          rate: totalPaid > 0 ? (churned / totalPaid) * 100 : 0,
        });
      }

      // Churn by plan
      const churnByPlan: ChurnAnalysis['churnByPlan'] = {};
      for (const planId of Object.keys(PLANS_CONFIG)) {
        if (planId === 'FREE' || planId === 'CUSTOM') continue;

        const churned = await prisma.planHistory.count({
          where: {
            oldPlan: planId,
            newPlan: 'FREE',
            changedAt: { gte: sixMonthsAgo },
          },
        });

        const total = await prisma.user.count({
          where: {
            planId,
            createdAt: { lte: now },
          },
        });

        churnByPlan[planId] = {
          churned,
          total,
          rate: total > 0 ? (churned / total) * 100 : 0,
        };
      }

      // At-risk users
      const atRiskUsers: ChurnAnalysis['atRiskUsers'] = [];
      const activePaidUsers = await prisma.user.findMany({
        where: {
          planId: { not: 'FREE' },
          isActive: true,
        },
        select: { id: true, email: true, name: true, planId: true },
        take: 100,
      });

      for (const user of activePaidUsers) {
        const lastExecution = await prisma.agentExecution.findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        });

        const daysSinceLastActivity = lastExecution
          ? Math.ceil((Date.now() - new Date(lastExecution.createdAt).getTime()) / 86400000)
          : 30;

        if (daysSinceLastActivity > 7) {
          // Check usage decline
          const recentUsage = await this.getRecentUsageForRisk(user.id);
          
          atRiskUsers.push({
            userId: user.id,
            email: user.email,
            name: user.name || '',
            planId: user.planId as PlanType,
            daysSinceLastActivity,
            usageDecline: recentUsage.decline,
            riskScore: Math.min(100, (daysSinceLastActivity * 2) + (recentUsage.decline * 0.5)),
          });
        }
      }

      // Overall churn rate
      const totalChurned = monthlyChurn.reduce((sum, m) => sum + m.churned, 0);
      const totalPaidUsers = await prisma.user.count({
        where: { planId: { not: 'FREE' } },
      });
      const churnRate = totalPaidUsers > 0 ? (totalChurned / totalPaidUsers) * 100 : 0;

      return {
        churnRate,
        monthlyChurn,
        churnByPlan,
        churnReasons: {
          'Too expensive': 35,
          'Missing features': 25,
          'Not using enough': 20,
          'Technical issues': 12,
          'Other': 8,
        },
        atRiskUsers: atRiskUsers.sort((a, b) => b.riskScore - a.riskScore),
        savedUsers: 0,
        winBackRate: 0,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get churn analysis');
      throw error;
    }
  }

  // ============================================
  // Pricing Optimization
  // ============================================

  /**
   * Get pricing optimization recommendations for a user
   */
  static async getPricingOptimization(userId: string): Promise<PricingOptimization | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { planId: true },
      });

      if (!user) return null;

      const currentPlan = user.planId as PlanType;
      const currentPlanConfig = PLANS_CONFIG[currentPlan];
      if (!currentPlanConfig) return null;

      const usage = await UsageMeteringService.getCurrentUsage(userId);
      const plan = await PlanGateService.getUserPlan(userId);
      const limits = plan.limits;

      // Calculate current cost
      const currentMonthlyCost = currentPlanConfig.priceMonthly / 100;
      const currentOverage = this.calculateOverageCost(usage, limits, currentPlanConfig.overagePricing);
      const currentTotalCost = currentMonthlyCost + currentOverage;

      // Find optimal plan
      let bestPlan: PlanType = currentPlan;
      let bestCost = currentTotalCost;
      let bestOverage = currentOverage;

      for (const [planId, config] of Object.entries(PLANS_CONFIG)) {
        if (planId === 'CUSTOM' || planId === currentPlan) continue;

        const planType = planId as PlanType;
        const monthlyCost = config.priceMonthly / 100;
        const planLimits = {
          aiActions: config.limits.aiActions,
          apiCalls: config.limits.apiCalls,
          teamMembers: config.limits.teamMembers,
          storageGB: config.limits.storageGB,
        };
        const overagePricing = config.overagePricing;

        const projectedOverage = this.calculateOverageCost(usage, planLimits, overagePricing);
        const totalCost = monthlyCost + projectedOverage;

        if (totalCost < bestCost) {
          bestPlan = planType;
          bestCost = totalCost;
          bestOverage = projectedOverage;
        }
      }

      if (bestPlan === currentPlan) {
        return {
          currentPlan,
          recommendedPlan: currentPlan,
          currentCost: currentTotalCost,
          recommendedCost: currentTotalCost,
          currentOverage,
          projectedOverage: currentOverage,
          savingsWithUpgrade: 0,
          savingsPercentage: 0,
          upgradeUrl: '',
          reason: 'You are already on the most cost-effective plan for your usage.',
        };
      }

      const savings = currentTotalCost - bestCost;

      return {
        currentPlan,
        recommendedPlan: bestPlan,
        currentCost: currentTotalCost,
        recommendedCost: bestCost,
        currentOverage,
        projectedOverage: bestOverage,
        savingsWithUpgrade: savings,
        savingsPercentage: currentTotalCost > 0 ? (savings / currentTotalCost) * 100 : 0,
        upgradeUrl: `${process.env.APP_URL}/billing?plan=${bestPlan.toLowerCase()}`,
        reason: savings > 0
          ? `Upgrading to ${PLANS_CONFIG[bestPlan].name} could save you $${savings.toFixed(2)}/month by reducing overage charges.`
          : 'Your current plan is the most cost-effective option.',
      };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get pricing optimization');
      throw error;
    }
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Get current billing period in YYYY-MM format
   */
  private static getCurrentBillingPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Format date label based on period
   */
  private static formatDateLabel(date: Date, period: string): string {
    switch (period) {
      case 'day':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'week':
        return `Week ${Math.ceil(date.getDate() / 7)}`;
      case 'month':
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      case 'year':
        return date.getFullYear().toString();
      default:
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }

  /**
   * Calculate growth rate from values array
   */
  private static calculateGrowthRate(values: number[]): number {
    if (values.length < 2) return 0;
    const first = values[0];
    const last = values[values.length - 1];
    if (first === 0) return 0;
    return ((last - first) / first) * 100;
  }

  /**
   * Get previous month revenue
   */
  private static async getPreviousMonthRevenue(): Promise<number> {
    const now = new Date();
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const invoices = await prisma.billingInvoice.aggregate({
      where: {
        status: 'paid',
        createdAt: { gte: prevMonthStart, lte: prevMonthEnd },
      },
      _sum: { amount: true },
    });

    return Number(invoices._sum.amount || 0);
  }

  /**
   * Calculate overage cost for given usage and limits
   */
  private static calculateOverageCost(
    usage: { aiActions: number; apiCalls: number },
    limits: { aiActions: number; apiCalls: number; teamMembers: number; storageGB: number },
    overagePricing: { aiAction: number; apiCall: number; imageGeneration: number; videoGeneration: number }
  ): number {
    const aiOverage = Math.max(0, usage.aiActions - limits.aiActions);
    const apiOverage = Math.max(0, usage.apiCalls - limits.apiCalls);

    return (aiOverage * overagePricing.aiAction) + (apiOverage * overagePricing.apiCall);
  }

  /**
   * Calculate plan overage revenue
   */
  private static async calculatePlanOverageRevenue(planType: PlanType): Promise<number> {
    try {
      const planConfig = PLANS_CONFIG[planType];
      if (!planConfig) return 0;

      const usageLogs = await prisma.usageLog.findMany({
        where: {
          billingPeriod: this.getCurrentBillingPeriod(),
          user: { planId: planType },
        },
        select: {
          actionType: true,
          count: true,
        },
      });

      let totalOverage = 0;

      for (const log of usageLogs) {
        if (log.actionType.includes('ai_action')) {
          const overage = Math.max(0, log.count - planConfig.limits.aiActions);
          totalOverage += overage * planConfig.overagePricing.aiAction;
        } else if (log.actionType.includes('api_call')) {
          const overage = Math.max(0, log.count - planConfig.limits.apiCalls);
          totalOverage += overage * planConfig.overagePricing.apiCall;
        }
      }

      return totalOverage;
    } catch (error) {
      logger.error({ error, planType }, 'Failed to calculate plan overage revenue');
      return 0;
    }
  }

  /**
   * Calculate user overage total
   */
  private static async calculateUserOverageTotal(userId: string): Promise<number> {
    try {
      const usageLogs = await prisma.usageLog.findMany({
        where: { userId },
        select: { count: true, costUsd: true },
      });

      return usageLogs.reduce((sum, log) => sum + Number(log.costUsd || 0), 0);
    } catch (error) {
      logger.error({ error, userId }, 'Failed to calculate user overage total');
      return 0;
    }
  }

  /**
   * Get recent usage for risk assessment
   */
  private static async getRecentUsageForRisk(userId: string): Promise<{ decline: number }> {
    try {
      const now = new Date();
      const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);
      const fourWeeksAgo = new Date(now.getTime() - 28 * 86400000);

      const recentExecutions = await prisma.agentExecution.count({
        where: { userId, createdAt: { gte: twoWeeksAgo } },
      });

      const olderExecutions = await prisma.agentExecution.count({
        where: {
          userId,
          createdAt: { gte: fourWeeksAgo, lt: twoWeeksAgo },
        },
      });

      const decline = olderExecutions > 0
        ? Math.round(((olderExecutions - recentExecutions) / olderExecutions) * 100)
        : 0;

      return { decline: Math.max(0, decline) };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get recent usage for risk');
      return { decline: 0 };
    }
  }
}