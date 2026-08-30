"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwitterClient = void 0;
// enterprise-ai-agent-platform/apps/api/src/agents/social/twitter.client.ts
const axios_1 = __importDefault(require("axios"));
const oauth_1_0a_1 = __importDefault(require("oauth-1.0a"));
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = require("../../utils/logger");
const api_config_1 = require("../../config/api.config");
class TwitterClient {
    constructor(accessToken, accessSecret) {
        this.client = null;
        this.oauth = null;
        this.accessToken = '';
        this.accessSecret = '';
        this.MAX_RETRIES = 3;
        this.BASE_DELAY_MS = 1000;
        this.accessToken = accessToken;
        this.accessSecret = accessSecret;
        this.initializeClient();
    }
    initializeClient() {
        this.oauth = new oauth_1_0a_1.default({
            consumer: {
                key: api_config_1.apiConfig.twitter.apiKey,
                secret: api_config_1.apiConfig.twitter.apiSecret,
            },
            signature_method: 'HMAC-SHA1',
            hash_function(base_string, key) {
                return crypto_1.default.createHmac('sha1', key).update(base_string).digest('base64');
            },
        });
        this.client = axios_1.default.create({
            baseURL: api_config_1.apiConfig.twitter.apiUrl,
            timeout: api_config_1.apiConfig.timeouts.default,
        });
        // Request interceptor for OAuth signing
        this.client.interceptors.request.use((config) => {
            if (this.oauth) {
                const oauthData = this.oauth.authorize({ url: `${config.baseURL}${config.url}`, method: config.method || 'GET' }, { key: this.accessToken, secret: this.accessSecret });
                config.headers.Authorization = this.oauth.toHeader(oauthData).Authorization;
            }
            logger_1.logger.debug({ method: config.method, url: config.url }, 'Twitter API request');
            return config;
        }, (error) => Promise.reject(error));
        // Response interceptor
        this.client.interceptors.response.use((response) => {
            logger_1.logger.debug({ status: response.status, url: response.config.url }, 'Twitter API response');
            return response;
        }, async (error) => {
            if (error.response?.status === 401) {
                logger_1.logger.error('Twitter token expired or invalid');
            }
            else if (error.response?.status === 403) {
                logger_1.logger.error('Twitter access denied');
            }
            else if (error.response?.status === 429) {
                const resetTime = error.response.headers['x-rate-limit-reset'];
                const waitSeconds = resetTime ? parseInt(resetTime) - Math.floor(Date.now() / 1000) : 900;
                logger_1.logger.warn({ waitSeconds }, 'Twitter rate limit exceeded');
            }
            throw error;
        });
    }
    async updateTokens(accessToken, accessSecret) {
        this.accessToken = accessToken;
        this.accessSecret = accessSecret;
        this.initializeClient();
    }
    /**
     * Retry wrapper for API calls with rate limit awareness
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
                    // Check for rate limit
                    if (axiosError.response?.status === 429) {
                        const resetTime = axiosError.response.headers['x-rate-limit-reset'];
                        const delay = resetTime
                            ? (parseInt(resetTime) - Math.floor(Date.now() / 1000)) * 1000
                            : this.BASE_DELAY_MS * Math.pow(2, attempt);
                        logger_1.logger.warn({ attempt, delay, context }, 'Twitter rate limit hit, waiting');
                        await new Promise(resolve => setTimeout(resolve, Math.max(delay, 15000)));
                    }
                    else {
                        const delay = this.BASE_DELAY_MS * Math.pow(2, attempt - 1);
                        logger_1.logger.warn({ attempt, delay, context, error: lastError.message }, 'Twitter API retry');
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }
        }
        throw lastError || new Error(`Failed after ${this.MAX_RETRIES} retries: ${context}`);
    }
    async postTweet(text, mediaIds) {
        return this.retryRequest(async () => {
            if (text.length > 280) {
                throw new Error(`Tweet exceeds 280 character limit (${text.length} characters)`);
            }
            if (!this.client)
                throw new Error('Client not initialized');
            const payload = { text };
            if (mediaIds && mediaIds.length > 0) {
                payload.media = { media_ids: mediaIds };
            }
            const response = await this.client.post('/tweets', payload);
            return { id: response.data.data.id, text: response.data.data.text };
        }, 'postTweet');
    }
    async postTweetWithMedia(text, mediaData, mediaType) {
        return this.retryRequest(async () => {
            // Step 1: Upload media
            const mediaResponse = await this.uploadMedia(mediaData, mediaType);
            const mediaId = mediaResponse.media_id_string;
            // Step 2: Post tweet with media
            return await this.postTweet(text, [mediaId]);
        }, 'postTweetWithMedia');
    }
    async uploadMedia(mediaData, mediaType) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const formData = new FormData();
            const blob = new Blob([mediaData], { type: mediaType });
            formData.append('media', blob, 'media');
            const response = await this.client.post('https://upload.twitter.com/1.1/media/upload.json', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return response.data;
        }, 'uploadMedia');
    }
    async deleteTweet(tweetId) {
        await this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            await this.client.delete(`/tweets/${tweetId}`);
        }, `deleteTweet(${tweetId})`);
    }
    async getTweet(tweetId) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get(`/tweets/${tweetId}`, {
                params: {
                    expansions: 'author_id,attachments.media_keys,referenced_tweets.id',
                    'tweet.fields': 'created_at,public_metrics,entities,attachments,conversation_id,in_reply_to_user_id,lang,possibly_sensitive,source',
                    'media.fields': 'url,preview_image_url,alt_text,variants',
                    'user.fields': 'name,username,profile_image_url,verified',
                },
            });
            return response.data.data;
        }, `getTweet(${tweetId})`);
    }
    async getUserTweets(userId, maxResults = 10, paginationToken) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const params = {
                max_results: Math.min(maxResults, 100),
                'tweet.fields': 'created_at,public_metrics,entities',
                exclude: 'retweets,replies',
            };
            if (paginationToken)
                params.pagination_token = paginationToken;
            const response = await this.client.get(`/users/${userId}/tweets`, { params });
            return {
                tweets: response.data.data || [],
                nextToken: response.data.meta?.next_token,
            };
        }, `getUserTweets(${userId})`);
    }
    async getMe() {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get('/users/me', {
                params: {
                    'user.fields': 'description,profile_image_url,verified,protected,public_metrics,created_at,location,url,entities,pinned_tweet_id',
                },
            });
            // Map public_metrics to individual fields
            const user = response.data.data;
            if (user?.public_metrics) {
                user.followers_count = user.public_metrics.followers_count;
                user.following_count = user.public_metrics.following_count;
                user.tweet_count = user.public_metrics.tweet_count;
                user.listed_count = user.public_metrics.listed_count;
            }
            return user;
        }, 'getMe');
    }
    async getUser(userId) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get(`/users/${userId}`, {
                params: {
                    'user.fields': 'description,profile_image_url,verified,protected,public_metrics,created_at,location,url,entities,pinned_tweet_id',
                },
            });
            const user = response.data.data;
            if (user?.public_metrics) {
                user.followers_count = user.public_metrics.followers_count;
                user.following_count = user.public_metrics.following_count;
                user.tweet_count = user.public_metrics.tweet_count;
                user.listed_count = user.public_metrics.listed_count;
            }
            return user;
        }, `getUser(${userId})`);
    }
    async getUsersByIds(userIds) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get('/users', {
                params: {
                    ids: userIds.slice(0, 100).join(','),
                    'user.fields': 'description,profile_image_url,verified,public_metrics',
                },
            });
            return response.data.data || [];
        }, `getUsersByIds(${userIds.length} users)`);
    }
    async getUsersByUsernames(usernames) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get('/users/by', {
                params: {
                    usernames: usernames.slice(0, 100).join(','),
                    'user.fields': 'description,profile_image_url,verified,public_metrics',
                },
            });
            return response.data.data || [];
        }, `getUsersByUsernames(${usernames.length} users)`);
    }
    async searchTweets(query, maxResults = 10, paginationToken) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const params = {
                query,
                max_results: Math.min(maxResults, 100),
                'tweet.fields': 'created_at,public_metrics,entities,author_id',
                expansions: 'author_id',
                'user.fields': 'name,username,profile_image_url,verified',
            };
            if (paginationToken)
                params.next_token = paginationToken;
            const response = await this.client.get('/tweets/search/recent', { params });
            return {
                tweets: response.data.data || [],
                nextToken: response.data.meta?.next_token,
            };
        }, `searchTweets(${query})`);
    }
    async replyToTweet(tweetId, text) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.post('/tweets', {
                text,
                reply: { in_reply_to_tweet_id: tweetId },
            });
            return { id: response.data.data.id, text: response.data.data.text };
        }, `replyToTweet(${tweetId})`);
    }
    async quoteTweet(tweetId, text) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.post('/tweets', {
                text,
                quote_tweet_id: tweetId,
            });
            return { id: response.data.data.id, text: response.data.data.text };
        }, `quoteTweet(${tweetId})`);
    }
    async likeTweet(tweetId, userId) {
        await this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const authenticatedUser = userId || (await this.getMe()).id;
            await this.client.post(`/users/${authenticatedUser}/likes`, { tweet_id: tweetId });
        }, `likeTweet(${tweetId})`);
    }
    async unlikeTweet(tweetId, userId) {
        await this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const authenticatedUser = userId || (await this.getMe()).id;
            await this.client.delete(`/users/${authenticatedUser}/likes/${tweetId}`);
        }, `unlikeTweet(${tweetId})`);
    }
    async retweet(tweetId, userId) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const authenticatedUser = userId || (await this.getMe()).id;
            const response = await this.client.post(`/users/${authenticatedUser}/retweets`, { tweet_id: tweetId });
            return { id: response.data.data.id, retweeted: response.data.data.retweeted };
        }, `retweet(${tweetId})`);
    }
    async unretweet(tweetId, userId) {
        await this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const authenticatedUser = userId || (await this.getMe()).id;
            await this.client.delete(`/users/${authenticatedUser}/retweets/${tweetId}`);
        }, `unretweet(${tweetId})`);
    }
    async getTweetAnalytics(tweetId) {
        return this.retryRequest(async () => {
            const tweet = await this.getTweet(tweetId);
            return {
                likes: tweet.public_metrics?.like_count || 0,
                retweets: tweet.public_metrics?.retweet_count || 0,
                replies: tweet.public_metrics?.reply_count || 0,
                quotes: tweet.public_metrics?.quote_count || 0,
                bookmarks: tweet.public_metrics?.bookmark_count || 0,
                impressions: tweet.public_metrics?.impression_count || 0,
            };
        }, `getTweetAnalytics(${tweetId})`);
    }
    async followUser(targetUserId) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const authenticatedUser = await this.getMe();
            const response = await this.client.post(`/users/${authenticatedUser.id}/following`, { target_user_id: targetUserId });
            return response.data.data;
        }, `followUser(${targetUserId})`);
    }
    async unfollowUser(targetUserId) {
        await this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const authenticatedUser = await this.getMe();
            await this.client.delete(`/users/${authenticatedUser.id}/following/${targetUserId}`);
        }, `unfollowUser(${targetUserId})`);
    }
    async blockUser(targetUserId) {
        await this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const authenticatedUser = await this.getMe();
            await this.client.post(`/users/${authenticatedUser.id}/blocking`, { target_user_id: targetUserId });
        }, `blockUser(${targetUserId})`);
    }
    async unblockUser(targetUserId) {
        await this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const authenticatedUser = await this.getMe();
            await this.client.delete(`/users/${authenticatedUser.id}/blocking/${targetUserId}`);
        }, `unblockUser(${targetUserId})`);
    }
    async muteUser(targetUserId) {
        await this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const authenticatedUser = await this.getMe();
            await this.client.post(`/users/${authenticatedUser.id}/muting`, { target_user_id: targetUserId });
        }, `muteUser(${targetUserId})`);
    }
    async unmuteUser(targetUserId) {
        await this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const authenticatedUser = await this.getMe();
            await this.client.delete(`/users/${authenticatedUser.id}/muting/${targetUserId}`);
        }, `unmuteUser(${targetUserId})`);
    }
    async getFollowers(userId, maxResults = 100) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get(`/users/${userId}/followers`, {
                params: {
                    max_results: Math.min(maxResults, 1000),
                    'user.fields': 'description,profile_image_url,verified,public_metrics',
                },
            });
            return response.data.data || [];
        }, `getFollowers(${userId})`);
    }
    async getFollowing(userId, maxResults = 100) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get(`/users/${userId}/following`, {
                params: {
                    max_results: Math.min(maxResults, 1000),
                    'user.fields': 'description,profile_image_url,verified,public_metrics',
                },
            });
            return response.data.data || [];
        }, `getFollowing(${userId})`);
    }
    async getLikedTweets(userId, maxResults = 100) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get(`/users/${userId}/liked_tweets`, {
                params: {
                    max_results: Math.min(maxResults, 100),
                    'tweet.fields': 'created_at,public_metrics,author_id',
                    expansions: 'author_id',
                    'user.fields': 'username,name,profile_image_url',
                },
            });
            return response.data.data || [];
        }, `getLikedTweets(${userId})`);
    }
    async getTweetCounts(query) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get('/tweets/counts/recent', {
                params: {
                    query,
                    granularity: 'day',
                },
            });
            return response.data.data || [];
        }, `getTweetCounts(${query})`);
    }
}
exports.TwitterClient = TwitterClient;
//# sourceMappingURL=twitter.client.js.map