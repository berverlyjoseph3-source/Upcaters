"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiService = void 0;
// enterprise-ai-agent-platform/apps/api/src/services/ai/gemini.service.ts
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../../utils/logger");
const api_config_1 = require("../../config/api.config");
class GeminiService {
    static initialize() {
        if (!this.client) {
            this.client = axios_1.default.create({
                baseURL: api_config_1.apiConfig.gemini.apiUrl,
                timeout: api_config_1.apiConfig.gemini.timeout,
            });
            logger_1.logger.info('Gemini client initialized');
        }
    }
    static getClient() {
        if (!this.client) {
            this.initialize();
        }
        if (!this.client) {
            throw new Error('Gemini client not initialized');
        }
        return this.client;
    }
    static buildUrl(model) {
        return `/models/${model}:generateContent?key=${api_config_1.apiConfig.gemini.apiKey}`;
    }
    static async createEmbedding(text, model) {
        const client = this.getClient();
        const embeddingModel = model || 'embedding-001';
        const response = await client.post(`/models/${embeddingModel}:embedContent?key=${api_config_1.apiConfig.gemini.apiKey}`, {
            model: `models/${embeddingModel}`,
            content: { parts: [{ text }] },
        });
        const values = response.data.embedding?.values || [];
        // Gemini's embedContent response doesn't report token usage directly;
        // approximate using the same heuristic as other providers in this codebase.
        const approxTokens = Math.ceil(text.length / 4);
        return {
            embeddings: [values],
            tokensUsed: approxTokens,
        };
    }
    static async complete(options) {
        const startTime = Date.now();
        const client = this.getClient();
        let lastError = null;
        const model = options.model || api_config_1.apiConfig.gemini.models.pro;
        const contents = [];
        if (options.systemPrompt) {
            contents.push({ role: 'user', parts: [{ text: options.systemPrompt }] });
            contents.push({ role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] });
        }
        contents.push({ role: 'user', parts: [{ text: options.prompt }] });
        const generationConfig = {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxTokens ?? 1000,
        };
        if (options.topP)
            generationConfig.topP = options.topP;
        if (options.topK)
            generationConfig.topK = options.topK;
        if (options.stopSequences)
            generationConfig.stopSequences = options.stopSequences;
        for (let attempt = 1; attempt <= this.MAX_RETRIES + 1; attempt++) {
            try {
                const response = await client.post(this.buildUrl(model), {
                    contents,
                    generationConfig,
                });
                const candidate = response.data.candidates?.[0];
                const content = candidate?.content?.parts?.[0]?.text || '';
                const finishReason = candidate?.finishReason || 'STOP';
                const promptTokens = response.data.usageMetadata?.promptTokenCount || 0;
                const completionTokens = response.data.usageMetadata?.candidatesTokenCount || 0;
                const totalTokens = promptTokens + completionTokens;
                const costUsd = this.calculateCost(model, promptTokens, completionTokens);
                logger_1.logger.debug({
                    model,
                    promptTokens,
                    completionTokens,
                    totalTokens,
                    costUsd,
                    finishReason,
                    durationMs: Date.now() - startTime,
                    attempt,
                }, 'Gemini completion completed');
                return {
                    content,
                    model,
                    finishReason: finishReason.toLowerCase(),
                    tokensUsed: { prompt: promptTokens, completion: completionTokens, total: totalTokens },
                    costUsd,
                };
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                logger_1.logger.warn({ error: lastError.message, attempt, model }, 'Gemini completion attempt failed');
                if (attempt <= this.MAX_RETRIES) {
                    const delay = this.BASE_DELAY_MS * Math.pow(2, attempt - 1);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError || new Error('Gemini completion failed after retries');
    }
    static async completeWithFallback(options) {
        const models = [api_config_1.apiConfig.gemini.models.pro, api_config_1.apiConfig.gemini.models.flash];
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
        throw lastError || new Error('All Gemini models failed');
    }
    static async streamComplete(options, onChunk) {
        const client = this.getClient();
        const model = options.model || api_config_1.apiConfig.gemini.models.pro;
        let fullContent = '';
        const contents = [];
        if (options.systemPrompt) {
            contents.push({ role: 'user', parts: [{ text: options.systemPrompt }] });
            contents.push({ role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] });
        }
        contents.push({ role: 'user', parts: [{ text: options.prompt }] });
        const generationConfig = {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxTokens ?? 1000,
        };
        try {
            const response = await client.post(this.buildUrl(model), {
                contents,
                generationConfig,
            }, { responseType: 'stream' });
            return new Promise((resolve, reject) => {
                let buffer = '';
                response.data.on('data', (chunk) => {
                    const chunkStr = chunk.toString();
                    buffer += chunkStr;
                    try {
                        const parsed = JSON.parse(buffer);
                        if (parsed.candidates?.[0]?.content?.parts?.[0]?.text) {
                            const newContent = parsed.candidates[0].content.parts[0].text;
                            const delta = newContent.slice(fullContent.length);
                            if (delta) {
                                fullContent = newContent;
                                onChunk(delta);
                            }
                        }
                        buffer = '';
                    }
                    catch (e) {
                        // Incomplete JSON, continue buffering
                    }
                });
                response.data.on('end', () => {
                    const promptTokens = 0; // Not available in streaming
                    const completionTokens = Math.ceil(fullContent.length / 4);
                    const costUsd = this.calculateCost(model, promptTokens, completionTokens);
                    resolve({
                        content: fullContent,
                        model,
                        finishReason: 'stop',
                        tokensUsed: { prompt: promptTokens, completion: completionTokens, total: completionTokens },
                        costUsd,
                    });
                });
                response.data.on('error', reject);
            });
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Gemini streaming failed');
            throw error;
        }
    }
    static calculateCost(model, inputTokens, outputTokens) {
        const pricing = {
            'gemini-1.5-pro': { input: 0.0000035, output: 0.0000105 },
            'gemini-1.5-flash': { input: 0.00000035, output: 0.00000105 },
        };
        const rate = pricing[model] || { input: 0.0000035, output: 0.0000105 };
        return (inputTokens * rate.input) + (outputTokens * rate.output);
    }
    static async listModels() {
        const client = this.getClient();
        try {
            const response = await client.get(`/models?key=${api_config_1.apiConfig.gemini.apiKey}`);
            return response.data.models?.map((m) => m.name) || [];
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
exports.GeminiService = GeminiService;
GeminiService.client = null;
GeminiService.MAX_RETRIES = api_config_1.apiConfig.gemini.maxRetries;
GeminiService.BASE_DELAY_MS = 1000;
//# sourceMappingURL=gemini.service.js.map