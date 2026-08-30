// enterprise-ai-agent-platform/apps/api/src/agents/calendar/calendar.client.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../../utils/logger';
import { apiConfig } from '../../config/api.config';

export interface CalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: Array<{ 
    email: string; 
    displayName?: string; 
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
    optional?: boolean;
    comment?: string;
    additionalGuests?: number;
    self?: boolean;
    organizer?: boolean;
    resource?: boolean;
  }>;
  organizer?: { email: string; displayName?: string; self?: boolean };
  status?: 'confirmed' | 'tentative' | 'cancelled';
  visibility?: 'default' | 'public' | 'private' | 'confidential';
  recurrence?: string[];
  recurringEventId?: string;
  originalStartTime?: { dateTime?: string; date?: string; timeZone?: string };
  transparency?: 'opaque' | 'transparent';
  sequence?: number;
  created?: string;
  updated?: string;
  htmlLink?: string;
  iCalUID?: string;
  conferenceData?: {
    createRequest?: { requestId: string; conferenceSolutionKey: { type: string }; status: { statusCode: string } };
    entryPoints?: Array<{ 
      entryPointType: string; 
      uri: string; 
      label?: string; 
      pin?: string;
      accessCode?: string;
      meetingCode?: string;
      passcode?: string;
      password?: string;
    }>;
    conferenceSolution?: { key: { type: string }; name: string; iconUri: string };
    conferenceId?: string;
    signature?: string;
    notes?: string;
  };
  reminders?: { useDefault: boolean; overrides?: Array<{ method: 'email' | 'popup'; minutes: number }> };
  colorId?: string;
  eventType?: 'default' | 'outOfOffice' | 'focusTime' | 'workingLocation';
}

export interface Calendar {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  timeZone?: string;
  summaryOverride?: string;
  colorId?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  hidden?: boolean;
  selected?: boolean;
  accessRole?: 'freeBusyReader' | 'reader' | 'writer' | 'owner';
  primary?: boolean;
  deleted?: boolean;
  conferenceProperties?: { allowedConferenceSolutionTypes?: string[] };
}

export interface FreeBusyRequest {
  timeMin: string;
  timeMax: string;
  timeZone?: string;
  items: Array<{ id: string }>;
  groupExpansionMax?: number;
  calendarExpansionMax?: number;
}

export interface FreeBusyResponse {
  calendars: Record<string, { 
    busy: Array<{ start: string; end: string }>;
    errors?: Array<{ domain: string; reason: string }>;
  }>;
  groups?: Record<string, { calendars: string[]; errors?: Array<{ domain: string; reason: string }> }>;
  timeMin: string;
  timeMax: string;
  kind?: string;
}

export interface CalendarListEntry {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  timeZone?: string;
  summaryOverride?: string;
  colorId?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  hidden?: boolean;
  selected?: boolean;
  accessRole?: string;
  primary?: boolean;
  deleted?: boolean;
}

export class CalendarClient {
  private client: AxiosInstance | null = null;
  private accessToken: string = '';
  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY_MS = 1000;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
    this.initializeClient();
  }

  private initializeClient(): void {
    this.client = axios.create({
      baseURL: apiConfig.google.calendar.apiUrl,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: apiConfig.timeouts.default,
    });

    this.client.interceptors.request.use(
      (config) => {
        logger.debug({ method: config.method, url: config.url }, 'Calendar API request');
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => {
        logger.debug({ status: response.status, url: response.config.url }, 'Calendar API response');
        return response;
      },
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          logger.error('Calendar token expired or invalid');
        } else if (error.response?.status === 403) {
          logger.error('Calendar access denied');
        } else if (error.response?.status === 429) {
          logger.warn('Calendar rate limit exceeded');
        }
        throw error;
      }
    );
  }

  async updateAccessToken(newToken: string): Promise<void> {
    this.accessToken = newToken;
    this.initializeClient();
  }

  /**
   * Retry wrapper for API calls
   */
  private async retryRequest<T>(fn: () => Promise<T>, context: string): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.MAX_RETRIES) {
          const delay = this.BASE_DELAY_MS * Math.pow(2, attempt - 1);
          logger.warn({ attempt, delay, context, error: lastError.message }, 'Calendar API retry');
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error(`Failed after ${this.MAX_RETRIES} retries: ${context}`);
  }

  async listCalendars(): Promise<CalendarListEntry[]> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.get('/users/me/calendarList');
      return response.data.items || [];
    }, 'listCalendars');
  }

  async getCalendar(calendarId: string): Promise<Calendar> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.get(`/calendars/${encodeURIComponent(calendarId)}`);
      return response.data;
    }, `getCalendar(${calendarId})`);
  }

  async clearCalendar(calendarId: string): Promise<void> {
    await this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      await this.client.post(`/calendars/${encodeURIComponent(calendarId)}/clear`);
    }, `clearCalendar(${calendarId})`);
  }

  async deleteCalendar(calendarId: string): Promise<void> {
    await this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      await this.client.delete(`/calendars/${encodeURIComponent(calendarId)}`);
    }, `deleteCalendar(${calendarId})`);
  }

  async listEvents(calendarId: string = 'primary', params: {
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
    pageToken?: string;
    showDeleted?: boolean;
    showHiddenInvitations?: boolean;
    singleEvents?: boolean;
    orderBy?: 'startTime' | 'updated';
    q?: string;
    privateExtendedProperty?: string;
    sharedExtendedProperty?: string;
    timeZone?: string;
    updatedMin?: string;
    iCalUID?: string;
    eventTypes?: string[];
  } = {}): Promise<{ items: CalendarEvent[]; nextPageToken?: string; nextSyncToken?: string; summary?: string; updated?: string }> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      
      const queryParams: any = { ...params };
      if (params.singleEvents === undefined) queryParams.singleEvents = true;
      
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

  async getEvent(calendarId: string, eventId: string): Promise<CalendarEvent> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.get(
        `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`
      );
      return response.data;
    }, `getEvent(${calendarId}, ${eventId})`);
  }

  async createEvent(calendarId: string, event: Partial<CalendarEvent>, sendUpdates?: 'all' | 'externalOnly' | 'none', supportsAttachments?: boolean): Promise<CalendarEvent> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      
      const params: any = {};
      if (sendUpdates) params.sendUpdates = sendUpdates;
      if (supportsAttachments !== undefined) params.supportsAttachments = supportsAttachments;
      
      const response = await this.client.post(
        `/calendars/${encodeURIComponent(calendarId)}/events`,
        event,
        { params }
      );
      return response.data;
    }, `createEvent(${calendarId})`);
  }

  async updateEvent(calendarId: string, eventId: string, event: Partial<CalendarEvent>, sendUpdates?: 'all' | 'externalOnly' | 'none'): Promise<CalendarEvent> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      
      const params: any = {};
      if (sendUpdates) params.sendUpdates = sendUpdates;
      
      const response = await this.client.put(
        `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        event,
        { params }
      );
      return response.data;
    }, `updateEvent(${calendarId}, ${eventId})`);
  }

  async patchEvent(calendarId: string, eventId: string, updates: Partial<CalendarEvent>, sendUpdates?: 'all' | 'externalOnly' | 'none'): Promise<CalendarEvent> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      
      const params: any = {};
      if (sendUpdates) params.sendUpdates = sendUpdates;
      
      const response = await this.client.patch(
        `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        updates,
        { params }
      );
      return response.data;
    }, `patchEvent(${calendarId}, ${eventId})`);
  }

  async deleteEvent(calendarId: string, eventId: string, sendUpdates?: 'all' | 'externalOnly' | 'none'): Promise<void> {
    await this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      
      const params: any = {};
      if (sendUpdates) params.sendUpdates = sendUpdates;
      
      await this.client.delete(
        `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        { params }
      );
    }, `deleteEvent(${calendarId}, ${eventId})`);
  }

  async moveEvent(calendarId: string, eventId: string, destinationCalendarId: string, sendUpdates?: 'all' | 'externalOnly' | 'none'): Promise<CalendarEvent> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      
      const params: any = { destination: destinationCalendarId };
      if (sendUpdates) params.sendUpdates = sendUpdates;
      
      const response = await this.client.post(
        `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}/move`,
        null,
        { params }
      );
      return response.data;
    }, `moveEvent(${calendarId}, ${eventId})`);
  }

  async quickAddEvent(calendarId: string, text: string, sendUpdates?: 'all' | 'externalOnly' | 'none'): Promise<CalendarEvent> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      
      const params: any = { text };
      if (sendUpdates) params.sendUpdates = sendUpdates;
      
      const response = await this.client.post(
        `/calendars/${encodeURIComponent(calendarId)}/events/quickAdd`,
        null,
        { params }
      );
      return response.data;
    }, `quickAddEvent(${calendarId})`);
  }

  async getFreeBusy(request: FreeBusyRequest): Promise<FreeBusyResponse> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.post('/freeBusy', request);
      return response.data;
    }, 'getFreeBusy');
  }

  async getSettings(): Promise<Record<string, string>> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.get('/users/me/settings');
      return response.data;
    }, 'getSettings');
  }

  async watchEvents(calendarId: string, webhookUrl: string, ttlSeconds: number = 3600): Promise<{ id: string; resourceId: string; resourceUri: string; expiration: string }> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      
      const channelId = `watch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await this.client.post(
        `/calendars/${encodeURIComponent(calendarId)}/events/watch`,
        {
          id: channelId,
          type: 'web_hook',
          address: webhookUrl,
          params: { ttl: `${ttlSeconds}s` },
        }
      );
      
      return {
        id: response.data.id,
        resourceId: response.data.resourceId,
        resourceUri: response.data.resourceUri,
        expiration: response.data.expiration,
      };
    }, `watchEvents(${calendarId})`);
  }

  async stopWatch(resourceId: string, channelId: string): Promise<void> {
    await this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      await this.client.post('/channels/stop', {
        id: channelId,
        resourceId: resourceId,
      });
    }, `stopWatch(${resourceId})`);
  }

  async importEvent(calendarId: string, event: CalendarEvent): Promise<CalendarEvent> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.post(
        `/calendars/${encodeURIComponent(calendarId)}/events/import`,
        event
      );
      return response.data;
    }, `importEvent(${calendarId})`);
  }

  async getInstances(calendarId: string, eventId: string, timeMin?: string, timeMax?: string, maxResults?: number): Promise<{ items: CalendarEvent[]; nextPageToken?: string }> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      
      const params: any = {};
      if (timeMin) params.timeMin = timeMin;
      if (timeMax) params.timeMax = timeMax;
      if (maxResults) params.maxResults = maxResults;
      
      const response = await this.client.get(
        `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}/instances`,
        { params }
      );
      
      return {
        items: response.data.items || [],
        nextPageToken: response.data.nextPageToken,
      };
    }, `getInstances(${calendarId}, ${eventId})`);
  }
}