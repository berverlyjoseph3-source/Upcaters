"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicClient = void 0;
// enterprise-ai-agent-platform/apps/api/src/services/ai/anthropic.client.ts
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../../utils/logger");
const api_config_1 = require("../../config/api.config");
class AnthropicClient {
    constructor() {
        this.client = axios_1.default.create({
            baseURL: api_config_1.apiConfig.anthropic.apiUrl,
            headers: {
                'x-api-key': api_config_1.apiConfig.anthropic.apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json',
            },
            timeout: api_config_1.apiConfig.anthropic.timeout,
        });
        this.client.interceptors.response.use((response) => response, (error) => {
            if (error.response?.status === 401) {
                logger_1.logger.error('Anthropic API key invalid');
            }
            else if (error.response?.status === 429) {
                logger_1.logger.warn('Anthropic rate limit exceeded');
            }
            return Promise.reject(error);
        });
    }
    static getInstance() {
        if (!AnthropicClient.instance) {
            AnthropicClient.instance = new AnthropicClient();
        }
        return AnthropicClient.instance;
    }
    async complete(options) {
        const requestBody = {
            model: options.model || api_config_1.apiConfig.anthropic.models.claude35,
            messages: options.messages,
            max_tokens: options.maxTokens || 1024,
            temperature: options.temperature ?? 0.7,
        };
        if (options.system)
            requestBody.system = options.system;
        if (options.topP)
            requestBody.top_p = options.topP;
        if (options.topK)
            requestBody.top_k = options.topK;
        if (options.stopSequences)
            requestBody.stop_sequences = options.stopSequences;
        if (options.stream)
            requestBody.stream = options.stream;
        const response = await this.client.post('/messages', requestBody);
        return response.data;
    }
    async streamComplete(options, onChunk) {
        const requestBody = {
            model: options.model || api_config_1.apiConfig.anthropic.models.claude35,
            messages: options.messages,
            max_tokens: options.maxTokens || 1024,
            temperature: options.temperature ?? 0.7,
            stream: true,
        };
        if (options.system)
            requestBody.system = options.system;
        const response = await this.client.post('/messages', requestBody, { responseType: 'stream' });
        let fullContent = '';
        let inputTokens = 0;
        let outputTokens = 0;
        let messageId = '';
        let stopReason = '';
        return new Promise((resolve, reject) => {
            let buffer = '';
            response.data.on('data', (chunk) => {
                const chunkStr = chunk.toString();
                const lines = chunkStr.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]')
                            continue;
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.type === 'message_start') {
                                messageId = parsed.message.id;
                                inputTokens = parsed.message.usage.input_tokens;
                            }
                            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                                fullContent += parsed.delta.text;
                                onChunk(parsed.delta.text);
                            }
                            if (parsed.type === 'message_stop') {
                                outputTokens = parsed.message.usage.output_tokens;
                                stopReason = parsed.message.stop_reason;
                            }
                        }
                        catch (e) {
                            // Ignore parse errors
                        }
                    }
                }
            });
            response.data.on('end', () => {
                resolve({
                    id: messageId,
                    type: 'message',
                    role: 'assistant',
                    content: [{ type: 'text', text: fullContent }],
                    model: options.model || api_config_1.apiConfig.anthropic.models.claude35,
                    stop_reason: stopReason,
                    stop_sequence: null,
                    usage: { input_tokens: inputTokens, output_tokens: outputTokens },
                });
            });
            response.data.on('error', reject);
        });
    }
    async countTokens(text) {
        return Math.ceil(text.length / 4);
    }
    calculateCost(model, inputTokens, outputTokens) {
        const pricing = {
            'claude-3-opus-20240229': { input: 0.000015, output: 0.000075 },
            'claude-3-5-sonnet-20241022': { input: 0.000003, output: 0.000015 },
            'claude-3-haiku-20240307': { input: 0.00000025, output: 0.00000125 },
        };
        const rate = pricing[model] || pricing['claude-3-5-sonnet-20241022'];
        return (inputTokens * rate.input) + (outputTokens * rate.output);
    }
}
exports.AnthropicClient = AnthropicClient;
AnthropicClient.instance = null;
//# sourceMappingURL=anthropic.client.js.map