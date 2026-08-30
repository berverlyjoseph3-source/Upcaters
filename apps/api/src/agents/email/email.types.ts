// enterprise-ai-agent-platform/apps/api/src/agents/email/email.types.ts

/**
 * Email Message Interface
 */
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
  receivedAt: Date;
  sentAt?: Date;
  attachments?: EmailAttachment[];
  replyTo?: EmailAddress;
  inReplyTo?: string;
  references?: string[];
}

/**
 * Email Address Interface
 */
export interface EmailAddress {
  name?: string;
  email: string;
}

/**
 * Email Attachment Interface
 */
export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url?: string;
  content?: Buffer;
}

/**
 * Email Filter Options
 */
export interface EmailFilterOptions {
  maxResults?: number;
  labelIds?: string[];
  query?: string;
  pageToken?: string;
  includeSpamTrash?: boolean;
}

/**
 * Email Send Options
 */
export interface EmailSendOptions {
  to: string | EmailAddress | (string | EmailAddress)[];
  subject: string;
  body: string;
  bodyHtml?: string;
  cc?: string | EmailAddress | (string | EmailAddress)[];
  bcc?: string | EmailAddress | (string | EmailAddress)[];
  replyTo?: string | EmailAddress;
  attachments?: EmailAttachment[];
  inReplyTo?: string;
  references?: string[];
}

/**
 * Email Draft Interface
 */
export interface EmailDraft {
  id: string;
  message: EmailMessage;
  created: Date;
  updated: Date;
}

/**
 * Email Classification Result
 */
export interface EmailClassification {
  category: 'urgent' | 'important' | 'newsletter' | 'spam' | 'normal';
  priority: number; // 1-10, 10 being highest
  suggestedAction: 'reply' | 'read' | 'archive' | 'delete' | 'label' | 'ignore';
  suggestedLabels: string[];
  reason: string;
}

/**
 * Email Batch Operation Result
 */
export interface EmailBatchResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: Array<{ id: string; error: string }>;
}

/**
 * Email Label Interface
 */
export interface EmailLabel {
  id: string;
  name: string;
  type: 'system' | 'user';
  color?: string;
  messageListVisibility: 'show' | 'hide';
  labelListVisibility: 'labelShow' | 'labelShowIfUnread' | 'labelHide';
}

/**
 * Email Reply Suggestion
 */
export interface EmailReplySuggestion {
  emailId: string;
  suggestedReplies: string[];
  tone: 'professional' | 'casual' | 'friendly' | 'formal';
  context: string;
}

/**
 * Email Summary
 */
export interface EmailSummary {
  totalUnread: number;
  totalInbox: number;
  byCategory: Record<string, number>;
  recentEmails: EmailMessage[];
  urgentCount: number;
}

/**
 * Email Webhook Payload
 */
export interface EmailWebhookPayload {
  emailId: string;
  userId: string;
  eventType: 'received' | 'sent' | 'read' | 'deleted' | 'archived';
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Gmail API Response Types
 */
export interface GmailMessageResponse {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  historyId: string;
  internalDate: string;
  payload: GmailMessagePart;
  sizeEstimate: number;
}

export interface GmailMessagePart {
  partId: string;
  mimeType: string;
  filename: string;
  headers: Array<{ name: string; value: string }>;
  body: { size: number; data?: string; attachmentId?: string };
  parts?: GmailMessagePart[];
}

export interface GmailProfileResponse {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

/**
 * Email Agent Configuration
 */
export interface EmailAgentConfig {
  maxEmailsPerFetch: number;
  autoLabelEnabled: boolean;
  autoReplyThreshold: number;
  syncIntervalMinutes: number;
  enableSmartClassification: boolean;
}