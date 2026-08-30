"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailAgent = void 0;
// enterprise-ai-agent-platform/apps/api/src/agents/email/email.agent.ts
const base_agent_1 = require("../core/base.agent");
const gmail_client_1 = require("./gmail.client");
const client_1 = require("@prisma/client");
const google_oauth_service_1 = require("../../auth/services/google-oauth.service");
const agent_types_1 = require("../../types/agent.types");
const logger_1 = require("../../utils/logger");
const openai_service_1 = require("../../services/ai/openai.service");
const email_tools_1 = require("./email.tools");
class EmailAgent extends base_agent_1.BaseAgent {
    constructor() {
        super(agent_types_1.AgentType.EMAIL, 'Email Agent', 'Smart email management with AI-powered replies and organization', '1.0.0');
    }
    registerTools() {
        this.registerTool(email_tools_1.EmailTools.getEmailsTool());
        this.registerTool(email_tools_1.EmailTools.sendEmailTool());
        this.registerTool(email_tools_1.EmailTools.replyToEmailTool());
        this.registerTool(email_tools_1.EmailTools.markAsReadTool());
        this.registerTool(email_tools_1.EmailTools.markAsUnreadTool());
        this.registerTool(email_tools_1.EmailTools.archiveEmailTool());
        this.registerTool(email_tools_1.EmailTools.deleteEmailTool());
        this.registerTool(email_tools_1.EmailTools.applyLabelsTool());
        this.registerTool(email_tools_1.EmailTools.removeLabelsTool());
        this.registerTool(email_tools_1.EmailTools.createDraftTool());
        this.registerTool(email_tools_1.EmailTools.getLabelsTool());
        this.registerTool(email_tools_1.EmailTools.classifyEmailTool());
        this.registerTool(email_tools_1.EmailTools.generateReplyTool());
        this.registerTool(email_tools_1.EmailTools.batchProcessEmailsTool());
        this.registerTool(email_tools_1.EmailTools.getEmailSummaryTool());
    }
    /**
     * Get Gmail client for a user
     */
    async getGmailClient(userId) {
        const accessToken = await google_oauth_service_1.GoogleOAuthService.getValidAccessToken(userId, client_1.OAuthProvider.GOOGLE_GMAIL);
        if (!accessToken) {
            throw new Error('Gmail not connected. Please connect your Gmail account in Settings.');
        }
        return new gmail_client_1.GmailClient(accessToken);
    }
    /**
     * Check if agent can handle the request
     */
    canHandle(request) {
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
    async doExecute(request, context) {
        const startTime = Date.now();
        const input = typeof request.input === 'string' ? request.input : JSON.stringify(request.input);
        const lowerInput = input.toLowerCase();
        try {
            // Check Gmail connection first
            try {
                await this.getGmailClient(context.userId);
            }
            catch (error) {
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error({ error, userId: context.userId, executionTimeMs: Date.now() - startTime }, 'Email agent execution failed');
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
    async handleSendEmail(userId, input, context) {
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
            const aiResult = await openai_service_1.OpenAIService.complete({
                prompt: extractionPrompt,
                temperature: 0.3,
                maxTokens: 500,
            });
            let emailDetails;
            try {
                emailDetails = JSON.parse(aiResult.content);
            }
            catch (parseError) {
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
            const result = await email_tools_1.EmailTools.sendEmail(userId, {
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
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Send email handling failed');
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
    async handleReplyEmail(userId, input, context) {
        try {
            const emailIdMatch = input.match(/(?:email|id|message)[:\s]+([a-zA-Z0-9_-]+)/i);
            const emailId = emailIdMatch?.[1];
            if (!emailId) {
                // Show recent emails for user to choose from
                const emails = await email_tools_1.EmailTools.fetchEmails(userId, { maxResults: 5 });
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
            }
            else {
                // Generate AI reply
                const aiResult = await openai_service_1.OpenAIService.complete({
                    prompt: `Generate a professional email reply for: "${input}"`,
                    temperature: 0.7,
                    maxTokens: 300,
                });
                replyBody = aiResult.content;
            }
            const result = await email_tools_1.EmailTools.replyToEmail(userId, emailId, replyBody, true);
            return {
                success: result.success,
                message: result.success ? 'Reply sent successfully!' : 'Failed to send reply',
                data: result,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Reply email handling failed');
            return {
                success: false,
                message: `Failed to reply to email: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }
    /**
     * Handle fetch emails request
     */
    async handleFetchEmails(userId, input, context) {
        try {
            const maxResults = parseInt(input.match(/(\d+)\s+emails?/i)?.[1] || '10');
            const query = input.includes('from') ? input.match(/from\s+([^\s]+)/i)?.[1] : undefined;
            const isUnread = input.includes('unread');
            const isImportant = input.includes('important');
            const labelIds = [];
            if (isUnread)
                labelIds.push('UNREAD');
            if (isImportant)
                labelIds.push('IMPORTANT');
            const result = await email_tools_1.EmailTools.fetchEmails(userId, {
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
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Fetch emails handling failed');
            return {
                success: false,
                message: `Failed to fetch emails: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }
    /**
     * Handle classify emails request
     */
    async handleClassifyEmails(userId, input, context) {
        try {
            const maxResults = parseInt(input.match(/(\d+)\s+emails?/i)?.[1] || '20');
            const result = await email_tools_1.EmailTools.fetchEmails(userId, {
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
                    const classification = await email_tools_1.EmailTools.classifyEmail(userId, email.id);
                    classifications.push({
                        id: email.id,
                        subject: email.subject,
                        from: email.from?.email || 'Unknown',
                        category: classification.category,
                        priority: classification.priority,
                        suggestedAction: classification.suggestedAction,
                    });
                }
                catch (e) {
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
            const byCategory = {};
            for (const c of classifications) {
                if (!byCategory[c.category])
                    byCategory[c.category] = [];
                byCategory[c.category].push(c);
            }
            return {
                success: true,
                message: `Classified ${classifications.length} emails`,
                classifications,
                byCategory,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Classify emails handling failed');
            return {
                success: false,
                message: `Failed to classify emails: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }
    /**
     * Handle email summary request
     */
    async handleEmailSummary(userId, input, context) {
        try {
            const summary = await email_tools_1.EmailTools.getEmailSummary(userId);
            return {
                success: true,
                message: `You have ${summary.totalUnread} unread emails out of ${summary.totalInbox} total in your inbox.`,
                summary,
                recentEmails: summary.recentEmails,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Email summary handling failed');
            return {
                success: false,
                message: `Failed to get email summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }
    /**
     * Handle search emails request
     */
    async handleSearchEmails(userId, input, context) {
        try {
            // Extract search query
            let searchQuery = input;
            const actionWords = ['search', 'find', 'look for', 'search for'];
            for (const word of actionWords) {
                searchQuery = searchQuery.replace(new RegExp(`^.*${word}\\s+`, 'i'), '');
            }
            const result = await email_tools_1.EmailTools.fetchEmails(userId, {
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
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Search emails handling failed');
            return {
                success: false,
                message: `Failed to search emails: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }
    /**
     * Handle delete emails request
     */
    async handleDeleteEmails(userId, input, context) {
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
            const result = await email_tools_1.EmailTools.deleteEmails(userId, emailIds);
            return {
                success: result.success,
                message: result.success
                    ? `Deleted ${result.processedCount} email(s)`
                    : `Failed to delete some emails. Deleted: ${result.processedCount}, Failed: ${result.failedCount}`,
                data: result,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Delete emails handling failed');
            return {
                success: false,
                message: `Failed to delete emails: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }
    /**
     * Handle archive emails request
     */
    async handleArchiveEmails(userId, input, context) {
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
            const result = await email_tools_1.EmailTools.modifyEmailLabels(userId, emailIds, [], ['INBOX']);
            return {
                success: result.success,
                message: result.success
                    ? `Archived ${result.processedCount} email(s)`
                    : 'Failed to archive emails',
                data: result,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Archive emails handling failed');
            return {
                success: false,
                message: `Failed to archive emails: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }
    /**
     * Execute with streaming support
     */
    async executeStream(request, context, onChunk) {
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
        }
        catch (error) {
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
exports.EmailAgent = EmailAgent;
//# sourceMappingURL=email.agent.js.map