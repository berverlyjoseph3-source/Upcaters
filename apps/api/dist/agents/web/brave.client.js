"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BraveSearchClient = void 0;
// enterprise-ai-agent-platform/apps/api/src/agents/web/brave.client.ts
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../../utils/logger");
const api_config_1 = require("../../config/api.config");
class BraveSearchClient {
    constructor() {
        this.client = null;
        this.MAX_RETRIES = 3;
        this.BASE_DELAY_MS = 1000;
        this.initializeClient();
    }
    initializeClient() {
        this.client = axios_1.default.create({
            baseURL: api_config_1.apiConfig.brave.apiUrl,
            headers: {
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip',
                'X-Subscription-Token': api_config_1.apiConfig.brave.apiKey,
            },
            timeout: api_config_1.apiConfig.timeouts.default,
        });
        this.client.interceptors.request.use((config) => {
            logger_1.logger.debug({ method: config.method, url: config.url, query: config.params?.q }, 'Brave Search API request');
            return config;
        }, (error) => Promise.reject(error));
        this.client.interceptors.response.use((response) => {
            logger_1.logger.debug({ status: response.status, query: response.config.params?.q }, 'Brave Search API response');
            return response;
        }, async (error) => {
            if (error.response?.status === 401) {
                logger_1.logger.error('Brave Search API key invalid or expired');
            }
            else if (error.response?.status === 429) {
                const retryAfter = error.response.headers['retry-after'];
                logger_1.logger.warn({ retryAfter }, 'Brave Search rate limit exceeded');
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
                    // Check for rate limit
                    if (axiosError.response?.status === 429) {
                        const retryAfter = axiosError.response.headers['retry-after'];
                        delay = retryAfter ? parseInt(retryAfter) * 1000 : delay * 2;
                    }
                    logger_1.logger.warn({ attempt, delay, context, error: lastError.message }, 'Brave Search API retry');
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError || new Error(`Failed after ${this.MAX_RETRIES} retries: ${context}`);
    }
    async searchWeb(options) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const params = {
                q: options.query,
                count: options.count || 10,
                safesearch: options.safesearch || 'moderate',
            };
            if (options.offset)
                params.offset = options.offset;
            if (options.country)
                params.country = options.country;
            if (options.search_lang)
                params.search_lang = options.search_lang;
            if (options.ui_lang)
                params.ui_lang = options.ui_lang;
            if (options.spellcheck !== undefined)
                params.spellcheck = options.spellcheck;
            if (options.freshness)
                params.freshness = options.freshness;
            if (options.goggles_id)
                params.goggles_id = options.goggles_id;
            if (options.units)
                params.units = options.units;
            if (options.extra_snippets)
                params.extra_snippets = options.extra_snippets;
            if (options.summary)
                params.summary = options.summary;
            const response = await this.client.get('/web/search', { params });
            return response.data;
        }, `searchWeb(${options.query})`);
    }
    async searchNews(query, count = 10, freshness) {
        return this.retryRequest(async () => {
            const params = { q: query, count, safesearch: 'moderate' };
            if (freshness)
                params.freshness = freshness;
            const response = await this.searchWeb({ query, count, freshness, result_filter: 'news' });
            return response.news?.results || [];
        }, `searchNews(${query})`);
    }
    async searchVideos(query, count = 10) {
        return this.retryRequest(async () => {
            const response = await this.searchWeb({ query, count, result_filter: 'videos' });
            return response.videos?.results || [];
        }, `searchVideos(${query})`);
    }
    async searchImages(query, count = 10, size) {
        return this.retryRequest(async () => {
            const response = await this.searchWeb({ query, count, result_filter: 'images' });
            return response.images?.results || [];
        }, `searchImages(${query})`);
    }
    async getFirstResult(query) {
        const results = await this.searchWeb({ query, count: 1 });
        return results.web?.results?.[0] || null;
    }
    async getTopResults(query, limit = 5) {
        const results = await this.searchWeb({ query, count: limit });
        return results.web?.results || [];
    }
    async searchWithSnippet(query, count = 10) {
        const results = await this.searchWeb({ query, count, extra_snippets: true });
        return (results.web?.results || []).map(r => ({
            title: r.title,
            url: r.url,
            snippet: r.description,
            source: r.profile?.name || r.meta_url?.hostname || 'Unknown',
        }));
    }
    async quickAnswer(query) {
        try {
            const results = await this.searchWeb({ query, count: 1, summary: true });
            if (results.summarizer?.summary?.[0]) {
                return {
                    answer: results.summarizer.summary[0].answer,
                    url: results.web?.results?.[0]?.url,
                };
            }
            return null;
        }
        catch (error) {
            logger_1.logger.warn({ error, query }, 'Quick answer search failed');
            return null;
        }
    }
    async searchGoggles(query, gogglesId, count = 10) {
        return this.searchWeb({ query, count, goggles_id: gogglesId });
    }
    async getSpellcheck(query) {
        try {
            const results = await this.searchWeb({ query, count: 1, spellcheck: true });
            return results.query?.altered || null;
        }
        catch (error) {
            return null;
        }
    }
}
exports.BraveSearchClient = BraveSearchClient;
//# sourceMappingURL=brave.client.js.map