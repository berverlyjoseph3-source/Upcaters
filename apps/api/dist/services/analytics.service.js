"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
// enterprise-ai-agent-platform/apps/api/src/services/analytics.service.ts
const client_1 = require("../db/client");
const date_fns_1 = require("date-fns");
class AnalyticsService {
    /**
     * Get complete analytics data
     */
    static async getAnalytics(userId, startDate, endDate, agentType, actionType, comparison) {
        const effectiveStart = startDate || (0, date_fns_1.subDays)(new Date(), 30);
        const effectiveEnd = endDate || new Date();
        const [summary, dailyUsage, byAgent, byAction, costBreakdown, forecast, topActions] = await Promise.all([
            this.getUsageSummary(userId, effectiveStart, effectiveEnd, comparison),
            this.getDailyUsage(userId, effectiveStart, effectiveEnd),
            this.getUsageByAgent(userId, effectiveStart, effectiveEnd),
            this.getUsageByAction(userId, effectiveStart, effectiveEnd),
            this.getCostBreakdown(userId, effectiveStart, effectiveEnd),
            this.getForecast(userId, effectiveStart, effectiveEnd),
            this.getTopActions(userId, effectiveStart, effectiveEnd),
        ]);
        return {
            summary,
            dailyUsage,
            byAgent,
            byAction,
            costBreakdown,
            forecast,
            topActions,
        };
    }
    /**
     * Get usage summary with comparison
     */
    static async getUsageSummary(userId, startDate, endDate, comparison) {
        // Get current period usage
        const currentUsage = await client_1.prisma.usageLog.aggregate({
            where: {
                userId,
                updatedAt: { gte: startDate, lte: endDate },
            },
            _sum: {
                count: true,
                tokensUsed: true,
                costUsd: true,
            },
        });
        // Calculate previous period for comparison
        let previousStart;
        let previousEnd;
        if (comparison === 'year_over_year') {
            previousStart = new Date(startDate);
            previousStart.setFullYear(previousStart.getFullYear() - 1);
            previousEnd = new Date(endDate);
            previousEnd.setFullYear(previousEnd.getFullYear() - 1);
        }
        else {
            const duration = endDate.getTime() - startDate.getTime();
            previousStart = new Date(startDate.getTime() - duration);
            previousEnd = new Date(endDate.getTime() - duration);
        }
        const previousUsage = await client_1.prisma.usageLog.aggregate({
            where: {
                userId,
                updatedAt: { gte: previousStart, lte: previousEnd },
            },
            _sum: {
                count: true,
                tokensUsed: true,
                costUsd: true,
            },
        });
        const currentAiActions = currentUsage._sum.count || 0;
        const previousAiActions = previousUsage._sum.count || 0;
        const aiChange = currentAiActions - previousAiActions;
        const aiChangePercent = previousAiActions > 0 ? (aiChange / previousAiActions) * 100 : 0;
        const currentCost = Number(currentUsage._sum.costUsd || 0);
        const previousCost = Number(previousUsage._sum.costUsd || 0);
        const costChange = currentCost - previousCost;
        const costChangePercent = previousCost > 0 ? (costChange / previousCost) * 100 : 0;
        const currentTokens = Number(currentUsage._sum.tokensUsed || 0);
        const previousTokens = Number(previousUsage._sum.tokensUsed || 0);
        const tokensChange = currentTokens - previousTokens;
        const tokensChangePercent = previousTokens > 0 ? (tokensChange / previousTokens) * 100 : 0;
        // Count active days
        const activeDays = await client_1.prisma.agentExecution.groupBy({
            by: ['createdAt'],
            where: {
                userId,
                createdAt: { gte: startDate, lte: endDate },
                status: 'SUCCESS',
            },
        });
        const avgDailyUsage = currentAiActions / (activeDays.length || 1);
        return {
            aiActions: {
                current: currentAiActions,
                previous: previousAiActions,
                change: aiChange,
                changePercentage: aiChangePercent,
                trend: aiChange > 0 ? 'up' : aiChange < 0 ? 'down' : 'stable',
            },
            apiCalls: {
                current: currentAiActions, // For now, same as aiActions
                previous: previousAiActions,
                change: aiChange,
                changePercentage: aiChangePercent,
                trend: aiChange > 0 ? 'up' : aiChange < 0 ? 'down' : 'stable',
            },
            totalCost: {
                current: currentCost,
                previous: previousCost,
                change: costChange,
                changePercentage: costChangePercent,
                trend: costChange > 0 ? 'up' : costChange < 0 ? 'down' : 'stable',
            },
            totalTokens: {
                current: currentTokens,
                previous: previousTokens,
                change: tokensChange,
                changePercentage: tokensChangePercent,
                trend: tokensChange > 0 ? 'up' : tokensChange < 0 ? 'down' : 'stable',
            },
            activeDays: activeDays.length,
            averageDailyUsage: avgDailyUsage,
        };
    }
    /**
     * Get daily usage data
     */
    static async getDailyUsage(userId, startDate, endDate) {
        const executions = await client_1.prisma.agentExecution.groupBy({
            by: ['createdAt'],
            where: {
                userId,
                createdAt: { gte: startDate, lte: endDate },
                status: 'SUCCESS',
            },
            _sum: {
                tokensUsed: true,
                costUsd: true,
            },
            _count: {
                id: true,
            },
        });
        const dailyMap = new Map();
        for (const exec of executions) {
            const date = (0, date_fns_1.format)(exec.createdAt, 'yyyy-MM-dd');
            if (!dailyMap.has(date)) {
                dailyMap.set(date, {
                    date,
                    aiActions: 0,
                    apiCalls: 0,
                    cost: 0,
                    tokens: 0,
                });
            }
            const daily = dailyMap.get(date);
            daily.aiActions += exec._count.id;
            daily.apiCalls += exec._count.id;
            daily.cost += Number(exec._sum.costUsd || 0);
            daily.tokens += Number(exec._sum.tokensUsed || 0);
        }
        return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    }
    /**
     * Get usage breakdown by agent
     */
    static async getUsageByAgent(userId, startDate, endDate) {
        const byAgent = await client_1.prisma.agentExecution.groupBy({
            by: ['agentType'],
            where: {
                userId,
                createdAt: { gte: startDate, lte: endDate },
                status: 'SUCCESS',
            },
            _count: {
                id: true,
            },
            _sum: {
                costUsd: true,
            },
        });
        const total = byAgent.reduce((sum, a) => sum + a._count.id, 0);
        return byAgent.map(agent => ({
            agentType: agent.agentType.toLowerCase(),
            count: agent._count.id,
            cost: Number(agent._sum.costUsd || 0),
            percentage: total > 0 ? (agent._count.id / total) * 100 : 0,
        }));
    }
    /**
     * Get usage breakdown by action type
     */
    static async getUsageByAction(userId, startDate, endDate) {
        const usageLogs = await client_1.prisma.usageLog.findMany({
            where: {
                userId,
                updatedAt: { gte: startDate, lte: endDate },
            },
            select: {
                actionType: true,
                count: true,
                costUsd: true,
            },
        });
        return usageLogs.map(log => ({
            actionType: log.actionType,
            count: log.count,
            cost: Number(log.costUsd),
            category: 'ai_action', // Default category
        }));
    }
    /**
     * Get cost breakdown
     */
    static async getCostBreakdown(userId, startDate, endDate) {
        const byAgent = await this.getUsageByAgent(userId, startDate, endDate);
        const byAction = await this.getUsageByAction(userId, startDate, endDate);
        const totalCost = byAgent.reduce((sum, a) => sum + a.cost, 0);
        return {
            byAgent,
            byAction,
            totalCost,
        };
    }
    /**
     * Get usage forecast
     */
    static async getForecast(userId, startDate, endDate, days = 30) {
        // Simple linear regression forecast based on historical data
        const dailyUsage = await this.getDailyUsage(userId, startDate, endDate);
        const values = dailyUsage.map(d => d.aiActions);
        if (values.length < 7) {
            return [];
        }
        const n = values.length;
        const x = Array.from({ length: n }, (_, i) => i);
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = values.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((a, b, i) => a + b * values[i], 0);
        const sumX2 = x.reduce((a, b) => a + b * b, 0);
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        const lastDate = new Date(dailyUsage[dailyUsage.length - 1]?.date || new Date());
        const forecast = [];
        for (let i = 1; i <= days; i++) {
            const forecastDate = new Date(lastDate);
            forecastDate.setDate(lastDate.getDate() + i);
            const predictedValue = intercept + slope * (n + i - 1);
            const confidence = Math.abs(predictedValue * 0.15);
            forecast.push({
                date: (0, date_fns_1.format)(forecastDate, 'yyyy-MM-dd'),
                forecast: Math.max(0, predictedValue),
                lowerBound: Math.max(0, predictedValue - confidence),
                upperBound: predictedValue + confidence,
            });
        }
        return forecast;
    }
    /**
     * Get top actions
     */
    static async getTopActions(userId, startDate, endDate, limit = 10) {
        const usageLogs = await client_1.prisma.usageLog.findMany({
            where: {
                userId,
                updatedAt: { gte: startDate, lte: endDate },
            },
            orderBy: { count: 'desc' },
            take: limit,
            select: {
                actionType: true,
                count: true,
                costUsd: true,
            },
        });
        return usageLogs.map(log => ({
            actionType: log.actionType,
            count: log.count,
            cost: Number(log.costUsd),
        }));
    }
    /**
     * Export analytics data
     */
    static async exportAnalytics(userId, format, startDate, endDate, includeCharts, metrics) {
        const effectiveStart = startDate || (0, date_fns_1.subDays)(new Date(), 30);
        const effectiveEnd = endDate || new Date();
        const analytics = await this.getAnalytics(userId, effectiveStart, effectiveEnd);
        let content;
        let mimeType;
        let extension;
        if (format === 'json') {
            content = JSON.stringify(analytics, null, 2);
            mimeType = 'application/json';
            extension = 'json';
        }
        else {
            // CSV format
            const headers = ['Date', 'AI Actions', 'API Calls', 'Cost', 'Tokens'];
            const rows = analytics.dailyUsage.map((d) => [
                d.date,
                d.aiActions,
                d.apiCalls,
                d.cost,
                d.tokens,
            ]);
            content = [headers, ...rows].map(row => row.join(',')).join('\n');
            mimeType = 'text/csv';
            extension = 'csv';
        }
        // In production, save to file storage and return URL
        const fileId = `${userId}_${Date.now()}.${extension}`;
        const url = `/api/analytics/export/download/${fileId}`;
        return { fileId, url };
    }
    /**
     * Get platform-wide analytics (admin)
     */
    static async getPlatformAnalytics(startDate, endDate) {
        const effectiveStart = startDate || (0, date_fns_1.subMonths)(new Date(), 1);
        const effectiveEnd = endDate || new Date();
        const [totalUsers, activeUsers, totalExecutions, totalCost, usersByPlan] = await Promise.all([
            client_1.prisma.user.count(),
            client_1.prisma.user.count({ where: { lastLoginAt: { gte: (0, date_fns_1.subDays)(new Date(), 7) } } }),
            client_1.prisma.agentExecution.count({
                where: { createdAt: { gte: effectiveStart, lte: effectiveEnd } },
            }),
            client_1.prisma.agentExecution.aggregate({
                where: { createdAt: { gte: effectiveStart, lte: effectiveEnd } },
                _sum: { costUsd: true },
            }),
            client_1.prisma.user.groupBy({
                by: ['planId'],
                _count: { id: true },
            }),
        ]);
        return {
            users: {
                total: totalUsers,
                active: activeUsers,
                byPlan: usersByPlan.map(p => ({ plan: p.planId, count: p._count.id })),
            },
            executions: {
                total: totalExecutions,
            },
            revenue: {
                total: Number(totalCost._sum.costUsd || 0),
            },
        };
    }
    /**
     * Get user analytics (admin)
     */
    static async getUserAnalytics(startDate, endDate) {
        const effectiveStart = startDate || (0, date_fns_1.subMonths)(new Date(), 1);
        const effectiveEnd = endDate || new Date();
        const users = await client_1.prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                planId: true,
                createdAt: true,
                lastLoginAt: true,
                _count: {
                    select: {
                        agentExecutions: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return users.map(user => ({
            id: user.id,
            email: user.email,
            name: user.name,
            planId: user.planId,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
            executions: user._count.agentExecutions,
        }));
    }
    /**
     * Get revenue analytics (admin)
     */
    static async getRevenueAnalytics(startDate, endDate, period = 'month') {
        const effectiveStart = startDate || (0, date_fns_1.subYears)(new Date(), 1);
        const effectiveEnd = endDate || new Date();
        const revenue = await client_1.prisma.billingInvoice.findMany({
            where: {
                status: 'paid',
                createdAt: { gte: effectiveStart, lte: effectiveEnd },
            },
            select: {
                amount: true,
                createdAt: true,
            },
        });
        let groupedRevenue = {};
        for (const inv of revenue) {
            let key;
            if (period === 'day') {
                key = (0, date_fns_1.format)(inv.createdAt, 'yyyy-MM-dd');
            }
            else if (period === 'week') {
                key = (0, date_fns_1.format)(inv.createdAt, 'yyyy-ww');
            }
            else if (period === 'month') {
                key = (0, date_fns_1.format)(inv.createdAt, 'yyyy-MM');
            }
            else {
                key = (0, date_fns_1.format)(inv.createdAt, 'yyyy');
            }
            groupedRevenue[key] = (groupedRevenue[key] || 0) + Number(inv.amount);
        }
        const total = Object.values(groupedRevenue).reduce((a, b) => a + b, 0);
        const values = Object.values(groupedRevenue);
        const previousTotal = values[values.length - 2] || 0;
        const growth = previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : 0;
        return {
            revenue: groupedRevenue,
            total,
            growth,
        };
    }
}
exports.AnalyticsService = AnalyticsService;
//# sourceMappingURL=analytics.service.js.map