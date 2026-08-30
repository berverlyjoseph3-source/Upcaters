"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metrics = void 0;
exports.recordAgentExecution = recordAgentExecution;
exports.recordApiRequest = recordApiRequest;
exports.recordDbQuery = recordDbQuery;
exports.recordExternalApiCall = recordExternalApiCall;
exports.recordQueueJob = recordQueueJob;
exports.recordUserAction = recordUserAction;
exports.recordError = recordError;
// enterprise-ai-agent-platform/apps/api/src/utils/metrics.ts
const logger_1 = require("./logger");
class MetricsCollector {
    constructor() {
        this.metrics = [];
        this.maxMetrics = 10000;
        this.interval = null;
    }
    /**
     * Record a metric value
     */
    record(name, value, labels) {
        const metric = {
            name,
            value,
            labels,
            timestamp: new Date(),
        };
        this.metrics.push(metric);
        // Trim if exceeding limit
        if (this.metrics.length > this.maxMetrics) {
            this.metrics = this.metrics.slice(-this.maxMetrics);
        }
    }
    /**
     * Increment a counter metric
     */
    increment(name, labels) {
        this.record(name, 1, labels);
    }
    /**
     * Record execution time of a function
     */
    async time(name, fn, labels) {
        const start = Date.now();
        try {
            return await fn();
        }
        finally {
            const duration = Date.now() - start;
            this.record(name, duration, { ...labels, unit: 'ms' });
        }
    }
    /**
     * Get all metrics
     */
    getMetrics() {
        return [...this.metrics];
    }
    /**
     * Get metrics summary by name
     */
    getSummary() {
        const summary = {};
        for (const metric of this.metrics) {
            if (!summary[metric.name]) {
                summary[metric.name] = { count: 0, sum: 0, min: Infinity, max: -Infinity };
            }
            summary[metric.name].count++;
            summary[metric.name].sum += metric.value;
            summary[metric.name].min = Math.min(summary[metric.name].min, metric.value);
            summary[metric.name].max = Math.max(summary[metric.name].max, metric.value);
        }
        const result = {};
        for (const [name, data] of Object.entries(summary)) {
            result[name] = {
                ...data,
                avg: data.sum / data.count,
            };
        }
        return result;
    }
    /**
     * Clear all metrics
     */
    clear() {
        this.metrics = [];
    }
    /**
     * Start periodic logging of metrics
     */
    startPeriodicLogging(intervalMs = 60000) {
        if (this.interval) {
            clearInterval(this.interval);
        }
        this.interval = setInterval(() => {
            const summary = this.getSummary();
            logger_1.logger.info({ metrics: summary }, 'Metrics summary');
        }, intervalMs);
    }
    /**
     * Stop periodic logging
     */
    stopPeriodicLogging() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}
exports.metrics = new MetricsCollector();
/**
 * Agent execution metrics
 */
function recordAgentExecution(agentType, success, durationMs) {
    exports.metrics.record('agent.execution', 1, {
        agentType,
        status: success ? 'success' : 'failure',
    });
    exports.metrics.record('agent.execution.duration', durationMs, { agentType });
}
/**
 * API request metrics
 */
function recordApiRequest(method, path, statusCode, durationMs) {
    exports.metrics.record('api.request', 1, {
        method,
        path,
        statusCode: statusCode.toString(),
    });
    exports.metrics.record('api.request.duration', durationMs, { method, path });
}
/**
 * Database query metrics
 */
function recordDbQuery(queryName, durationMs) {
    exports.metrics.record('db.query', 1, { query: queryName });
    exports.metrics.record('db.query.duration', durationMs, { query: queryName });
}
/**
 * External API call metrics
 */
function recordExternalApiCall(service, success, durationMs) {
    exports.metrics.record('external.api', 1, {
        service,
        status: success ? 'success' : 'failure',
    });
    exports.metrics.record('external.api.duration', durationMs, { service });
}
/**
 * Queue job metrics
 */
function recordQueueJob(queue, jobType, success, durationMs) {
    exports.metrics.record('queue.job', 1, {
        queue,
        jobType,
        status: success ? 'success' : 'failure',
    });
    exports.metrics.record('queue.job.duration', durationMs, { queue, jobType });
}
/**
 * User action metrics
 */
function recordUserAction(userId, action) {
    exports.metrics.record('user.action', 1, { action });
}
/**
 * Error metrics
 */
function recordError(errorType, source) {
    exports.metrics.record('error', 1, { errorType, source });
}
//# sourceMappingURL=metrics.js.map