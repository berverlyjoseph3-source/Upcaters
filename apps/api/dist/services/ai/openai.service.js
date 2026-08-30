"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIService = void 0;
// enterprise-ai-agent-platform/apps/api/src/services/ai/openai.service.ts
const openai_1 = __importDefault(require("openai"));
const logger_1 = require("../../utils/logger");
const api_config_1 = require("../../config/api.config");
class OpenAIService {
    static initialize() {
        if (!this.client) {
            this.client = new openai_1.default({
                apiKey: api_config_1.apiConfig.openai.apiKey,
                timeout: api_config_1.apiConfig.openai.timeout,
                maxRetries: this.MAX_RETRIES,
            });
            logger_1.logger.info('OpenAI client initialized');
        }
    }
    static getClient() {
        if (!this.client) {
            this.initialize();
        }
        if (!this.client) {
            throw new Error('OpenAI client not initialized');
        }
        return this.client;
    }
    static async complete(options) {
        const startTime = Date.now();
        const client = this.getClient();
        let lastError = null;
        const messages = [];
        if (options.systemPrompt) {
            messages.push({ role: 'system', content: options.systemPrompt });
        }
        messages.push({ role: 'user', content: options.prompt });
        const model = options.model || api_config_1.apiConfig.openai.models.gpt4;
        for (let attempt = 1; attempt <= this.MAX_RETRIES + 1; attempt++) {
            try {
                const response = await client.chat.completions.create({
                    model,
                    messages,
                    temperature: options.temperature ?? 0.7,
                    max_tokens: options.maxTokens ?? 1000,
                    top_p: options.topP ?? 1,
                    frequency_penalty: options.frequencyPenalty ?? 0,
                    presence_penalty: options.presencePenalty ?? 0,
                });
                const completion = response.choices[0];
                const usage = response.usage;
                const tokensUsed = usage?.total_tokens || 0;
                const costUsd = this.calculateCost(model, tokensUsed);
                logger_1.logger.debug({
                    model: response.model,
                    promptTokens: usage?.prompt_tokens,
                    completionTokens: usage?.completion_tokens,
                    totalTokens: tokensUsed,
                    costUsd,
                    durationMs: Date.now() - startTime,
                    attempt,
                }, 'OpenAI completion completed');
                return {
                    content: completion.message.content || '',
                    model: response.model,
                    tokensUsed: {
                        prompt: usage?.prompt_tokens || 0,
                        completion: usage?.completion_tokens || 0,
                        total: tokensUsed,
                    },
                    finishReason: completion.finish_reason || 'stop',
                    costUsd,
                };
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                logger_1.logger.warn({ error: lastError.message, attempt, model }, 'OpenAI completion attempt failed');
                if (attempt <= this.MAX_RETRIES) {
                    const delay = this.BASE_DELAY_MS * Math.pow(2, attempt - 1);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError || new Error('OpenAI completion failed after retries');
    }
    static async completeWithFallback(options) {
        const models = [api_config_1.apiConfig.openai.models.gpt4, api_config_1.apiConfig.openai.models.gpt35];
        let lastError = null;
        for (const model of models) {
            try {
                return await this.complete({ ...options, model });
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                logger_1.logger.warn({ error: lastError.message, model }, 'Model failed, trying fallback');
            }
        }
        throw lastError || new Error('All OpenAI models failed');
    }
    static async createEmbedding(options) {
        const client = this.getClient();
        const input = Array.isArray(options.input) ? options.input : [options.input];
        const model = options.model || api_config_1.apiConfig.openai.models.embedding;
        try {
            const response = await client.embeddings.create({
                model,
                input,
            });
            const embeddings = response.data.map(item => item.embedding);
            const tokensUsed = response.usage.total_tokens;
            logger_1.logger.debug({
                inputCount: input.length,
                embeddingDimensions: embeddings[0]?.length,
                tokensUsed,
            }, 'Embeddings created');
            return { embeddings, tokensUsed };
        }
        catch (error) {
            logger_1.logger.error({ error, inputCount: input.length }, 'Failed to create embeddings');
            throw error;
        }
    }
    static async streamComplete(options, onChunk) {
        const client = this.getClient();
        const messages = [];
        if (options.systemPrompt) {
            messages.push({ role: 'system', content: options.systemPrompt });
        }
        messages.push({ role: 'user', content: options.prompt });
        const model = options.model || api_config_1.apiConfig.openai.models.gpt4;
        let fullContent = '';
        try {
            const stream = await client.chat.completions.create({
                model,
                messages,
                temperature: options.temperature ?? 0.7,
                max_tokens: options.maxTokens ?? 1000,
                stream: true,
            });
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                    fullContent += content;
                    onChunk(content);
                }
            }
            const tokensUsed = Math.ceil(fullContent.length / 4);
            const costUsd = this.calculateCost(model, tokensUsed);
            return {
                content: fullContent,
                model,
                tokensUsed: { prompt: 0, completion: tokensUsed, total: tokensUsed },
                finishReason: 'stop',
                costUsd,
            };
        }
        catch (error) {
            logger_1.logger.error({ error }, 'OpenAI streaming failed');
            throw error;
        }
    }
    static calculateCost(model, tokensUsed) {
        const pricing = {
            'gpt-4-turbo-preview': 0.00001,
            'gpt-4': 0.00003,
            'gpt-3.5-turbo': 0.000001,
            'text-embedding-3-small': 0.00000002,
        };
        const rate = pricing[model] || 0.00001;
        return tokensUsed * rate;
    }
    static async listModels() {
        const client = this.getClient();
        try {
            const response = await client.models.list();
            return response.data.map(m => m.id);
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to list models');
            return [];
        }
    }
    static estimateTokens(text) {
        return Math.ceil(text.length / 4);
    }
}
exports.OpenAIService = OpenAIService;
OpenAIService.client = null;
OpenAIService.MAX_RETRIES = api_config_1.apiConfig.openai.maxRetries;
OpenAIService.BASE_DELAY_MS = 1000;
//# sourceMappingURL=openai.service.js.map