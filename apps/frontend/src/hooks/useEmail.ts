// enterprise-ai-agent-platform/apps/frontend/src/hooks/useEmail.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/auth.store';

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
  receivedAt: Date;
  sentAt?: Date;
  attachments?: EmailAttachment[];
  replyTo?: EmailAddress;
  inReplyTo?: string;
}

export interface EmailLabel {
  id: string;
  name: string;
  type: 'system' | 'user';
  color?: string;
  messageListVisibility: string;
  labelListVisibility: string;
}

export interface EmailDraft {
  id: string;
  message: EmailMessage;
  created: Date;
  updated: Date;
}

export interface EmailClassification {
  category: 'urgent' | 'important' | 'newsletter' | 'spam' | 'normal';
  priority: number;
  suggestedAction: 'reply' | 'read' | 'archive' | 'delete' | 'label' | 'ignore';
  suggestedLabels: string[];
  reason: string;
}

export interface EmailReplySuggestion {
  emailId: string;
  suggestedReplies: string[];
  tone: 'professional' | 'casual' | 'friendly' | 'formal';
  context: string;
}

export interface EmailSummary {
  totalUnread: number;
  totalInbox: number;
  byCategory: Record<string, number>;
  recentEmails: EmailMessage[];
  urgentCount: number;
}

export interface EmailSendOptions {
  to: string | EmailAddress | (string | EmailAddress)[];
  subject: string;
  body: string;
  bodyHtml?: string;
  cc?: string | EmailAddress | (string | EmailAddress)[];
  bcc?: string | EmailAddress | (string | EmailAddress)[];
  replyTo?: string | EmailAddress;
  attachments?: File[];
  inReplyTo?: string;
  threadId?: string;
}

export interface EmailFilterOptions {
  maxResults?: number;
  labelIds?: string[];
  query?: string;
  pageToken?: string;
  includeSpamTrash?: boolean;
}

export interface EmailSettings {
  signature: string;
  autoReply: boolean;
  autoReplyMessage: string;
  notificationEmail: boolean;
  language: string;
  theme: 'light' | 'dark' | 'system';
  refreshInterval: number;
  sendReadReceipts: boolean;
}

export interface EmailViewState {
  currentView: 'inbox' | 'sent' | 'starred' | 'archive' | 'trash' | 'drafts' | 'spam';
  selectedEmailId: string | null;
  isComposeOpen: boolean;
  isSettingsOpen: boolean;
  searchQuery: string;
  selectedLabelIds: string[];
  currentPage: number;
  pageSize: number;
  totalEmails: number;
  hasMorePages: boolean;
  isConnected: boolean;
  lastSyncAt: Date | null;
}

export interface EmailBatchResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: Array<{ id: string; error: string }>;
}

// ============================================
// Hook State Interface
// ============================================

interface UseEmailState extends EmailViewState {
  emails: EmailMessage[];
  labels: EmailLabel[];
  drafts: EmailDraft[];
  summary: EmailSummary | null;
  classification: Record<string, EmailClassification>;
  replySuggestions: Record<string, EmailReplySuggestion>;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  successMessage: string | null;
}

// ============================================
// Hook
// ============================================

export function useEmail() {
  const { user, isAuthenticated } = useAuthStore();
  const abortControllerRef = useRef<AbortController | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================
  // State
  // ============================================

  const [state, setState] = useState<UseEmailState>({
    // View state
    currentView: 'inbox',
    selectedEmailId: null,
    isComposeOpen: false,
    isSettingsOpen: false,
    searchQuery: '',
    selectedLabelIds: [],
    currentPage: 1,
    pageSize: 20,
    totalEmails: 0,
    hasMorePages: false,
    isConnected: false,
    lastSyncAt: null,

    // Data
    emails: [],
    labels: [],
    drafts: [],
    summary: null,
    classification: {},
    replySuggestions: {},

    // Status
    isLoading: false,
    isSending: false,
    error: null,
    successMessage: null,
  });

  // ============================================
  // Helpers
  // ============================================

  const updateState = useCallback((partial: Partial<UseEmailState>) => {
    setState(prev => ({ ...prev, ...partial }));
  }, []);

  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  const clearSuccess = useCallback(() => {
    updateState({ successMessage: null });
  }, [updateState]);

  const showSuccess = useCallback((message: string) => {
    updateState({ successMessage: message });
    setTimeout(() => updateState({ successMessage: null }), 3000);
  }, [updateState]);

  // ============================================
  // Connection Check
  // ============================================

  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      const response = await apiClient.get<{ connected: boolean }>('/api/auth/connected-services');
      const isConnected = response.data?.connected || false;
      updateState({ isConnected });
      return isConnected;
    } catch {
      updateState({ isConnected: false });
      return false;
    }
  }, [updateState]);

  // ============================================
  // Fetch Emails
  // ============================================

  const fetchEmails = useCallback(async (options?: EmailFilterOptions) => {
    updateState({ isLoading: true, error: null });

    try {
      const params = new URLSearchParams();
      params.append('maxResults', String(options?.maxResults || state.pageSize));
      if (options?.labelIds?.length) {
        options.labelIds.forEach(id => params.append('labelIds', id));
      }
      if (options?.query) params.append('query', options.query);
      if (state.searchQuery) params.append('search', state.searchQuery);
      if (options?.pageToken) params.append('pageToken', options.pageToken);
      params.append('page', String(state.currentPage));

      // Determine labels based on view
      let labelIds = options?.labelIds || [];
      if (!labelIds.length) {
        switch (state.currentView) {
          case 'inbox':
            labelIds = ['INBOX'];
            break;
          case 'sent':
            labelIds = ['SENT'];
            break;
          case 'starred':
            labelIds = ['STARRED'];
            break;
          case 'drafts':
            labelIds = ['DRAFT'];
            break;
          case 'spam':
            labelIds = ['SPAM'];
            break;
          case 'trash':
            labelIds = ['TRASH'];
            break;
          case 'archive':
            params.append('archived', 'true');
            break;
        }
      }

      labelIds.forEach(id => params.append('labelIds', id));

      const response = await apiClient.get<{
        emails: EmailMessage[];
        nextPageToken?: string;
        total: number;
        resultSizeEstimate: number;
      }>(`/api/agent/email/emails?${params.toString()}`);

      if (response.success && response.data) {
        updateState({
          emails: response.data.emails.map(e => ({
            ...e,
            receivedAt: new Date(e.receivedAt),
            sentAt: e.sentAt ? new Date(e.sentAt) : undefined,
          })),
          totalEmails: response.data.total || response.data.emails.length,
          hasMorePages: !!response.data.nextPageToken,
          lastSyncAt: new Date(),
        });
      } else {
        updateState({ error: response.error || 'Failed to fetch emails' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch emails';
      updateState({ error: message });
    } finally {
      updateState({ isLoading: false });
    }
  }, [state.currentView, state.pageSize, state.currentPage, state.searchQuery, updateState]);

  // ============================================
  // Fetch Single Email
  // ============================================

  const fetchEmailById = useCallback(async (emailId: string): Promise<EmailMessage | null> => {
    try {
      const response = await apiClient.get<EmailMessage>(
        `/api/agent/email/emails/${emailId}?format=full`
      );

      if (response.success && response.data) {
        const email = {
          ...response.data,
          receivedAt: new Date(response.data.receivedAt),
          sentAt: response.data.sentAt ? new Date(response.data.sentAt) : undefined,
        };

        // Mark as read
        if (!email.isRead) {
          markAsRead(emailId);
        }

        // Update in email list
        setState(prev => ({
          ...prev,
          emails: prev.emails.map(e =>
            e.id === emailId ? { ...email, isRead: true } : e
          ),
        }));

        return email;
      }
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch email';
      updateState({ error: message });
      return null;
    }
  }, [updateState]);

  // ============================================
  // Send Email
  // ============================================

  const sendEmail = useCallback(async (options: EmailSendOptions): Promise<boolean> => {
    updateState({ isSending: true, error: null });

    try {
      const payload: Record<string, any> = {
        to: options.to,
        subject: options.subject,
        body: options.body,
      };

      if (options.cc) payload.cc = options.cc;
      if (options.bcc) payload.bcc = options.bcc;
      if (options.replyTo) payload.replyTo = options.replyTo;
      if (options.inReplyTo) payload.inReplyTo = options.inReplyTo;
      if (options.threadId) payload.threadId = options.threadId;
      if (options.bodyHtml) payload.bodyHtml = options.bodyHtml;

      // Handle attachments
      if (options.attachments && options.attachments.length > 0) {
        const formData = new FormData();
        formData.append('data', JSON.stringify(payload));
        options.attachments.forEach(file => {
          formData.append('attachments', file);
        });

        const response = await apiClient.post('/api/agent/email/send', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (response.success) {
          showSuccess('Email sent successfully!');
          await fetchEmails();
          return true;
        }
      } else {
        const response = await apiClient.post<{ id: string }>('/api/agent/email/send', payload);

        if (response.success) {
          showSuccess('Email sent successfully!');
          await fetchEmails();
          return true;
        }
      }

      updateState({ error: 'Failed to send email' });
      return false;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send email';
      updateState({ error: message });
      return false;
    } finally {
      updateState({ isSending: false });
    }
  }, [fetchEmails, showSuccess, updateState]);

  // ============================================
  // Reply to Email
  // ============================================

  const replyToEmail = useCallback(async (
    emailId: string,
    body: string,
    options?: { quoteOriginal?: boolean; replyAll?: boolean }
  ): Promise<boolean> => {
    updateState({ isSending: true, error: null });

    try {
      const response = await apiClient.post<{ id: string }>(
        `/api/agent/email/emails/${emailId}/reply`,
        {
          body,
          quoteOriginal: options?.quoteOriginal ?? true,
          replyAll: options?.replyAll ?? false,
        }
      );

      if (response.success) {
        showSuccess('Reply sent successfully!');
        return true;
      }

      updateState({ error: 'Failed to send reply' });
      return false;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send reply';
      updateState({ error: message });
      return false;
    } finally {
      updateState({ isSending: false });
    }
  }, [showSuccess, updateState]);

  // ============================================
  // Forward Email
  // ============================================

  const forwardEmail = useCallback(async (
    emailId: string,
    to: string[],
    additionalMessage?: string
  ): Promise<boolean> => {
    updateState({ isSending: true, error: null });

    try {
      const response = await apiClient.post<{ id: string }>(
        `/api/agent/email/emails/${emailId}/forward`,
        { to, additionalMessage }
      );

      if (response.success) {
        showSuccess('Email forwarded successfully!');
        return true;
      }

      updateState({ error: 'Failed to forward email' });
      return false;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to forward email';
      updateState({ error: message });
      return false;
    } finally {
      updateState({ isSending: false });
    }
  }, [showSuccess, updateState]);

  // ============================================
  // Save Draft
  // ============================================

  const saveDraft = useCallback(async (options: EmailSendOptions): Promise<EmailDraft | null> => {
    try {
      const response = await apiClient.post<EmailDraft>('/api/agent/email/drafts', {
        to: options.to,
        subject: options.subject,
        body: options.body,
        cc: options.cc,
        bcc: options.bcc,
      });

      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          drafts: [response.data!, ...prev.drafts],
        }));
        showSuccess('Draft saved');
        return response.data;
      }

      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save draft';
      updateState({ error: message });
      return null;
    }
  }, [showSuccess, updateState]);

  const updateDraft = useCallback(async (
    draftId: string,
    options: Partial<EmailSendOptions>
  ): Promise<boolean> => {
    try {
      const response = await apiClient.put(`/api/agent/email/drafts/${draftId}`, options);
      if (response.success) {
        showSuccess('Draft updated');
        return true;
      }
      return false;
    } catch (error) {
      updateState({ error: 'Failed to update draft' });
      return false;
    }
  }, [showSuccess, updateState]);

  const deleteDraft = useCallback(async (draftId: string): Promise<boolean> => {
    try {
      const response = await apiClient.delete(`/api/agent/email/drafts/${draftId}`);
      if (response.success) {
        setState(prev => ({
          ...prev,
          drafts: prev.drafts.filter(d => d.id !== draftId),
        }));
        showSuccess('Draft deleted');
        return true;
      }
      return false;
    } catch (error) {
      updateState({ error: 'Failed to delete draft' });
      return false;
    }
  }, [showSuccess, updateState]);

  // ============================================
  // Batch Actions
  // ============================================

  const batchAction = useCallback(async (
    emailIds: string[],
    action: 'archive' | 'delete' | 'markRead' | 'markUnread' | 'star' | 'unstar' | 'spam'
  ): Promise<EmailBatchResult> => {
    try {
      const response = await apiClient.post<EmailBatchResult>(
        `/api/agent/email/batch`,
        { emailIds, action }
      );

      if (response.success && response.data) {
        // Update local state
        setState(prev => {
          let updatedEmails = [...prev.emails];

          switch (action) {
            case 'archive':
              updatedEmails = updatedEmails.filter(e => !emailIds.includes(e.id));
              break;
            case 'delete':
              updatedEmails = updatedEmails.filter(e => !emailIds.includes(e.id));
              break;
            case 'markRead':
              updatedEmails = updatedEmails.map(e =>
                emailIds.includes(e.id) ? { ...e, isRead: true } : e
              );
              break;
            case 'markUnread':
              updatedEmails = updatedEmails.map(e =>
                emailIds.includes(e.id) ? { ...e, isRead: false } : e
              );
              break;
            case 'star':
              updatedEmails = updatedEmails.map(e =>
                emailIds.includes(e.id) ? { ...e, isStarred: true } : e
              );
              break;
            case 'unstar':
              updatedEmails = updatedEmails.map(e =>
                emailIds.includes(e.id) ? { ...e, isStarred: false } : e
              );
              break;
          }

          return { ...prev, emails: updatedEmails };
        });

        showSuccess(`${action} completed: ${response.data.processedCount} emails`);
        return response.data;
      }

      return { success: false, processedCount: 0, failedCount: emailIds.length, errors: [] };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Batch action failed';
      updateState({ error: message });
      return { success: false, processedCount: 0, failedCount: emailIds.length, errors: [] };
    }
  }, [showSuccess, updateState]);

  // ============================================
  // Single Email Actions
  // ============================================

  const markAsRead = useCallback(async (emailId: string) => {
    try {
      await apiClient.post(`/api/agent/email/emails/${emailId}/read`);
      setState(prev => ({
        ...prev,
        emails: prev.emails.map(e =>
          e.id === emailId ? { ...e, isRead: true } : e
        ),
      }));
    } catch (error) {
      // Silent fail for read status
    }
  }, []);

  const markAsUnread = useCallback(async (emailId: string) => {
    try {
      await apiClient.post(`/api/agent/email/emails/${emailId}/unread`);
      setState(prev => ({
        ...prev,
        emails: prev.emails.map(e =>
          e.id === emailId ? { ...e, isRead: false } : e
        ),
      }));
    } catch (error) {
      updateState({ error: 'Failed to mark as unread' });
    }
  }, [updateState]);

  const toggleStar = useCallback(async (emailId: string) => {
    try {
      await apiClient.post(`/api/agent/email/emails/${emailId}/star`);
      setState(prev => ({
        ...prev,
        emails: prev.emails.map(e =>
          e.id === emailId ? { ...e, isStarred: !e.isStarred } : e
        ),
      }));
    } catch (error) {
      updateState({ error: 'Failed to toggle star' });
    }
  }, [updateState]);

  const archiveEmail = useCallback(async (emailId: string) => {
    try {
      await apiClient.post(`/api/agent/email/emails/${emailId}/archive`);
      setState(prev => ({
        ...prev,
        emails: prev.emails.filter(e => e.id !== emailId),
      }));
      showSuccess('Email archived');
    } catch (error) {
      updateState({ error: 'Failed to archive email' });
    }
  }, [showSuccess, updateState]);

  const deleteEmail = useCallback(async (emailId: string) => {
    try {
      await apiClient.delete(`/api/agent/email/emails/${emailId}`);
      setState(prev => ({
        ...prev,
        emails: prev.emails.filter(e => e.id !== emailId),
      }));
      showSuccess('Email moved to trash');
    } catch (error) {
      updateState({ error: 'Failed to delete email' });
    }
  }, [showSuccess, updateState]);

  // ============================================
  // Labels Management
  // ============================================

  const applyLabel = useCallback(async (emailId: string, labelIds: string[]) => {
    try {
      await apiClient.post(`/api/agent/email/emails/${emailId}/labels`, { addLabelIds: labelIds });
      fetchEmails();
    } catch (error) {
      updateState({ error: 'Failed to apply labels' });
    }
  }, [fetchEmails, updateState]);

  const removeLabel = useCallback(async (emailId: string, labelIds: string[]) => {
    try {
      await apiClient.post(`/api/agent/email/emails/${emailId}/labels`, { removeLabelIds: labelIds });
      fetchEmails();
    } catch (error) {
      updateState({ error: 'Failed to remove labels' });
    }
  }, [fetchEmails, updateState]);

  const fetchLabels = useCallback(async () => {
    try {
      const response = await apiClient.get<EmailLabel[]>('/api/agent/email/labels');
      if (response.success && response.data) {
        updateState({ labels: response.data });
      }
    } catch (error) {
      updateState({ error: 'Failed to fetch labels' });
    }
  }, [updateState]);

  const createLabel = useCallback(async (name: string, color?: string) => {
    try {
      const response = await apiClient.post<EmailLabel>('/api/agent/email/labels', { name, color });
      if (response.success && response.data) {
        setState(prev => ({ ...prev, labels: [...prev.labels, response.data!] }));
        showSuccess('Label created');
      }
    } catch (error) {
      updateState({ error: 'Failed to create label' });
    }
  }, [showSuccess, updateState]);

  // ============================================
  // AI Features
  // ============================================

  const classifyEmail = useCallback(async (emailId: string) => {
    try {
      updateState({ isLoading: true });
      const response = await apiClient.get<EmailClassification>(
        `/api/agent/email/emails/${emailId}/classify`
      );

      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          classification: { ...prev.classification, [emailId]: response.data! },
        }));
        return response.data;
      }
      return null;
    } catch (error) {
      updateState({ error: 'Failed to classify email' });
      return null;
    } finally {
      updateState({ isLoading: false });
    }
  }, [updateState]);

  const generateReply = useCallback(async (
    emailId: string,
    tone: 'professional' | 'casual' | 'friendly' | 'formal' = 'professional',
    length: 'short' | 'medium' | 'long' = 'medium'
  ) => {
    try {
      updateState({ isLoading: true });
      const response = await apiClient.post<EmailReplySuggestion>(
        `/api/agent/email/emails/${emailId}/suggest-reply`,
        { tone, length }
      );

      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          replySuggestions: { ...prev.replySuggestions, [emailId]: response.data! },
        }));
        return response.data;
      }
      return null;
    } catch (error) {
      updateState({ error: 'Failed to generate reply' });
      return null;
    } finally {
      updateState({ isLoading: false });
    }
  }, [updateState]);

  // ============================================
  // Summary & Search
  // ============================================

  const getEmailSummary = useCallback(async () => {
    try {
      const response = await apiClient.get<EmailSummary>('/api/agent/email/summary');
      if (response.success && response.data) {
        updateState({ summary: response.data });
        return response.data;
      }
      return null;
    } catch (error) {
      updateState({ error: 'Failed to get email summary' });
      return null;
    }
  }, [updateState]);

  const searchEmails = useCallback(async (query: string) => {
    updateState({ searchQuery: query, currentPage: 1 });
    await fetchEmails({ query });
  }, [fetchEmails, updateState]);

  const clearSearch = useCallback(() => {
    updateState({ searchQuery: '' });
    fetchEmails();
  }, [fetchEmails, updateState]);

  // ============================================
  // View Navigation
  // ============================================

  const setView = useCallback((view: EmailViewState['currentView']) => {
    updateState({
      currentView: view,
      selectedEmailId: null,
      currentPage: 1,
      searchQuery: '',
    });
  }, [updateState]);

  const selectEmail = useCallback((emailId: string | null) => {
    updateState({ selectedEmailId: emailId });
  }, [updateState]);

  const openCompose = useCallback((options?: { to?: string; subject?: string; body?: string }) => {
    updateState({ isComposeOpen: true });
  }, [updateState]);

  const closeCompose = useCallback(() => {
    updateState({ isComposeOpen: false });
  }, [updateState]);

  const openSettings = useCallback(() => {
    updateState({ isSettingsOpen: true });
  }, [updateState]);

  const closeSettings = useCallback(() => {
    updateState({ isSettingsOpen: false });
  }, [updateState]);

  const nextPage = useCallback(() => {
    setState(prev => ({ ...prev, currentPage: prev.currentPage + 1 }));
  }, []);

  const prevPage = useCallback(() => {
    setState(prev => ({ ...prev, currentPage: Math.max(1, prev.currentPage - 1) }));
  }, []);

  const setPageSize = useCallback((size: number) => {
    updateState({ pageSize: size, currentPage: 1 });
  }, [updateState]);

  // ============================================
  // Data Refresh
  // ============================================

  const refresh = useCallback(async () => {
    await Promise.all([
      fetchEmails(),
      fetchLabels(),
      getEmailSummary(),
      checkConnection(),
    ]);
  }, [fetchEmails, fetchLabels, getEmailSummary, checkConnection]);

  const startAutoRefresh = useCallback((intervalMs: number = 60000) => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
    refreshIntervalRef.current = setInterval(() => {
      fetchEmails();
      getEmailSummary();
    }, intervalMs);
  }, [fetchEmails, getEmailSummary]);

  const stopAutoRefresh = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  }, []);

  // ============================================
  // Settings Management
  // ============================================

  const getEmailSettings = useCallback(async (): Promise<EmailSettings | null> => {
    try {
      const response = await apiClient.get<EmailSettings>('/api/agent/email/settings');
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      return null;
    }
  }, []);

  const updateEmailSettings = useCallback(async (settings: Partial<EmailSettings>): Promise<boolean> => {
    try {
      const response = await apiClient.put('/api/agent/email/settings', settings);
      if (response.success) {
        showSuccess('Settings updated');
        return true;
      }
      return false;
    } catch (error) {
      updateState({ error: 'Failed to update settings' });
      return false;
    }
  }, [showSuccess, updateState]);

  // ============================================
  // Initialize
  // ============================================

  const initialize = useCallback(async () => {
    if (!isAuthenticated) return;

    updateState({ isLoading: true });
    const connected = await checkConnection();

    if (connected) {
      await Promise.all([
        fetchEmails(),
        fetchLabels(),
        getEmailSummary(),
      ]);
    }

    updateState({ isLoading: false });
    startAutoRefresh();
  }, [isAuthenticated, checkConnection, fetchEmails, fetchLabels, getEmailSummary, startAutoRefresh, updateState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAutoRefresh();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [stopAutoRefresh]);

  // ============================================
  // Return API
  // ============================================

  return {
    // State
    ...state,

    // Connection
    checkConnection,
    initialize,

    // Email CRUD
    fetchEmails,
    fetchEmailById,
    sendEmail,
    replyToEmail,
    forwardEmail,

    // Drafts
    saveDraft,
    updateDraft,
    deleteDraft,

    // Batch actions
    batchAction,

    // Single actions
    markAsRead,
    markAsUnread,
    toggleStar,
    archiveEmail,
    deleteEmail,

    // Labels
    fetchLabels,
    applyLabel,
    removeLabel,
    createLabel,

    // AI features
    classifyEmail,
    generateReply,

    // Summary & Search
    getEmailSummary,
    searchEmails,
    clearSearch,

    // Navigation
    setView,
    selectEmail,
    openCompose,
    closeCompose,
    openSettings,
    closeSettings,
    nextPage,
    prevPage,
    setPageSize,

    // Refresh
    refresh,
    startAutoRefresh,
    stopAutoRefresh,

    // Settings
    getEmailSettings,
    updateEmailSettings,

    // Utilities
    clearError,
    clearSuccess,
    updateState,
  };
}

export default useEmail;