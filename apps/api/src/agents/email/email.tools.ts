// enterprise-ai-agent-platform/apps/api/src/agents/email/email.tools.ts
import { AgentTool, AgentContext } from '../../types/agent.types';
import { OAuthProvider } from '@prisma/client';
import { GoogleOAuthService } from '../../auth/services/google-oauth.service';
import { logger } from '../../utils/logger';
import { OpenAIClient } from '../../services/ai/openai.client';
import { 
  EmailMessage, 
  EmailFilterOptions, 
  EmailSendOptions, 
  EmailDraft,
  EmailClassification,
  EmailLabel,
  EmailBatchResult,
  EmailAddress,
  EmailAttachment,
} from './email.types';
import { GmailClient } from './gmail.client';

export class EmailTools {
  /**
   * Get emails from Gmail
   */
  static getEmailsTool(): AgentTool {
    return {
      name: 'get_emails',
      description: 'Fetch emails from Gmail with optional filters',
      parameters: [
        { name: 'maxResults', type: 'number', required: false, description: 'Maximum number of emails to fetch (default: 10)' },
        { name: 'labelIds', type: 'array', required: false, description: 'Filter by label IDs (e.g., ["INBOX", "UNREAD"])' },
        { name: 'query', type: 'string', required: false, description: 'Search query (e.g., "from:user@example.com")' },
        { name: 'pageToken', type: 'string', required: false, description: 'Pagination token for next page' },
        { name: 'includeSpamTrash', type: 'boolean', required: false, description: 'Include spam and trash folders' },
      ],
      execute: async (params, context) => {
        return await this.fetchEmails(context.userId, {
          maxResults: params.maxResults || 10,
          labelIds: params.labelIds,
          query: params.query,
          pageToken: params.pageToken,
          includeSpamTrash: params.includeSpamTrash,
        });
      },
      requiresApiCall: true,
      cost: 1,
    };
  }

  /**
   * Send email
   */
  static sendEmailTool(): AgentTool {
    return {
      name: 'send_email',
      description: 'Send an email to one or more recipients',
      parameters: [
        { name: 'to', type: 'string', required: true, description: 'Recipient email address(es)' },
        { name: 'subject', type: 'string', required: true, description: 'Email subject line' },
        { name: 'body', type: 'string', required: true, description: 'Email body content' },
        { name: 'cc', type: 'string', required: false, description: 'CC recipients' },
        { name: 'bcc', type: 'string', required: false, description: 'BCC recipients' },
        { name: 'replyTo', type: 'string', required: false, description: 'Reply-to email address' },
        { name: 'attachments', type: 'array', required: false, description: 'Array of attachment objects {filename, content, mimeType}' },
      ],
      execute: async (params, context) => {
        return await this.sendEmail(context.userId, {
          to: params.to,
          subject: params.subject,
          body: params.body,
          cc: params.cc,
          bcc: params.bcc,
          replyTo: params.replyTo,
          attachments: params.attachments,
        });
      },
      requiresApiCall: true,
      cost: 2,
    };
  }

  /**
   * Reply to email
   */
  static replyToEmailTool(): AgentTool {
    return {
      name: 'reply_to_email',
      description: 'Reply to an existing email',
      parameters: [
        { name: 'emailId', type: 'string', required: true, description: 'ID of the email to reply to' },
        { name: 'body', type: 'string', required: true, description: 'Reply body content' },
        { name: 'quoteOriginal', type: 'boolean', required: false, description: 'Whether to quote the original message' },
      ],
      execute: async (params, context) => {
        return await this.replyToEmail(context.userId, params.emailId, params.body, params.quoteOriginal);
      },
      requiresApiCall: true,
      cost: 2,
    };
  }

  /**
   * Mark email as read
   */
  static markAsReadTool(): AgentTool {
    return {
      name: 'mark_as_read',
      description: 'Mark one or more emails as read',
      parameters: [
        { name: 'emailIds', type: 'array', required: true, description: 'Array of email IDs to mark as read' },
      ],
      execute: async (params, context) => {
        return await this.modifyEmailLabels(context.userId, params.emailIds, [], ['UNREAD']);
      },
      requiresApiCall: true,
      cost: 0.5,
    };
  }

  /**
   * Mark email as unread
   */
  static markAsUnreadTool(): AgentTool {
    return {
      name: 'mark_as_unread',
      description: 'Mark one or more emails as unread',
      parameters: [
        { name: 'emailIds', type: 'array', required: true, description: 'Array of email IDs to mark as unread' },
      ],
      execute: async (params, context) => {
        return await this.modifyEmailLabels(context.userId, params.emailIds, ['UNREAD'], []);
      },
      requiresApiCall: true,
      cost: 0.5,
    };
  }

  /**
   * Archive email
   */
  static archiveEmailTool(): AgentTool {
    return {
      name: 'archive_email',
      description: 'Archive one or more emails (remove from inbox)',
      parameters: [
        { name: 'emailIds', type: 'array', required: true, description: 'Array of email IDs to archive' },
      ],
      execute: async (params, context) => {
        return await this.modifyEmailLabels(context.userId, params.emailIds, [], ['INBOX']);
      },
      requiresApiCall: true,
      cost: 0.5,
    };
  }

  /**
   * Delete email
   */
  static deleteEmailTool(): AgentTool {
    return {
      name: 'delete_email',
      description: 'Move emails to trash',
      parameters: [
        { name: 'emailIds', type: 'array', required: true, description: 'Array of email IDs to delete' },
      ],
      execute: async (params, context) => {
        return await this.deleteEmails(context.userId, params.emailIds);
      },
      requiresApiCall: true,
      cost: 0.5,
    };
  }

  /**
   * Apply labels to email
   */
  static applyLabelsTool(): AgentTool {
    return {
      name: 'apply_labels',
      description: 'Apply labels to emails',
      parameters: [
        { name: 'emailIds', type: 'array', required: true, description: 'Array of email IDs' },
        { name: 'labelIds', type: 'array', required: true, description: 'Array of label IDs to apply' },
      ],
      execute: async (params, context) => {
        return await this.modifyEmailLabels(context.userId, params.emailIds, params.labelIds, []);
      },
      requiresApiCall: true,
      cost: 0.5,
    };
  }

  /**
   * Remove labels from email
   */
  static removeLabelsTool(): AgentTool {
    return {
      name: 'remove_labels',
      description: 'Remove labels from emails',
      parameters: [
        { name: 'emailIds', type: 'array', required: true, description: 'Array of email IDs' },
        { name: 'labelIds', type: 'array', required: true, description: 'Array of label IDs to remove' },
      ],
      execute: async (params, context) => {
        return await this.modifyEmailLabels(context.userId, params.emailIds, [], params.labelIds);
      },
      requiresApiCall: true,
      cost: 0.5,
    };
  }

  /**
   * Create draft email
   */
  static createDraftTool(): AgentTool {
    return {
      name: 'create_draft',
      description: 'Create an email draft',
      parameters: [
        { name: 'to', type: 'string', required: true, description: 'Recipient email address(es)' },
        { name: 'subject', type: 'string', required: true, description: 'Email subject line' },
        { name: 'body', type: 'string', required: true, description: 'Email body content' },
        { name: 'cc', type: 'string', required: false, description: 'CC recipients' },
        { name: 'bcc', type: 'string', required: false, description: 'BCC recipients' },
      ],
      execute: async (params, context) => {
        return await this.createDraft(context.userId, {
          to: params.to,
          subject: params.subject,
          body: params.body,
          cc: params.cc,
          bcc: params.bcc,
        });
      },
      requiresApiCall: true,
      cost: 1,
    };
  }

  /**
   * Get labels
   */
  static getLabelsTool(): AgentTool {
    return {
      name: 'get_labels',
      description: 'Get all Gmail labels for the user',
      parameters: [],
      execute: async (params, context) => {
        return await this.getLabels(context.userId);
      },
      requiresApiCall: true,
      cost: 0.5,
    };
  }

  /**
   * Classify email
   */
  static classifyEmailTool(): AgentTool {
    return {
      name: 'classify_email',
      description: 'Classify an email by urgency and importance using AI',
      parameters: [
        { name: 'emailId', type: 'string', required: true, description: 'ID of the email to classify' },
      ],
      execute: async (params, context) => {
        return await this.classifyEmail(context.userId, params.emailId);
      },
      requiresApiCall: true,
      cost: 1,
    };
  }

  /**
   * Generate AI reply suggestion
   */
  static generateReplyTool(): AgentTool {
    return {
      name: 'generate_reply',
      description: 'Generate AI-powered reply suggestions for an email',
      parameters: [
        { name: 'emailId', type: 'string', required: true, description: 'ID of the email to reply to' },
        { name: 'tone', type: 'string', required: false, description: 'Tone of the reply (professional, casual, friendly, formal)' },
        { name: 'length', type: 'string', required: false, description: 'Length of reply (short, medium, long)' },
      ],
      execute: async (params, context) => {
        return await this.generateReply(context.userId, params.emailId, params.tone, params.length);
      },
      requiresApiCall: true,
      cost: 2,
    };
  }

  /**
   * Batch process emails
   */
  static batchProcessEmailsTool(): AgentTool {
    return {
      name: 'batch_process_emails',
      description: 'Process multiple emails with a single action',
      parameters: [
        { name: 'action', type: 'string', required: true, description: 'Action to perform (archive, delete, mark_read, mark_unread, label)' },
        { name: 'emailIds', type: 'array', required: true, description: 'Array of email IDs to process' },
        { name: 'labelIds', type: 'array', required: false, description: 'Label IDs for label action' },
      ],
      execute: async (params, context) => {
        return await this.batchProcess(context.userId, params.action, params.emailIds, params.labelIds);
      },
      requiresApiCall: true,
      cost: 1,
    };
  }

  /**
   * Get email summary
   */
  static getEmailSummaryTool(): AgentTool {
    return {
      name: 'get_email_summary',
      description: 'Get a summary of your inbox',
      parameters: [],
      execute: async (params, context) => {
        return await this.getEmailSummary(context.userId);
      },
      requiresApiCall: true,
      cost: 1,
    };
  }

  // ============================================
  // Implementation Methods
  // ============================================

  /**
   * Get Gmail client for a user
   */
  private static async getGmailClient(userId: string): Promise<GmailClient> {
    const accessToken = await GoogleOAuthService.getValidAccessToken(userId, OAuthProvider.GOOGLE_GMAIL);
    if (!accessToken) {
      throw new Error('Gmail not connected. Please connect your Gmail account in Settings.');
    }
    return new GmailClient(accessToken);
  }

  /**
   * Fetch emails from Gmail
   */
  static async fetchEmails(
    userId: string,
    options: EmailFilterOptions
  ): Promise<{ emails: EmailMessage[]; nextPageToken?: string; resultSizeEstimate?: number }> {
    try {
      const client = await this.getGmailClient(userId);
      
      logger.info({ userId, options }, 'Fetching emails');

      const result = await client.listMessages({
        maxResults: options.maxResults,
        pageToken: options.pageToken,
        q: options.query,
        labelIds: options.labelIds,
      });

      const emails: EmailMessage[] = [];
      
      for (const msg of (result.messages || []).slice(0, options.maxResults)) {
        try {
          const fullMsg = await client.getMessage(msg.id, 'full');
          const headers = fullMsg.payload?.headers || [];
          
          const subject = headers.find(h => h.name === 'Subject')?.value || '(no subject)';
          const from = this.parseEmailAddress(headers.find(h => h.name === 'From')?.value || '');
          const to = this.parseEmailAddresses(headers.find(h => h.name === 'To')?.value || '');
          const cc = this.parseEmailAddresses(headers.find(h => h.name === 'Cc')?.value || '');
          const date = headers.find(h => h.name === 'Date')?.value || '';
          const replyTo = this.parseEmailAddress(headers.find(h => h.name === 'Reply-To')?.value || '');
          
          // Extract body content
          let body = '';
          let bodyHtml = '';
          if (fullMsg.payload?.parts) {
            for (const part of fullMsg.payload.parts) {
              if (part.mimeType === 'text/plain' && part.body?.data) {
                body = Buffer.from(part.body.data, 'base64').toString('utf-8');
              } else if (part.mimeType === 'text/html' && part.body?.data) {
                bodyHtml = Buffer.from(part.body.data, 'base64').toString('utf-8');
              }
            }
          } else if (fullMsg.payload?.body?.data) {
            body = Buffer.from(fullMsg.payload.body.data, 'base64').toString('utf-8');
          }

          // Extract attachments
          const attachments: EmailAttachment[] = [];
          if (fullMsg.payload?.parts) {
            for (const part of fullMsg.payload.parts) {
              if (part.filename && part.body?.attachmentId) {
                attachments.push({
                  id: part.body.attachmentId,
                  filename: part.filename,
                  mimeType: part.mimeType || 'application/octet-stream',
                  size: part.body.size || 0,
                });
              }
            }
          }

          emails.push({
            id: fullMsg.id,
            threadId: fullMsg.threadId,
            from,
            to,
            cc: cc.length > 0 ? cc : undefined,
            subject,
            body,
            bodyHtml: bodyHtml || undefined,
            snippet: fullMsg.snippet || '',
            labels: fullMsg.labelIds || [],
            isRead: !fullMsg.labelIds?.includes('UNREAD'),
            isStarred: fullMsg.labelIds?.includes('STARRED') || false,
            isImportant: fullMsg.labelIds?.includes('IMPORTANT') || false,
            receivedAt: new Date(parseInt(fullMsg.internalDate || '0')),
            attachments: attachments.length > 0 ? attachments : undefined,
            replyTo,
          });
        } catch (msgError) {
          logger.warn({ msgError, messageId: msg.id }, 'Failed to parse individual email');
        }
      }

      return {
        emails,
        nextPageToken: result.nextPageToken,
        resultSizeEstimate: result.resultSizeEstimate,
      };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to fetch emails');
      throw new Error('Failed to fetch emails from Gmail');
    }
  }

  /**
   * Send an email
   */
  static async sendEmail(
    userId: string,
    options: EmailSendOptions
  ): Promise<{ id: string; threadId?: string; success: boolean }> {
    try {
      const client = await this.getGmailClient(userId);
      
      logger.info({ userId, subject: options.subject, to: this.formatAddresses(options.to) }, 'Sending email');

      const emailLines: string[] = [];
      
      // Build headers
      emailLines.push(`To: ${this.formatAddresses(options.to)}`);
      if (options.cc) emailLines.push(`Cc: ${this.formatAddresses(options.cc)}`);
      if (options.bcc) emailLines.push(`Bcc: ${this.formatAddresses(options.bcc)}`);
      if (options.replyTo) emailLines.push(`Reply-To: ${typeof options.replyTo === 'string' ? options.replyTo : options.replyTo.email}`);
      emailLines.push(`Subject: ${options.subject}`);
      emailLines.push('MIME-Version: 1.0');
      
      // Build body
      if (options.bodyHtml) {
        emailLines.push('Content-Type: text/html; charset=utf-8');
        emailLines.push('');
        emailLines.push(options.bodyHtml);
      } else {
        emailLines.push('Content-Type: text/plain; charset=utf-8');
        emailLines.push('');
        emailLines.push(options.body);
      }

      const rawMessage = Buffer.from(emailLines.join('\r\n'))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const result = await client.sendMessage(rawMessage);
      
      logger.info({ userId, messageId: result.id, threadId: result.threadId }, 'Email sent successfully');

      return {
        id: result.id,
        threadId: result.threadId,
        success: true,
      };
    } catch (error) {
      logger.error({ error, userId, subject: options.subject }, 'Failed to send email');
      throw new Error('Failed to send email');
    }
  }

  /**
   * Reply to an email
   */
  static async replyToEmail(
    userId: string,
    emailId: string,
    body: string,
    quoteOriginal: boolean = true
  ): Promise<{ id: string; threadId?: string; success: boolean }> {
    try {
      const client = await this.getGmailClient(userId);
      
      logger.info({ userId, emailId, quoteOriginal }, 'Replying to email');

      // Get original email for threading
      const originalEmail = await client.getMessage(emailId, 'metadata');
      const headers = originalEmail.payload?.headers || [];
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const from = headers.find(h => h.name === 'From')?.value || '';
      const replyTo = headers.find(h => h.name === 'Reply-To')?.value || from;
      const references = headers.find(h => h.name === 'Message-ID')?.value || '';
      
      const emailLines: string[] = [];
      
      emailLines.push(`To: ${replyTo}`);
      emailLines.push(`Subject: Re: ${subject.replace(/^Re:\s*/i, '')}`);
      emailLines.push(`In-Reply-To: ${references}`);
      emailLines.push(`References: ${references}`);
      emailLines.push('MIME-Version: 1.0');
      emailLines.push('Content-Type: text/plain; charset=utf-8');
      emailLines.push('');
      emailLines.push(body);

      const rawMessage = Buffer.from(emailLines.join('\r\n'))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

      const result = await client.sendMessage(rawMessage);
      
      logger.info({ userId, emailId, replyMessageId: result.id }, 'Reply sent successfully');

      return {
        id: result.id,
        threadId: result.threadId,
        success: true,
      };
    } catch (error) {
      logger.error({ error, userId, emailId }, 'Failed to reply to email');
      throw new Error('Failed to send reply');
    }
  }

  /**
   * Modify email labels
   */
  static async modifyEmailLabels(
    userId: string,
    emailIds: string[],
    addLabels: string[],
    removeLabels: string[]
  ): Promise<EmailBatchResult> {
    try {
      if (emailIds.length === 0) {
        return { success: true, processedCount: 0, failedCount: 0, errors: [] };
      }

      const client = await this.getGmailClient(userId);
      
      logger.info({ userId, emailCount: emailIds.length, addLabels, removeLabels }, 'Modifying email labels');

      if (emailIds.length === 1) {
        await client.modifyMessage(emailIds[0], addLabels, removeLabels);
        return {
          success: true,
          processedCount: 1,
          failedCount: 0,
          errors: [],
        };
      }

      // Batch modify
      await client.batchModifyMessages(emailIds, addLabels, removeLabels);
      
      return {
        success: true,
        processedCount: emailIds.length,
        failedCount: 0,
        errors: [],
      };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to modify email labels');
      
      return {
        success: false,
        processedCount: 0,
        failedCount: emailIds.length,
        errors: emailIds.map(id => ({ id, error: error instanceof Error ? error.message : 'Unknown error' })),
      };
    }
  }

  /**
   * Delete emails (move to trash)
   */
  static async deleteEmails(userId: string, emailIds: string[]): Promise<EmailBatchResult> {
    try {
      const client = await this.getGmailClient(userId);
      
      logger.info({ userId, emailCount: emailIds.length }, 'Deleting emails');

      const results = await Promise.allSettled(
        emailIds.map(async (id) => {
          try {
            await client.trashMessage(id);
            return { id, success: true };
          } catch (error) {
            return { id, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
          }
        })
      );

      let processedCount = 0;
      let failedCount = 0;
      const errors: Array<{ id: string; error: string }> = [];

      for (const result of results) {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            processedCount++;
          } else {
            failedCount++;
            errors.push({ id: result.value.id, error: result.value.error });
          }
        } else {
          failedCount++;
        }
      }

      return {
        success: failedCount === 0,
        processedCount,
        failedCount,
        errors,
      };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to delete emails');
      throw new Error('Failed to delete emails');
    }
  }

  /**
   * Create an email draft
   */
  private static async createDraft(
    userId: string,
    options: EmailSendOptions
  ): Promise<EmailDraft> {
    try {
      const client = await this.getGmailClient(userId);
      
      logger.info({ userId, subject: options.subject }, 'Creating draft');

      const emailLines: string[] = [];
      
      emailLines.push(`To: ${this.formatAddresses(options.to)}`);
      if (options.cc) emailLines.push(`Cc: ${this.formatAddresses(options.cc)}`);
      if (options.bcc) emailLines.push(`Bcc: ${this.formatAddresses(options.bcc)}`);
      emailLines.push(`Subject: ${options.subject}`);
      emailLines.push('MIME-Version: 1.0');
      emailLines.push('Content-Type: text/plain; charset=utf-8');
      emailLines.push('');
      emailLines.push(options.body);

      const rawMessage = Buffer.from(emailLines.join('\r\n'))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

      const result = await client.createDraft(rawMessage);

      return {
        id: result.id,
        message: {
          id: result.message?.id || '',
          threadId: result.message?.threadId || '',
          from: { email: userId, name: 'Me' },
          to: this.parseEmailAddresses(this.formatAddresses(options.to)),
          subject: options.subject,
          body: options.body,
          snippet: options.body.substring(0, 200),
          labels: ['DRAFT'],
          isRead: true,
          isStarred: false,
          isImportant: false,
          receivedAt: new Date(),
        },
        created: new Date(),
        updated: new Date(),
      };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to create draft');
      throw new Error('Failed to create draft');
    }
  }

  /**
   * Get Gmail labels
   */
  private static async getLabels(userId: string): Promise<EmailLabel[]> {
    try {
      const client = await this.getGmailClient(userId);
      
      logger.info({ userId }, 'Getting labels');

      const labels = await client.getLabels();
      
      return labels.map(l => ({
        id: l.id,
        name: l.name,
        type: l.type as 'system' | 'user',
        messageListVisibility: 'show',
        labelListVisibility: 'labelShow',
      }));
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get labels');
      throw new Error('Failed to get Gmail labels');
    }
  }

  /**
   * Classify an email using AI
   */
  static async classifyEmail(
    userId: string,
    emailId: string
  ): Promise<EmailClassification> {
    try {
      const client = await this.getGmailClient(userId);
      const email = await client.getMessage(emailId, 'full');
      
      const headers = email.payload?.headers || [];
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const from = headers.find(h => h.name === 'From')?.value || '';
      const snippet = email.snippet || '';
      
      logger.info({ userId, emailId, subject }, 'Classifying email');

      // Try AI classification
      try {
        const openai = OpenAIClient.getInstance();
        const response = await openai.complete({
          messages: [
            {
              role: 'system',
              content: 'Classify the email as one of: urgent, important, newsletter, spam, or normal. Return JSON with category and priority (1-10). Also suggest action: reply, read, archive, delete, label, ignore.'
            },
            {
              role: 'user',
              content: `Subject: ${subject}\nFrom: ${from}\nSnippet: ${snippet.substring(0, 500)}`
            }
          ],
          maxTokens: 200,
          temperature: 0.3,
        });
        
        try {
          const classification = JSON.parse(response.choices[0].message.content);
          return {
            category: classification.category || 'normal',
            priority: classification.priority || 5,
            suggestedAction: classification.suggestedAction || 'read',
            suggestedLabels: classification.suggestedLabels || [],
            reason: classification.reason || 'AI classification based on content analysis',
          };
        } catch (parseError) {
          logger.warn({ parseError }, 'Failed to parse classification response');
        }
      } catch (aiError) {
        logger.warn({ aiError }, 'AI classification failed, using heuristic fallback');
      }

      // Heuristic fallback classification
      const lowerSubject = subject.toLowerCase();
      const lowerFrom = from.toLowerCase();
      const lowerSnippet = snippet.toLowerCase();
      
      let category: EmailClassification['category'] = 'normal';
      let priority = 5;
      let suggestedAction: EmailClassification['suggestedAction'] = 'read';
      const suggestedLabels: string[] = [];

      // Check for urgency indicators
      if (
        lowerSubject.includes('urgent') ||
        lowerSubject.includes('asap') ||
        lowerSubject.includes('emergency') ||
        lowerSubject.includes('critical') ||
        lowerSnippet.includes('deadline')
      ) {
        category = 'urgent';
        priority = 9;
        suggestedAction = 'reply';
      }
      // Check for newsletters
      else if (
        lowerSubject.includes('newsletter') ||
        lowerSubject.includes('weekly digest') ||
        lowerSubject.includes('monthly update') ||
        lowerFrom.includes('noreply') ||
        lowerFrom.includes('no-reply')
      ) {
        category = 'newsletter';
        priority = 3;
        suggestedAction = 'read';
      }
      // Check for spam indicators
      else if (
        lowerSubject.includes('win') ||
        lowerSubject.includes('prize') ||
        lowerSubject.includes('congratulations') ||
        lowerSnippet.includes('unsubscribe') ||
        lowerSnippet.includes('click here')
      ) {
        category = 'spam';
        priority = 1;
        suggestedAction = 'delete';
      }
      // Check for important indicators
      else if (
        lowerSubject.includes('action required') ||
        lowerSubject.includes('review') ||
        lowerSubject.includes('approval') ||
        lowerSnippet.includes('please respond')
      ) {
        category = 'important';
        priority = 7;
        suggestedAction = 'reply';
      }

      return {
        category,
        priority,
        suggestedAction,
        suggestedLabels,
        reason: 'Heuristic classification based on email content analysis',
      };
    } catch (error) {
      logger.error({ error, userId, emailId }, 'Failed to classify email');
      return {
        category: 'normal',
        priority: 5,
        suggestedAction: 'read',
        suggestedLabels: [],
        reason: 'Classification failed, defaulting to normal',
      };
    }
  }

  /**
   * Generate AI reply suggestion
   */
  private static async generateReply(
    userId: string,
    emailId: string,
    tone: string = 'professional',
    length: string = 'medium'
  ): Promise<{ suggestedReplies: string[]; tone: string; context: string }> {
    try {
      const client = await this.getGmailClient(userId);
      const email = await client.getMessage(emailId, 'full');
      
      const headers = email.payload?.headers || [];
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const from = headers.find(h => h.name === 'From')?.value || '';
      const snippet = email.snippet || '';
      
      logger.info({ userId, emailId, tone, length }, 'Generating reply suggestions');

      const lengthGuide = length === 'short' ? '1-2 sentences' : 
                          length === 'long' ? '3-4 paragraphs' : 
                          '2-3 sentences';

      const openai = OpenAIClient.getInstance();
      const response = await openai.complete({
        messages: [
          {
            role: 'system',
            content: `Generate 3 ${tone} reply suggestions (${lengthGuide} each) for the following email. Return JSON with array of suggestions.`
          },
          {
            role: 'user',
            content: `Subject: ${subject}\nFrom: ${from}\nContent: ${snippet.substring(0, 500)}`
          }
        ],
        maxTokens: 500,
        temperature: 0.7,
      });

      try {
        const parsed = JSON.parse(response.choices[0].message.content);
        return {
          suggestedReplies: parsed.suggestions || parsed.suggestedReplies || [],
          tone,
          context: snippet.substring(0, 200),
        };
      } catch (parseError) {
        // Parse from text if JSON parsing fails
        const lines = response.choices[0].message.content.split('\n').filter((l: string) => l.trim());
        const replies = lines
          .filter((l: string) => l.match(/^\d+[\.\)]|^-|^•/) && l.length > 10)
          .map((l: string) => l.replace(/^\d+[\.\)]\s*|^-\s*|^•\s*/, '').trim())
          .slice(0, 3);

        return {
          suggestedReplies: replies.length > 0 ? replies : ['Thank you for your email.', 'I will review this and get back to you.', 'I appreciate your message.'],
          tone,
          context: snippet.substring(0, 200),
        };
      }
    } catch (error) {
      logger.error({ error, userId, emailId }, 'Failed to generate reply');
      return {
        suggestedReplies: ['Thank you for your email.', 'I will review this shortly.', 'I appreciate your message.'],
        tone: 'professional',
        context: 'Reply generation failed, using default suggestions',
      };
    }
  }

  /**
   * Batch process emails
   */
  private static async batchProcess(
    userId: string,
    action: string,
    emailIds: string[],
    labelIds?: string[]
  ): Promise<EmailBatchResult> {
    try {
      const client = await this.getGmailClient(userId);
      
      logger.info({ userId, action, emailCount: emailIds.length }, 'Batch processing emails');

      switch (action) {
        case 'archive':
          return await this.modifyEmailLabels(userId, emailIds, [], ['INBOX']);
        case 'delete':
          return await this.deleteEmails(userId, emailIds);
        case 'mark_read':
          return await this.modifyEmailLabels(userId, emailIds, [], ['UNREAD']);
        case 'mark_unread':
          return await this.modifyEmailLabels(userId, emailIds, ['UNREAD'], []);
        case 'label':
          if (labelIds && labelIds.length > 0) {
            return await this.modifyEmailLabels(userId, emailIds, labelIds, []);
          }
          return { success: false, processedCount: 0, failedCount: emailIds.length, errors: [{ id: 'all', error: 'No label IDs provided' }] };
        default:
          return { success: false, processedCount: 0, failedCount: emailIds.length, errors: [{ id: 'all', error: `Unknown action: ${action}` }] };
      }
    } catch (error) {
      logger.error({ error, userId, action }, 'Failed to batch process');
      return { success: false, processedCount: 0, failedCount: emailIds.length, errors: [{ id: 'all', error: error instanceof Error ? error.message : 'Unknown error' }] };
    }
  }

  /**
   * Get email summary
   */
  static async getEmailSummary(userId: string): Promise<{
    totalUnread: number;
    totalInbox: number;
    byCategory: Record<string, number>;
    recentEmails: Array<{ id: string; subject: string; from: string; receivedAt: Date }>;
    urgentCount: number;
  }> {
    try {
      const client = await this.getGmailClient(userId);
      
      logger.info({ userId }, 'Getting email summary');

      // Get unread count
      const unreadResult = await client.listMessages({
        maxResults: 1,
        labelIds: ['UNREAD', 'INBOX'],
      });

      // Get recent inbox emails
      const inboxResult = await client.listMessages({
        maxResults: 20,
        labelIds: ['INBOX'],
      });

      // Get urgent emails (labeled as IMPORTANT)
      const importantResult = await client.listMessages({
        maxResults: 20,
        labelIds: ['IMPORTANT', 'INBOX'],
      });

      // Fetch details for recent emails
      const recentEmails = [];
      for (const msg of (inboxResult.messages || []).slice(0, 5)) {
        try {
          const fullMsg = await client.getMessage(msg.id, 'metadata');
          const headers = fullMsg.payload?.headers || [];
          recentEmails.push({
            id: fullMsg.id,
            subject: headers.find(h => h.name === 'Subject')?.value || '(no subject)',
            from: headers.find(h => h.name === 'From')?.value || 'Unknown',
            receivedAt: new Date(parseInt(fullMsg.internalDate || '0')),
          });
        } catch (e) {
          // Skip individual email fetch errors
        }
      }

      return {
        totalUnread: unreadResult.resultSizeEstimate || 0,
        totalInbox: inboxResult.resultSizeEstimate || 0,
        byCategory: {
          unread: unreadResult.resultSizeEstimate || 0,
          important: importantResult.resultSizeEstimate || 0,
        },
        recentEmails,
        urgentCount: importantResult.resultSizeEstimate || 0,
      };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get email summary');
      return {
        totalUnread: 0,
        totalInbox: 0,
        byCategory: {},
        recentEmails: [],
        urgentCount: 0,
      };
    }
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Parse email address from string
   */
  private static parseEmailAddress(addressStr: string): EmailAddress {
    if (!addressStr) return { email: '' };
    
    // Handle "Name <email>" format
    const match = addressStr.match(/^(?:"?([^"]*)"?\s*)?<?([^>]*)>?$/);
    
    if (match) {
      return {
        name: match[1]?.trim() || undefined,
        email: match[2]?.trim() || addressStr.trim(),
      };
    }
    
    return { email: addressStr.trim() };
  }

  /**
   * Parse multiple email addresses
   */
  private static parseEmailAddresses(addressesStr: string): EmailAddress[] {
    if (!addressesStr) return [];
    
    return addressesStr.split(',').map(a => this.parseEmailAddress(a.trim()));
  }

  /**
   * Format email addresses for headers
   */
  private static formatAddresses(addresses: string | EmailAddress | (string | EmailAddress)[]): string {
    if (typeof addresses === 'string') return addresses;
    if (Array.isArray(addresses)) {
      return addresses.map(a => typeof a === 'string' ? a : a.email).join(', ');
    }
    return addresses.email;
  }
}