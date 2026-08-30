"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiClient = void 0;
// enterprise-ai-agent-platform/apps/api/src/services/ai/gemini.client.ts
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../../utils/logger");
const api_config_1 = require("../../config/api.config");
class GeminiClient {
    constructor() {
        this.apiKey = api_config_1.apiConfig.gemini.apiKey;
        this.client = axios_1.default.create({
            baseURL: api_config_1.apiConfig.gemini.apiUrl,
            timeout: api_config_1.apiConfig.gemini.timeout,
        });
        this.client.interceptors.response.use((response) => response, (error) => {
            if (error.response?.status === 401) {
                logger_1.logger.error('Gemini API key invalid');
            }
            else if (error.response?.status === 429) {
                logger_1.logger.warn('Gemini rate limit exceeded');
            }
            return Promise.reject(error);
        });
    }
    static getInstance() {
        if (!GeminiClient.instance) {
            GeminiClient.instance = new GeminiClient();
        }
        return GeminiClient.instance;
    }
    buildUrl(model) {
        return `/models/${model}:generateContent?key=${this.apiKey}`;
    }
    buildStreamUrl(model) {
        return `/models/${model}:streamGenerateContent?key=${this.apiKey}&alt=sse`;
    }
    async complete(options) {
        const model = options.model || api_config_1.apiConfig.gemini.models.pro;
        const requestBody = {
            contents: options.contents,
            generationConfig: {
                temperature: options.temperature ?? 0.7,
                maxOutputTokens: options.maxOutputTokens ?? 1000,
            },
        };
        if (options.topP)
            requestBody.generationConfig.topP = options.topP;
        if (options.topK)
            requestBody.generationConfig.topK = options.topK;
        if (options.stopSequences)
            requestBody.generationConfig.stopSequences = options.stopSequences;
        if (options.systemInstruction) {
            requestBody.systemInstruction = { parts: [{ text: options.systemInstruction }] };
        }
        const response = await this.client.post(this.buildUrl(model), requestBody);
        return response.data;
    }
    async streamComplete(options, onChunk) {
        const model = options.model || api_config_1.apiConfig.gemini.models.pro;
        const requestBody = {
            contents: options.contents,
            generationConfig: {
                temperature: options.temperature ?? 0.7,
                maxOutputTokens: options.maxOutputTokens ?? 1000,
            },
        };
        if (options.systemInstruction) {
            requestBody.systemInstruction = { parts: [{ text: options.systemInstruction }] };
        }
        const response = await this.client.post(this.buildStreamUrl(model), requestBody, { responseType: 'stream' });
        let fullContent = '';
        let finalResponse = null;
        return new Promise((resolve, reject) => {
            let buffer = '';
            response.data.on('data', (chunk) => {
                const chunkStr = chunk.toString();
                buffer += chunkStr;
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]')
                            continue;
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.candidates?.[0]?.content?.parts?.[0]?.text) {
                                const newText = parsed.candidates[0].content.parts[0].text;
                                const delta = newText.slice(fullContent.length);
                                if (delta) {
                                    fullContent = newText;
                                    onChunk(delta);
                                }
                            }
                            finalResponse = parsed;
                        }
                        catch (e) {
                            // Ignore parse errors
                        }
                    }
                }
            });
            response.data.on('end', () => {
                if (finalResponse) {
                    resolve(finalResponse);
                }
                else {
                    resolve({
                        candidates: [{ content: { parts: [{ text: fullContent }], role: 'model' }, finishReason: 'STOP', safetyRatings: [] }],
                        usageMetadata: { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 },
                        modelVersion: model,
                    });
                }
            });
            response.data.on('error', reject);
        });
    }
    async createEmbedding(text) {
        const model = 'embedding-001';
        const response = await this.client.post(`/models/${model}:embedContent?key=${this.apiKey}`, { content: { parts: [{ text }] } });
        return response.data.embedding?.values || [];
    }
    calculateCost(model, inputTokens, outputTokens) {
        const pricing = {
            'gemini-1.5-pro': { input: 0.0000035, output: 0.0000105 },
            'gemini-1.5-flash': { input: 0.00000035, output: 0.00000105 },
            'gemini-1.0-pro': { input: 0.0000005, output: 0.0000015 },
        };
        const rate = pricing[model] || pricing['gemini-1.5-pro'];
        return (inputTokens * rate.input) + (outputTokens * rate.output);
    }
    async listModels() {
        const response = await this.client.get(`/models?key=${this.apiKey}`);
        return response.data.models?.map((m) => m.name) || [];
    }
}
exports.GeminiClient = GeminiClient;
GeminiClient.instance = null;
//# sourceMappingURL=gemini.client.js.map