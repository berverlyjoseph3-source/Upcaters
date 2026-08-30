// enterprise-ai-agent-platform/apps/api/src/agents/email/email.agent.ts
import { BaseAgent } from '../core/base.agent';
import { GmailClient } from './gmail.client';
import { OAuthProvider } from '@prisma/client';
import { GoogleOAuthService } from '../../auth/services/google-oauth.service';
import { AgentType, AgentRequest, AgentContext, AgentResponse, StreamingChunk } from '../../types/agent.types';
import { logger } from '../../utils/logger';
import { OpenAIService } from '../../services/ai/openai.service';
import { EmailTools } from './email.tools';

export class EmailAgent extends BaseAgent {
  constructor() {
    super(
      AgentType.EMAIL,
      'Email Agent',
      'Smart email management with AI-powered replies and organization',
      '1.0.0'
    );
  }

  protected registerTools(): void {
    this.registerTool(EmailTools.getEmailsTool());
    this.registerTool(EmailTools.sendEmailTool());
    this.registerTool(EmailTools.replyToEmailTool());
    this.registerTool(EmailTools.markAsReadTool());
    this.registerTool(EmailTools.markAsUnreadTool());
    this.registerTool(EmailTools.archiveEmailTool());
    this.registerTool(EmailTools.deleteEmailTool());
    this.registerTool(EmailTools.applyLabelsTool());
    this.registerTool(EmailTools.removeLabelsTool());
    this.registerTool(EmailTools.createDraftTool());
    this.registerTool(EmailTools.getLabelsTool());
    this.registerTool(EmailTools.classifyEmailTool());
    this.registerTool(EmailTools.generateReplyTool());
    this.registerTool(EmailTools.batchProcessEmailsTool());
    this.registerTool(EmailTools.getEmailSummaryTool());
  }

  /**
   * Get Gmail client for a user
   */
  private async getGmailClient(userId: string): Promise<GmailClient> {
    const accessToken = await GoogleOAuthService.getValidAccessToken(userId, OAuthProvider.GOOGLE_GMAIL);
    if (!accessToken) {
      throw new Error('Gmail not connected. Please connect your Gmail account in Settings.');
    }
    return new GmailClient(accessToken);
  }

  /**
   * Check if agent can handle the request
   */
  canHandle(request: AgentRequest): boolean {
    const input = typeof request.input === 'string' ? request.input.toLowerCase() : '';
    
    const emailKeywords = [
      'email', 'mail', 'inbox', 'send', 'reply', 'gmail', 'outlook',
      'message', 'compose', 'draft', 'attachment', 'spam', 'label',
      'unread', 'read', 'archive', 'trash', 'inbox zero'
    ];
    
    const matches = emailKeywords.filter(keyword => input.includes(keyword));
    
    // Also handle any input since email agent can process general text
    return matches.length > 0 || input.length > 0;
  }

  /**
   * Execute email agent logic
   */
  protected async doExecute(request: AgentRequest, context: AgentContext): Promise<any> {
    const startTime = Date.now();
    const input = typeof request.input === 'string' ? request.input : JSON.stringify(request.input);
    const lowerInput = input.toLowerCase();

    try {
      // Check Gmail connection first
      try {
        await this.getGmailClient(context.userId);
      } catch (error) {
        return {
          success: false,
          message: 'Gmail is not connected. Please connect your Gmail account in Settings to use the Email Agent.',
          action: 'connect_gmail',
          error: error instanceof Error ? error.message : 'Connection failed',
        };
      }

      // Handle send email
      if (lowerInput.includes('send') || lowerInput.includes('compose') || lowerInput.includes('write email')) {
        return await this.handleSendEmail(context.userId, input, context);
      }

      // Handle reply to email
      if (lowerInput.includes('reply') || lowerInput.includes('respond') || lowerInput.includes('answer')) {
        return await this.handleReplyEmail(context.userId, input, context);
      }

      // Handle classify emails
      if (lowerInput.includes('classify') || lowerInput.includes('categorize') || lowerInput.includes('organize')) {
        return await this.handleClassifyEmails(context.userId, input, context);
      }

      // Handle summarize/check inbox
      if (lowerInput.includes('summary') || lowerInput.includes('summarize') || lowerInput.includes('overview') || lowerInput.includes('inbox')) {
        return await this.handleEmailSummary(context.userId, input, context);
      }

      // Handle search emails
      if (lowerInput.includes('search') || lowerInput.includes('find') || lowerInput.includes('look for')) {
        return await this.handleSearchEmails(context.userId, input, context);
      }

      // Handle delete/archive
      if (lowerInput.includes('delete') || lowerInput.includes('remove') || lowerInput.includes('trash')) {
        return await this.handleDeleteEmails(context.userId, input, context);
      }

      if (lowerInput.includes('archive')) {
        return await this.handleArchiveEmails(context.userId, input, context);
      }

      // Default: show unread emails
      return await this.handleFetchEmails(context.userId, input, context);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error, userId: context.userId, executionTimeMs: Date.now() - startTime }, 'Email agent execution failed');
      
      return {
        success: false,
        message: `Failed to process email request: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle send email request
   */
  private async handleSendEmail(userId: string, input: string, context: AgentContext): Promise<any> {
    try {
      // Extract email details using AI
      const extractionPrompt = `
Extract email details from the following request. Return JSON with:
- to: recipient email(s) (required)
- subject: email subject (required)
- body: email body content (required)
- cc: CC recipients (optional, null if none)
- bcc: BCC recipients (optional, null if none)

Request: "${input.substring(0, 1000)}"

Return ONLY valid JSON.`;

      const aiResult = await OpenAIService.complete({
        prompt: extractionPrompt,
        temperature: 0.3,
        maxTokens: 500,
      });

      let emailDetails;
      try {
        emailDetails = JSON.parse(aiResult.content);
      } catch (parseError) {
        // Fallback extraction
        const toMatch = input.match(/to\s+([^\s]+@[^\s]+)/i);
        const subjectMatch = input.match(/subject\s+(.+?)(?:\s+body|\s+message|\s*$)/i);
        const bodyMatch = input.match(/(?:body|message|saying)\s+(.+)$/is);

        emailDetails = {
          to: toMatch?.[1] || 'unknown@example.com',
          subject: subjectMatch?.[1] || 'Message from AI Agent',
          body: bodyMatch?.[1] || input,
        };
      }

      if (!emailDetails.to || !emailDetails.subject) {
        return {
          success: false,
          message: 'Please provide recipient email and subject for the email.',
          action: 'compose_email',
        };
      }

      const result = await EmailTools.sendEmail(userId, {
        to: emailDetails.to,
        subject: emailDetails.subject,
        body: emailDetails.body,
        cc: emailDetails.cc,
        bcc: emailDetails.bcc,
      });

      return {
        success: result.success,
        message: result.success ? 'Email sent successfully!' : 'Failed to send email',
        data: result,
      };
    } catch (error) {
      logger.error({ error, userId }, 'Send email handling failed');
      return {
        success: false,
        message: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        action: 'compose_email',
      };
    }
  }

  /**
   * Handle reply to email request
   */
  private async handleReplyEmail(userId: string, input: string, context: AgentContext): Promise<any> {
    try {
      const emailIdMatch = input.match(/(?:email|id|message)[:\s]+([a-zA-Z0-9_-]+)/i);
      const emailId = emailIdMatch?.[1];

      if (!emailId) {
        // Show recent emails for user to choose from
        const emails = await EmailTools.fetchEmails(userId, { maxResults: 5 });
        
        if (!emails.emails || emails.emails.length === 0) {
          return {
            success: false,
            message: 'Please specify which email to reply to. No recent emails found.',
            action: 'select_email',
          };
        }

        return {
          success: false,
          message: 'Please specify which email to reply to. Here are your recent emails:',
          action: 'select_email',
          emails: emails.emails.map(e => ({
            id: e.id,
            subject: e.subject,
            from: e.from?.email || e.from,
          })),
        };
      }

      // Extract reply body
      let replyBody = input;
      const bodyMatch = input.match(/(?:say|body|message|content)[:\s]+(.+)$/is);
      if (bodyMatch) {
        replyBody = bodyMatch[1];
      } else {
        // Generate AI reply
        const aiResult = await OpenAIService.complete({
          prompt: `Generate a professional email reply for: "${input}"`,
          temperature: 0.7,
          maxTokens: 300,
        });
        replyBody = aiResult.content;
      }

      const result = await EmailTools.replyToEmail(userId, emailId, replyBody, true);

      return {
        success: result.success,
        message: result.success ? 'Reply sent successfully!' : 'Failed to send reply',
        data: result,
      };
    } catch (error) {
      logger.error({ error, userId }, 'Reply email handling failed');
      return {
        success: false,
        message: `Failed to reply to email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Handle fetch emails request
   */
  private async handleFetchEmails(userId: string, input: string, context: AgentContext): Promise<any> {
    try {
      const maxResults = parseInt(input.match(/(\d+)\s+emails?/i)?.[1] || '10');
      const query = input.includes('from') ? input.match(/from\s+([^\s]+)/i)?.[1] : undefined;
      const isUnread = input.includes('unread');
      const isImportant = input.includes('important');

      const labelIds: string[] = [];
      if (isUnread) labelIds.push('UNREAD');
      if (isImportant) labelIds.push('IMPORTANT');

      const result = await EmailTools.fetchEmails(userId, {
        maxResults,
        query,
        labelIds: labelIds.length > 0 ? labelIds : undefined,
      });

      if (!result.emails || result.emails.length === 0) {
        return {
          success: true,
          message: 'No emails found matching your criteria.',
          emails: [],
          count: 0,
        };
      }

      return {
        success: true,
        message: `Found ${result.emails.length} email(s)`,
        emails: result.emails.map(e => ({
          id: e.id,
          subject: e.subject,
          from: e.from?.email || 'Unknown',
          snippet: e.snippet,
          isRead: e.isRead,
          isStarred: e.isStarred,
          receivedAt: e.receivedAt,
          hasAttachments: e.attachments && e.attachments.length > 0,
        })),
        count: result.emails.length,
        hasMore: !!result.nextPageToken,
      };
    } catch (error) {
      logger.error({ error, userId }, 'Fetch emails handling failed');
      return {
        success: false,
        message: `Failed to fetch emails: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Handle classify emails request
   */
  private async handleClassifyEmails(userId: string, input: string, context: AgentContext): Promise<any> {
    try {
      const maxResults = parseInt(input.match(/(\d+)\s+emails?/i)?.[1] || '20');
      
      const result = await EmailTools.fetchEmails(userId, {
        maxResults,
        labelIds: ['INBOX'],
      });

      if (!result.emails || result.emails.length === 0) {
        return {
          success: true,
          message: 'No emails to classify.',
          classifications: [],
        };
      }

      // Classify each email (limit to 10 to avoid excessive API calls)
      const emailsToClassify = result.emails.slice(0, 10);
      const classifications = [];

      for (const email of emailsToClassify) {
        try {
          const classification = await EmailTools.classifyEmail(userId, email.id);
          classifications.push({
            id: email.id,
            subject: email.subject,
            from: email.from?.email || 'Unknown',
            category: classification.category,
            priority: classification.priority,
            suggestedAction: classification.suggestedAction,
          });
        } catch (e) {
          classifications.push({
            id: email.id,
            subject: email.subject,
            from: email.from?.email || 'Unknown',
            category: 'normal',
            priority: 5,
            suggestedAction: 'read',
          });
        }
      }

      // Group by category
      const byCategory: Record<string, typeof classifications> = {};
      for (const c of classifications) {
        if (!byCategory[c.category]) byCategory[c.category] = [];
        byCategory[c.category].push(c);
      }

      return {
        success: true,
        message: `Classified ${classifications.length} emails`,
        classifications,
        byCategory,
      };
    } catch (error) {
      logger.error({ error, userId }, 'Classify emails handling failed');
      return {
        success: false,
        message: `Failed to classify emails: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Handle email summary request
   */
  private async handleEmailSummary(userId: string, input: string, context: AgentContext): Promise<any> {
    try {
      const summary = await EmailTools.getEmailSummary(userId);

      return {
        success: true,
        message: `You have ${summary.totalUnread} unread emails out of ${summary.totalInbox} total in your inbox.`,
        summary,
        recentEmails: summary.recentEmails,
      };
    } catch (error) {
      logger.error({ error, userId }, 'Email summary handling failed');
      return {
        success: false,
        message: `Failed to get email summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Handle search emails request
   */
  private async handleSearchEmails(userId: string, input: string, context: AgentContext): Promise<any> {
    try {
      // Extract search query
      let searchQuery = input;
      const actionWords = ['search', 'find', 'look for', 'search for'];
      for (const word of actionWords) {
        searchQuery = searchQuery.replace(new RegExp(`^.*${word}\\s+`, 'i'), '');
      }

      const result = await EmailTools.fetchEmails(userId, {
        maxResults: 20,
        query: searchQuery.trim(),
      });

      return {
        success: true,
        message: result.emails && result.emails.length > 0
          ? `Found ${result.emails.length} email(s) matching "${searchQuery.trim()}"`
          : `No emails found matching "${searchQuery.trim()}"`,
        emails: result.emails?.map(e => ({
          id: e.id,
          subject: e.subject,
          from: e.from?.email || 'Unknown',
          snippet: e.snippet,
          isRead: e.isRead,
          receivedAt: e.receivedAt,
        })),
        count: result.emails?.length || 0,
      };
    } catch (error) {
      logger.error({ error, userId }, 'Search emails handling failed');
      return {
        success: false,
        message: `Failed to search emails: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Handle delete emails request
   */
  private async handleDeleteEmails(userId: string, input: string, context: AgentContext): Promise<any> {
    try {
      const emailIdMatch = input.match(/(?:email|id|message)[:\s]+([a-zA-Z0-9_-]+)/gi);
      const emailIds = emailIdMatch?.map(m => m.replace(/.*?([a-zA-Z0-9_-]+)$/, '$1'));

      if (!emailIds || emailIds.length === 0) {
        return {
          success: false,
          message: 'Please specify which email(s) to delete.',
          action: 'specify_emails',
        };
      }

      const result = await EmailTools.deleteEmails(userId, emailIds);

      return {
        success: result.success,
        message: result.success
          ? `Deleted ${result.processedCount} email(s)`
          : `Failed to delete some emails. Deleted: ${result.processedCount}, Failed: ${result.failedCount}`,
        data: result,
      };
    } catch (error) {
      logger.error({ error, userId }, 'Delete emails handling failed');
      return {
        success: false,
        message: `Failed to delete emails: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Handle archive emails request
   */
  private async handleArchiveEmails(userId: string, input: string, context: AgentContext): Promise<any> {
    try {
      const emailIdMatch = input.match(/(?:email|id|message)[:\s]+([a-zA-Z0-9_-]+)/gi);
      const emailIds = emailIdMatch?.map(m => m.replace(/.*?([a-zA-Z0-9_-]+)$/, '$1'));

      if (!emailIds || emailIds.length === 0) {
        return {
          success: false,
          message: 'Please specify which email(s) to archive.',
          action: 'specify_emails',
        };
      }

      const result = await EmailTools.modifyEmailLabels(userId, emailIds, [], ['INBOX']);

      return {
        success: result.success,
        message: result.success
          ? `Archived ${result.processedCount} email(s)`
          : 'Failed to archive emails',
        data: result,
      };
    } catch (error) {
      logger.error({ error, userId }, 'Archive emails handling failed');
      return {
        success: false,
        message: `Failed to archive emails: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Execute with streaming support
   */
  async executeStream(
    request: AgentRequest,
    context: AgentContext,
    onChunk: (chunk: StreamingChunk) => void
  ): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      onChunk({
        type: 'thought',
        content: 'Checking your Gmail connection...',
        timestamp: new Date(),
      });

      const result = await this.doExecute(request, context);

      onChunk({
        type: 'output',
        content: result.message || JSON.stringify(result),
        timestamp: new Date(),
      });

      return {
        id: `email_${Date.now()}`,
        success: result.success !== false,
        output: result,
        metadata: {
          agentType: this.agentType,
          executionTimeMs: Date.now() - startTime,
          tokensUsed: 0,
          costUsd: 0,
          retryCount: 0,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      onChunk({
        type: 'error',
        content: error instanceof Error ? error.message : 'Execution failed',
        timestamp: new Date(),
      });

      return {
        id: `email_${Date.now()}`,
        success: false,
        output: null,
        error: error instanceof Error ? error.message : 'Execution failed',
        metadata: {
          agentType: this.agentType,
          executionTimeMs: Date.now() - startTime,
          tokensUsed: 0,
          costUsd: 0,
          retryCount: 0,
        },
        timestamp: new Date(),
      };
    }
  }
}