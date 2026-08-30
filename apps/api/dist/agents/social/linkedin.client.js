"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkedInClient = void 0;
// enterprise-ai-agent-platform/apps/api/src/agents/social/linkedin.client.ts
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../../utils/logger");
const api_config_1 = require("../../config/api.config");
class LinkedInClient {
    constructor(accessToken) {
        this.client = null;
        this.accessToken = '';
        this.MAX_RETRIES = 3;
        this.BASE_DELAY_MS = 1000;
        this.accessToken = accessToken;
        this.initializeClient();
    }
    initializeClient() {
        this.client = axios_1.default.create({
            baseURL: api_config_1.apiConfig.linkedin.apiUrl,
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': '202312',
            },
            timeout: api_config_1.apiConfig.timeouts.default,
        });
        this.client.interceptors.request.use((config) => {
            logger_1.logger.debug({ method: config.method, url: config.url }, 'LinkedIn API request');
            return config;
        }, (error) => Promise.reject(error));
        this.client.interceptors.response.use((response) => {
            logger_1.logger.debug({ status: response.status, url: response.config.url }, 'LinkedIn API response');
            return response;
        }, async (error) => {
            if (error.response?.status === 401) {
                logger_1.logger.error('LinkedIn token expired or invalid');
            }
            else if (error.response?.status === 429) {
                logger_1.logger.warn('LinkedIn rate limit exceeded');
            }
            throw error;
        });
    }
    async updateAccessToken(newToken) {
        this.accessToken = newToken;
        this.initializeClient();
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
                    const delay = this.BASE_DELAY_MS * Math.pow(2, attempt - 1);
                    logger_1.logger.warn({ attempt, delay, context, error: lastError.message }, 'LinkedIn API retry');
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError || new Error(`Failed after ${this.MAX_RETRIES} retries: ${context}`);
    }
    async getProfile() {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const [profileResponse, emailResponse] = await Promise.all([
                this.client.get('/me', {
                    params: { projection: '(id,firstName,lastName,profilePicture(displayImage~:playableStreams),headline,industry,summary)' },
                }),
                this.client.get('/emailAddress?q=members&projection=(elements*(handle~))'),
            ]);
            const profile = profileResponse.data;
            const email = emailResponse.data.elements?.[0]?.['handle~']?.emailAddress;
            let profilePicture;
            const displayImage = profile.profilePicture?.['displayImage~'];
            if (displayImage?.elements?.length > 0) {
                profilePicture = displayImage.elements[0].identifiers?.[0]?.identifier;
            }
            return {
                id: profile.id,
                firstName: profile.firstName?.localized?.en_US,
                lastName: profile.lastName?.localized?.en_US,
                email,
                profilePicture,
                headline: profile.headline?.localized?.en_US,
                industry: profile.industry?.localized?.en_US,
                summary: profile.summary?.localized?.en_US,
            };
        }, 'getProfile');
    }
    async createTextPost(content, visibility = 'PUBLIC') {
        return this.retryRequest(async () => {
            const profile = await this.getProfile();
            const author = `urn:li:person:${profile.id}`;
            const postData = {
                author,
                lifecycleState: 'PUBLISHED',
                specificContent: {
                    'com.linkedin.ugc.ShareContent': {
                        shareCommentary: { text: content },
                        shareMediaCategory: 'NONE',
                    },
                },
                visibility: {
                    'com.linkedin.ugc.MemberNetworkVisibility': visibility,
                },
            };
            const response = await this.client.post('/ugcPosts', postData);
            return {
                id: response.data.id,
                author: response.data.author,
                lifecycleState: response.data.lifecycleState,
                created: response.data.created,
                lastModified: response.data.lastModified,
            };
        }, 'createTextPost');
    }
    async createImagePost(content) {
        return this.retryRequest(async () => {
            const profile = await this.getProfile();
            const author = `urn:li:person:${profile.id}`;
            // Step 1: Register the image upload
            const registerResponse = await this.client.post('/assets?action=registerUpload', {
                registerUploadRequest: {
                    recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
                    owner: author,
                    serviceRelationships: [
                        {
                            relationshipType: 'OWNER',
                            identifier: 'urn:li:userGeneratedContent',
                        },
                    ],
                },
            });
            const uploadUrl = registerResponse.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
            const asset = registerResponse.data.value.asset;
            // Step 2: Upload the image
            if (content.mediaUrl) {
                const imageResponse = await axios_1.default.get(content.mediaUrl, { responseType: 'arraybuffer' });
                await axios_1.default.put(uploadUrl, imageResponse.data, {
                    headers: { 'Content-Type': 'application/octet-stream' },
                });
            }
            // Step 3: Create the post with image
            const postData = {
                author,
                lifecycleState: 'PUBLISHED',
                specificContent: {
                    'com.linkedin.ugc.ShareContent': {
                        shareCommentary: { text: content.text },
                        shareMediaCategory: 'IMAGE',
                        media: [
                            {
                                status: 'READY',
                                description: { text: content.mediaTitle || content.text.substring(0, 200) },
                                media: asset,
                            },
                        ],
                    },
                },
                visibility: {
                    'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
                },
            };
            const response = await this.client.post('/ugcPosts', postData);
            return {
                id: response.data.id,
                author: response.data.author,
                lifecycleState: response.data.lifecycleState,
                created: response.data.created,
                lastModified: response.data.lastModified,
            };
        }, 'createImagePost');
    }
    async createArticlePost(title, content, visibility = 'PUBLIC') {
        return this.retryRequest(async () => {
            const profile = await this.getProfile();
            const author = `urn:li:person:${profile.id}`;
            const articleData = {
                author,
                lifecycleState: 'PUBLISHED',
                specificContent: {
                    'com.linkedin.ugc.ShareContent': {
                        shareCommentary: { text: title },
                        shareMediaCategory: 'ARTICLE',
                        media: [
                            {
                                status: 'READY',
                                description: { text: title },
                                originalUrl: '',
                                title: { text: title },
                            },
                        ],
                    },
                },
                visibility: {
                    'com.linkedin.ugc.MemberNetworkVisibility': visibility,
                },
            };
            const response = await this.client.post('/ugcPosts', articleData);
            return response.data;
        }, 'createArticlePost');
    }
    async deletePost(postId) {
        await this.retryRequest(async () => {
            await this.client.delete(`/ugcPosts/${postId}`);
        }, `deletePost(${postId})`);
    }
    async getPost(postId) {
        return this.retryRequest(async () => {
            const response = await this.client.get(`/ugcPosts/${postId}`);
            return response.data;
        }, `getPost(${postId})`);
    }
    async getPostAnalytics(postId) {
        return this.retryRequest(async () => {
            const response = await this.client.get(`/socialActions/${postId}`);
            return {
                likes: response.data.likesSummary?.totalLikes || 0,
                comments: response.data.commentsSummary?.totalComments || 0,
                shares: response.data.sharesSummary?.totalShares || 0,
                impressions: response.data.impressionSummary?.totalImpressions || 0,
            };
        }, `getPostAnalytics(${postId})`);
    }
    async getOrganizations() {
        return this.retryRequest(async () => {
            const response = await this.client.get('/organizationalEntityAcls', {
                params: { q: 'roleAssignee', role: 'ADMINISTRATOR', state: 'APPROVED' },
            });
            return (response.data.elements || []).map((e) => ({
                id: e.organizationalTarget?.split(':').pop(),
                name: e.organizationalTargetName?.localized?.en_US || '',
            }));
        }, 'getOrganizations');
    }
    async getOrganizationPosts(organizationId, maxResults = 10) {
        return this.retryRequest(async () => {
            const response = await this.client.get(`/organizations/${organizationId}/posts`, {
                params: { q: 'author', count: maxResults },
            });
            return response.data.elements || [];
        }, `getOrganizationPosts(${organizationId})`);
    }
    async getConnections() {
        return this.retryRequest(async () => {
            const response = await this.client.get('/connections', {
                params: { q: 'viewer', count: 100 },
            });
            return response.data.elements || [];
        }, 'getConnections');
    }
    async searchPeople(query, maxResults = 20) {
        return this.retryRequest(async () => {
            const response = await this.client.get('/search/people', {
                params: { q: 'keywords', keywords: query, count: maxResults },
            });
            return response.data.elements || [];
        }, `searchPeople(${query})`);
    }
}
exports.LinkedInClient = LinkedInClient;
//# sourceMappingURL=linkedin.client.js.map