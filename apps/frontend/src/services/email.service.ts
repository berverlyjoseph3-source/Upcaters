// apps/frontend/src/services/email.service.ts
import { apiClient } from '../api/client';

// ============================================
// Types
// ============================================

export interface EmailAddress {
  name?: string;
  email: string;
}

export interface EmailAttachment {
  id?: string;
  filename: string;
  mimeType: string;
  size?: number;
  content?: string | Buffer;
  url?: string;
  inline?: boolean;
  contentId?: string;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  body: string;
  bodyHtml?: string;
  snippet: string;
  labels: string[];
  isRead: boolean;
  isStarred: boolean;
  isImportant: boolean;
  isDraft: boolean;
  isSent: boolean;
  receivedAt: Date;
  sentAt?: Date;
  attachments?: EmailAttachment[];
  replyTo?: EmailAddress;
  inReplyTo?: string;
  references?: string[];
  hasAttachments: boolean;
  sizeEstimate?: number;
  historyId?: string;
}

export interface EmailListResponse {
  emails: EmailMessage[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}

export interface EmailFilterOptions {
  maxResults?: number;
  pageToken?: string;
  q?: string;
  labelIds?: string[];
  includeSpamTrash?: boolean;
  unreadOnly?: boolean;
  starredOnly?: boolean;
  importantOnly?: boolean;
  from?: string;
  to?: string;
  subject?: string;
  after?: Date;
  before?: Date;
  hasAttachment?: boolean;
}

export interface EmailSendOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  body: string;
  bodyHtml?: string;
  replyTo?: string;
  inReplyTo?: string;
  references?: string[];
  attachments?: Array<{
    filename: string;
    content: string | Blob;
    mimeType?: string;
  }>;
  threadId?: string;
}

export interface EmailDraft {
  id: string;
  message: EmailMessage;
  created: Date;
  updated: Date;
}

export interface EmailLabel {
  id: string;
  name: string;
  type: 'system' | 'user';
  messageListVisibility?: string;
  labelListVisibility?: string;
  messagesTotal?: number;
  messagesUnread?: number;
  threadsTotal?: number;
  threadsUnread?: number;
  color?: {
    textColor: string;
    backgroundColor: string;
  };
}

export interface EmailClassification {
  category: 'urgent' | 'important' | 'newsletter' | 'spam' | 'normal' | 'social' | 'promotion';
  priority: number;
  suggestedAction: 'reply' | 'read' | 'archive' | 'delete' | 'label' | 'ignore' | 'forward';
  suggestedLabels: string[];
  reason: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  hasActionItems?: boolean;
  actionItems?: string[];
}

export interface EmailReplySuggestion {
  emailId: string;
  suggestedReplies: string[];
  tone: 'professional' | 'casual' | 'friendly' | 'formal';
  context: string;
  confidence: number;
}

export interface EmailSummary {
  totalUnread: number;
  totalInbox: number;
  totalSent: number;
  totalDrafts: number;
  totalSpam: number;
  totalTrash: number;
  byCategory: Record<string, number>;
  recentEmails: EmailMessage[];
  urgentCount: number;
  averageResponseTimeHours?: number;
  topSenders: Array<{ email: string; name: string; count: number }>;
}

export interface EmailBatchResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: Array<{ id: string; error: string }>;
}

export interface EmailThread {
  id: string;
  messages: EmailMessage[];
  subject: string;
  snippet: string;
  lastMessageDate: Date;
  messageCount: number;
  participants: EmailAddress[];
  hasAttachment: boolean;
  isUnread: boolean;
}

export interface EmailSearchSuggestion {
  query: string;
  description: string;
  category: string;
}

// ============================================
// Email Service
// ============================================

class EmailService {
  // ============================================
  // Fetch Emails
  // ============================================

  static async fetchEmails(options: EmailFilterOptions = {}): Promise<EmailListResponse> {
    const params: Record<string, any> = {
      maxResults: options.maxResults || 20,
      pageToken: options.pageToken,
      q: options.q,
      labelIds: options.labelIds?.join(','),
      includeSpamTrash: options.includeSpamTrash,
    };

    if (options.unreadOnly) params.q = `${params.q || ''} is:unread`.trim();
    if (options.starredOnly) params.q = `${params.q || ''} is:starred`.trim();
    if (options.importantOnly) params.q = `${params.q || ''} is:important`.trim();
    if (options.from) params.q = `${params.q || ''} from:${options.from}`.trim();
    if (options.to) params.q = `${params.q || ''} to:${options.to}`.trim();
    if (options.subject) params.q = `${params.q || ''} subject:${options.subject}`.trim();
    if (options.after) params.q = `${params.q || ''} after:${Math.floor(options.after.getTime() / 1000)}`.trim();
    if (options.before) params.q = `${params.q || ''} before:${Math.floor(options.before.getTime() / 1000)}`.trim();
    if (options.hasAttachment) params.q = `${params.q || ''} has:attachment`.trim();

    const response = await apiClient.get<EmailListResponse>('/api/agent/email/emails', { params });

    if (response.success && response.data) {
      return {
        emails: response.data.emails.map(EmailService.transformEmail),
        nextPageToken: response.data.nextPageToken,
        resultSizeEstimate: response.data.resultSizeEstimate,
      };
    }

    throw new Error(response.error || 'Failed to fetch emails');
  }

  // ============================================
  // Get Single Email
  // ============================================

  static async getEmail(emailId: string): Promise<EmailMessage> {
    const response = await apiClient.get<EmailMessage>(`/api/agent/email/emails/${emailId}`);

    if (response.success && response.data) {
      return EmailService.transformEmail(response.data);
    }

    throw new Error(response.error || 'Failed to fetch email');
  }

  // ============================================
  // Get Email Thread
  // ============================================

  static async getThread(threadId: string): Promise<EmailThread> {
    const response = await apiClient.get<EmailThread>(`/api/agent/email/threads/${threadId}`);

    if (response.success && response.data) {
      return {
        ...response.data,
        lastMessageDate: new Date(response.data.lastMessageDate),
        messages: response.data.messages.map(EmailService.transformEmail),
      };
    }

    throw new Error(response.error || 'Failed to fetch thread');
  }

  // ============================================
  // Send Email
  // ============================================

  static async sendEmail(options: EmailSendOptions): Promise<{ id: string; threadId?: string }> {
    const response = await apiClient.post<{ id: string; threadId?: string }>(
      '/api/agent/email/emails/send',
      {
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
        bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : undefined,
        subject: options.subject,
        body: options.body,
        bodyHtml: options.bodyHtml,
        replyTo: options.replyTo,
        inReplyTo: options.inReplyTo,
        references: options.references?.join(' '),
        attachments: options.attachments,
        threadId: options.threadId,
      }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to send email');
  }

  // ============================================
  // Reply to Email
  // ============================================

  static async replyToEmail(
    emailId: string,
    body: string,
    options?: {
      bodyHtml?: string;
      quoteOriginal?: boolean;
      attachments?: Array<{ filename: string; content: string | Blob; mimeType?: string }>;
    }
  ): Promise<{ id: string; threadId?: string }> {
    const response = await apiClient.post<{ id: string; threadId?: string }>(
      `/api/agent/email/emails/${emailId}/reply`,
      {
        body,
        bodyHtml: options?.bodyHtml,
        quoteOriginal: options?.quoteOriginal !== false,
        attachments: options?.attachments,
      }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to send reply');
  }

  // ============================================
  // Forward Email
  // ============================================

  static async forwardEmail(
    emailId: string,
    to: string | string[],
    additionalMessage?: string
  ): Promise<{ id: string; threadId?: string }> {
    const response = await apiClient.post<{ id: string; threadId?: string }>(
      `/api/agent/email/emails/${emailId}/forward`,
      {
        to: Array.isArray(to) ? to.join(', ') : to,
        additionalMessage,
      }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to forward email');
  }

  // ============================================
  // Create Draft
  // ============================================

  static async createDraft(options: EmailSendOptions): Promise<EmailDraft> {
    const response = await apiClient.post<EmailDraft>(
      '/api/agent/email/drafts',
      {
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
        bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : undefined,
        subject: options.subject,
        body: options.body,
        bodyHtml: options.bodyHtml,
        replyTo: options.replyTo,
        attachments: options.attachments,
        threadId: options.threadId,
      }
    );

    if (response.success && response.data) {
      return {
        ...response.data,
        created: new Date(response.data.created),
        updated: new Date(response.data.updated),
        message: EmailService.transformEmail(response.data.message),
      };
    }

    throw new Error(response.error || 'Failed to create draft');
  }

  // ============================================
  // Update Draft
  // ============================================

  static async updateDraft(
    draftId: string,
    options: Partial<EmailSendOptions>
  ): Promise<EmailDraft> {
    const response = await apiClient.put<EmailDraft>(
      `/api/agent/email/drafts/${draftId}`,
      options
    );

    if (response.success && response.data) {
      return {
        ...response.data,
        created: new Date(response.data.created),
        updated: new Date(response.data.updated),
        message: EmailService.transformEmail(response.data.message),
      };
    }

    throw new Error(response.error || 'Failed to update draft');
  }

  // ============================================
  // Delete Draft
  // ============================================

  static async deleteDraft(draftId: string): Promise<void> {
    const response = await apiClient.delete(`/api/agent/email/drafts/${draftId}`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete draft');
    }
  }

  // ============================================
  // Mark as Read/Unread
  // ============================================

  static async markAsRead(emailIds: string[]): Promise<EmailBatchResult> {
    const response = await apiClient.post<EmailBatchResult>(
      '/api/agent/email/emails/markRead',
      { emailIds }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to mark as read');
  }

  static async markAsUnread(emailIds: string[]): Promise<EmailBatchResult> {
    const response = await apiClient.post<EmailBatchResult>(
      '/api/agent/email/emails/markUnread',
      { emailIds }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to mark as unread');
  }

  // ============================================
  // Archive / Unarchive
  // ============================================

  static async archiveEmails(emailIds: string[]): Promise<EmailBatchResult> {
    const response = await apiClient.post<EmailBatchResult>(
      '/api/agent/email/emails/archive',
      { emailIds }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to archive emails');
  }

  static async unarchiveEmails(emailIds: string[]): Promise<EmailBatchResult> {
    const response = await apiClient.post<EmailBatchResult>(
      '/api/agent/email/emails/unarchive',
      { emailIds }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to unarchive emails');
  }

  // ============================================
  // Star / Unstar
  // ============================================

  static async starEmails(emailIds: string[]): Promise<EmailBatchResult> {
    const response = await apiClient.post<EmailBatchResult>(
      '/api/agent/email/emails/star',
      { emailIds }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to star emails');
  }

  static async unstarEmails(emailIds: string[]): Promise<EmailBatchResult> {
    const response = await apiClient.post<EmailBatchResult>(
      '/api/agent/email/emails/unstar',
      { emailIds }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to unstar emails');
  }

  // ============================================
  // Move to Trash / Delete
  // ============================================

  static async trashEmails(emailIds: string[]): Promise<EmailBatchResult> {
    const response = await apiClient.post<EmailBatchResult>(
      '/api/agent/email/emails/trash',
      { emailIds }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to trash emails');
  }

  static async deleteEmails(emailIds: string[]): Promise<EmailBatchResult> {
    const response = await apiClient.post<EmailBatchResult>(
      '/api/agent/email/emails/delete',
      { emailIds }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to delete emails');
  }

  static async untrashEmails(emailIds: string[]): Promise<EmailBatchResult> {
    const response = await apiClient.post<EmailBatchResult>(
      '/api/agent/email/emails/untrash',
      { emailIds }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to restore emails');
  }

  // ============================================
  // Labels Management
  // ============================================

  static async getLabels(): Promise<EmailLabel[]> {
    const response = await apiClient.get<{ labels: EmailLabel[] }>('/api/agent/email/labels');

    if (response.success && response.data) {
      return response.data.labels;
    }

    throw new Error(response.error || 'Failed to fetch labels');
  }

  static async createLabel(
    name: string,
    options?: {
      messageListVisibility?: string;
      labelListVisibility?: string;
      color?: { textColor: string; backgroundColor: string };
    }
  ): Promise<EmailLabel> {
    const response = await apiClient.post<EmailLabel>('/api/agent/email/labels', {
      name,
      ...options,
    });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to create label');
  }

  static async updateLabel(
    labelId: string,
    updates: Partial<Pick<EmailLabel, 'name' | 'messageListVisibility' | 'labelListVisibility' | 'color'>>
  ): Promise<EmailLabel> {
    const response = await apiClient.put<EmailLabel>(`/api/agent/email/labels/${labelId}`, updates);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to update label');
  }

  static async deleteLabel(labelId: string): Promise<void> {
    const response = await apiClient.delete(`/api/agent/email/labels/${labelId}`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete label');
    }
  }

  static async applyLabel(emailIds: string[], labelIds: string[]): Promise<EmailBatchResult> {
    const response = await apiClient.post<EmailBatchResult>(
      '/api/agent/email/emails/labels',
      { emailIds, addLabelIds: labelIds }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to apply labels');
  }

  static async removeLabel(emailIds: string[], labelIds: string[]): Promise<EmailBatchResult> {
    const response = await apiClient.post<EmailBatchResult>(
      '/api/agent/email/emails/labels/remove',
      { emailIds, removeLabelIds: labelIds }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to remove labels');
  }

  // ============================================
  // Classification & AI Features
  // ============================================

  static async classifyEmail(emailId: string): Promise<EmailClassification> {
    const response = await apiClient.post<EmailClassification>(
      `/api/agent/email/emails/${emailId}/classify`
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to classify email');
  }

  static async classifyMultipleEmails(emailIds: string[]): Promise<Record<string, EmailClassification>> {
    const response = await apiClient.post<Record<string, EmailClassification>>(
      '/api/agent/email/emails/classify/batch',
      { emailIds }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to classify emails');
  }

  static async generateReplySuggestions(
    emailId: string,
    options?: {
      tone?: 'professional' | 'casual' | 'friendly' | 'formal';
      count?: number;
      maxLength?: number;
    }
  ): Promise<EmailReplySuggestion> {
    const response = await apiClient.post<EmailReplySuggestion>(
      `/api/agent/email/emails/${emailId}/suggest-reply`,
      {
        tone: options?.tone || 'professional',
        count: options?.count || 3,
        maxLength: options?.maxLength || 300,
      }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to generate reply suggestions');
  }

  // ============================================
  // Smart Compose
  // ============================================

  static async smartCompose(
    partialDraft: string,
    context?: {
      subject?: string;
      recipientName?: string;
      previousEmails?: string[];
      tone?: string;
    }
  ): Promise<{ completion: string; confidence: number }> {
    const response = await apiClient.post<{ completion: string; confidence: number }>(
      '/api/agent/email/smart-compose',
      {
        partialDraft,
        context,
      }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to generate completion');
  }

  // ============================================
  // Email Summary
  // ============================================

  static async getEmailSummary(): Promise<EmailSummary> {
    const response = await apiClient.get<EmailSummary>('/api/agent/email/summary');

    if (response.success && response.data) {
      return {
        ...response.data,
        recentEmails: response.data.recentEmails.map(EmailService.transformEmail),
      };
    }

    throw new Error(response.error || 'Failed to get email summary');
  }

  // ============================================
  // Search Emails
  // ============================================

  static async searchEmails(
    query: string,
    maxResults: number = 20
  ): Promise<EmailListResponse> {
    return EmailService.fetchEmails({ q: query, maxResults });
  }

  static async getSearchSuggestions(partialQuery: string): Promise<EmailSearchSuggestion[]> {
    const response = await apiClient.get<{ suggestions: EmailSearchSuggestion[] }>(
      '/api/agent/email/search-suggestions',
      { params: { q: partialQuery } }
    );

    if (response.success && response.data) {
      return response.data.suggestions;
    }

    return [];
  }

  // ============================================
  // Attachments
  // ============================================

  static async getAttachment(
    emailId: string,
    attachmentId: string
  ): Promise<{ data: Blob; filename: string; mimeType: string }> {
    const response = await apiClient.get<{ url: string; filename: string; mimeType: string }>(
      `/api/agent/email/attachments/${emailId}/${attachmentId}`
    );

    if (response.success && response.data) {
      const blobResponse = await fetch(response.data.url);
      const blob = await blobResponse.blob();
      return {
        data: blob,
        filename: response.data.filename,
        mimeType: response.data.mimeType,
      };
    }

    throw new Error(response.error || 'Failed to get attachment');
  }

  // ============================================
  // Settings
  // ============================================

  static async getSettings(): Promise<{
    signature: string;
    autoReply: boolean;
    autoReplyMessage: string;
    defaultSendAs: string;
    language: string;
    displayName: string;
    sendAsAliases: string[];
  }> {
    const response = await apiClient.get<{
      signature: string;
      autoReply: boolean;
      autoReplyMessage: string;
      defaultSendAs: string;
      language: string;
      displayName: string;
      sendAsAliases: string[];
    }>('/api/agent/email/settings');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to get settings');
  }

  static async updateSettings(settings: Partial<{
    signature: string;
    autoReply: boolean;
    autoReplyMessage: string;
    defaultSendAs: string;
    language: string;
    displayName: string;
  }>): Promise<void> {
    const response = await apiClient.put('/api/agent/email/settings', settings);

    if (!response.success) {
      throw new Error(response.error || 'Failed to update settings');
    }
  }

  // ============================================
  // Connection
  // ============================================

  static async isConnected(): Promise<boolean> {
    try {
      const response = await apiClient.get<{ connected: boolean }>('/api/agent/email/status');
      return response.data?.connected || false;
    } catch {
      return false;
    }
  }

  static async disconnect(): Promise<void> {
    const response = await apiClient.delete('/api/agent/email/disconnect');
    if (!response.success) {
      throw new Error(response.error || 'Failed to disconnect');
    }
  }

  // ============================================
  // Helpers
  // ============================================

  private static transformEmail(email: any): EmailMessage {
    return {
      id: email.id,
      threadId: email.threadId,
      from: EmailService.parseEmailAddress(email.from),
      to: EmailService.parseEmailAddresses(email.to),
      cc: email.cc ? EmailService.parseEmailAddresses(email.cc) : undefined,
      bcc: email.bcc ? EmailService.parseEmailAddresses(email.bcc) : undefined,
      subject: email.subject || '(no subject)',
      body: email.body || '',
      bodyHtml: email.bodyHtml,
      snippet: email.snippet || '',
      labels: email.labels || [],
      isRead: !email.labels?.includes('UNREAD'),
      isStarred: email.labels?.includes('STARRED') || false,
      isImportant: email.labels?.includes('IMPORTANT') || false,
      isDraft: email.labels?.includes('DRAFT') || false,
      isSent: email.labels?.includes('SENT') || false,
      receivedAt: new Date(email.receivedAt || email.internalDate || Date.now()),
      sentAt: email.sentAt ? new Date(email.sentAt) : undefined,
      attachments: email.attachments?.map((a: any) => ({
        id: a.id,
        filename: a.filename || a.name,
        mimeType: a.mimeType,
        size: a.size,
        url: a.url,
      })),
      replyTo: email.replyTo ? EmailService.parseEmailAddress(email.replyTo) : undefined,
      inReplyTo: email.inReplyTo,
      references: email.references,
      hasAttachments: email.hasAttachments || (email.attachments?.length > 0) || false,
      sizeEstimate: email.sizeEstimate,
      historyId: email.historyId,
    };
  }

  private static parseEmailAddress(addressStr: string): EmailAddress {
    if (!addressStr) return { email: '' };

    const match = addressStr.match(/^(?:"?([^"]*)"?\s*)?<?([^>]*)>?$/);
    if (match) {
      return {
        name: match[1]?.trim() || undefined,
        email: match[2]?.trim() || addressStr.trim(),
      };
    }

    return { email: addressStr.trim() };
  }

  private static parseEmailAddresses(addressesStr: string | string[]): EmailAddress[] {
    if (!addressesStr) return [];

    const str = Array.isArray(addressesStr) ? addressesStr.join(', ') : addressesStr;
    return str.split(',').map(a => EmailService.parseEmailAddress(a.trim()));
  }

  // ============================================
  // Utility Formatters
  // ============================================

  static formatAddress(address: EmailAddress): string {
    if (address.name) {
      return `"${address.name}" <${address.email}>`;
    }
    return address.email;
  }

  static formatAddressList(addresses: EmailAddress[]): string {
    return addresses.map(EmailService.formatAddress).join(', ');
  }

  static extractDomain(email: string): string {
    const match = email.match(/@(.+)$/);
    return match ? match[1] : email;
  }

  static formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  static getTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

export default EmailService;
