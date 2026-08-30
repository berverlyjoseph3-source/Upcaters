// enterprise-ai-agent-platform/apps/api/src/agents/email/gmail.client.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../../utils/logger';
import { apiConfig } from '../../config/api.config';

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body: { data?: string; size: number; attachmentId?: string };
    parts?: Array<{
      partId: string;
      mimeType: string;
      filename: string;
      headers: Array<{ name: string; value: string }>;
      body: { size: number; data?: string; attachmentId?: string };
    }>;
  };
  internalDate: string;
  sizeEstimate?: number;
  historyId?: string;
}

export interface GmailMessageList {
  messages: Array<{ id: string; threadId: string }>;
  nextPageToken?: string;
  resultSizeEstimate: number;
}

export interface GmailProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

export interface GmailLabel {
  id: string;
  name: string;
  type: string;
  messageListVisibility: string;
  labelListVisibility: string;
  messagesTotal?: number;
  messagesUnread?: number;
  threadsTotal?: number;
  threadsUnread?: number;
  color?: {
    textColor: string;
    backgroundColor: string;
  };
}

export class GmailClient {
  private client: AxiosInstance | null = null;
  private accessToken: string = '';
  private userId: string = 'me';
  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY_MS = 1000;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
    this.initializeClient();
  }

  private initializeClient(): void {
    this.client = axios.create({
      baseURL: apiConfig.google.gmail.apiUrl,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: apiConfig.timeouts.default,
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug({ method: config.method, url: config.url }, 'Gmail API request');
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.debug({ status: response.status, url: response.config.url }, 'Gmail API response');
        return response;
      },
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          logger.error('Gmail token expired or invalid');
        } else if (error.response?.status === 429) {
          logger.warn('Gmail rate limit exceeded, will retry');
        }
        throw error;
      }
    );
  }

  /**
   * Update access token
   */
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
          logger.warn({ attempt, delay, context, error: lastError.message }, 'Gmail API retry');
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error(`Failed after ${this.MAX_RETRIES} retries: ${context}`);
  }

  /**
   * Get user profile
   */
  async getProfile(): Promise<GmailProfile> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.get(`/${this.userId}/profile`);
      return response.data;
    }, 'getProfile');
  }

  /**
   * List messages
   */
  async listMessages(params: {
    maxResults?: number;
    pageToken?: string;
    q?: string;
    labelIds?: string[];
    includeSpamTrash?: boolean;
  }): Promise<GmailMessageList> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.get(`/${this.userId}/messages`, { params });
      return response.data;
    }, 'listMessages');
  }

  /**
   * Get a specific message
   */
  async getMessage(messageId: string, format: 'full' | 'metadata' | 'minimal' | 'raw' = 'full'): Promise<GmailMessage> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.get(`/${this.userId}/messages/${messageId}`, {
        params: { format },
      });
      return response.data;
    }, `getMessage(${messageId})`);
  }

  /**
   * Send a message
   */
  async sendMessage(rawMessage: string, threadId?: string): Promise<{ id: string; threadId: string; labelIds: string[] }> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      
      const body: any = { raw: rawMessage };
      if (threadId) body.threadId = threadId;
      
      const response = await this.client.post(`/${this.userId}/messages/send`, body);
      return response.data;
    }, 'sendMessage');
  }

  /**
   * Create a draft
   */
  async createDraft(rawMessage: string, threadId?: string): Promise<{ id: string; message: { id: string; threadId: string } }> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      
      const body: any = { message: { raw: rawMessage } };
      if (threadId) body.message.threadId = threadId;
      
      const response = await this.client.post(`/${this.userId}/drafts`, body);
      return response.data;
    }, 'createDraft');
  }

  /**
   * Update a draft
   */
  async updateDraft(draftId: string, rawMessage: string): Promise<{ id: string; message: { id: string; threadId: string } }> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.put(`/${this.userId}/drafts/${draftId}`, {
        message: { raw: rawMessage },
      });
      return response.data;
    }, `updateDraft(${draftId})`);
  }

  /**
   * Delete a message permanently
   */
  async deleteMessage(messageId: string): Promise<void> {
    await this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      await this.client.delete(`/${this.userId}/messages/${messageId}`);
    }, `deleteMessage(${messageId})`);
  }

  /**
   * Move message to trash
   */
  async trashMessage(messageId: string): Promise<void> {
    await this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      await this.client.post(`/${this.userId}/messages/${messageId}/trash`);
    }, `trashMessage(${messageId})`);
  }

  /**
   * Remove message from trash
   */
  async untrashMessage(messageId: string): Promise<void> {
    await this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      await this.client.post(`/${this.userId}/messages/${messageId}/untrash`);
    }, `untrashMessage(${messageId})`);
  }

  /**
   * Modify message labels
   */
  async modifyMessage(messageId: string, addLabelIds: string[], removeLabelIds: string[]): Promise<void> {
    await this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      await this.client.post(`/${this.userId}/messages/${messageId}/modify`, {
        addLabelIds,
        removeLabelIds,
      });
    }, `modifyMessage(${messageId})`);
  }

  /**
   * Batch modify messages
   */
  async batchModifyMessages(ids: string[], addLabelIds: string[], removeLabelIds: string[]): Promise<void> {
    await this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      await this.client.post(`/${this.userId}/messages/batchModify`, {
        ids,
        addLabelIds,
        removeLabelIds,
      });
    }, `batchModifyMessages(${ids.length} messages)`);
  }

  /**
   * Get all labels
   */
  async getLabels(): Promise<GmailLabel[]> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.get(`/${this.userId}/labels`);
      return response.data.labels || [];
    }, 'getLabels');
  }

  /**
   * Create a label
   */
  async createLabel(name: string, messageListVisibility: string = 'show', labelListVisibility: string = 'labelShow'): Promise<GmailLabel> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.post(`/${this.userId}/labels`, {
        name,
        messageListVisibility,
        labelListVisibility,
      });
      return response.data;
    }, `createLabel(${name})`);
  }

  /**
   * Delete a label
   */
  async deleteLabel(labelId: string): Promise<void> {
    await this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      await this.client.delete(`/${this.userId}/labels/${labelId}`);
    }, `deleteLabel(${labelId})`);
  }

  /**
   * Update a label
   */
  async updateLabel(labelId: string, updates: Partial<GmailLabel>): Promise<GmailLabel> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.put(`/${this.userId}/labels/${labelId}`, updates);
      return response.data;
    }, `updateLabel(${labelId})`);
  }

  /**
   * Search messages
   */
  async searchMessages(query: string, maxResults: number = 20): Promise<GmailMessageList> {
    return this.listMessages({ q: query, maxResults });
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    await this.modifyMessage(messageId, [], ['UNREAD']);
  }

  /**
   * Mark message as unread
   */
  async markAsUnread(messageId: string): Promise<void> {
    await this.modifyMessage(messageId, ['UNREAD'], []);
  }

  /**
   * Archive message (remove from inbox)
   */
  async archiveMessage(messageId: string): Promise<void> {
    await this.modifyMessage(messageId, [], ['INBOX']);
  }

  /**
   * Star message
   */
  async starMessage(messageId: string): Promise<void> {
    await this.modifyMessage(messageId, ['STARRED'], []);
  }

  /**
   * Unstar message
   */
  async unstarMessage(messageId: string): Promise<void> {
    await this.modifyMessage(messageId, [], ['STARRED']);
  }

  /**
   * Get attachment
   */
  async getAttachment(messageId: string, attachmentId: string): Promise<Buffer> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.get(
        `/${this.userId}/messages/${messageId}/attachments/${attachmentId}`,
        { responseType: 'arraybuffer' }
      );
      return Buffer.from(response.data);
    }, `getAttachment(${messageId}, ${attachmentId})`);
  }

  /**
   * Get thread
   */
  async getThread(threadId: string): Promise<{ id: string; messages: GmailMessage[] }> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.get(`/${this.userId}/threads/${threadId}`);
      return response.data;
    }, `getThread(${threadId})`);
  }

  /**
   * List threads
   */
  async listThreads(params: {
    maxResults?: number;
    pageToken?: string;
    q?: string;
    labelIds?: string[];
  }): Promise<{ threads: Array<{ id: string }>; nextPageToken?: string; resultSizeEstimate: number }> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.get(`/${this.userId}/threads`, { params });
      return response.data;
    }, 'listThreads');
  }

  /**
   * Delete a thread
   */
  async deleteThread(threadId: string): Promise<void> {
    await this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      await this.client.delete(`/${this.userId}/threads/${threadId}`);
    }, `deleteThread(${threadId})`);
  }

  /**
   * Modify thread labels
   */
  async modifyThread(threadId: string, addLabelIds: string[], removeLabelIds: string[]): Promise<void> {
    await this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      await this.client.post(`/${this.userId}/threads/${threadId}/modify`, {
        addLabelIds,
        removeLabelIds,
      });
    }, `modifyThread(${threadId})`);
  }
}