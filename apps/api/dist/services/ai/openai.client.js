"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIClient = void 0;
// enterprise-ai-agent-platform/apps/api/src/services/ai/openai.client.ts
const openai_1 = __importDefault(require("openai"));
const logger_1 = require("../../utils/logger");
const api_config_1 = require("../../config/api.config");
class OpenAIClient {
    constructor() {
        this.client = new openai_1.default({
            apiKey: api_config_1.apiConfig.openai.apiKey,
            timeout: api_config_1.apiConfig.openai.timeout,
            maxRetries: api_config_1.apiConfig.openai.maxRetries,
        });
        logger_1.logger.info('OpenAI client initialized');
    }
    static getInstance() {
        if (!OpenAIClient.instance) {
            OpenAIClient.instance = new OpenAIClient();
        }
        return OpenAIClient.instance;
    }
    async complete(options) {
        const response = await this.client.chat.completions.create({
            model: options.model || api_config_1.apiConfig.openai.models.gpt4,
            messages: options.messages,
            max_tokens: options.maxTokens ?? 1000,
            temperature: options.temperature ?? 0.7,
            top_p: options.topP ?? 1,
            frequency_penalty: options.frequencyPenalty ?? 0,
            presence_penalty: options.presencePenalty ?? 0,
            stop: options.stop,
            stream: false,
        });
        return {
            id: response.id,
            object: response.object,
            created: response.created,
            model: response.model,
            choices: response.choices.map(c => ({
                index: c.index,
                message: { role: c.message.role, content: c.message.content || '' },
                finish_reason: c.finish_reason || 'stop',
            })),
            usage: {
                prompt_tokens: response.usage?.prompt_tokens || 0,
                completion_tokens: response.usage?.completion_tokens || 0,
                total_tokens: response.usage?.total_tokens || 0,
            },
        };
    }
    async streamComplete(options, onChunk) {
        const stream = await this.client.chat.completions.create({
            model: options.model || api_config_1.apiConfig.openai.models.gpt4,
            messages: options.messages,
            max_tokens: options.maxTokens ?? 1000,
            temperature: options.temperature ?? 0.7,
            stream: true,
        });
        let fullContent = '';
        let responseId = '';
        let responseModel = '';
        for await (const chunk of stream) {
            responseId = chunk.id;
            responseModel = chunk.model;
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                fullContent += content;
                onChunk(content);
            }
        }
        return {
            id: responseId,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: responseModel,
            choices: [{ index: 0, message: { role: 'assistant', content: fullContent }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        };
    }
    async createEmbedding(options) {
        const response = await this.client.embeddings.create({
            model: options.model || api_config_1.apiConfig.openai.models.embedding,
            input: options.input,
        });
        return {
            object: response.object,
            data: response.data.map(d => ({
                object: d.object,
                index: d.index,
                embedding: d.embedding,
            })),
            usage: {
                prompt_tokens: response.usage.prompt_tokens,
                total_tokens: response.usage.total_tokens,
            },
        };
    }
    async createImage(prompt, size = '1024x1024', quality = 'standard') {
        const response = await this.client.images.generate({
            model: 'dall-e-3',
            prompt,
            n: 1,
            size: size,
            quality: quality,
        });
        const url = response.data?.[0]?.url;
        if (!url) {
            throw new Error('OpenAI image generation returned no image URL');
        }
        return url;
    }
    calculateCost(model, tokensUsed) {
        const pricing = {
            'gpt-4-turbo-preview': 0.00001,
            'gpt-4': 0.00003,
            'gpt-3.5-turbo': 0.000001,
            'text-embedding-3-small': 0.00000002,
            'dall-e-3': 0.04,
        };
        const rate = pricing[model] || 0.00001;
        return tokensUsed * rate;
    }
    async listModels() {
        const response = await this.client.models.list();
        return response.data.map(m => m.id);
    }
}
exports.OpenAIClient = OpenAIClient;
OpenAIClient.instance = null;
//# sourceMappingURL=openai.client.js.map