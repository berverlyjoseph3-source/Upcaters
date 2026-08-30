"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestratorTools = void 0;
const openai_service_1 = require("../../services/ai/openai.service");
const anthropic_service_1 = require("../../services/ai/anthropic.service");
const gemini_service_1 = require("../../services/ai/gemini.service");
const intent_classifier_1 = require("./intent-classifier");
const task_planner_1 = require("./task-planner");
const memory_manager_1 = require("./memory-manager");
const agent_registry_1 = require("../core/agent.registry");
const agent_types_1 = require("../../types/agent.types");
const logger_1 = require("../../utils/logger");
// ============================================
// Orchestrator Tools
// ============================================
class OrchestratorTools {
    /**
     * Delegate to a specialized agent
     */
    static delegateToAgentTool() {
        return {
            name: 'delegate_to_agent',
            description: 'Delegate a task to a specialized AI agent (Email, Drive, Content, Social, Calendar, Web, Task)',
            parameters: [
                { name: 'agentType', type: 'string', required: true, description: 'The agent to delegate to (email, drive, content, social, calendar, web, task)' },
                { name: 'task', type: 'string', required: true, description: 'The task to execute' },
                { name: 'input', type: 'object', required: false, description: 'Additional input parameters for the task' },
                { name: 'priority', type: 'number', required: false, description: 'Task priority (0=low, 1=normal, 2=high, 3=critical)' },
                { name: 'timeout', type: 'number', required: false, description: 'Timeout in milliseconds' },
            ],
            execute: async (params, context) => {
                return await this.delegateToAgent(params.agentType, params.task, params.input || {}, context, params.priority, params.timeout);
            },
            requiresApiCall: true,
            cost: 1,
        };
    }
    /**
     * Classify user intent
     */
    static classifyIntentTool() {
        return {
            name: 'classify_intent',
            description: 'Analyze user input to determine intent and suggest the best agent for handling',
            parameters: [
                { name: 'input', type: 'string', required: true, description: 'User input to classify' },
                { name: 'useAI', type: 'boolean', required: false, description: 'Use AI for classification (default: true)' },
            ],
            execute: async (params, context) => {
                return await this.classifyIntent(params.input, params.useAI !== false);
            },
            requiresApiCall: true,
            cost: 2,
        };
    }
    /**
     * Create an execution plan
     */
    static createPlanTool() {
        return {
            name: 'create_plan',
            description: 'Create a step-by-step execution plan for complex multi-agent tasks',
            parameters: [
                { name: 'intent', type: 'object', required: true, description: 'Classified intent object' },
                { name: 'maxSteps', type: 'number', required: false, description: 'Maximum number of steps (default: 10)' },
                { name: 'enableParallelization', type: 'boolean', required: false, description: 'Enable parallel execution where possible' },
                { name: 'enableFallbacks', type: 'boolean', required: false, description: 'Add fallback steps for error handling' },
                { name: 'estimateCost', type: 'boolean', required: false, description: 'Estimate token and cost usage' },
            ],
            execute: async (params, context) => {
                return await this.createPlan(params.intent, context, {
                    maxSteps: params.maxSteps || 10,
                    enableParallelization: params.enableParallelization !== false,
                    enableFallbacks: params.enableFallbacks !== false,
                    estimatedCost: params.estimateCost !== false,
                });
            },
            requiresApiCall: true,
            cost: 3,
        };
    }
    /**
     * Retrieve relevant memories
     */
    static retrieveMemoryTool() {
        return {
            name: 'retrieve_memory',
            description: 'Retrieve relevant long-term memories to provide context for the current task',
            parameters: [
                { name: 'query', type: 'string', required: true, description: 'Query to search for relevant memories' },
                { name: 'limit', type: 'number', required: false, description: 'Maximum number of memories to retrieve (default: 5)' },
                { name: 'minImportance', type: 'number', required: false, description: 'Minimum importance threshold (0-1, default: 0.5)' },
                { name: 'includeSimilarity', type: 'boolean', required: false, description: 'Include similarity scores in results' },
            ],
            execute: async (params, context) => {
                return await this.retrieveMemory(context.userId, params.query, params.limit || 5, params.minImportance || 0.5, params.includeSimilarity !== false);
            },
            requiresApiCall: true,
            cost: 1,
        };
    }
    /**
     * Store a memory
     */
    static storeMemoryTool() {
        return {
            name: 'store_memory',
            description: 'Store important information in long-term memory for future reference',
            parameters: [
                { name: 'content', type: 'string', required: true, description: 'Content to store in memory' },
                { name: 'importance', type: 'number', required: false, description: 'Importance level 0-1 (default: 0.7)' },
                { name: 'type', type: 'string', required: false, description: 'Memory type (short_term, long_term, episodic, semantic)' },
                { name: 'generateEmbedding', type: 'boolean', required: false, description: 'Generate vector embedding for semantic search' },
                { name: 'metadata', type: 'object', required: false, description: 'Additional metadata for the memory' },
            ],
            execute: async (params, context) => {
                return await this.storeMemory(context.userId, params.content, params.importance || 0.7, params.type || 'semantic', params.generateEmbedding !== false, params.metadata || {});
            },
            requiresApiCall: true,
            cost: 0.5,
        };
    }
    /**
     * Execute multiple agents in sequence or parallel
     */
    static multiAgentExecuteTool() {
        return {
            name: 'multi_agent_execute',
            description: 'Execute a complex task requiring multiple specialized agents working together',
            parameters: [
                { name: 'agents', type: 'array', required: true, description: 'Array of agent tasks [{agentType, task, input}]' },
                { name: 'mode', type: 'string', required: false, description: 'Execution mode (sequential, parallel, conditional)' },
                { name: 'context', type: 'object', required: false, description: 'Shared context across all agents' },
                { name: 'stopOnError', type: 'boolean', required: false, description: 'Stop execution if any agent fails' },
            ],
            execute: async (params, context) => {
                return await this.multiAgentExecute(params.agents, params.mode || 'sequential', context, params.context || {}, params.stopOnError !== false);
            },
            requiresApiCall: true,
            cost: 5,
        };
    }
    /**
     * Generate text using AI with fallback
     */
    static generateTextTool() {
        return {
            name: 'generate_text',
            description: 'Generate text content using AI with automatic fallback across providers',
            parameters: [
                { name: 'prompt', type: 'string', required: true, description: 'The prompt for text generation' },
                { name: 'systemPrompt', type: 'string', required: false, description: 'System instructions for the AI' },
                { name: 'temperature', type: 'number', required: false, description: 'Creativity level 0-1' },
                { name: 'maxTokens', type: 'number', required: false, description: 'Maximum output tokens' },
                { name: 'preferredModel', type: 'string', required: false, description: 'Preferred AI model (openai, anthropic, gemini)' },
            ],
            execute: async (params, context) => {
                return await this.generateText(params.prompt, params.systemPrompt, params.temperature ?? 0.7, params.maxTokens ?? 1000, params.preferredModel || 'openai');
            },
            requiresApiCall: true,
            cost: 3,
        };
    }
    /**
     * Get available agents and their capabilities
     */
    static getAvailableAgentsTool() {
        return {
            name: 'get_available_agents',
            description: 'List all available specialized agents with their capabilities and tools',
            parameters: [
                { name: 'includeTools', type: 'boolean', required: false, description: 'Include tool list for each agent' },
                { name: 'includeMetrics', type: 'boolean', required: false, description: 'Include usage metrics' },
                { name: 'filterByType', type: 'string', required: false, description: 'Filter by agent type' },
            ],
            execute: async (params, context) => {
                return await this.getAvailableAgents(params.includeTools !== false, params.includeMetrics !== false, params.filterByType);
            },
            requiresApiCall: false,
            cost: 0,
        };
    }
    /**
     * Execute a plan step by step
     */
    static executePlanTool() {
        return {
            name: 'execute_plan',
            description: 'Execute a pre-created task plan step by step with monitoring',
            parameters: [
                { name: 'plan', type: 'object', required: true, description: 'The task plan to execute' },
                { name: 'maxRetries', type: 'number', required: false, description: 'Maximum retries per step (default: 3)' },
                { name: 'parallel', type: 'boolean', required: false, description: 'Execute independent steps in parallel' },
                { name: 'onStepComplete', type: 'function', required: false, description: 'Callback after each step completes' },
            ],
            execute: async (params, context) => {
                return await this.executePlan(params.plan, context, params.maxRetries || 3, params.parallel !== false);
            },
            requiresApiCall: true,
            cost: 0, // Cost calculated per executed step
        };
    }
    /**
     * Reflect on execution results and generate improvements
     */
    static reflectOnExecutionTool() {
        return {
            name: 'reflect_on_execution',
            description: 'Analyze execution results and generate improvement suggestions',
            parameters: [
                { name: 'executionResults', type: 'object', required: true, description: 'Results from plan execution' },
                { name: 'originalRequest', type: 'string', required: false, description: 'Original user request for context' },
                { name: 'storeInsights', type: 'boolean', required: false, description: 'Store insights in long-term memory' },
            ],
            execute: async (params, context) => {
                return await this.reflectOnExecution(params.executionResults, params.originalRequest, params.storeInsights !== false, context);
            },
            requiresApiCall: true,
            cost: 2,
        };
    }
    /**
     * Batch execute multiple user requests
     */
    static batchExecuteTool() {
        return {
            name: 'batch_execute',
            description: 'Process multiple user requests in batch with intelligent routing',
            parameters: [
                { name: 'requests', type: 'array', required: true, description: 'Array of user requests [{id, input, context}]' },
                { name: 'maxConcurrent', type: 'number', required: false, description: 'Maximum concurrent executions (default: 3)' },
                { name: 'priority', type: 'string', required: false, description: 'Batch priority (low, normal, high)' },
            ],
            execute: async (params, context) => {
                return await this.batchExecute(params.requests, context, params.maxConcurrent || 3);
            },
            requiresApiCall: true,
            cost: 0, // Cost calculated per request
        };
    }
    /**
     * Analyze and optimize a plan
     */
    static optimizePlanTool() {
        return {
            name: 'optimize_plan',
            description: 'Analyze and optimize a task plan for better efficiency',
            parameters: [
                { name: 'plan', type: 'object', required: true, description: 'The plan to optimize' },
                { name: 'optimizationGoal', type: 'string', required: false, description: 'Goal: speed, cost, accuracy, balanced' },
                { name: 'maxSteps', type: 'number', required: false, description: 'Maximum steps allowed after optimization' },
            ],
            execute: async (params, context) => {
                return await this.optimizePlan(params.plan, params.optimizationGoal || 'balanced', params.maxSteps);
            },
            requiresApiCall: true,
            cost: 2,
        };
    }
    /**
     * Suggest follow-up actions
     */
    static suggestFollowUpTool() {
        return {
            name: 'suggest_follow_up',
            description: 'Suggest follow-up actions based on execution results and user context',
            parameters: [
                { name: 'executionResults', type: 'object', required: true, description: 'Results from previous execution' },
                { name: 'userPreferences', type: 'object', required: false, description: 'User preferences for context' },
                { name: 'count', type: 'number', required: false, description: 'Number of suggestions (default: 3)' },
            ],
            execute: async (params, context) => {
                return await this.suggestFollowUp(params.executionResults, params.userPreferences || {}, params.count || 3);
            },
            requiresApiCall: true,
            cost: 1,
        };
    }
    // ============================================
    // Implementation Methods
    // ============================================
    /**
     * Delegate to a specialized agent
     */
    static async delegateToAgent(agentTypeStr, task, input, context, priority = 1, timeout) {
        const startTime = Date.now();
        try {
            // Map string to AgentType
            const agentType = this.mapToAgentType(agentTypeStr);
            // Get the agent from registry
            const agent = agent_registry_1.agentRegistry.getAgent(agentType);
            if (!agent) {
                // Try to find based on capabilities
                const availableAgent = this.findAgentByCapability(agentTypeStr);
                if (!availableAgent) {
                    throw new Error(`Agent "${agentTypeStr}" not found or not available`);
                }
                logger_1.logger.info({ agentTypeStr, delegatedTo: availableAgent.getType() }, 'Agent delegated to closest match');
                const request = {
                    id: `delegation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    userId: context.userId,
                    sessionId: context.sessionId,
                    input: {
                        type: 'task',
                        data: { task, ...input },
                    },
                    priority,
                    timeout,
                    context,
                };
                const response = await availableAgent.execute(request, context);
                logger_1.logger.info({
                    agentType: availableAgent.getType(),
                    success: response.success,
                    executionTimeMs: Date.now() - startTime,
                }, 'Agent delegation completed');
                return response.output;
            }
            const request = {
                id: `delegation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                userId: context.userId,
                sessionId: context.sessionId,
                input: {
                    type: 'task',
                    data: { task, ...input },
                },
                priority,
                timeout,
                context,
            };
            const response = await agent.execute(request, context);
            if (!response.success) {
                // Try fallback agent
                logger_1.logger.warn({ agentType: agent.getType(), error: response.error }, 'Agent execution failed, trying fallback');
                const fallbackAgent = this.findFallbackAgent(agentType);
                if (fallbackAgent) {
                    const fallbackResponse = await fallbackAgent.execute(request, context);
                    return fallbackResponse.success ? fallbackResponse.output : response.output;
                }
            }
            logger_1.logger.info({
                agentType: agent.getType(),
                success: response.success,
                executionTimeMs: Date.now() - startTime,
            }, 'Agent delegation completed');
            return response.success ? response.output : { error: response.error };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger_1.logger.error({ error: errorMessage, agentType: agentTypeStr, task }, 'Agent delegation failed');
            throw error;
        }
    }
    /**
     * Classify user intent
     */
    static async classifyIntent(input, useAI = true) {
        const startTime = Date.now();
        try {
            let intent;
            let method = 'keyword';
            if (useAI) {
                intent = await intent_classifier_1.IntentClassifier.classify(input);
                method = 'ai';
            }
            else {
                intent = intent_classifier_1.IntentClassifier.classifyByKeywords(input);
                if (!intent) {
                    intent = await intent_classifier_1.IntentClassifier.classifyByAI(input);
                    method = 'ai_fallback';
                }
            }
            return {
                primaryIntent: intent.primaryIntent,
                confidence: intent.confidence,
                suggestedAgent: intent.suggestedAgent,
                alternativeIntents: intent.alternativeIntents || [],
                entities: intent.entities || {},
                requiresMultipleAgents: intent.requiresMultipleAgents || false,
                agentChain: intent.agentChain,
                classificationMethod: method,
                processingTimeMs: Date.now() - startTime,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, input }, 'Intent classification failed');
            return {
                primaryIntent: 'general_assistance',
                confidence: 0.3,
                suggestedAgent: 'orchestrator',
                alternativeIntents: [],
                entities: {},
                requiresMultipleAgents: false,
                classificationMethod: 'fallback',
                processingTimeMs: Date.now() - startTime,
            };
        }
    }
    /**
     * Create an execution plan
     */
    static async createPlan(intent, context, options) {
        const startTime = Date.now();
        try {
            const plan = await task_planner_1.TaskPlanner.createPlan(intent, context, {
                maxSteps: options.maxSteps,
                enableParallelization: options.enableParallelization,
                enableFallbacks: options.enableFallbacks,
                estimatedCost: options.estimatedCost,
            });
            const validation = task_planner_1.TaskPlanner.validatePlan(plan);
            return {
                planId: plan.id,
                steps: plan.steps.map(step => ({
                    id: step.id,
                    agentType: step.agentType,
                    action: step.action,
                    description: this.describeStep(step),
                    dependsOn: step.dependsOn,
                    parallelGroup: step.parallelGroup,
                    hasFallback: !!step.fallback,
                    estimatedCost: plan.estimatedCost ? (plan.estimatedCost / plan.steps.length) : undefined,
                })),
                mode: plan.mode,
                totalSteps: plan.steps.length,
                estimatedTokens: plan.estimatedTokens,
                estimatedCost: plan.estimatedCost,
                validation: {
                    isValid: validation.valid,
                    errors: validation.errors,
                },
                processingTimeMs: Date.now() - startTime,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, intent }, 'Plan creation failed');
            throw error;
        }
    }
    /**
     * Retrieve relevant memories
     */
    static async retrieveMemory(userId, query, limit = 5, minImportance = 0.5, includeSimilarity = true) {
        try {
            const [relevantMemories, shortTermMemories] = await Promise.all([
                memory_manager_1.MemoryManager.retrieveRelevantMemories(userId, query, limit, minImportance),
                memory_manager_1.MemoryManager.getShortTerm(userId, 5),
            ]);
            const allMemories = [...relevantMemories, ...shortTermMemories].slice(0, limit);
            return {
                memories: allMemories.map(m => ({
                    id: m.id || `mem_${Date.now()}`,
                    content: m.content,
                    type: m.type || 'long_term',
                    importance: m.importance || 0.5,
                    similarity: includeSimilarity ? m.similarity : undefined,
                    timestamp: m.timestamp || new Date(),
                    metadata: m.metadata,
                })),
                query,
                totalFound: relevantMemories.length,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId, query }, 'Memory retrieval failed');
            return { memories: [], query, totalFound: 0 };
        }
    }
    /**
     * Store a memory
     */
    static async storeMemory(userId, content, importance = 0.7, type = 'semantic', generateEmbedding = true, metadata = {}) {
        try {
            let result;
            if (type === 'short_term') {
                result = await memory_manager_1.MemoryManager.storeShortTerm(userId, content, metadata);
            }
            else {
                result = await memory_manager_1.MemoryManager.storeLongTerm(userId, content, importance, { ...metadata, type }, generateEmbedding);
            }
            return {
                success: true,
                memoryId: result.id,
                type: result.type || type,
                importance: result.importance || importance,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Memory storage failed');
            return {
                success: false,
                memoryId: '',
                type,
                importance,
            };
        }
    }
    /**
     * Execute multiple agents
     */
    static async multiAgentExecute(agents, mode = 'sequential', context, sharedContext = {}, stopOnError = true) {
        const startTime = Date.now();
        const results = [];
        try {
            if (mode === 'sequential') {
                // Execute one at a time, passing results forward
                for (const agentTask of agents) {
                    try {
                        const stepStart = Date.now();
                        const enrichedInput = {
                            ...agentTask.input,
                            ...sharedContext,
                            previousResults: results.map(r => ({
                                agentType: r.agentType,
                                output: r.output,
                                success: r.success,
                            })),
                        };
                        const output = await this.delegateToAgent(agentTask.agentType, agentTask.task, enrichedInput, context);
                        results.push({
                            agentType: agentTask.agentType,
                            success: true,
                            output,
                            executionTimeMs: Date.now() - stepStart,
                        });
                    }
                    catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        results.push({
                            agentType: agentTask.agentType,
                            success: false,
                            output: null,
                            error: errorMessage,
                            executionTimeMs: 0,
                        });
                        if (stopOnError) {
                            logger_1.logger.warn({ failedAgent: agentTask.agentType, error: errorMessage }, 'Multi-agent execution stopped due to error');
                            break;
                        }
                    }
                }
            }
            else {
                // Parallel execution
                const promises = agents.map(async (agentTask) => {
                    const stepStart = Date.now();
                    try {
                        const output = await this.delegateToAgent(agentTask.agentType, agentTask.task, { ...agentTask.input, ...sharedContext }, context);
                        return {
                            agentType: agentTask.agentType,
                            success: true,
                            output,
                            executionTimeMs: Date.now() - stepStart,
                        };
                    }
                    catch (error) {
                        return {
                            agentType: agentTask.agentType,
                            success: false,
                            output: null,
                            error: error instanceof Error ? error.message : String(error),
                            executionTimeMs: Date.now() - stepStart,
                        };
                    }
                });
                const parallelResults = await Promise.all(promises);
                results.push(...parallelResults);
            }
            return {
                results,
                mode,
                totalSuccess: results.filter(r => r.success).length,
                totalFailed: results.filter(r => !r.success).length,
                totalTimeMs: Date.now() - startTime,
            };
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Multi-agent execution failed');
            throw error;
        }
    }
    /**
     * Generate text with AI fallback
     */
    static async generateText(prompt, systemPrompt, temperature = 0.7, maxTokens = 1000, preferredModel = 'openai') {
        const providers = this.buildProviderChain(preferredModel);
        let lastError = null;
        let attempts = 0;
        for (const provider of providers) {
            attempts++;
            try {
                let response;
                switch (provider) {
                    case 'openai': {
                        const result = await openai_service_1.OpenAIService.complete({
                            prompt,
                            systemPrompt,
                            temperature,
                            maxTokens,
                        });
                        response = {
                            content: result.content,
                            model: result.model,
                            tokensUsed: result.tokensUsed.total,
                            costUsd: result.costUsd,
                        };
                        break;
                    }
                    case 'anthropic': {
                        const result = await anthropic_service_1.AnthropicService.complete({
                            prompt,
                            systemPrompt,
                            temperature,
                            maxTokens,
                        });
                        response = {
                            content: result.content,
                            model: result.model,
                            tokensUsed: result.tokensUsed.total,
                            costUsd: result.costUsd,
                        };
                        break;
                    }
                    case 'gemini': {
                        const result = await gemini_service_1.GeminiService.complete({
                            prompt,
                            systemPrompt,
                            temperature,
                            maxTokens,
                        });
                        response = {
                            content: result.content,
                            model: result.model,
                            tokensUsed: result.tokensUsed.total,
                            costUsd: result.costUsd,
                        };
                        break;
                    }
                    default:
                        continue;
                }
                return {
                    content: response.content,
                    model: response.model,
                    provider: provider,
                    tokensUsed: response.tokensUsed,
                    costUsd: response.costUsd,
                    attempts,
                };
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                logger_1.logger.warn({ error: lastError.message, provider, attempt: attempts }, 'AI provider failed, trying next');
            }
        }
        throw lastError || new Error('All AI providers failed to generate text');
    }
    /**
     * Get available agents
     */
    static async getAvailableAgents(includeTools = true, includeMetrics = true, filterByType) {
        try {
            const allAgents = agent_registry_1.agentRegistry.getAllAgents();
            const agentList = [];
            let healthyCount = 0;
            let degradedCount = 0;
            for (const agent of allAgents) {
                const agentType = agent.getType().toLowerCase();
                // Filter by type if specified
                if (filterByType && agentType !== filterByType.toLowerCase()) {
                    continue;
                }
                const health = await agent.getHealth();
                const agentInfo = {
                    type: agentType,
                    name: agent.getName(),
                    description: agent.getDescription(),
                    version: agent.getVersion(),
                    status: health.status,
                };
                if (includeTools) {
                    agentInfo.tools = agent.getTools().map(tool => ({
                        name: tool.name,
                        description: tool.description,
                        cost: tool.cost,
                    }));
                }
                if (includeMetrics) {
                    const metrics = agent.getMetrics();
                    agentInfo.metrics = {
                        totalExecutions: metrics.totalExecutions,
                        successRate: metrics.totalExecutions > 0
                            ? (metrics.successfulExecutions / metrics.totalExecutions) * 100
                            : 100,
                        averageResponseTimeMs: metrics.averageResponseTimeMs,
                        errorRate: metrics.errorRate,
                    };
                }
                if (health.status === 'error' || health.status === 'degraded') {
                    degradedCount++;
                }
                else {
                    healthyCount++;
                }
                agentList.push(agentInfo);
            }
            return {
                agents: agentList,
                totalAgents: agentList.length,
                healthyAgents: healthyCount,
                degradedAgents: degradedCount,
            };
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to get available agents');
            throw error;
        }
    }
    /**
     * Execute a plan step by step
     */
    static async executePlan(plan, context, maxRetries = 3, parallel = true) {
        const startTime = Date.now();
        const stepResults = [];
        const stepOutputs = new Map();
        let totalTokensUsed = 0;
        let totalCostUsd = 0;
        try {
            const steps = plan.steps || [];
            if (parallel && plan.mode === 'parallel' && steps.length > 1) {
                // Group independent steps
                const groups = this.groupStepsByDependencies(steps);
                for (const group of groups) {
                    const groupResults = await Promise.all(group.map(async (step) => {
                        let retries = 0;
                        let lastError = null;
                        while (retries <= maxRetries) {
                            try {
                                const stepStart = Date.now();
                                const resolvedInput = this.resolveStepInput(step.input, stepOutputs);
                                const agent = agent_registry_1.agentRegistry.getAgent(this.mapToAgentType(step.agentType));
                                if (!agent) {
                                    throw new Error(`Agent ${step.agentType} not found`);
                                }
                                const response = await agent.execute({
                                    id: `plan_${plan.planId || 'unknown'}_${step.id}`,
                                    userId: context.userId,
                                    sessionId: context.sessionId,
                                    input: resolvedInput,
                                    context,
                                }, context);
                                const duration = Date.now() - stepStart;
                                totalTokensUsed += response.metadata.tokensUsed || 0;
                                totalCostUsd += response.metadata.costUsd || 0;
                                return {
                                    stepId: step.id,
                                    agentType: step.agentType,
                                    success: response.success,
                                    output: response.output,
                                    error: response.error,
                                    executionTimeMs: duration,
                                    retryCount: retries,
                                };
                            }
                            catch (error) {
                                lastError = error instanceof Error ? error : new Error(String(error));
                                retries++;
                                if (retries <= maxRetries) {
                                    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries - 1)));
                                }
                            }
                        }
                        return {
                            stepId: step.id,
                            agentType: step.agentType,
                            success: false,
                            output: null,
                            error: lastError?.message || 'Max retries exceeded',
                            executionTimeMs: 0,
                            retryCount: retries,
                        };
                    }));
                    stepResults.push(...groupResults);
                    groupResults.forEach((result, idx) => {
                        if (result.success && result.output) {
                            stepOutputs.set(group[idx].id, result.output);
                        }
                    });
                }
            }
            else {
                // Sequential execution
                for (const step of steps) {
                    let retries = 0;
                    let lastError = null;
                    let stepSuccess = false;
                    while (retries <= maxRetries) {
                        try {
                            const stepStart = Date.now();
                            const resolvedInput = this.resolveStepInput(step.input, stepOutputs);
                            const agent = agent_registry_1.agentRegistry.getAgent(this.mapToAgentType(step.agentType));
                            if (!agent) {
                                throw new Error(`Agent ${step.agentType} not found`);
                            }
                            const response = await agent.execute({
                                id: `plan_${plan.planId || 'unknown'}_${step.id}`,
                                userId: context.userId,
                                sessionId: context.sessionId,
                                input: resolvedInput,
                                context,
                            }, context);
                            const duration = Date.now() - stepStart;
                            totalTokensUsed += response.metadata.tokensUsed || 0;
                            totalCostUsd += response.metadata.costUsd || 0;
                            const result = {
                                stepId: step.id,
                                agentType: step.agentType,
                                success: response.success,
                                output: response.output,
                                error: response.error,
                                executionTimeMs: duration,
                                retryCount: retries,
                            };
                            stepResults.push(result);
                            if (response.success && response.output) {
                                stepOutputs.set(step.id, response.output);
                            }
                            stepSuccess = response.success;
                            break;
                        }
                        catch (error) {
                            lastError = error instanceof Error ? error : new Error(String(error));
                            retries++;
                            if (retries <= maxRetries) {
                                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries - 1)));
                            }
                        }
                    }
                    if (!stepSuccess && !step.fallback) {
                        logger_1.logger.warn({ stepId: step.id, error: lastError?.message }, 'Plan step failed, stopping execution');
                        break;
                    }
                }
            }
            return {
                results: stepResults,
                planId: plan.planId || plan.id || 'unknown',
                totalSteps: steps.length,
                successfulSteps: stepResults.filter(r => r.success).length,
                failedSteps: stepResults.filter(r => !r.success).length,
                totalTimeMs: Date.now() - startTime,
                totalTokensUsed,
                totalCostUsd,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, planId: plan.planId || plan.id }, 'Plan execution failed');
            throw error;
        }
    }
    /**
     * Reflect on execution results
     */
    static async reflectOnExecution(executionResults, originalRequest, storeInsights = true, context) {
        try {
            // Analyze results
            const results = executionResults.results || [executionResults];
            const steps = Array.isArray(results) ? results : [results];
            const successfulSteps = steps.filter((s) => s.success);
            const failedSteps = steps.filter((s) => !s.success);
            // Generate reflection prompt
            const reflectionPrompt = `
Analyze the following execution results and provide insights:

Original Request: ${originalRequest || 'Not provided'}
Total Steps: ${steps.length}
Successful Steps: ${successfulSteps.length}
Failed Steps: ${failedSteps.length}
Errors: ${failedSteps.map((s) => s.error).join('; ') || 'None'}

For each agent, evaluate performance:
${steps.map((s) => `- ${s.agentType}: ${s.success ? 'Success' : 'Failed'} (${s.executionTimeMs}ms, ${s.retryCount} retries)`).join('\n')}

Respond with JSON containing:
- summary: overall execution summary
- insights: array of key insights learned
- improvements: array of suggested improvements
- agentPerformance: object mapping agent types to {success, efficiency}
- recommendedNextSteps: array of suggested follow-up actions
`;
            const aiResponse = await this.generateText(reflectionPrompt, undefined, 0.3, 1500, 'openai');
            let parsed;
            try {
                parsed = JSON.parse(aiResponse.content);
            }
            catch {
                // Parse from text if JSON parsing fails
                parsed = {
                    summary: aiResponse.content,
                    insights: [],
                    improvements: [],
                    agentPerformance: {},
                    recommendedNextSteps: [],
                };
            }
            // Store insights in memory if requested
            if (storeInsights && context && parsed.insights && parsed.insights.length > 0) {
                for (const insight of parsed.insights) {
                    await memory_manager_1.MemoryManager.storeShortTerm(context.userId, `Reflection insight: ${insight}`, { type: 'reflection', timestamp: new Date().toISOString() });
                }
            }
            return {
                summary: parsed.summary || 'Execution completed',
                insights: parsed.insights || [],
                improvements: parsed.improvements || [],
                agentPerformance: parsed.agentPerformance || {},
                recommendedNextSteps: parsed.recommendedNextSteps || [],
            };
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Reflection failed');
            return {
                summary: 'Reflection analysis failed',
                insights: [],
                improvements: [],
                agentPerformance: {},
                recommendedNextSteps: [],
            };
        }
    }
    /**
     * Batch execute multiple requests
     */
    static async batchExecute(requests, context, maxConcurrent = 3) {
        const startTime = Date.now();
        const results = [];
        try {
            // Process in chunks to control concurrency
            for (let i = 0; i < requests.length; i += maxConcurrent) {
                const chunk = requests.slice(i, i + maxConcurrent);
                const chunkResults = await Promise.all(chunk.map(async (request) => {
                    const requestStart = Date.now();
                    try {
                        // Classify intent
                        const intent = await this.classifyIntent(request.input, true);
                        // Execute based on intent
                        let output;
                        if (intent.requiresMultipleAgents && intent.agentChain) {
                            const plan = await this.createPlan(intent, context, {
                                enableParallelization: true,
                                enableFallbacks: true,
                                estimatedCost: false,
                            });
                            const executionResult = await this.executePlan(plan, context);
                            output = {
                                intent: intent.primaryIntent,
                                planResult: executionResult,
                            };
                        }
                        else {
                            const agentOutput = await this.delegateToAgent(intent.suggestedAgent, request.input, intent.entities, context);
                            output = agentOutput;
                        }
                        return {
                            requestId: request.id,
                            intent: {
                                primaryIntent: intent.primaryIntent,
                                confidence: intent.confidence,
                                suggestedAgent: intent.suggestedAgent,
                            },
                            output,
                            success: true,
                            executionTimeMs: Date.now() - requestStart,
                        };
                    }
                    catch (error) {
                        return {
                            requestId: request.id,
                            intent: null,
                            output: null,
                            success: false,
                            error: error instanceof Error ? error.message : String(error),
                            executionTimeMs: Date.now() - requestStart,
                        };
                    }
                }));
                results.push(...chunkResults);
            }
            return {
                results,
                totalRequests: requests.length,
                successfulRequests: results.filter(r => r.success).length,
                failedRequests: results.filter(r => !r.success).length,
                totalTimeMs: Date.now() - startTime,
            };
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Batch execution failed');
            throw error;
        }
    }
    /**
     * Optimize a task plan
     */
    static async optimizePlan(plan, optimizationGoal = 'balanced', maxSteps) {
        try {
            const steps = plan.steps || [];
            const originalSteps = steps.length;
            // Apply optimizations based on goal
            let optimizedSteps = [...steps];
            switch (optimizationGoal) {
                case 'speed':
                    // Enable parallelization where possible
                    optimizedSteps = steps.map((step) => ({
                        ...step,
                        parallelGroup: step.dependsOn.length === 0 ? 'group_0' : step.parallelGroup,
                    }));
                    break;
                case 'cost':
                    // Consolidate steps that can be handled by a single agent
                    optimizedSteps = this.consolidateSteps(steps);
                    break;
                case 'accuracy':
                    // Add validation steps
                    optimizedSteps = this.addValidationSteps(steps);
                    break;
                case 'balanced':
                default:
                    // Mix of optimizations
                    optimizedSteps = steps.map((step) => ({
                        ...step,
                        parallelGroup: step.dependsOn.length === 0 ? 'group_0' : undefined,
                        fallback: step.fallback || {
                            id: `${step.id}_fallback`,
                            agentType: 'ORCHESTRATOR',
                            action: 'handle_error',
                            input: { originalStepId: step.id },
                            dependsOn: step.dependsOn,
                        },
                    }));
                    break;
            }
            // Enforce max steps limit
            if (maxSteps && optimizedSteps.length > maxSteps) {
                optimizedSteps = optimizedSteps.slice(0, maxSteps);
            }
            const originalTokens = plan.estimatedTokens || originalSteps * 500;
            const optimizedTokens = optimizedSteps.length * 400;
            const savingsPercentage = ((originalTokens - optimizedTokens) / originalTokens) * 100;
            return {
                originalSteps,
                optimizedSteps: optimizedSteps.length,
                originalEstimatedTokens: originalTokens,
                optimizedEstimatedTokens: optimizedTokens,
                savingsPercentage: Math.round(savingsPercentage),
                changes: [
                    optimizationGoal === 'speed' ? 'Enabled parallel execution for independent steps' : '',
                    optimizationGoal === 'cost' ? 'Consolidated steps for cost efficiency' : '',
                    optimizationGoal === 'accuracy' ? 'Added validation steps for accuracy' : '',
                    `Reduced estimated tokens by ${Math.round(savingsPercentage)}%`,
                ].filter(Boolean),
                optimizedPlan: {
                    ...plan,
                    steps: optimizedSteps,
                    estimatedTokens: optimizedTokens,
                    estimatedCost: optimizedTokens * 0.001,
                },
            };
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Plan optimization failed');
            throw error;
        }
    }
    /**
     * Suggest follow-up actions
     */
    static async suggestFollowUp(executionResults, userPreferences = {}, count = 3) {
        try {
            const prompt = `
Based on the following execution results and user preferences, suggest ${count} follow-up actions:

Execution Results: ${JSON.stringify(executionResults, null, 2)}
User Preferences: ${JSON.stringify(userPreferences, null, 2)}

Respond with JSON array of suggestions, each containing:
- action: short action name
- description: detailed description of the suggested action
- agentType: which agent should handle it
- confidence: 0-1 confidence score
- expectedBenefit: what the user gains from this action
`;
            const aiResponse = await this.generateText(prompt, undefined, 0.5, 800, 'openai');
            let suggestions;
            try {
                suggestions = JSON.parse(aiResponse.content);
            }
            catch {
                suggestions = [];
            }
            return {
                suggestions: Array.isArray(suggestions) ? suggestions.slice(0, count) : [],
            };
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Follow-up suggestion failed');
            return { suggestions: [] };
        }
    }
    // ============================================
    // Helper Methods
    // ============================================
    /**
     * Map string to AgentType enum
     */
    static mapToAgentType(agentTypeStr) {
        const mapping = {
            'email': agent_types_1.AgentType.EMAIL,
            'drive': agent_types_1.AgentType.DRIVE,
            'content': agent_types_1.AgentType.CONTENT,
            'social': agent_types_1.AgentType.SOCIAL,
            'calendar': agent_types_1.AgentType.CALENDAR,
            'web': agent_types_1.AgentType.WEB,
            'task': agent_types_1.AgentType.TASK,
            'orchestrator': agent_types_1.AgentType.ORCHESTRATOR,
            'EMAIL': agent_types_1.AgentType.EMAIL,
            'DRIVE': agent_types_1.AgentType.DRIVE,
            'CONTENT': agent_types_1.AgentType.CONTENT,
            'SOCIAL': agent_types_1.AgentType.SOCIAL,
            'CALENDAR': agent_types_1.AgentType.CALENDAR,
            'WEB': agent_types_1.AgentType.WEB,
            'TASK': agent_types_1.AgentType.TASK,
            'ORCHESTRATOR': agent_types_1.AgentType.ORCHESTRATOR,
        };
        return mapping[agentTypeStr.toUpperCase()] || agent_types_1.AgentType.ORCHESTRATOR;
    }
    /**
     * Find agent by capability keyword
     */
    static findAgentByCapability(keyword) {
        const allAgents = agent_registry_1.agentRegistry.getAllAgents();
        const keywordLower = keyword.toLowerCase();
        for (const agent of allAgents) {
            const description = agent.getDescription().toLowerCase();
            const name = agent.getName().toLowerCase();
            if (description.includes(keywordLower) || name.includes(keywordLower)) {
                return agent;
            }
        }
        return null;
    }
    /**
     * Find fallback agent for a failed delegation
     */
    static findFallbackAgent(agentType) {
        // Fallback chain: if primary agent fails, try a related agent
        const fallbackChain = {
            [agent_types_1.AgentType.EMAIL]: [agent_types_1.AgentType.WEB, agent_types_1.AgentType.ORCHESTRATOR],
            [agent_types_1.AgentType.DRIVE]: [agent_types_1.AgentType.WEB, agent_types_1.AgentType.ORCHESTRATOR],
            [agent_types_1.AgentType.CONTENT]: [agent_types_1.AgentType.WEB, agent_types_1.AgentType.ORCHESTRATOR],
            [agent_types_1.AgentType.SOCIAL]: [agent_types_1.AgentType.WEB, agent_types_1.AgentType.ORCHESTRATOR],
            [agent_types_1.AgentType.CALENDAR]: [agent_types_1.AgentType.TASK, agent_types_1.AgentType.ORCHESTRATOR],
            [agent_types_1.AgentType.WEB]: [agent_types_1.AgentType.CONTENT, agent_types_1.AgentType.ORCHESTRATOR],
            [agent_types_1.AgentType.TASK]: [agent_types_1.AgentType.CALENDAR, agent_types_1.AgentType.ORCHESTRATOR],
        };
        const chain = fallbackChain[agentType] || [agent_types_1.AgentType.ORCHESTRATOR];
        for (const fallbackType of chain) {
            const agent = agent_registry_1.agentRegistry.getAgent(fallbackType);
            if (agent)
                return agent;
        }
        return agent_registry_1.agentRegistry.getAgent(agent_types_1.AgentType.ORCHESTRATOR);
    }
    /**
     * Build provider chain with preferred model first
     */
    static buildProviderChain(preferred) {
        const allProviders = ['openai', 'anthropic', 'gemini'];
        const preferredIdx = allProviders.indexOf(preferred.toLowerCase());
        if (preferredIdx >= 0) {
            return [
                allProviders[preferredIdx],
                ...allProviders.filter((_, i) => i !== preferredIdx),
            ];
        }
        return allProviders;
    }
    /**
     * Describe a plan step in human-readable format
     */
    static describeStep(step) {
        return `${step.agentType.toLowerCase()} agent: ${step.action}`;
    }
    /**
     * Group steps by dependencies for parallel execution
     */
    static groupStepsByDependencies(steps) {
        const groups = [];
        const completed = new Set();
        steps.sort((a, b) => (a.dependsOn?.length || 0) - (b.dependsOn?.length || 0));
        for (let i = 0; i < steps.length; i++) {
            if (completed.has(i))
                continue;
            const group = [steps[i]];
            completed.add(i);
            for (let j = i + 1; j < steps.length; j++) {
                if (completed.has(j))
                    continue;
                const stepJ = steps[j];
                const canParallelize = stepJ.dependsOn?.length === 0 ||
                    stepJ.dependsOn?.every((dep) => !group.some(s => s.id === dep) || completed.has(steps.indexOf(s)));
                if (canParallelize) {
                    group.push(stepJ);
                    completed.add(j);
                }
            }
            groups.push(group);
        }
        return groups;
    }
    /**
     * Resolve step input with previous outputs
     */
    static resolveStepInput(input, previousOutputs) {
        if (typeof input === 'string' && input.startsWith('$') && previousOutputs.has(input.substring(1))) {
            return previousOutputs.get(input.substring(1));
        }
        if (typeof input === 'object' && input !== null && !Array.isArray(input)) {
            const resolved = {};
            for (const [key, value] of Object.entries(input)) {
                resolved[key] = this.resolveStepInput(value, previousOutputs);
            }
            return resolved;
        }
        return input;
    }
    /**
     * Consolidate steps for cost optimization
     */
    static consolidateSteps(steps) {
        const consolidated = [];
        const agentStepMap = new Map();
        for (const step of steps) {
            const key = step.agentType;
            if (!agentStepMap.has(key)) {
                agentStepMap.set(key, []);
            }
            agentStepMap.get(key).push(step);
        }
        for (const [agentType, agentSteps] of agentStepMap.entries()) {
            if (agentSteps.length > 1) {
                consolidated.push({
                    id: `consolidated_${agentSteps[0].id}`,
                    agentType,
                    action: 'batch_execute',
                    input: {
                        tasks: agentSteps.map(s => ({ action: s.action, input: s.input })),
                    },
                    dependsOn: [...new Set(agentSteps.flatMap(s => s.dependsOn || []))],
                });
            }
            else {
                consolidated.push(agentSteps[0]);
            }
        }
        return consolidated;
    }
    /**
     * Add validation steps for accuracy optimization
     */
    static addValidationSteps(steps) {
        const withValidation = [];
        for (const step of steps) {
            withValidation.push(step);
            if (step.agentType !== 'ORCHESTRATOR') {
                const validationStep = {
                    id: `${step.id}_validation`,
                    agentType: 'ORCHESTRATOR',
                    action: 'validate_output',
                    input: {
                        originalStep: step.id,
                        outputToValidate: `$${step.id}`,
                    },
                    dependsOn: [step.id],
                };
                withValidation.push(validationStep);
            }
        }
        return withValidation;
    }
}
exports.OrchestratorTools = OrchestratorTools;
//# sourceMappingURL=orchestrator.tools.js.map