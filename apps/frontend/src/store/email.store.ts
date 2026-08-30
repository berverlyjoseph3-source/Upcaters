// enterprise-ai-agent-platform/apps/frontend/src/store/email.store.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { apiClient } from '../api/client';

// ============================================
// Types
// ============================================

export interface EmailAddress {
  name?: string;
  email: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url?: string;
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
  hasAttachments: boolean;
  attachments?: EmailAttachment[];
  receivedAt: Date;
}

export interface EmailDraft {
  id: string;
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailLabel {
  id: string;
  name: string;
  type: 'system' | 'user';
  color?: string;
  messageCount?: number;
  unreadCount?: number;
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
  needsResponseCount: number;
  lastSyncTime: Date;
}

export interface EmailClassification {
  category: 'urgent' | 'important' | 'newsletter' | 'spam' | 'social' | 'promotional' | 'normal';
  priority: number;
  suggestedAction: 'reply' | 'read' | 'archive' | 'delete' | 'label' | 'ignore';
  suggestedLabels: string[];
  reason: string;
  confidence: number;
}

export interface EmailReplySuggestion {
  emailId: string;
  suggestedReplies: string[];
  tone: 'professional' | 'casual' | 'friendly' | 'formal' | 'enthusiastic';
  context: string;
}

export interface EmailFilterOptions {
  maxResults?: number;
  pageToken?: string;
  query?: string;
  labelIds?: string[];
  from?: string;
  to?: string;
  hasAttachment?: boolean;
  afterDate?: Date;
  beforeDate?: Date;
}

export interface EmailSendOptions {
  to: string;
  subject: string;
  body: string;
  bodyHtml?: string;
  cc?: string;
  bcc?: string;
  replyTo?: string;
  attachments?: File[];
  inReplyTo?: string;
}

export interface EmailBatchResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: Array<{ id: string; error: string }>;
}

// ============================================
// View & Sort Types
// ============================================

export type EmailView = 'inbox' | 'sent' | 'drafts' | 'starred' | 'archive' | 'trash' | 'spam';
export type EmailSortField = 'receivedAt' | 'subject' | 'from' | 'isRead';
export type EmailSortDirection = 'asc' | 'desc';

// ============================================
// Store State Interface
// ============================================

interface EmailState {
  // ============================================
  // Data State
  // ============================================
  emails: EmailMessage[];
  selectedEmailId: string | null;
  drafts: EmailDraft[];
  labels: EmailLabel[];
  summary: EmailSummary | null;
  classifications: Record<string, EmailClassification>;
  replySuggestions: Record<string, EmailReplySuggestion>;

  // ============================================
  // UI State
  // ============================================
  activeView: EmailView;
  isLoading: boolean;
  isSending: boolean;
  isFetchingMore: boolean;
  isComposing: boolean;
  isClassifying: boolean;
  isGeneratingReply: boolean;
  error: string | null;
  searchQuery: string;
  sortField: EmailSortField;
  sortDirection: EmailSortDirection;
  selectedEmailIds: Set<string>;
  nextPageToken: string | null;
  hasMoreEmails: boolean;
  lastSyncTime: Date | null;

  // ============================================
  // Compose State
  // ============================================
  composeOpen: boolean;
  composeTo: string;
  composeSubject: string;
  composeBody: string;
  composeCc: string;
  composeBcc: string;
  composeAttachments: File[];
  composeReplyToId: string | null;
  composeIsReply: boolean;
  composeIsForward: boolean;

  // ============================================
  // Actions - Email Fetching
  // ============================================
  fetchEmails: (view?: EmailView, options?: EmailFilterOptions) => Promise<void>;
  fetchMoreEmails: () => Promise<void>;
  fetchEmailById: (emailId: string) => Promise<EmailMessage | null>;
  fetchDrafts: () => Promise<void>;
  fetchLabels: () => Promise<void>;
  fetchSummary: () => Promise<void>;
  refreshEmails: () => Promise<void>;

  // ============================================
  // Actions - Email Operations
  // ============================================
  sendEmail: (options: EmailSendOptions) => Promise<{ success: boolean; error?: string }>;
  saveDraft: (draft: Partial<EmailDraft>) => Promise<{ success: boolean; draftId?: string; error?: string }>;
  updateDraft: (draftId: string, updates: Partial<EmailDraft>) => Promise<{ success: boolean; error?: string }>;
  deleteDraft: (draftId: string) => Promise<{ success: boolean; error?: string }>;
  replyToEmail: (emailId: string, body: string, quoteOriginal?: boolean) => Promise<{ success: boolean; error?: string }>;
  forwardEmail: (emailId: string, to: string, body?: string) => Promise<{ success: boolean; error?: string }>;

  // ============================================
  // Actions - Email Management
  // ============================================
  markAsRead: (emailIds: string[]) => Promise<void>;
  markAsUnread: (emailIds: string[]) => Promise<void>;
  toggleStar: (emailIds: string[]) => Promise<void>;
  archiveEmails: (emailIds: string[]) => Promise<EmailBatchResult>;
  deleteEmails: (emailIds: string[]) => Promise<EmailBatchResult>;
  moveToTrash: (emailIds: string[]) => Promise<void>;
  restoreFromTrash: (emailIds: string[]) => Promise<void>;
  applyLabels: (emailIds: string[], labelIds: string[]) => Promise<void>;
  removeLabels: (emailIds: string[], labelIds: string[]) => Promise<void>;

  // ============================================
  // Actions - AI Features
  // ============================================
  classifyEmail: (emailId: string) => Promise<EmailClassification | null>;
  classifyAllUnread: () => Promise<void>;
  generateReplySuggestions: (emailId: string, tone?: string, length?: string) => Promise<EmailReplySuggestion | null>;
  summarizeThread: (emailId: string) => Promise<string | null>;

  // ============================================
  // Actions - Search & Filter
  // ============================================
  searchEmails: (query: string) => Promise<void>;
  filterByLabel: (labelId: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;

  // ============================================
  // Actions - UI State
  // ============================================
  setActiveView: (view: EmailView) => void;
  selectEmail: (emailId: string | null) => void;
  toggleEmailSelection: (emailId: string) => void;
  selectAllEmails: () => void;
  clearSelection: () => void;
  setSortOrder: (field: EmailSortField, direction: EmailSortDirection) => void;
  openCompose: (options?: { replyTo?: string; forwardOf?: string; to?: string; subject?: string }) => void;
  closeCompose: () => void;
  updateComposeField: (field: string, value: any) => void;
  clearError: () => void;

  // ============================================
  // Actions - Labels
  // ============================================
  createLabel: (name: string, color?: string) => Promise<EmailLabel | null>;
  updateLabel: (labelId: string, updates: Partial<EmailLabel>) => Promise<void>;
  deleteLabel: (labelId: string) => Promise<void>;

  // ============================================
  // Computed
  // ============================================
  getSelectedEmail: () => EmailMessage | null;
  getFilteredEmails: () => EmailMessage[];
  getUnreadCount: () => number;
  getStarredCount: () => number;
  getDraftCount: () => number;
  getSelectedCount: () => number;
}

// ============================================
// Store Implementation
// ============================================

export const useEmailStore = create<EmailState>()(
  devtools(
    persist(
      (set, get) => ({
        // ============================================
        // Initial State
        // ============================================
        emails: [],
        selectedEmailId: null,
        drafts: [],
        labels: [],
        summary: null,
        classifications: {},
        replySuggestions: {},

        activeView: 'inbox',
        isLoading: false,
        isSending: false,
        isFetchingMore: false,
        isComposing: false,
        isClassifying: false,
        isGeneratingReply: false,
        error: null,
        searchQuery: '',
        sortField: 'receivedAt',
        sortDirection: 'desc',
        selectedEmailIds: new Set<string>(),
        nextPageToken: null,
        hasMoreEmails: false,
        lastSyncTime: null,

        composeOpen: false,
        composeTo: '',
        composeSubject: '',
        composeBody: '',
        composeCc: '',
        composeBcc: '',
        composeAttachments: [],
        composeReplyToId: null,
        composeIsReply: false,
        composeIsForward: false,

        // ============================================
        // Computed Getters
        // ============================================
        getSelectedEmail: () => {
          const { emails, selectedEmailId } = get();
          return emails.find(e => e.id === selectedEmailId) || null;
        },

        getFilteredEmails: () => {
          const { emails, activeView, searchQuery } = get();
          let filtered = [...emails];

          // Filter by view
          switch (activeView) {
            case 'inbox':
              filtered = filtered.filter(e => !e.labels.includes('TRASH') && !e.labels.includes('DRAFT') && !e.labels.includes('SENT'));
              break;
            case 'sent':
              filtered = filtered.filter(e => e.labels.includes('SENT'));
              break;
            case 'drafts':
              filtered = filtered.filter(e => e.labels.includes('DRAFT'));
              break;
            case 'starred':
              filtered = filtered.filter(e => e.isStarred);
              break;
            case 'archive':
              filtered = filtered.filter(e => e.labels.includes('ARCHIVE'));
              break;
            case 'trash':
              filtered = filtered.filter(e => e.labels.includes('TRASH'));
              break;
            case 'spam':
              filtered = filtered.filter(e => e.labels.includes('SPAM'));
              break;
          }

          // Filter by search
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(e =>
              e.subject.toLowerCase().includes(query) ||
              e.from.name?.toLowerCase().includes(query) ||
              e.from.email.toLowerCase().includes(query) ||
              e.snippet.toLowerCase().includes(query) ||
              e.body.toLowerCase().includes(query)
            );
          }

          // Sort
          const { sortField, sortDirection } = get();
          filtered.sort((a, b) => {
            let comparison = 0;
            switch (sortField) {
              case 'receivedAt':
                comparison = new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime();
                break;
              case 'subject':
                comparison = a.subject.localeCompare(b.subject);
                break;
              case 'from':
                comparison = (a.from.name || a.from.email).localeCompare(b.from.name || b.from.email);
                break;
              case 'isRead':
                comparison = Number(a.isRead) - Number(b.isRead);
                break;
            }
            return sortDirection === 'asc' ? comparison : -comparison;
          });

          return filtered;
        },

        getUnreadCount: () => {
          return get().emails.filter(e => !e.isRead && !e.labels.includes('TRASH') && !e.labels.includes('DRAFT')).length;
        },

        getStarredCount: () => {
          return get().emails.filter(e => e.isStarred).length;
        },

        getDraftCount: () => {
          return get().drafts.length;
        },

        getSelectedCount: () => {
          return get().selectedEmailIds.size;
        },

        // ============================================
        // Email Fetching Actions
        // ============================================

        fetchEmails: async (view?: EmailView, options?: EmailFilterOptions) => {
          const state = get();
          const targetView = view || state.activeView;
          
          set({ isLoading: true, error: null, activeView: targetView });

          try {
            const labelMap: Record<EmailView, string[]> = {
              inbox: ['INBOX'],
              sent: ['SENT'],
              drafts: ['DRAFT'],
              starred: ['STARRED'],
              archive: ['ARCHIVE'],
              trash: ['TRASH'],
              spam: ['SPAM'],
            };

            const params: Record<string, any> = {
              maxResults: options?.maxResults || 50,
              labelIds: options?.labelIds || labelMap[targetView] || ['INBOX'],
            };

            if (options?.query) params.query = options.query;
            if (options?.pageToken) params.pageToken = options.pageToken;
            if (options?.from) params.from = options.from;
            if (options?.to) params.to = options.to;
            if (options?.hasAttachment !== undefined) params.hasAttachment = options.hasAttachment;

            const response = await apiClient.get<{
              emails: EmailMessage[];
              nextPageToken?: string;
              resultSizeEstimate?: number;
            }>('/api/agent/email/list', params);

            if (response.success && response.data) {
              const emails = response.data.emails.map((email: any) => ({
                ...email,
                receivedAt: new Date(email.receivedAt),
              }));

              set({
                emails,
                nextPageToken: response.data.nextPageToken || null,
                hasMoreEmails: !!response.data.nextPageToken,
                lastSyncTime: new Date(),
                isLoading: false,
              });
            } else {
              set({ isLoading: false, error: response.error || 'Failed to fetch emails' });
            }
          } catch (err) {
            set({
              isLoading: false,
              error: err instanceof Error ? err.message : 'Failed to fetch emails',
            });
          }
        },

        fetchMoreEmails: async () => {
          const { nextPageToken, activeView, isFetchingMore } = get();
          if (!nextPageToken || isFetchingMore) return;

          set({ isFetchingMore: true, error: null });

          try {
            const labelMap: Record<EmailView, string[]> = {
              inbox: ['INBOX'],
              sent: ['SENT'],
              drafts: ['DRAFT'],
              starred: ['STARRED'],
              archive: ['ARCHIVE'],
              trash: ['TRASH'],
              spam: ['SPAM'],
            };

            const response = await apiClient.get<{
              emails: EmailMessage[];
              nextPageToken?: string;
            }>('/api/agent/email/list', {
              maxResults: 50,
              pageToken: nextPageToken,
              labelIds: labelMap[activeView] || ['INBOX'],
            });

            if (response.success && response.data) {
              const newEmails = response.data.emails.map((email: any) => ({
                ...email,
                receivedAt: new Date(email.receivedAt),
              }));

              set(state => ({
                emails: [...state.emails, ...newEmails],
                nextPageToken: response.data?.nextPageToken || null,
                hasMoreEmails: !!response.data?.nextPageToken,
                isFetchingMore: false,
              }));
            } else {
              set({ isFetchingMore: false, error: response.error || 'Failed to fetch more emails' });
            }
          } catch (err) {
            set({
              isFetchingMore: false,
              error: err instanceof Error ? err.message : 'Failed to fetch more emails',
            });
          }
        },

        fetchEmailById: async (emailId: string) => {
          try {
            const response = await apiClient.get<EmailMessage>(`/api/agent/email/${emailId}`);
            if (response.success && response.data) {
              const email = {
                ...response.data,
                receivedAt: new Date(response.data.receivedAt),
              };
              
              set(state => ({
                emails: state.emails.map(e => e.id === emailId ? email : e),
              }));

              return email;
            }
            return null;
          } catch (err) {
            set({ error: err instanceof Error ? err.message : 'Failed to fetch email' });
            return null;
          }
        },

        fetchDrafts: async () => {
          try {
            const response = await apiClient.get<EmailDraft[]>('/api/agent/email/drafts');
            if (response.success && response.data) {
              set({ drafts: response.data });
            }
          } catch (err) {
            console.error('Failed to fetch drafts:', err);
          }
        },

        fetchLabels: async () => {
          try {
            const response = await apiClient.get<EmailLabel[]>('/api/agent/email/labels');
            if (response.success && response.data) {
              set({ labels: response.data });
            }
          } catch (err) {
            console.error('Failed to fetch labels:', err);
          }
        },

        fetchSummary: async () => {
          try {
            const response = await apiClient.get<EmailSummary>('/api/agent/email/summary');
            if (response.success && response.data) {
              set({ summary: response.data });
            }
          } catch (err) {
            console.error('Failed to fetch summary:', err);
          }
        },

        refreshEmails: async () => {
          const { activeView } = get();
          await get().fetchEmails(activeView);
          await get().fetchSummary();
          await get().fetchLabels();
        },

        // ============================================
        // Email Operations Actions
        // ============================================

        sendEmail: async (options: EmailSendOptions) => {
          set({ isSending: true, error: null });

          try {
            const formData = new FormData();
            formData.append('to', options.to);
            formData.append('subject', options.subject);
            formData.append('body', options.body);
            if (options.bodyHtml) formData.append('bodyHtml', options.bodyHtml);
            if (options.cc) formData.append('cc', options.cc);
            if (options.bcc) formData.append('bcc', options.bcc);
            if (options.replyTo) formData.append('replyTo', options.replyTo);
            if (options.inReplyTo) formData.append('inReplyTo', options.inReplyTo);
            
            if (options.attachments) {
              options.attachments.forEach(file => {
                formData.append('attachments', file);
              });
            }

            const response = await apiClient.post<{ id: string; threadId: string }>(
              '/api/agent/email/send',
              formData,
              { headers: { 'Content-Type': 'multipart/form-data' } }
            );

            if (response.success) {
              set({ isSending: false, composeOpen: false });
              await get().refreshEmails();
              return { success: true };
            }

            set({ isSending: false, error: response.error || 'Failed to send email' });
            return { success: false, error: response.error || 'Failed to send email' };
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to send email';
            set({ isSending: false, error: errorMessage });
            return { success: false, error: errorMessage };
          }
        },

        saveDraft: async (draft: Partial<EmailDraft>) => {
          try {
            const response = await apiClient.post<{ id: string }>('/api/agent/email/drafts', draft);
            if (response.success && response.data) {
              const newDraft: EmailDraft = {
                id: response.data.id,
                to: draft.to || '',
                subject: draft.subject || '',
                body: draft.body || '',
                cc: draft.cc,
                bcc: draft.bcc,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              set(state => ({ drafts: [...state.drafts, newDraft] }));
              return { success: true, draftId: response.data.id };
            }
            return { success: false, error: response.error || 'Failed to save draft' };
          } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'Failed to save draft' };
          }
        },

        updateDraft: async (draftId: string, updates: Partial<EmailDraft>) => {
          try {
            const response = await apiClient.put(`/api/agent/email/drafts/${draftId}`, updates);
            if (response.success) {
              set(state => ({
                drafts: state.drafts.map(d =>
                  d.id === draftId ? { ...d, ...updates, updatedAt: new Date() } : d
                ),
              }));
              return { success: true };
            }
            return { success: false, error: response.error || 'Failed to update draft' };
          } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'Failed to update draft' };
          }
        },

        deleteDraft: async (draftId: string) => {
          try {
            const response = await apiClient.delete(`/api/agent/email/drafts/${draftId}`);
            if (response.success) {
              set(state => ({ drafts: state.drafts.filter(d => d.id !== draftId) }));
              return { success: true };
            }
            return { success: false, error: response.error || 'Failed to delete draft' };
          } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'Failed to delete draft' };
          }
        },

        replyToEmail: async (emailId: string, body: string, quoteOriginal?: boolean) => {
          set({ isSending: true, error: null });

          try {
            const response = await apiClient.post('/api/agent/email/reply', {
              emailId,
              body,
              quoteOriginal: quoteOriginal ?? true,
            });

            if (response.success) {
              set({ isSending: false, composeOpen: false });
              await get().refreshEmails();
              return { success: true };
            }

            set({ isSending: false, error: response.error || 'Failed to send reply' });
            return { success: false, error: response.error || 'Failed to send reply' };
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to send reply';
            set({ isSending: false, error: errorMessage });
            return { success: false, error: errorMessage };
          }
        },

        forwardEmail: async (emailId: string, to: string, body?: string) => {
          set({ isSending: true, error: null });

          try {
            const response = await apiClient.post('/api/agent/email/forward', {
              emailId,
              to,
              body,
            });

            if (response.success) {
              set({ isSending: false, composeOpen: false });
              await get().refreshEmails();
              return { success: true };
            }

            set({ isSending: false, error: response.error || 'Failed to forward email' });
            return { success: false, error: response.error || 'Failed to forward email' };
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to forward email';
            set({ isSending: false, error: errorMessage });
            return { success: false, error: errorMessage };
          }
        },

        // ============================================
        // Email Management Actions
        // ============================================

        markAsRead: async (emailIds: string[]) => {
          set(state => ({
            emails: state.emails.map(e =>
              emailIds.includes(e.id) ? { ...e, isRead: true } : e
            ),
          }));

          try {
            await apiClient.post('/api/agent/email/mark-read', { emailIds });
          } catch (err) {
            set(state => ({
              emails: state.emails.map(e =>
                emailIds.includes(e.id) ? { ...e, isRead: false } : e
              ),
            }));
          }
        },

        markAsUnread: async (emailIds: string[]) => {
          set(state => ({
            emails: state.emails.map(e =>
              emailIds.includes(e.id) ? { ...e, isRead: false } : e
            ),
          }));

          try {
            await apiClient.post('/api/agent/email/mark-unread', { emailIds });
          } catch (err) {
            set(state => ({
              emails: state.emails.map(e =>
                emailIds.includes(e.id) ? { ...e, isRead: true } : e
              ),
            }));
          }
        },

        toggleStar: async (emailIds: string[]) => {
          set(state => ({
            emails: state.emails.map(e =>
              emailIds.includes(e.id) ? { ...e, isStarred: !e.isStarred } : e
            ),
          }));

          try {
            const email = get().emails.find(e => emailIds.includes(e.id));
            if (email) {
              if (email.isStarred) {
                await apiClient.post('/api/agent/email/unstar', { emailIds });
              } else {
                await apiClient.post('/api/agent/email/star', { emailIds });
              }
            }
          } catch (err) {
            set(state => ({
              emails: state.emails.map(e =>
                emailIds.includes(e.id) ? { ...e, isStarred: !e.isStarred } : e
              ),
            }));
          }
        },

        archiveEmails: async (emailIds: string[]) => {
          set(state => ({
            emails: state.emails.filter(e => !emailIds.includes(e.id)),
          }));

          try {
            const response = await apiClient.post<EmailBatchResult>('/api/agent/email/archive', { emailIds });
            if (response.success) {
              set({ selectedEmailIds: new Set() });
            }
            return response.data || { success: true, processedCount: emailIds.length, failedCount: 0, errors: [] };
          } catch (err) {
            await get().refreshEmails();
            return { success: false, processedCount: 0, failedCount: emailIds.length, errors: [{ id: 'all', error: String(err) }] };
          }
        },

        deleteEmails: async (emailIds: string[]) => {
          set(state => ({
            emails: state.emails.filter(e => !emailIds.includes(e.id)),
          }));

          try {
            const response = await apiClient.post<EmailBatchResult>('/api/agent/email/delete', { emailIds });
            if (response.success) {
              set({ selectedEmailIds: new Set(), selectedEmailId: null });
            }
            return response.data || { success: true, processedCount: emailIds.length, failedCount: 0, errors: [] };
          } catch (err) {
            await get().refreshEmails();
            return { success: false, processedCount: 0, failedCount: emailIds.length, errors: [{ id: 'all', error: String(err) }] };
          }
        },

        moveToTrash: async (emailIds: string[]) => {
          set(state => ({
            emails: state.emails.map(e =>
              emailIds.includes(e.id) ? { ...e, labels: [...e.labels, 'TRASH'] } : e
            ),
          }));

          try {
            await apiClient.post('/api/agent/email/trash', { emailIds });
          } catch (err) {
            set(state => ({
              emails: state.emails.map(e =>
                emailIds.includes(e.id) ? { ...e, labels: e.labels.filter(l => l !== 'TRASH') } : e
              ),
            }));
          }
        },

        restoreFromTrash: async (emailIds: string[]) => {
          set(state => ({
            emails: state.emails.map(e =>
              emailIds.includes(e.id) ? { ...e, labels: e.labels.filter(l => l !== 'TRASH') } : e
            ),
          }));

          try {
            await apiClient.post('/api/agent/email/untrash', { emailIds });
          } catch (err) {
            set(state => ({
              emails: state.emails.map(e =>
                emailIds.includes(e.id) ? { ...e, labels: [...e.labels, 'TRASH'] } : e
              ),
            }));
          }
        },

        applyLabels: async (emailIds: string[], labelIds: string[]) => {
          set(state => ({
            emails: state.emails.map(e =>
              emailIds.includes(e.id) ? { ...e, labels: [...new Set([...e.labels, ...labelIds])] } : e
            ),
          }));

          try {
            await apiClient.post('/api/agent/email/labels/apply', { emailIds, labelIds });
          } catch (err) {
            set(state => ({
              emails: state.emails.map(e =>
                emailIds.includes(e.id) ? { ...e, labels: e.labels.filter(l => !labelIds.includes(l)) } : e
              ),
            }));
          }
        },

        removeLabels: async (emailIds: string[], labelIds: string[]) => {
          set(state => ({
            emails: state.emails.map(e =>
              emailIds.includes(e.id) ? { ...e, labels: e.labels.filter(l => !labelIds.includes(l)) } : e
            ),
          }));

          try {
            await apiClient.post('/api/agent/email/labels/remove', { emailIds, labelIds });
          } catch (err) {
            set(state => ({
              emails: state.emails.map(e =>
                emailIds.includes(e.id) ? { ...e, labels: [...new Set([...e.labels, ...labelIds])] } : e
              ),
            }));
          }
        },

        // ============================================
        // AI Feature Actions
        // ============================================

        classifyEmail: async (emailId: string) => {
          set({ isClassifying: true });

          try {
            const response = await apiClient.get<EmailClassification>(`/api/agent/email/${emailId}/classify`);
            if (response.success && response.data) {
              set(state => ({
                classifications: { ...state.classifications, [emailId]: response.data! },
                isClassifying: false,
              }));
              return response.data;
            }
            set({ isClassifying: false });
            return null;
          } catch (err) {
            set({ isClassifying: false });
            return null;
          }
        },

        classifyAllUnread: async () => {
          set({ isClassifying: true });

          try {
            const unreadEmails = get().emails.filter(e => !e.isRead);
            const classifications: Record<string, EmailClassification> = {};

            for (const email of unreadEmails.slice(0, 10)) {
              const classification = await get().classifyEmail(email.id);
              if (classification) {
                classifications[email.id] = classification;
              }
            }

            set({ classifications, isClassifying: false });
          } catch (err) {
            set({ isClassifying: false });
          }
        },

        generateReplySuggestions: async (emailId: string, tone?: string, length?: string) => {
          set({ isGeneratingReply: true });

          try {
            const params: Record<string, string> = {};
            if (tone) params.tone = tone;
            if (length) params.length = length;

            const response = await apiClient.get<EmailReplySuggestion>(
              `/api/agent/email/${emailId}/reply-suggestions`,
              params
            );

            if (response.success && response.data) {
              set(state => ({
                replySuggestions: { ...state.replySuggestions, [emailId]: response.data! },
                isGeneratingReply: false,
              }));
              return response.data;
            }

            set({ isGeneratingReply: false });
            return null;
          } catch (err) {
            set({ isGeneratingReply: false });
            return null;
          }
        },

        summarizeThread: async (emailId: string) => {
          try {
            const response = await apiClient.get<{ summary: string }>(`/api/agent/email/${emailId}/summarize`);
            if (response.success && response.data) {
              return response.data.summary;
            }
            return null;
          } catch (err) {
            return null;
          }
        },

        // ============================================
        // Search & Filter Actions
        // ============================================

        searchEmails: async (query: string) => {
          set({ searchQuery: query, isLoading: true });
          await get().fetchEmails(undefined, { query });
        },

        filterByLabel: async (labelId: string) => {
          set({ isLoading: true });
          await get().fetchEmails(undefined, { labelIds: [labelId] });
        },

        setSearchQuery: (query: string) => {
          set({ searchQuery: query });
        },

        clearSearch: () => {
          set({ searchQuery: '' });
          get().fetchEmails();
        },

        // ============================================
        // UI State Actions
        // ============================================

        setActiveView: (view: EmailView) => {
          set({
            activeView: view,
            selectedEmailId: null,
            selectedEmailIds: new Set(),
            searchQuery: '',
          });
          get().fetchEmails(view);
        },

        selectEmail: (emailId: string | null) => {
          set({ selectedEmailId: emailId });

          if (emailId) {
            const email = get().emails.find(e => e.id === emailId);
            if (email && !email.isRead) {
              get().markAsRead([emailId]);
            }
          }
        },

        toggleEmailSelection: (emailId: string) => {
          set(state => {
            const newSet = new Set(state.selectedEmailIds);
            if (newSet.has(emailId)) {
              newSet.delete(emailId);
            } else {
              newSet.add(emailId);
            }
            return { selectedEmailIds: newSet };
          });
        },

        selectAllEmails: () => {
          const filtered = get().getFilteredEmails();
          if (filtered.length === get().selectedEmailIds.size) {
            set({ selectedEmailIds: new Set() });
          } else {
            set({ selectedEmailIds: new Set(filtered.map(e => e.id)) });
          }
        },

        clearSelection: () => {
          set({ selectedEmailIds: new Set() });
        },

        setSortOrder: (field: EmailSortField, direction: EmailSortDirection) => {
          set({ sortField: field, sortDirection: direction });
        },

        openCompose: (options?: { replyTo?: string; forwardOf?: string; to?: string; subject?: string }) => {
          const state: Partial<EmailState> = {
            composeOpen: true,
            composeTo: options?.to || '',
            composeSubject: options?.subject || '',
            composeBody: '',
            composeCc: '',
            composeBcc: '',
            composeAttachments: [],
            composeReplyToId: options?.replyTo || options?.forwardOf || null,
            composeIsReply: !!options?.replyTo,
            composeIsForward: !!options?.forwardOf,
          };

          if (options?.replyTo) {
            const email = get().emails.find(e => e.id === options.replyTo);
            if (email) {
              state.composeTo = email.from.email;
              state.composeSubject = `Re: ${email.subject.replace(/^Re:\s*/i, '')}`;
            }
          }

          if (options?.forwardOf) {
            const email = get().emails.find(e => e.id === options.forwardOf);
            if (email) {
              state.composeSubject = `Fwd: ${email.subject}`;
              state.composeBody = `\n\n---------- Forwarded message ----------\nFrom: ${email.from.name || email.from.email}\nDate: ${email.receivedAt.toLocaleString()}\nSubject: ${email.subject}\n\n${email.body}`;
            }
          }

          set(state as any);
        },

        closeCompose: () => {
          set({
            composeOpen: false,
            composeTo: '',
            composeSubject: '',
            composeBody: '',
            composeCc: '',
            composeBcc: '',
            composeAttachments: [],
            composeReplyToId: null,
            composeIsReply: false,
            composeIsForward: false,
          });
        },

        updateComposeField: (field: string, value: any) => {
          set({ [`compose${field.charAt(0).toUpperCase() + field.slice(1)}`]: value } as any);
        },

        clearError: () => {
          set({ error: null });
        },

        // ============================================
        // Label Management Actions
        // ============================================

        createLabel: async (name: string, color?: string) => {
          try {
            const response = await apiClient.post<EmailLabel>('/api/agent/email/labels', { name, color });
            if (response.success && response.data) {
              set(state => ({ labels: [...state.labels, response.data!] }));
              return response.data;
            }
            return null;
          } catch (err) {
            return null;
          }
        },

        updateLabel: async (labelId: string, updates: Partial<EmailLabel>) => {
          try {
            const response = await apiClient.put(`/api/agent/email/labels/${labelId}`, updates);
            if (response.success) {
              set(state => ({
                labels: state.labels.map(l => l.id === labelId ? { ...l, ...updates } : l),
              }));
            }
          } catch (err) {
            console.error('Failed to update label:', err);
          }
        },

        deleteLabel: async (labelId: string) => {
          try {
            const response = await apiClient.delete(`/api/agent/email/labels/${labelId}`);
            if (response.success) {
              set(state => ({ labels: state.labels.filter(l => l.id !== labelId) }));
            }
          } catch (err) {
            console.error('Failed to delete label:', err);
          }
        },
      }),
      {
        name: 'email-agent-store',
        partialize: (state) => ({
          activeView: state.activeView,
          sortField: state.sortField,
          sortDirection: state.sortDirection,
          composeOpen: state.composeOpen,
        }),
      }
    )
  )
);

// ============================================
// Selector Hooks
// ============================================

export const useEmailList = () => useEmailStore(state => ({
  emails: state.emails,
  isLoading: state.isLoading,
  error: state.error,
  activeView: state.activeView,
  searchQuery: state.searchQuery,
  selectedEmailIds: state.selectedEmailIds,
  hasMoreEmails: state.hasMoreEmails,
  isFetchingMore: state.isFetchingMore,
  fetchEmails: state.fetchEmails,
  fetchMoreEmails: state.fetchMoreEmails,
  refreshEmails: state.refreshEmails,
  setActiveView: state.setActiveView,
  selectEmail: state.selectEmail,
  toggleEmailSelection: state.toggleEmailSelection,
  selectAllEmails: state.selectAllEmails,
  clearSelection: state.clearSelection,
  searchEmails: state.searchEmails,
  clearSearch: state.clearSearch,
  markAsRead: state.markAsRead,
  markAsUnread: state.markAsUnread,
  toggleStar: state.toggleStar,
  archiveEmails: state.archiveEmails,
  deleteEmails: state.deleteEmails,
  moveToTrash: state.moveToTrash,
  restoreFromTrash: state.restoreFromTrash,
  setSortOrder: state.setSortOrder,
  getFilteredEmails: state.getFilteredEmails,
  getUnreadCount: state.getUnreadCount,
  getStarredCount: state.getStarredCount,
  getSelectedCount: state.getSelectedCount,
}));

export const useSelectedEmail = () => useEmailStore(state => ({
  selectedEmailId: state.selectedEmailId,
  getSelectedEmail: state.getSelectedEmail,
  selectEmail: state.selectEmail,
  classifyEmail: state.classifyEmail,
  generateReplySuggestions: state.generateReplySuggestions,
  summarizeThread: state.summarizeThread,
  classifications: state.classifications,
  replySuggestions: state.replySuggestions,
  isClassifying: state.isClassifying,
  isGeneratingReply: state.isGeneratingReply,
}));

export const useEmailCompose = () => useEmailStore(state => ({
  composeOpen: state.composeOpen,
  composeTo: state.composeTo,
  composeSubject: state.composeSubject,
  composeBody: state.composeBody,
  composeCc: state.composeCc,
  composeBcc: state.composeBcc,
  composeAttachments: state.composeAttachments,
  composeReplyToId: state.composeReplyToId,
  composeIsReply: state.composeIsReply,
  composeIsForward: state.composeIsForward,
  isSending: state.isSending,
  isComposing: state.isComposing,
  openCompose: state.openCompose,
  closeCompose: state.closeCompose,
  updateComposeField: state.updateComposeField,
  sendEmail: state.sendEmail,
  replyToEmail: state.replyToEmail,
  forwardEmail: state.forwardEmail,
  saveDraft: state.saveDraft,
}));

export const useEmailLabels = () => useEmailStore(state => ({
  labels: state.labels,
  createLabel: state.createLabel,
  updateLabel: state.updateLabel,
  deleteLabel: state.deleteLabel,
  applyLabels: state.applyLabels,
  removeLabels: state.removeLabels,
}));

export const useEmailSummary = () => useEmailStore(state => ({
  summary: state.summary,
  drafts: state.drafts,
  fetchSummary: state.fetchSummary,
  fetchDrafts: state.fetchDrafts,
  fetchLabels: state.fetchLabels,
  getUnreadCount: state.getUnreadCount,
  getStarredCount: state.getStarredCount,
  getDraftCount: state.getDraftCount,
  lastSyncTime: state.lastSyncTime,
}));