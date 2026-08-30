"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerplexityClient = void 0;
// enterprise-ai-agent-platform/apps/api/src/agents/web/perplexity.client.ts
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../../utils/logger");
const api_config_1 = require("../../config/api.config");
class PerplexityClient {
    constructor() {
        this.client = null;
        this.MAX_RETRIES = 3;
        this.BASE_DELAY_MS = 1000;
        this.initializeClient();
    }
    initializeClient() {
        this.client = axios_1.default.create({
            baseURL: api_config_1.apiConfig.perplexity.apiUrl,
            headers: {
                'Authorization': `Bearer ${api_config_1.apiConfig.perplexity.apiKey}`,
                'Content-Type': 'application/json',
            },
            timeout: api_config_1.apiConfig.timeouts.ai,
        });
        this.client.interceptors.request.use((config) => {
            logger_1.logger.debug({ method: config.method, url: config.url }, 'Perplexity API request');
            return config;
        }, (error) => Promise.reject(error));
        this.client.interceptors.response.use((response) => {
            logger_1.logger.debug({ status: response.status, model: response.data?.model, tokens: response.data?.usage?.total_tokens }, 'Perplexity API response');
            return response;
        }, async (error) => {
            if (error.response?.status === 401) {
                logger_1.logger.error('Perplexity API key invalid');
            }
            else if (error.response?.status === 429) {
                logger_1.logger.warn('Perplexity rate limit exceeded');
            }
            else if (error.response?.status === 402) {
                logger_1.logger.error('Perplexity API payment required');
            }
            throw error;
        });
    }
    /**
     * Retry wrapper for API calls
     */
    async retryRequest(fn, context) {
        let lastError = null;
        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                return await fn();
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (attempt < this.MAX_RETRIES) {
                    const axiosError = error;
                    let delay = this.BASE_DELAY_MS * Math.pow(2, attempt - 1);
                    if (axiosError.response?.status === 429) {
                        const retryAfter = axiosError.response.headers['retry-after'];
                        delay = retryAfter ? parseInt(retryAfter) * 1000 : delay * 2;
                    }
                    logger_1.logger.warn({ attempt, delay, context, error: lastError.message }, 'Perplexity API retry');
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError || new Error(`Failed after ${this.MAX_RETRIES} retries: ${context}`);
    }
    async complete(options) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const model = options.model || 'llama-3.1-sonar-small-128k-online';
            const messages = [
                {
                    role: 'system',
                    content: 'You are a helpful research assistant. Provide accurate, well-sourced information with citations. Be concise and informative.',
                },
                {
                    role: 'user',
                    content: options.query,
                },
            ];
            const requestBody = {
                model,
                messages,
                max_tokens: options.maxTokens || 2000,
                temperature: options.temperature ?? 0.2,
                top_p: options.topP ?? 0.9,
            };
            if (options.searchDomainFilter) {
                requestBody.search_domain_filter = options.searchDomainFilter;
            }
            if (options.searchRecencyFilter) {
                requestBody.search_recency_filter = options.searchRecencyFilter;
            }
            if (options.returnImages) {
                requestBody.return_images = true;
            }
            if (options.returnRelatedQuestions) {
                requestBody.return_related_questions = true;
            }
            if (options.frequencyPenalty !== undefined) {
                requestBody.frequency_penalty = options.frequencyPenalty;
            }
            if (options.presencePenalty !== undefined) {
                requestBody.presence_penalty = options.presencePenalty;
            }
            const response = await this.client.post('/chat/completions', requestBody);
            return response.data;
        }, `complete(${options.query.substring(0, 100)})`);
    }
    async research(query, detail = 'detailed') {
        const maxTokens = detail === 'comprehensive' ? 4000 : detail === 'concise' ? 1000 : 2000;
        const response = await this.complete({
            query,
            returnRelatedQuestions: true,
            maxTokens,
            temperature: 0.1,
        });
        return {
            answer: response.choices[0]?.message?.content || '',
            sources: (response.citations || []).map((citation, index) => ({
                title: typeof citation === 'string' ? citation : `Source ${index + 1}`,
                url: typeof citation === 'string' ? citation : `https://example.com/source-${index + 1}`,
            })),
            followUpQuestions: response.related_questions,
            images: response.images,
            citations: response.citations,
        };
    }
    async quickAnswer(query) {
        const response = await this.complete({
            query,
            maxTokens: 500,
            temperature: 0.1,
        });
        return response.choices[0]?.message?.content || '';
    }
    async searchWithSources(query) {
        const response = await this.complete({ query, maxTokens: 2000 });
        return {
            answer: response.choices[0]?.message?.content || '',
            sources: response.citations || [],
        };
    }
    async researchWithImages(query) {
        const response = await this.complete({
            query,
            returnImages: true,
            maxTokens: 3000,
        });
        return {
            answer: response.choices[0]?.message?.content || '',
            sources: response.citations || [],
            images: response.images,
        };
    }
    async compareTopics(topics) {
        const results = await Promise.allSettled(topics.map(async (topic) => {
            try {
                const response = await this.complete({
                    query: `Provide a concise summary and analysis of: ${topic}`,
                    maxTokens: 1000,
                });
                return {
                    topic,
                    summary: response.choices[0]?.message?.content || 'No information available',
                    sources: response.citations,
                };
            }
            catch (error) {
                return {
                    topic,
                    summary: 'Failed to retrieve information',
                };
            }
        }));
        return results.map(r => r.status === 'fulfilled' ? r.value : {
            topic: 'Unknown',
            summary: 'Failed to retrieve information'
        });
    }
    async analyzeSentiment(text) {
        const query = `Analyze the sentiment of the following text. Respond with valid JSON ONLY: {"sentiment": "positive", "confidence": 85, "explanation": "brief explanation of analysis"}\n\nText: "${text.substring(0, 1000)}"`;
        const answer = await this.quickAnswer(query);
        try {
            // Extract JSON from response
            const jsonMatch = answer.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    sentiment: parsed.sentiment || 'neutral',
                    confidence: parsed.confidence || 50,
                    explanation: parsed.explanation || 'Could not determine sentiment',
                };
            }
        }
        catch (error) {
            logger_1.logger.warn({ error }, 'Failed to parse sentiment analysis response');
        }
        return {
            sentiment: 'neutral',
            confidence: 50,
            explanation: 'Could not determine sentiment accurately',
        };
    }
    async factCheck(claim) {
        const query = `Fact check this claim and respond with JSON: {"verdict": "true/false/misleading/unverifiable", "confidence": 85, "explanation": "detailed explanation with evidence"}\n\nClaim: ${claim}`;
        const answer = await this.quickAnswer(query);
        try {
            const jsonMatch = answer.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    claim,
                    verdict: parsed.verdict || 'unverifiable',
                    confidence: parsed.confidence || 50,
                    explanation: parsed.explanation || 'Could not verify claim',
                    sources: [],
                };
            }
        }
        catch (error) {
            logger_1.logger.warn({ error }, 'Failed to parse fact check response');
        }
        return {
            claim,
            verdict: 'unverifiable',
            confidence: 50,
            explanation: 'Could not verify the claim',
            sources: [],
        };
    }
    async getLatestNews(topic) {
        return this.searchWithSources(`What are the latest developments in ${topic}? Include recent news and updates.`);
    }
    async generateSummary(text, maxLength = 200) {
        const query = `Summarize the following text in no more than ${maxLength} words:\n\n${text.substring(0, 4000)}`;
        return this.quickAnswer(query);
    }
    async extractKeyPoints(text) {
        const query = `Extract the key points from this text. Respond with valid JSON array: [{"point": "key point", "importance": 0.8}]\n\n${text.substring(0, 4000)}`;
        const answer = await this.quickAnswer(query);
        try {
            const jsonMatch = answer.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        }
        catch (error) {
            logger_1.logger.warn({ error }, 'Failed to parse key points');
        }
        // Fallback: split by newlines
        return answer.split('\n')
            .filter(line => line.trim().length > 10)
            .map(point => ({
            point: point.replace(/^[•\-\d]+\.?\s*/, '').trim(),
            importance: 0.5,
        }));
    }
}
exports.PerplexityClient = PerplexityClient;
//# sourceMappingURL=perplexity.client.js.map