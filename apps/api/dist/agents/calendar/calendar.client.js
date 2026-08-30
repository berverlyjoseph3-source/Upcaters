"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarClient = void 0;
// enterprise-ai-agent-platform/apps/api/src/agents/calendar/calendar.client.ts
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../../utils/logger");
const api_config_1 = require("../../config/api.config");
class CalendarClient {
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
            baseURL: api_config_1.apiConfig.google.calendar.apiUrl,
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
            },
            timeout: api_config_1.apiConfig.timeouts.default,
        });
        this.client.interceptors.request.use((config) => {
            logger_1.logger.debug({ method: config.method, url: config.url }, 'Calendar API request');
            return config;
        }, (error) => Promise.reject(error));
        this.client.interceptors.response.use((response) => {
            logger_1.logger.debug({ status: response.status, url: response.config.url }, 'Calendar API response');
            return response;
        }, async (error) => {
            if (error.response?.status === 401) {
                logger_1.logger.error('Calendar token expired or invalid');
            }
            else if (error.response?.status === 403) {
                logger_1.logger.error('Calendar access denied');
            }
            else if (error.response?.status === 429) {
                logger_1.logger.warn('Calendar rate limit exceeded');
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
                    logger_1.logger.warn({ attempt, delay, context, error: lastError.message }, 'Calendar API retry');
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError || new Error(`Failed after ${this.MAX_RETRIES} retries: ${context}`);
    }
    async listCalendars() {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get('/users/me/calendarList');
            return response.data.items || [];
        }, 'listCalendars');
    }
    async getCalendar(calendarId) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get(`/calendars/${encodeURIComponent(calendarId)}`);
            return response.data;
        }, `getCalendar(${calendarId})`);
    }
    async clearCalendar(calendarId) {
        await this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            await this.client.post(`/calendars/${encodeURIComponent(calendarId)}/clear`);
        }, `clearCalendar(${calendarId})`);
    }
    async deleteCalendar(calendarId) {
        await this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            await this.client.delete(`/calendars/${encodeURIComponent(calendarId)}`);
        }, `deleteCalendar(${calendarId})`);
    }
    async listEvents(calendarId = 'primary', params = {}) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const queryParams = { ...params };
            if (params.singleEvents === undefined)
                queryParams.singleEvents = true;
            const response = await this.client.get(`/calendars/${encodeURIComponent(calendarId)}/events`, {
                params: queryParams,
            });
            return {
                items: response.data.items || [],
                nextPageToken: response.data.nextPageToken,
                nextSyncToken: response.data.nextSyncToken,
                summary: response.data.summary,
                updated: response.data.updated,
            };
        }, `listEvents(${calendarId})`);
    }
    async getEvent(calendarId, eventId) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`);
            return response.data;
        }, `getEvent(${calendarId}, ${eventId})`);
    }
    async createEvent(calendarId, event, sendUpdates, supportsAttachments) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const params = {};
            if (sendUpdates)
                params.sendUpdates = sendUpdates;
            if (supportsAttachments !== undefined)
                params.supportsAttachments = supportsAttachments;
            const response = await this.client.post(`/calendars/${encodeURIComponent(calendarId)}/events`, event, { params });
            return response.data;
        }, `createEvent(${calendarId})`);
    }
    async updateEvent(calendarId, eventId, event, sendUpdates) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const params = {};
            if (sendUpdates)
                params.sendUpdates = sendUpdates;
            const response = await this.client.put(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, event, { params });
            return response.data;
        }, `updateEvent(${calendarId}, ${eventId})`);
    }
    async patchEvent(calendarId, eventId, updates, sendUpdates) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const params = {};
            if (sendUpdates)
                params.sendUpdates = sendUpdates;
            const response = await this.client.patch(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, updates, { params });
            return response.data;
        }, `patchEvent(${calendarId}, ${eventId})`);
    }
    async deleteEvent(calendarId, eventId, sendUpdates) {
        await this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const params = {};
            if (sendUpdates)
                params.sendUpdates = sendUpdates;
            await this.client.delete(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, { params });
        }, `deleteEvent(${calendarId}, ${eventId})`);
    }
    async moveEvent(calendarId, eventId, destinationCalendarId, sendUpdates) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const params = { destination: destinationCalendarId };
            if (sendUpdates)
                params.sendUpdates = sendUpdates;
            const response = await this.client.post(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}/move`, null, { params });
            return response.data;
        }, `moveEvent(${calendarId}, ${eventId})`);
    }
    async quickAddEvent(calendarId, text, sendUpdates) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const params = { text };
            if (sendUpdates)
                params.sendUpdates = sendUpdates;
            const response = await this.client.post(`/calendars/${encodeURIComponent(calendarId)}/events/quickAdd`, null, { params });
            return response.data;
        }, `quickAddEvent(${calendarId})`);
    }
    async getFreeBusy(request) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.post('/freeBusy', request);
            return response.data;
        }, 'getFreeBusy');
    }
    async getSettings() {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get('/users/me/settings');
            return response.data;
        }, 'getSettings');
    }
    async watchEvents(calendarId, webhookUrl, ttlSeconds = 3600) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const channelId = `watch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const response = await this.client.post(`/calendars/${encodeURIComponent(calendarId)}/events/watch`, {
                id: channelId,
                type: 'web_hook',
                address: webhookUrl,
                params: { ttl: `${ttlSeconds}s` },
            });
            return {
                id: response.data.id,
                resourceId: response.data.resourceId,
                resourceUri: response.data.resourceUri,
                expiration: response.data.expiration,
            };
        }, `watchEvents(${calendarId})`);
    }
    async stopWatch(resourceId, channelId) {
        await this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            await this.client.post('/channels/stop', {
                id: channelId,
                resourceId: resourceId,
            });
        }, `stopWatch(${resourceId})`);
    }
    async importEvent(calendarId, event) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.post(`/calendars/${encodeURIComponent(calendarId)}/events/import`, event);
            return response.data;
        }, `importEvent(${calendarId})`);
    }
    async getInstances(calendarId, eventId, timeMin, timeMax, maxResults) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const params = {};
            if (timeMin)
                params.timeMin = timeMin;
            if (timeMax)
                params.timeMax = timeMax;
            if (maxResults)
                params.maxResults = maxResults;
            const response = await this.client.get(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}/instances`, { params });
            return {
                items: response.data.items || [],
                nextPageToken: response.data.nextPageToken,
            };
        }, `getInstances(${calendarId}, ${eventId})`);
    }
}
exports.CalendarClient = CalendarClient;
//# sourceMappingURL=calendar.client.js.map