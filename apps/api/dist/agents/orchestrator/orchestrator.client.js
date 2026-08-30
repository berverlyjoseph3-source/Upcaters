"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestratorClient = void 0;
exports.getOrchestratorClient = getOrchestratorClient;
exports.resetOrchestratorClient = resetOrchestratorClient;
// enterprise-ai-agent-platform/apps/api/src/agents/orchestrator/orchestrator.client.ts
const axios_1 = __importDefault(require("axios"));
const openai_client_1 = require("../../services/ai/openai.client");
const anthropic_client_1 = require("../../services/ai/anthropic.client");
const gemini_client_1 = require("../../services/ai/gemini.client");
const agent_registry_1 = require("../core/agent.registry");
const logger_1 = require("../../utils/logger");
const orchestrator_types_1 = require("./orchestrator.types");
// ============================================
// Default Configuration
// ============================================
const DEFAULT_ORCHESTRATOR_CONFIG = {
    maxStepsPerPlan: 10,
    maxRetriesPerStep: 3,
    maxPlanRetries: 2,
    maxConcurrentExecutions: 10,
    defaultTimeoutMs: 30000,
    executionTimeoutMs: 300000,
    enableAutomaticFallbacks: true,
    enablePlanOptimization: true,
    enableMemoryConsolidation: true,
    enableExecutionReflection: true,
    enablePreExecutionCostCheck: true,
    enableCircuitBreaker: true,
    enableBackpressure: true,
    circuitBreakerThreshold: 5,
    circuitBreakerTimeoutMs: 60000,
    retryBaseDelayMs: 1000,
    retryMaxDelayMs: 30000,
    defaultModel: 'gpt-4',
    modelFallbackChain: ['openai', 'anthropic', 'gemini'],
    classificationOptions: {
        confidenceThreshold: 0.6,
        maxAlternatives: 3,
        useCache: true,
        cacheTTL: 3600,
        useAIFallback: true,
        extractEntities: true,
        includeComplexityEstimation: true,
        preferredMethod: 'hybrid',
    },
    planningOptions: {
        maxSteps: 10,
        enableParallelization: true,
        enableFallbacks: true,
        estimatedCost: true,
        optimizationGoal: 'balanced',
        maxDepth: 3,
        timeout: 15000,
    },
    executionOptions: {
        maxRetries: 3,
        parallel: true,
        stopOnError: false,
        timeout: 60000,
        priority: 1,
        storeInMemory: true,
        generateEmbeddings: true,
    },
    memoryOptions: {
        maxShortTermEntries: 50,
        shortTermTTLSeconds: 3600,
        longTermImportanceThreshold: 0.7,
        enableVectorSearch: true,
    },
    streamingOptions: {
        enabled: true,
        chunkDelayMs: 50,
        maxChunkSize: 200,
    },
    rateLimiting: {
        requestsPerMinute: 60,
        tokensPerMinute: 90000,
        costPerHour: 50,
    },
};
// ============================================
// Orchestrator Client
// ============================================
class OrchestratorClient {
    constructor(config) {
        // ============================================
        // ENHANCEMENT: Caching
        // ============================================
        this.intentCache = new Map();
        this.INTENT_CACHE_TTL = 3600000; // 1 hour
        this.MAX_CACHE_SIZE = 1000;
        this.planCache = new Map();
        this.PLAN_CACHE_TTL = 1800000; // 30 minutes
        this.memoryCache = new Map();
        this.MEMORY_CACHE_TTL = 300000; // 5 minutes
        // ============================================
        // ENHANCEMENT: Circuit Breakers
        // ============================================
        this.circuitBreakers = new Map();
        // ============================================
        // ENHANCEMENT: Rate Limiting
        // ============================================
        this.requestCount = 0;
        this.tokenCount = 0;
        this.costAccumulated = 0;
        this.rateLimitWindowStart = Date.now();
        this.RATE_LIMIT_WINDOW_MS = 60000;
        // ============================================
        // ENHANCEMENT: Metrics
        // ============================================
        this.metrics = {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            partialSuccessExecutions: 0,
            rejectedExecutions: 0,
            averageExecutionTimeMs: 0,
            p95ExecutionTimeMs: 0,
            p99ExecutionTimeMs: 0,
            totalTokensUsed: 0,
            totalCostUsd: 0,
            averageStepsPerExecution: 0,
            averageAgentsPerExecution: 0,
            fallbackUsageRate: 0,
            circuitBreakerTriggerRate: 0,
            classificationAccuracy: 0,
            planOptimizationSavingsUsd: 0,
            memoryHitRate: 0,
            backpressureRejectionRate: 0,
            executionResumeRate: 0,
            errorRateByState: {},
            agentUsageDistribution: {},
            modelUsageDistribution: {},
            circuitBreakerStatus: {},
        };
        this.executionTimes = [];
        // ============================================
        // ENHANCEMENT: Event Listeners
        // ============================================
        this.eventListeners = [];
        // ============================================
        // ENHANCEMENT: Sessions
        // ============================================
        this.activeSessions = new Map();
        // ============================================
        // ENHANCEMENT: Backpressure
        // ============================================
        this.activeExecutions = 0;
        this.pendingExecutions = [];
        this.config = { ...DEFAULT_ORCHESTRATOR_CONFIG, ...config };
        // Initialize AI clients
        this.openaiClient = openai_client_1.OpenAIClient.getInstance();
        this.anthropicClient = anthropic_client_1.AnthropicClient.getInstance();
        this.geminiClient = gemini_client_1.GeminiClient.getInstance();
        // Initialize HTTP client
        this.httpClient = axios_1.default.create({
            timeout: this.config.defaultTimeoutMs,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'AI-Agent-Orchestrator/3.0.0',
            },
        });
        this.setupHttpInterceptors();
        // Start periodic tasks
        this.startCacheCleanup();
        this.startRateLimitReset();
        this.startCircuitBreakerMonitor();
        logger_1.logger.info('Orchestrator client initialized', {
            version: '3.0.0',
            maxConcurrent: this.config.maxConcurrentExecutions,
            circuitBreakerEnabled: this.config.enableCircuitBreaker,
            backpressureEnabled: this.config.enableBackpressure,
            preExecutionCostCheck: this.config.enablePreExecutionCostCheck,
        });
    }
    // ============================================
    // HTTP Interceptors
    // ============================================
    setupHttpInterceptors() {
        this.httpClient.interceptors.request.use((config) => {
            logger_1.logger.debug({ method: config.method, url: config.url }, 'Orchestrator HTTP request');
            config.headers['X-Request-ID'] =
                config.headers['X-Request-ID'] ||
                    `orch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            return config;
        }, (error) => Promise.reject(error));
        this.httpClient.interceptors.response.use((response) => {
            logger_1.logger.debug({ status: response.status, url: response.config.url }, 'Orchestrator HTTP response');
            return response;
        }, async (error) => {
            if (error.response?.status === 429) {
                logger_1.logger.warn('Orchestrator rate limit exceeded');
            }
            else if (error.response?.status === 503) {
                logger_1.logger.warn('Service unavailable');
            }
            throw error;
        });
    }
    // ============================================
    // ENHANCEMENT: Circuit Breaker
    // ============================================
    getOrCreateCircuitBreaker(agentType) {
        if (!this.circuitBreakers.has(agentType)) {
            this.circuitBreakers.set(agentType, {
                failureCount: 0,
                lastFailure: 0,
                isOpen: false,
                openUntil: 0,
            });
        }
        return this.circuitBreakers.get(agentType);
    }
    async withCircuitBreaker(agentType, operation) {
        if (!this.config.enableCircuitBreaker) {
            return operation();
        }
        const breaker = this.getOrCreateCircuitBreaker(agentType);
        if (breaker.isOpen && Date.now() < breaker.openUntil) {
            this.emitEvent(orchestrator_types_1.OrchestratorEventType.CIRCUIT_BREAKER_OPENED, {
                agentType,
                breaker,
            });
            throw new Error(`Circuit breaker open for agent "${agentType}" until ${new Date(breaker.openUntil).toISOString()}`);
        }
        try {
            const result = await operation();
            // Success - reset breaker
            breaker.failureCount = 0;
            breaker.isOpen = false;
            breaker.openUntil = 0;
            this.circuitBreakers.set(agentType, breaker);
            this.emitEvent(orchestrator_types_1.OrchestratorEventType.CIRCUIT_BREAKER_CLOSED, {
                agentType,
                breaker,
            });
            return result;
        }
        catch (error) {
            breaker.failureCount++;
            breaker.lastFailure = Date.now();
            this.circuitBreakers.set(agentType, breaker);
            if (breaker.failureCount >=
                this.config.circuitBreakerThreshold) {
                breaker.isOpen = true;
                breaker.openUntil =
                    Date.now() + this.config.circuitBreakerTimeoutMs;
                this.circuitBreakers.set(agentType, breaker);
                logger_1.logger.error({
                    agentType,
                    failureCount: breaker.failureCount,
                    openUntil: new Date(breaker.openUntil).toISOString(),
                }, 'Circuit breaker opened');
                this.emitEvent(orchestrator_types_1.OrchestratorEventType.CIRCUIT_BREAKER_OPENED, { agentType, breaker });
            }
            throw error;
        }
    }
    startCircuitBreakerMonitor() {
        setInterval(() => {
            for (const [agentType, breaker] of this
                .circuitBreakers.entries()) {
                if (breaker.isOpen &&
                    Date.now() >= breaker.openUntil) {
                    // Auto-close after timeout
                    breaker.isOpen = false;
                    breaker.failureCount = 0;
                    this.circuitBreakers.set(agentType, breaker);
                    logger_1.logger.info({ agentType }, 'Circuit breaker auto-closed');
                }
            }
        }, 30000);
    }
    /**
     * ENHANCEMENT: Get circuit breaker status for monitoring
     */
    getCircuitBreakerStatus() {
        const status = {};
        for (const [agentType, breaker] of this.circuitBreakers.entries()) {
            status[agentType] = { ...breaker };
        }
        return status;
    }
    /**
     * ENHANCEMENT: Reset circuit breaker for an agent
     */
    resetCircuitBreaker(agentType) {
        this.circuitBreakers.delete(agentType);
        logger_1.logger.info({ agentType }, 'Circuit breaker reset');
    }
    // ============================================
    // ENHANCEMENT: Backpressure Control
    // ============================================
    async acquireExecutionSlot() {
        if (!this.config.enableBackpressure) {
            return true;
        }
        if (this.activeExecutions >=
            this.config.maxConcurrentExecutions) {
            this.metrics.rejectedExecutions++;
            this.metrics.backpressureRejectionRate =
                this.metrics.rejectedExecutions /
                    Math.max(1, this.metrics.totalExecutions);
            this.emitEvent(orchestrator_types_1.OrchestratorEventType.BACKPRESSURE_REJECTED, {
                activeExecutions: this.activeExecutions,
                max: this.config.maxConcurrentExecutions,
            });
            return false;
        }
        this.activeExecutions++;
        return true;
    }
    releaseExecutionSlot() {
        if (this.activeExecutions > 0) {
            this.activeExecutions--;
        }
        // Process pending executions
        if (this.pendingExecutions.length > 0 &&
            this.activeExecutions <
                this.config.maxConcurrentExecutions) {
            const pending = this.pendingExecutions.shift();
            if (pending) {
                this.activeExecutions++;
                // Process pending request (would need full execution context)
                logger_1.logger.info({ requestId: pending.requestId }, 'Processing pending execution');
            }
        }
    }
    // ============================================
    // ENHANCEMENT: Rate Limiting
    // ============================================
    checkRateLimit(tokens = 0, cost = 0) {
        if (!this.config.rateLimiting)
            return;
        const now = Date.now();
        // Reset window if expired
        if (now - this.rateLimitWindowStart >=
            this.RATE_LIMIT_WINDOW_MS) {
            this.requestCount = 0;
            this.tokenCount = 0;
            this.costAccumulated = 0;
            this.rateLimitWindowStart = now;
        }
        this.requestCount++;
        const { requestsPerMinute, tokensPerMinute, costPerHour } = this.config.rateLimiting;
        if (requestsPerMinute &&
            this.requestCount > requestsPerMinute) {
            throw new Error(`Rate limit exceeded: ${requestsPerMinute} req/min`);
        }
        if (tokensPerMinute && this.tokenCount > tokensPerMinute) {
            throw new Error(`Token limit exceeded: ${tokensPerMinute} tokens/min`);
        }
        if (costPerHour && this.costAccumulated > costPerHour) {
            throw new Error(`Cost limit exceeded: $${costPerHour}/hr`);
        }
        this.tokenCount += tokens;
        this.costAccumulated += cost;
    }
    startRateLimitReset() {
        setInterval(() => {
            const now = Date.now();
            if (now - this.rateLimitWindowStart >=
                this.RATE_LIMIT_WINDOW_MS) {
                this.requestCount = 0;
                this.tokenCount = 0;
                this.rateLimitWindowStart = now;
            }
        }, this.RATE_LIMIT_WINDOW_MS);
    }
    // ============================================
    // ENHANCEMENT: Cache Management
    // ============================================
    getFromCache(cache, key, ttl) {
        const cached = cache.get(key);
        if (cached && Date.now() - cached.cachedAt < ttl) {
            return cached;
        }
        return null;
    }
    addToCache(cache, key, value, maxSize) {
        if (cache.size >= maxSize) {
            const oldestKey = cache.keys().next().value;
            if (oldestKey)
                cache.delete(oldestKey);
        }
        cache.set(key, value);
    }
    startCacheCleanup() {
        setInterval(() => {
            const now = Date.now();
            for (const [key, value] of this.intentCache.entries()) {
                if (now - value.cachedAt > this.INTENT_CACHE_TTL) {
                    this.intentCache.delete(key);
                }
            }
            for (const [key, value] of this.planCache.entries()) {
                if (now - value.cachedAt > this.PLAN_CACHE_TTL) {
                    this.planCache.delete(key);
                }
            }
            for (const [key, value] of this.memoryCache.entries()) {
                if (now - value.cachedAt > this.MEMORY_CACHE_TTL) {
                    this.memoryCache.delete(key);
                }
            }
        }, this.INTENT_CACHE_TTL);
    }
    // ============================================
    // ENHANCEMENT: Event System
    // ============================================
    addEventListener(listener) {
        this.eventListeners.push(listener);
    }
    removeEventListener(listener) {
        const index = this.eventListeners.indexOf(listener);
        if (index > -1) {
            this.eventListeners.splice(index, 1);
        }
    }
    emitEvent(type, data) {
        const event = {
            type,
            timestamp: new Date(),
            data,
        };
        for (const listener of this.eventListeners) {
            try {
                switch (type) {
                    case orchestrator_types_1.OrchestratorEventType.STATE_CHANGE:
                        listener.onStateChange?.(data.from, data.to, data.state);
                        break;
                    case orchestrator_types_1.OrchestratorEventType.INTENT_CLASSIFIED:
                        listener.onIntentClassified?.(data.intent, data.state);
                        break;
                    case orchestrator_types_1.OrchestratorEventType.PLAN_CREATED:
                        listener.onPlanCreated?.(data.plan, data.state);
                        break;
                    case orchestrator_types_1.OrchestratorEventType.STEP_COMPLETED:
                        listener.onStepCompleted?.(data.result, data.state);
                        break;
                    case orchestrator_types_1.OrchestratorEventType.STEP_FAILED:
                        listener.onStepFailed?.(data.result, data.state);
                        break;
                    case orchestrator_types_1.OrchestratorEventType.EXECUTION_COMPLETED:
                        listener.onExecutionCompleted?.(data.result, data.state);
                        break;
                    case orchestrator_types_1.OrchestratorEventType.ERROR_OCCURRED:
                        listener.onError?.(data.error, data.state);
                        break;
                    case orchestrator_types_1.OrchestratorEventType.CIRCUIT_BREAKER_OPENED:
                    case orchestrator_types_1.OrchestratorEventType.CIRCUIT_BREAKER_CLOSED:
                        listener.onCircuitBreakerChange?.(data.agentType, data.breaker);
                        break;
                    case orchestrator_types_1.OrchestratorEventType.BACKPRESSURE_REJECTED:
                        listener.onBackpressureRejected?.(data.userId || 'unknown', data.reason || 'Backpressure');
                        break;
                }
            }
            catch (error) {
                logger_1.logger.error({ error, eventType: type }, 'Event listener error');
            }
        }
    }
    // ============================================
    // ENHANCEMENT: Metrics
    // ============================================
    updateMetrics(success, tokensUsed, costUsd, executionTimeMs, stepCount, agentTypes, status) {
        this.metrics.totalExecutions++;
        if (status === 'partial_success') {
            this.metrics.partialSuccessExecutions++;
        }
        else if (success) {
            this.metrics.successfulExecutions++;
        }
        else {
            this.metrics.failedExecutions++;
        }
        this.metrics.totalTokensUsed += tokensUsed;
        this.metrics.totalCostUsd += costUsd;
        // Track execution times for percentiles
        this.executionTimes.push(executionTimeMs);
        if (this.executionTimes.length > 1000) {
            this.executionTimes.shift();
        }
        const sorted = [...this.executionTimes].sort((a, b) => a - b);
        const total = this.metrics.totalExecutions;
        this.metrics.averageExecutionTimeMs =
            (this.metrics.averageExecutionTimeMs *
                (total - 1) +
                executionTimeMs) /
                total;
        if (sorted.length > 0) {
            this.metrics.p95ExecutionTimeMs =
                sorted[Math.floor(sorted.length * 0.95)] || executionTimeMs;
            this.metrics.p99ExecutionTimeMs =
                sorted[Math.floor(sorted.length * 0.99)] || executionTimeMs;
        }
        this.metrics.averageStepsPerExecution =
            (this.metrics.averageStepsPerExecution *
                (total - 1) +
                stepCount) /
                total;
        const uniqueAgents = new Set(agentTypes);
        this.metrics.averageAgentsPerExecution =
            (this.metrics.averageAgentsPerExecution *
                (total - 1) +
                uniqueAgents.size) /
                total;
        for (const agent of agentTypes) {
            this.metrics.agentUsageDistribution[agent] =
                (this.metrics.agentUsageDistribution[agent] || 0) +
                    1;
        }
        this.metrics.circuitBreakerStatus =
            this.getCircuitBreakerStatus();
    }
    getMetrics() {
        return { ...this.metrics };
    }
    resetMetrics() {
        this.metrics = {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            partialSuccessExecutions: 0,
            rejectedExecutions: 0,
            averageExecutionTimeMs: 0,
            p95ExecutionTimeMs: 0,
            p99ExecutionTimeMs: 0,
            totalTokensUsed: 0,
            totalCostUsd: 0,
            averageStepsPerExecution: 0,
            averageAgentsPerExecution: 0,
            fallbackUsageRate: 0,
            circuitBreakerTriggerRate: 0,
            classificationAccuracy: 0,
            planOptimizationSavingsUsd: 0,
            memoryHitRate: 0,
            backpressureRejectionRate: 0,
            executionResumeRate: 0,
            errorRateByState: {},
            agentUsageDistribution: {},
            modelUsageDistribution: {},
            circuitBreakerStatus: {},
        };
        this.executionTimes = [];
        logger_1.logger.info('Orchestrator metrics reset');
    }
    // ============================================
    // AI Text Generation with Fallback
    // ============================================
    async generateText(prompt, options) {
        const providerChain = options?.preferredProvider
            ? [
                options.preferredProvider,
                ...this.config.modelFallbackChain.filter((p) => p !== options.preferredProvider),
            ]
            : this.config.modelFallbackChain;
        let lastError = null;
        let totalTokens = 0;
        let totalCost = 0;
        for (let attempt = 0; attempt < providerChain.length; attempt++) {
            const provider = providerChain[attempt];
            try {
                this.checkRateLimit(options?.maxTokens || 1000, 0.01);
                let result;
                switch (provider) {
                    case 'openai': {
                        const openaiResult = await this.openaiClient.complete({
                            messages: [
                                ...(options?.systemPrompt
                                    ? [
                                        {
                                            role: 'system',
                                            content: options.systemPrompt,
                                        },
                                    ]
                                    : []),
                                {
                                    role: 'user',
                                    content: prompt,
                                },
                            ],
                            temperature: options?.temperature ?? 0.7,
                            maxTokens: options?.maxTokens ?? 1000,
                        });
                        result = {
                            content: openaiResult.choices[0].message.content,
                            model: openaiResult.model,
                            tokensUsed: openaiResult.usage.total_tokens,
                            costUsd: this.openaiClient.calculateCost(openaiResult.model, openaiResult.usage.total_tokens),
                        };
                        break;
                    }
                    case 'anthropic': {
                        const anthropicResult = await this.anthropicClient.complete({
                            messages: [
                                { role: 'user', content: prompt },
                            ],
                            system: options?.systemPrompt,
                            temperature: options?.temperature ?? 0.7,
                            maxTokens: options?.maxTokens ?? 1000,
                        });
                        result = {
                            content: anthropicResult.content[0]?.text ||
                                '',
                            model: anthropicResult.model,
                            tokensUsed: anthropicResult.usage.output_tokens,
                            costUsd: this.anthropicClient.calculateCost(anthropicResult.model, anthropicResult.usage.input_tokens, anthropicResult.usage.output_tokens),
                        };
                        break;
                    }
                    case 'gemini': {
                        const geminiResult = await this.geminiClient.complete({
                            contents: [
                                ...(options?.systemPrompt
                                    ? [
                                        {
                                            parts: [
                                                {
                                                    text: options.systemPrompt,
                                                },
                                            ],
                                            role: 'user',
                                        },
                                        {
                                            parts: [
                                                { text: 'Understood.' },
                                            ],
                                            role: 'model',
                                        },
                                    ]
                                    : []),
                                {
                                    parts: [{ text: prompt }],
                                    role: 'user',
                                },
                            ],
                            temperature: options?.temperature ?? 0.7,
                            maxOutputTokens: options?.maxTokens ?? 1000,
                        });
                        result = {
                            content: geminiResult.candidates[0]?.content
                                .parts[0]?.text || '',
                            model: geminiResult.modelVersion,
                            tokensUsed: geminiResult.usageMetadata
                                .totalTokenCount,
                            costUsd: this.geminiClient.calculateCost(geminiResult.modelVersion, geminiResult.usageMetadata
                                .promptTokenCount, geminiResult.usageMetadata
                                .candidatesTokenCount),
                        };
                        break;
                    }
                    default:
                        continue;
                }
                totalTokens = result.tokensUsed;
                totalCost = result.costUsd;
                this.metrics.modelUsageDistribution[provider] =
                    (this.metrics.modelUsageDistribution[provider] || 0) + 1;
                return {
                    content: result.content,
                    model: result.model,
                    provider,
                    tokensUsed: totalTokens,
                    costUsd: totalCost,
                    attempts: attempt + 1,
                };
            }
            catch (error) {
                lastError =
                    error instanceof Error
                        ? error
                        : new Error(String(error));
                logger_1.logger.warn({
                    error: lastError.message,
                    provider,
                    attempt: attempt + 1,
                }, 'AI provider failed, trying next');
            }
        }
        throw (lastError ||
            new Error('All AI providers failed to generate text'));
    }
    /**
     * Stream text generation with progress updates
     */
    async generateTextStreaming(prompt, onChunk, options) {
        let fullContent = '';
        onChunk({
            type: 'start',
            content: 'Starting text generation...',
            progress: 0,
        });
        // Use OpenAI for streaming (most reliable)
        try {
            const result = await this.openaiClient.streamComplete({
                messages: [
                    ...(options?.systemPrompt
                        ? [
                            {
                                role: 'system',
                                content: options.systemPrompt,
                            },
                        ]
                        : []),
                    { role: 'user', content: prompt },
                ],
                temperature: options?.temperature ?? 0.7,
                maxTokens: options?.maxTokens ?? 1000,
            }, (chunk) => {
                fullContent += chunk;
                onChunk({
                    type: 'content',
                    content: chunk,
                    progress: Math.min(20 +
                        (fullContent.length /
                            ((options?.maxTokens || 1000) * 4)) *
                            70, 90),
                    provider: 'openai',
                });
            });
            onChunk({
                type: 'complete',
                content: '',
                progress: 100,
                provider: 'openai',
            });
            return {
                content: fullContent,
                provider: 'openai',
                model: result.model,
                tokensUsed: result.usage.total_tokens,
                costUsd: this.openaiClient.calculateCost(result.model, result.usage.total_tokens),
            };
        }
        catch (error) {
            onChunk({
                type: 'error',
                content: `Streaming failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                progress: 0,
            });
            throw error;
        }
    }
    // ============================================
    // Intent Classification
    // ============================================
    async classifyIntent(input, options) {
        // Check cache
        const cacheKey = `${input.substring(0, 200)}:${options?.preferredMethod || 'default'}`;
        const cached = this.getFromCache(this.intentCache, cacheKey, this.INTENT_CACHE_TTL);
        if (cached) {
            this.metrics.memoryHitRate =
                (this.metrics.memoryHitRate *
                    this.metrics.totalExecutions +
                    1) /
                    (this.metrics.totalExecutions + 1);
            return cached.intent;
        }
        this.checkRateLimit(500, 0.001);
        const classificationPrompt = `
You are an intent classification system. Classify this input and respond with JSON.

Input: "${input}"

Respond with:
{
  "primaryIntent": "string",
  "confidence": number (0-1),
  "alternativeIntents": [{"intent": "string", "confidence": number}],
  "entities": {"key": "value"},
  "suggestedAgent": "EMAIL|DRIVE|CONTENT|SOCIAL|CALENDAR|WEB|TASK|ORCHESTRATOR",
  "requiresMultipleAgents": boolean,
  "agentChain": ["AGENT_TYPE1", "AGENT_TYPE2"],
  "complexity": "simple|moderate|complex|very_complex",
  "estimatedTimeMs": number,
  "estimatedCostUsd": number
}
`;
        const result = await this.generateText(classificationPrompt, {
            temperature: 0.1,
            maxTokens: 500,
        });
        let intent;
        try {
            const jsonMatch = result.content.match(/\{[\s\S]*\}/);
            intent = jsonMatch
                ? JSON.parse(jsonMatch[0])
                : {
                    primaryIntent: 'general_assistance',
                    confidence: 0.3,
                    alternativeIntents: [],
                    entities: {},
                    suggestedAgent: 'ORCHESTRATOR',
                    requiresMultipleAgents: false,
                    classificationMethod: 'fallback',
                };
        }
        catch {
            intent = {
                primaryIntent: 'general_assistance',
                confidence: 0.3,
                alternativeIntents: [],
                entities: {},
                suggestedAgent: 'ORCHESTRATOR',
                requiresMultipleAgents: false,
                classificationMethod: 'fallback',
            };
        }
        intent.classificationMethod = 'ai';
        intent.processingTimeMs = 0;
        // Cache
        this.addToCache(this.intentCache, cacheKey, { intent, cachedAt: Date.now() }, this.MAX_CACHE_SIZE);
        return intent;
    }
    // ============================================
    // Agent Delegation
    // ============================================
    async delegateToAgent(request, context) {
        const startTime = Date.now();
        let retryCount = 0;
        let fallbackUsed = false;
        let circuitBreakerTriggered = false;
        const fallbackChain = [
            request.agentType,
            ...(request.fallbackAgents || []),
        ];
        for (const agentType of fallbackChain) {
            try {
                this.checkRateLimit(300, 0.001);
                await this.acquireExecutionSlot();
                const agent = agent_registry_1.agentRegistry.getAgent(agentType);
                if (!agent) {
                    logger_1.logger.warn({ agentType }, 'Agent not found, trying next');
                    continue;
                }
                const agentRequest = {
                    id: `delegation_${Date.now()}`,
                    userId: context?.userId || 'system',
                    sessionId: context?.sessionId,
                    input: {
                        type: 'task',
                        data: {
                            task: request.task,
                            ...request.input,
                        },
                    },
                    priority: request.priority || 1,
                    timeout: request.timeout,
                    context: context,
                };
                const response = await this.withCircuitBreaker(agentType, async () => agent.execute(agentRequest, context));
                this.releaseExecutionSlot();
                const contract = response.output;
                const success = contract?.status === 'success' ||
                    contract?.status === 'partial_success';
                this.updateMetrics(success, contract?.cost?.tokens || 0, contract?.cost?.usd || 0, Date.now() - startTime, 1, [agentType], contract?.status);
                return {
                    success,
                    output: contract?.data || response.output,
                    error: contract?.errors?.[0]?.message,
                    agentType,
                    executionTimeMs: Date.now() - startTime,
                    tokensUsed: contract?.cost?.tokens || 0,
                    costUsd: contract?.cost?.usd || 0,
                    retryCount,
                    fallbackUsed,
                    fallbackChain,
                    circuitBreakerTriggered,
                    metadata: contract?.metadata,
                };
            }
            catch (error) {
                this.releaseExecutionSlot();
                retryCount++;
                fallbackUsed = agentType !== request.agentType;
                if (error instanceof Error &&
                    error.message.includes('Circuit breaker')) {
                    circuitBreakerTriggered = true;
                    this.metrics.circuitBreakerTriggerRate =
                        this.metrics.circuitBreakerTriggerRate +
                            1 / Math.max(1, this.metrics.totalExecutions);
                }
            }
        }
        this.updateMetrics(false, 0, 0, Date.now() - startTime, 0, []);
        return {
            success: false,
            output: null,
            error: 'All agents in chain failed',
            agentType: request.agentType,
            executionTimeMs: Date.now() - startTime,
            tokensUsed: 0,
            costUsd: 0,
            retryCount,
            fallbackUsed: true,
            fallbackChain,
            circuitBreakerTriggered,
        };
    }
    // ============================================
    // Multi-Agent Execution
    // ============================================
    async executeMultiAgent(agents, mode = 'sequential', context, options) {
        const startTime = Date.now();
        const results = [];
        if (mode === 'parallel') {
            const maxConcurrent = options?.maxConcurrent ||
                this.config.maxConcurrentExecutions;
            for (let i = 0; i < agents.length; i += maxConcurrent) {
                const chunk = agents.slice(i, i + maxConcurrent);
                const chunkResults = await Promise.all(chunk.map((agent) => this.delegateToAgent({
                    agentType: agent.agentType,
                    task: agent.task,
                    input: {
                        ...agent.input,
                        ...options?.sharedContext,
                    },
                    priority: agent.priority,
                }, context)));
                results.push(...chunkResults);
            }
        }
        else {
            for (const agent of agents) {
                const result = await this.delegateToAgent({
                    agentType: agent.agentType,
                    task: agent.task,
                    input: {
                        ...agent.input,
                        ...options?.sharedContext,
                        previousResults: results
                            .slice(-3)
                            .map((r) => ({
                            agentType: r.agentType,
                            success: r.success,
                            output: r.output,
                        })),
                    },
                }, context);
                results.push(result);
                if (!result.success && options?.stopOnError) {
                    break;
                }
            }
        }
        return {
            results,
            mode,
            totalSuccess: results.filter((r) => r.success)
                .length,
            totalFailed: results.filter((r) => !r.success)
                .length,
            totalTimeMs: Date.now() - startTime,
        };
    }
    // ============================================
    // Batch Execution
    // ============================================
    async executeBatch(request) {
        const startTime = Date.now();
        const results = [];
        let totalTokens = 0;
        let totalCost = 0;
        const maxConcurrent = request.maxConcurrent ||
            this.config.maxConcurrentExecutions;
        for (let i = 0; i < request.requests.length; i += maxConcurrent) {
            const chunk = request.requests.slice(i, i + maxConcurrent);
            const chunkResults = await Promise.all(chunk.map(async (req) => {
                const reqStart = Date.now();
                try {
                    const intent = await this.classifyIntent(req.input);
                    let output;
                    let tokens = 0;
                    let cost = 0;
                    if (intent.requiresMultipleAgents &&
                        intent.agentChain) {
                        const multiResult = await this.executeMultiAgent(intent.agentChain.map((a) => ({
                            agentType: a,
                            task: req.input,
                            input: intent.entities,
                        })), 'sequential', req.context);
                        output = multiResult;
                        tokens = multiResult.results.reduce((s, r) => s + r.tokensUsed, 0);
                        cost = multiResult.results.reduce((s, r) => s + r.costUsd, 0);
                    }
                    else {
                        const delegation = await this.delegateToAgent({
                            agentType: intent.suggestedAgent,
                            task: req.input,
                            input: intent.entities,
                            priority: req.priority,
                        }, req.context);
                        output = delegation.output;
                        tokens = delegation.tokensUsed;
                        cost = delegation.costUsd;
                    }
                    return {
                        requestId: req.id,
                        intent: {
                            primaryIntent: intent.primaryIntent,
                            confidence: intent.confidence,
                            suggestedAgent: intent.suggestedAgent,
                        },
                        output,
                        success: true,
                        executionTimeMs: Date.now() - reqStart,
                        tokensUsed: tokens,
                        costUsd: cost,
                    };
                }
                catch (error) {
                    return {
                        requestId: req.id,
                        output: null,
                        success: false,
                        error: error instanceof Error
                            ? error.message
                            : String(error),
                        executionTimeMs: Date.now() - reqStart,
                        tokensUsed: 0,
                        costUsd: 0,
                    };
                }
            }));
            for (const r of chunkResults) {
                results.push(r);
                totalTokens += r.tokensUsed;
                totalCost += r.costUsd;
            }
        }
        return {
            results,
            totalRequests: request.requests.length,
            successfulRequests: results.filter((r) => r.success).length,
            failedRequests: results.filter((r) => !r.success).length,
            partialSuccessRequests: 0,
            totalTimeMs: Date.now() - startTime,
            totalTokensUsed: totalTokens,
            totalCostUsd: totalCost,
        };
    }
    // ============================================
    // Session Management
    // ============================================
    createSession(userId) {
        const session = {
            id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId,
            startedAt: new Date(),
            lastActivityAt: new Date(),
            messageCount: 0,
            context: { sessionId: '', userId },
            messageHistory: [],
            isActive: true,
        };
        this.activeSessions.set(session.id, session);
        return session;
    }
    getSession(sessionId) {
        return this.activeSessions.get(sessionId) || null;
    }
    getUserSessions(userId) {
        return Array.from(this.activeSessions.values()).filter((s) => s.userId === userId);
    }
    endSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (session) {
            session.isActive = false;
            this.activeSessions.set(sessionId, session);
            return true;
        }
        return false;
    }
    // ============================================
    // Health & Status
    // ============================================
    async getHealth() {
        return {
            state: orchestrator_types_1.OrchestratorStateType.IDLE,
            isHealthy: true,
            currentLoad: this.activeExecutions /
                this.config.maxConcurrentExecutions,
            queueLength: this.pendingExecutions.length,
            activeExecutions: this.activeExecutions,
            waitingExecutions: this.pendingExecutions.length,
            rejectedExecutions: this.metrics.rejectedExecutions,
            metrics: this.getMetrics(),
            lastHeartbeat: new Date(),
            uptime: process.uptime(),
            version: '3.0.0',
        };
    }
    // ============================================
    // Configuration
    // ============================================
    updateConfig(config) {
        this.config = { ...this.config, ...config };
        logger_1.logger.info('Orchestrator configuration updated', { keys: Object.keys(config) });
    }
    getConfig() {
        return { ...this.config };
    }
    // ============================================
    // Shutdown
    // ============================================
    async shutdown() {
        logger_1.logger.info('Orchestrator client shutting down...');
        this.intentCache.clear();
        this.planCache.clear();
        this.memoryCache.clear();
        this.circuitBreakers.clear();
        this.activeSessions.clear();
        this.eventListeners = [];
        this.resetMetrics();
        logger_1.logger.info('Orchestrator client shutdown complete');
    }
}
exports.OrchestratorClient = OrchestratorClient;
// ============================================
// Singleton Instance
// ============================================
let orchestratorClientInstance = null;
function getOrchestratorClient(config) {
    if (!orchestratorClientInstance) {
        orchestratorClientInstance = new OrchestratorClient(config);
    }
    return orchestratorClientInstance;
}
function resetOrchestratorClient() {
    if (orchestratorClientInstance) {
        orchestratorClientInstance.shutdown();
        orchestratorClientInstance = null;
    }
}
//# sourceMappingURL=orchestrator.client.js.map