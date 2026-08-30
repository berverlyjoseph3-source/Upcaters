// enterprise-ai-agent-platform/apps/api/src/utils/metrics.ts
import { logger } from './logger';

interface MetricData {
  name: string;
  value: number;
  labels?: Record<string, string>;
  timestamp: Date;
}

class MetricsCollector {
  private metrics: MetricData[] = [];
  private readonly maxMetrics = 10000;
  private interval: NodeJS.Timeout | null = null;

  /**
   * Record a metric value
   */
  record(name: string, value: number, labels?: Record<string, string>): void {
    const metric: MetricData = {
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
  increment(name: string, labels?: Record<string, string>): void {
    this.record(name, 1, labels);
  }

  /**
   * Record execution time of a function
   */
  async time<T>(name: string, fn: () => Promise<T>, labels?: Record<string, string>): Promise<T> {
    const start = Date.now();
    try {
      return await fn();
    } finally {
      const duration = Date.now() - start;
      this.record(name, duration, { ...labels, unit: 'ms' });
    }
  }

  /**
   * Get all metrics
   */
  getMetrics(): MetricData[] {
    return [...this.metrics];
  }

  /**
   * Get metrics summary by name
   */
  getSummary(): Record<string, { count: number; sum: number; avg: number; min: number; max: number }> {
    const summary: Record<string, { count: number; sum: number; min: number; max: number }> = {};

    for (const metric of this.metrics) {
      if (!summary[metric.name]) {
        summary[metric.name] = { count: 0, sum: 0, min: Infinity, max: -Infinity };
      }
      summary[metric.name].count++;
      summary[metric.name].sum += metric.value;
      summary[metric.name].min = Math.min(summary[metric.name].min, metric.value);
      summary[metric.name].max = Math.max(summary[metric.name].max, metric.value);
    }

    const result: Record<string, { count: number; sum: number; avg: number; min: number; max: number }> = {};
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
  clear(): void {
    this.metrics = [];
  }

  /**
   * Start periodic logging of metrics
   */
  startPeriodicLogging(intervalMs: number = 60000): void {
    if (this.interval) {
      clearInterval(this.interval);
    }

    this.interval = setInterval(() => {
      const summary = this.getSummary();
      logger.info({ metrics: summary }, 'Metrics summary');
    }, intervalMs);
  }

  /**
   * Stop periodic logging
   */
  stopPeriodicLogging(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

export const metrics = new MetricsCollector();

/**
 * Agent execution metrics
 */
export function recordAgentExecution(agentType: string, success: boolean, durationMs: number): void {
  metrics.record('agent.execution', 1, {
    agentType,
    status: success ? 'success' : 'failure',
  });
  metrics.record('agent.execution.duration', durationMs, { agentType });
}

/**
 * API request metrics
 */
export function recordApiRequest(method: string, path: string, statusCode: number, durationMs: number): void {
  metrics.record('api.request', 1, {
    method,
    path,
    statusCode: statusCode.toString(),
  });
  metrics.record('api.request.duration', durationMs, { method, path });
}

/**
 * Database query metrics
 */
export function recordDbQuery(queryName: string, durationMs: number): void {
  metrics.record('db.query', 1, { query: queryName });
  metrics.record('db.query.duration', durationMs, { query: queryName });
}

/**
 * External API call metrics
 */
export function recordExternalApiCall(service: string, success: boolean, durationMs: number): void {
  metrics.record('external.api', 1, {
    service,
    status: success ? 'success' : 'failure',
  });
  metrics.record('external.api.duration', durationMs, { service });
}

/**
 * Queue job metrics
 */
export function recordQueueJob(queue: string, jobType: string, success: boolean, durationMs: number): void {
  metrics.record('queue.job', 1, {
    queue,
    jobType,
    status: success ? 'success' : 'failure',
  });
  metrics.record('queue.job.duration', durationMs, { queue, jobType });
}

/**
 * User action metrics
 */
export function recordUserAction(userId: string, action: string): void {
  metrics.record('user.action', 1, { action });
}

/**
 * Error metrics
 */
export function recordError(errorType: string, source: string): void {
  metrics.record('error', 1, { errorType, source });
}