"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FacebookClient = void 0;
// enterprise-ai-agent-platform/apps/api/src/agents/social/facebook.client.ts
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../../utils/logger");
const api_config_1 = require("../../config/api.config");
class FacebookClient {
    constructor(accessToken) {
        this.client = null;
        this.accessToken = '';
        this.pageAccessTokens = new Map();
        this.MAX_RETRIES = 3;
        this.BASE_DELAY_MS = 1000;
        this.accessToken = accessToken;
        this.initializeClient();
    }
    initializeClient() {
        this.client = axios_1.default.create({
            baseURL: api_config_1.apiConfig.facebook.apiUrl,
            params: { access_token: this.accessToken },
            timeout: api_config_1.apiConfig.timeouts.default,
        });
        this.client.interceptors.request.use((config) => {
            logger_1.logger.debug({ method: config.method, url: config.url }, 'Facebook API request');
            return config;
        }, (error) => Promise.reject(error));
        this.client.interceptors.response.use((response) => {
            logger_1.logger.debug({ status: response.status, url: response.config.url }, 'Facebook API response');
            return response;
        }, async (error) => {
            if (error.response?.status === 401) {
                logger_1.logger.error('Facebook token expired or invalid');
            }
            else if (error.response?.status === 429) {
                logger_1.logger.warn('Facebook rate limit exceeded');
            }
            throw error;
        });
    }
    async updateAccessToken(newToken) {
        this.accessToken = newToken;
        this.initializeClient();
    }
    async retryRequest(fn, context) {
        let lastError = null;
        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                return await fn();
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (attempt < this.MAX_RETRIES) {
                    const delay = this.BASE_DELAY_MS * Math.pow(2, attempt - 1);
                    logger_1.logger.warn({ attempt, delay, context, error: lastError.message }, 'Facebook API retry');
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError || new Error(`Failed after ${this.MAX_RETRIES} retries: ${context}`);
    }
    async getPages() {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get('/me/accounts', {
                params: {
                    fields: 'id,name,access_token,category,category_list,tasks,instagram_business_account,fan_count',
                },
            });
            const pages = response.data.data || [];
            for (const page of pages) {
                this.pageAccessTokens.set(page.id, page.access_token);
            }
            return pages;
        }, 'getPages');
    }
    async getPageAccessToken(pageId) {
        if (this.pageAccessTokens.has(pageId)) {
            return this.pageAccessTokens.get(pageId);
        }
        const pages = await this.getPages();
        const page = pages.find(p => p.id === pageId);
        if (!page) {
            throw new Error(`Page ${pageId} not found`);
        }
        return page.access_token;
    }
    async postToPage(pageId, content, mediaUrl) {
        return this.retryRequest(async () => {
            const pageToken = await this.getPageAccessToken(pageId);
            if (mediaUrl) {
                const response = await axios_1.default.post(`${api_config_1.apiConfig.facebook.apiUrl}/${pageId}/photos`, {
                    url: mediaUrl,
                    caption: content,
                    access_token: pageToken,
                    published: true,
                });
                return { id: response.data.id, post_id: response.data.post_id };
            }
            else {
                const response = await axios_1.default.post(`${api_config_1.apiConfig.facebook.apiUrl}/${pageId}/feed`, {
                    message: content,
                    access_token: pageToken,
                });
                return { id: response.data.id };
            }
        }, `postToPage(${pageId})`);
    }
    async postToInstagram(pageId, imageUrl, caption) {
        return this.retryRequest(async () => {
            const page = await this.getPageInfo(pageId);
            if (!page.instagram_business_account) {
                throw new Error('Page does not have an Instagram Business Account connected');
            }
            const igUserId = page.instagram_business_account.id;
            const pageToken = await this.getPageAccessToken(pageId);
            // Step 1: Create media container
            const createResponse = await axios_1.default.post(`${api_config_1.apiConfig.facebook.apiUrl}/${igUserId}/media`, {
                image_url: imageUrl,
                caption: caption,
                access_token: pageToken,
            });
            const creationId = createResponse.data.id;
            // Step 2: Publish the media
            const publishResponse = await axios_1.default.post(`${api_config_1.apiConfig.facebook.apiUrl}/${igUserId}/media_publish`, {
                creation_id: creationId,
                access_token: pageToken,
            });
            return { id: publishResponse.data.id, media_id: publishResponse.data.id };
        }, `postToInstagram(${pageId})`);
    }
    async postCarouselToInstagram(pageId, imageUrls, caption) {
        return this.retryRequest(async () => {
            const page = await this.getPageInfo(pageId);
            if (!page.instagram_business_account) {
                throw new Error('Page does not have an Instagram Business Account connected');
            }
            const igUserId = page.instagram_business_account.id;
            const pageToken = await this.getPageAccessToken(pageId);
            // Step 1: Create media containers for each image
            const containerIds = [];
            for (const imageUrl of imageUrls) {
                const createResponse = await axios_1.default.post(`${api_config_1.apiConfig.facebook.apiUrl}/${igUserId}/media`, {
                    image_url: imageUrl,
                    is_carousel_item: true,
                    access_token: pageToken,
                });
                containerIds.push(createResponse.data.id);
            }
            // Step 2: Create carousel container
            const carouselResponse = await axios_1.default.post(`${api_config_1.apiConfig.facebook.apiUrl}/${igUserId}/media`, {
                media_type: 'CAROUSEL',
                children: containerIds,
                caption: caption,
                access_token: pageToken,
            });
            // Step 3: Publish
            const publishResponse = await axios_1.default.post(`${api_config_1.apiConfig.facebook.apiUrl}/${igUserId}/media_publish`, {
                creation_id: carouselResponse.data.id,
                access_token: pageToken,
            });
            return { id: publishResponse.data.id };
        }, `postCarouselToInstagram(${pageId})`);
    }
    async getPageInfo(pageId) {
        return this.retryRequest(async () => {
            const pageToken = await this.getPageAccessToken(pageId);
            const response = await axios_1.default.get(`${api_config_1.apiConfig.facebook.apiUrl}/${pageId}`, {
                params: {
                    fields: 'id,name,category,category_list,instagram_business_account,fan_count,followers_count',
                    access_token: pageToken,
                },
            });
            return response.data;
        }, `getPageInfo(${pageId})`);
    }
    async getPost(postId, pageId) {
        return this.retryRequest(async () => {
            let token = this.accessToken;
            if (pageId) {
                token = await this.getPageAccessToken(pageId);
            }
            const response = await axios_1.default.get(`${api_config_1.apiConfig.facebook.apiUrl}/${postId}`, {
                params: {
                    fields: 'id,message,created_time,updated_time,shares,reactions.summary(true),comments.summary(true),permalink_url',
                    access_token: token,
                },
            });
            return response.data;
        }, `getPost(${postId})`);
    }
    async getPostAnalytics(postId, pageId) {
        return this.retryRequest(async () => {
            let token = this.accessToken;
            if (pageId) {
                token = await this.getPageAccessToken(pageId);
            }
            const response = await axios_1.default.get(`${api_config_1.apiConfig.facebook.apiUrl}/${postId}/insights`, {
                params: {
                    metric: 'post_impressions,post_reach,post_engaged_users,post_reactions_by_type_total,post_comments_count,post_shares_count',
                    access_token: token,
                },
            });
            const insights = response.data.data || [];
            const getValue = (metric) => {
                const item = insights.find((i) => i.name === metric);
                return item?.values?.[0]?.value || 0;
            };
            return {
                impressions: getValue('post_impressions'),
                reach: getValue('post_reach'),
                engagement: getValue('post_engaged_users'),
                reactions: getValue('post_reactions_by_type_total'),
                comments: getValue('post_comments_count'),
                shares: getValue('post_shares_count'),
            };
        }, `getPostAnalytics(${postId})`);
    }
    async deletePost(postId, pageId) {
        await this.retryRequest(async () => {
            let token = this.accessToken;
            if (pageId) {
                token = await this.getPageAccessToken(pageId);
            }
            await axios_1.default.delete(`${api_config_1.apiConfig.facebook.apiUrl}/${postId}`, {
                params: { access_token: token },
            });
        }, `deletePost(${postId})`);
    }
    async getUserProfile() {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get('/me', {
                params: { fields: 'id,name,email,picture' },
            });
            return {
                id: response.data.id,
                name: response.data.name,
                email: response.data.email,
                picture: response.data.picture?.data?.url || '',
            };
        }, 'getUserProfile');
    }
    async getInstagramBusinessAccount(pageId) {
        return this.retryRequest(async () => {
            const page = await this.getPageInfo(pageId);
            if (!page.instagram_business_account)
                return null;
            const igUserId = page.instagram_business_account.id;
            const pageToken = await this.getPageAccessToken(pageId);
            const response = await axios_1.default.get(`${api_config_1.apiConfig.facebook.apiUrl}/${igUserId}`, {
                params: {
                    fields: 'id,username,name,biography,followers_count,media_count',
                    access_token: pageToken,
                },
            });
            return response.data;
        }, `getInstagramBusinessAccount(${pageId})`);
    }
    async getInstagramMedia(igUserId, pageId, limit = 20) {
        return this.retryRequest(async () => {
            const pageToken = await this.getPageAccessToken(pageId);
            const response = await axios_1.default.get(`${api_config_1.apiConfig.facebook.apiUrl}/${igUserId}/media`, {
                params: {
                    fields: 'id,caption,media_url,permalink,timestamp,media_type,like_count,comments_count',
                    limit,
                    access_token: pageToken,
                },
            });
            return response.data.data || [];
        }, `getInstagramMedia(${igUserId})`);
    }
    async refreshLongLivedToken() {
        return this.retryRequest(async () => {
            const response = await axios_1.default.get('https://graph.facebook.com/v18.0/oauth/access_token', {
                params: {
                    grant_type: 'fb_exchange_token',
                    client_id: api_config_1.apiConfig.facebook.appId,
                    client_secret: api_config_1.apiConfig.facebook.appSecret,
                    fb_exchange_token: this.accessToken,
                },
            });
            const newToken = response.data.access_token;
            await this.updateAccessToken(newToken);
            return newToken;
        }, 'refreshLongLivedToken');
    }
    async getPageInsights(pageId, since, until) {
        return this.retryRequest(async () => {
            const pageToken = await this.getPageAccessToken(pageId);
            const params = {
                metric: 'page_impressions,page_engaged_users,page_fans,page_fan_adds,page_fan_removes',
                access_token: pageToken,
            };
            if (since)
                params.since = Math.floor(since.getTime() / 1000);
            if (until)
                params.until = Math.floor(until.getTime() / 1000);
            const response = await axios_1.default.get(`${api_config_1.apiConfig.facebook.apiUrl}/${pageId}/insights`, { params });
            const insights = {};
            for (const item of response.data.data || []) {
                insights[item.name] = item.values?.[0]?.value || 0;
            }
            return insights;
        }, `getPageInsights(${pageId})`);
    }
}
exports.FacebookClient = FacebookClient;
//# sourceMappingURL=facebook.client.js.map