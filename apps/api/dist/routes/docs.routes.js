"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// enterprise-ai-agent-platform/apps/api/src/routes/docs.routes.ts
const express_1 = require("express");
const rate_limit_middleware_1 = require("../auth/middleware/rate-limit.middleware");
const usage_types_1 = require("../types/usage.types");
const router = (0, express_1.Router)();
/**
 * GET /api/docs
 * Main API documentation
 */
router.get('/', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), (req, res) => {
    res.json({
        name: 'Enterprise AI Agent Platform API',
        version: '1.0.0',
        description: 'Complete API documentation for the Enterprise AI Agent Platform',
        baseUrl: `${req.protocol}://${req.get('host')}`,
        endpoints: {
            auth: {
                base: '/api/auth',
                description: 'Authentication endpoints',
                endpoints: [
                    { method: 'POST', path: '/register', description: 'Register a new user' },
                    { method: 'POST', path: '/login', description: 'Login with email/password' },
                    { method: 'POST', path: '/refresh', description: 'Refresh access token' },
                    { method: 'POST', path: '/logout', description: 'Logout user' },
                    { method: 'GET', path: '/me', description: 'Get current user' },
                    { method: 'GET', path: '/google', description: 'Google OAuth login' },
                    { method: 'GET', path: '/linkedin', description: 'LinkedIn OAuth login' },
                    { method: 'GET', path: '/facebook', description: 'Facebook OAuth login' },
                    { method: 'GET', path: '/twitter', description: 'X/Twitter OAuth login' },
                ],
            },
            user: {
                base: '/api/user',
                description: 'User management endpoints',
                endpoints: [
                    { method: 'GET', path: '/profile', description: 'Get user profile' },
                    { method: 'PUT', path: '/profile', description: 'Update user profile' },
                    { method: 'GET', path: '/connections', description: 'Get OAuth connections' },
                    { method: 'DELETE', path: '/connections/:provider', description: 'Disconnect OAuth provider' },
                    { method: 'GET', path: '/api-keys', description: 'Get API keys' },
                    { method: 'POST', path: '/api-keys', description: 'Generate new API key' },
                    { method: 'DELETE', path: '/api-keys', description: 'Revoke API key' },
                    { method: 'GET', path: '/notifications', description: 'Get notification preferences' },
                    { method: 'PUT', path: '/notifications', description: 'Update notification preferences' },
                ],
            },
            usage: {
                base: '/api/usage',
                description: 'Usage metering endpoints',
                endpoints: [
                    { method: 'GET', path: '/stats', description: 'Get current usage statistics' },
                    { method: 'GET', path: '/limits', description: 'Get plan limits' },
                    { method: 'GET', path: '/history', description: 'Get historical usage' },
                    { method: 'GET', path: '/percentage', description: 'Get usage percentage' },
                    { method: 'GET', path: '/actions', description: 'Get action costs' },
                    { method: 'GET', path: '/export', description: 'Export usage as CSV' },
                    { method: 'GET', path: '/check-feature/:feature', description: 'Check feature access' },
                    { method: 'GET', path: '/check-limit/:category', description: 'Check usage limit' },
                ],
            },
            billing: {
                base: '/api/billing',
                description: 'Billing and subscription endpoints',
                endpoints: [
                    { method: 'GET', path: '/plans', description: 'Get available plans' },
                    { method: 'POST', path: '/create-checkout', description: 'Create checkout session' },
                    { method: 'POST', path: '/create-portal', description: 'Create customer portal' },
                    { method: 'GET', path: '/subscription', description: 'Get subscription' },
                    { method: 'PUT', path: '/subscription', description: 'Update subscription' },
                    { method: 'DELETE', path: '/subscription', description: 'Cancel subscription' },
                    { method: 'GET', path: '/summary', description: 'Get billing summary' },
                    { method: 'GET', path: '/invoices', description: 'List invoices' },
                    { method: 'GET', path: '/invoices/upcoming', description: 'Get upcoming invoice' },
                    { method: 'GET', path: '/invoices/:id', description: 'Get specific invoice' },
                    { method: 'POST', path: '/validate-coupon', description: 'Validate coupon' },
                ],
            },
            agent: {
                base: '/api/agent',
                description: 'AI Agent execution endpoints',
                endpoints: [
                    { method: 'POST', path: '/execute', description: 'Execute agent (orchestrator)' },
                    { method: 'POST', path: '/stream', description: 'Streaming agent execution' },
                    { method: 'GET', path: '/status', description: 'Get agent status' },
                    { method: 'GET', path: '/agents', description: 'List all agents' },
                    { method: 'GET', path: '/agents/:type/tools', description: 'Get agent tools' },
                    { method: 'POST', path: '/email/execute', description: 'Execute email agent' },
                    { method: 'POST', path: '/drive/execute', description: 'Execute drive agent' },
                    { method: 'POST', path: '/content/execute', description: 'Execute content agent' },
                    { method: 'POST', path: '/social/execute', description: 'Execute social agent' },
                    { method: 'POST', path: '/calendar/execute', description: 'Execute calendar agent' },
                    { method: 'POST', path: '/web/execute', description: 'Execute web agent' },
                    { method: 'POST', path: '/task/execute', description: 'Execute task agent' },
                ],
            },
            admin: {
                base: '/api/admin',
                description: 'Administration endpoints (admin only)',
                endpoints: [
                    { method: 'GET', path: '/users', description: 'List all users' },
                    { method: 'GET', path: '/users/:userId', description: 'Get user details' },
                    { method: 'PUT', path: '/users/:userId', description: 'Update user' },
                    { method: 'DELETE', path: '/users/:userId', description: 'Deactivate user' },
                    { method: 'POST', path: '/users/:userId/reactivate', description: 'Reactivate user' },
                    { method: 'GET', path: '/metrics/platform', description: 'Platform metrics' },
                    { method: 'GET', path: '/metrics/usage', description: 'Usage analytics' },
                    { method: 'GET', path: '/export/users', description: 'Export users CSV' },
                ],
            },
            webhooks: {
                base: '/api/webhooks',
                description: 'Webhook endpoints (public)',
                endpoints: [
                    { method: 'POST', path: '/stripe', description: 'Stripe webhook receiver' },
                    { method: 'GET', path: '/health', description: 'Webhook health check' },
                ],
            },
            health: {
                base: '/health',
                description: 'Health check endpoints',
                endpoints: [
                    { method: 'GET', path: '/health', description: 'Basic health check' },
                    { method: 'GET', path: '/health/ready', description: 'Readiness probe' },
                    { method: 'GET', path: '/health/live', description: 'Liveness probe' },
                    { method: 'GET', path: '/health/metrics', description: 'Detailed metrics' },
                    { method: 'GET', path: '/health/agents', description: 'Agent health' },
                    { method: 'GET', path: '/health/dependencies', description: 'Dependency checks' },
                ],
            },
        },
        authentication: {
            type: 'Bearer Token',
            header: 'Authorization: Bearer <your_jwt_token>',
            alternative: 'X-API-Key: <your_api_key>',
            note: 'API keys are available on PROFESSIONAL plan and above',
        },
        rateLimiting: {
            unauthenticated: '100 requests per minute',
            authenticated: '1000 requests per minute',
            apiKey: '2000 requests per minute',
            headers: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
        },
        errors: {
            format: {
                success: false,
                error: 'Error message',
                code: 'ERROR_CODE',
            },
            commonCodes: [
                { code: 'UNAUTHORIZED', status: 401, description: 'Authentication required' },
                { code: 'FORBIDDEN', status: 403, description: 'Insufficient permissions' },
                { code: 'PLAN_LIMIT_EXCEEDED', status: 402, description: 'Plan limit reached' },
                { code: 'USAGE_LIMIT_REACHED', status: 429, description: 'Usage limit exceeded' },
                { code: 'NOT_FOUND', status: 404, description: 'Resource not found' },
                { code: 'VALIDATION_ERROR', status: 400, description: 'Invalid input' },
            ],
        },
    });
});
/**
 * GET /api/docs/plans
 * Detailed plan information
 */
router.get('/plans', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), (req, res) => {
    const plans = Object.entries(usage_types_1.PLAN_LIMITS_CONFIG).map(([id, config]) => ({
        id,
        name: id === 'FREE' ? 'Free' : id === 'STARTER' ? 'Starter' : id === 'PROFESSIONAL' ? 'Professional' : 'Enterprise',
        limits: config,
        features: usage_types_1.FEATURE_ACCESS_MATRIX[id] || usage_types_1.FEATURE_ACCESS_MATRIX.FREE,
        pricing: {
            monthly: id === 'FREE' ? 0 : id === 'STARTER' ? 29 : id === 'PROFESSIONAL' ? 99 : 499,
            yearly: id === 'FREE' ? 0 : id === 'STARTER' ? 278.40 : id === 'PROFESSIONAL' ? 950.40 : 4790.40,
            currency: 'USD',
        },
    }));
    res.json({
        success: true,
        data: plans,
    });
});
/**
 * GET /api/docs/actions
 * Detailed action costs information
 */
router.get('/actions', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), (req, res) => {
    const actions = Object.entries(usage_types_1.ACTION_COSTS).map(([type, config]) => ({
        actionType: type,
        category: config.category,
        baseCost: config.baseCost,
        requiresApiCall: config.requiresApiCall,
        tokenMultiplier: config.tokenMultiplier,
        description: getActionDescription(type),
    }));
    res.json({
        success: true,
        data: actions,
    });
});
/**
 * GET /api/docs/agents
 * Detailed agent information
 */
router.get('/agents', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), (req, res) => {
    const agents = [
        {
            type: 'email',
            name: 'Email Agent',
            description: 'Manages Gmail emails: read, send, reply, organize with labels',
            tools: [
                { name: 'get_emails', description: 'Fetch emails from Gmail' },
                { name: 'send_email', description: 'Send email to recipients' },
                { name: 'reply_to_email', description: 'Reply to existing email' },
                { name: 'mark_as_read', description: 'Mark emails as read' },
                { name: 'create_draft', description: 'Create email draft' },
                { name: 'classify_email', description: 'Classify email urgency' },
            ],
            requiredPlan: 'FREE',
        },
        {
            type: 'drive',
            name: 'Drive Agent',
            description: 'Manages Google Drive files: upload, download, search, share',
            tools: [
                { name: 'list_files', description: 'List files from Drive' },
                { name: 'search_files', description: 'Search files by query' },
                { name: 'upload_file', description: 'Upload file to Drive' },
                { name: 'download_file', description: 'Download file from Drive' },
                { name: 'share_file', description: 'Share file with user' },
                { name: 'create_folder', description: 'Create new folder' },
            ],
            requiredPlan: 'STARTER',
        },
        {
            type: 'content',
            name: 'Content Agent',
            description: 'Generates content using AI: text, images, videos',
            tools: [
                { name: 'generate_text', description: 'Generate text content' },
                { name: 'generate_image', description: 'Generate image from prompt' },
                { name: 'generate_video', description: 'Generate video (Enterprise)' },
                { name: 'edit_content', description: 'Edit existing content' },
                { name: 'analyze_content', description: 'Analyze content quality' },
            ],
            requiredPlan: 'FREE for text, PROFESSIONAL for images, ENTERPRISE for video',
        },
        {
            type: 'social',
            name: 'Social Agent',
            description: 'Posts to social media: LinkedIn, Instagram, Facebook, X',
            tools: [
                { name: 'post_to_linkedin', description: 'Post to LinkedIn' },
                { name: 'post_to_instagram', description: 'Post to Instagram' },
                { name: 'post_to_facebook', description: 'Post to Facebook' },
                { name: 'post_to_x', description: 'Post to X/Twitter' },
                { name: 'schedule_post', description: 'Schedule future post' },
                { name: 'get_analytics', description: 'Get post analytics' },
            ],
            requiredPlan: 'STARTER',
        },
        {
            type: 'calendar',
            name: 'Calendar Agent',
            description: 'Manages Google Calendar: events, scheduling, availability',
            tools: [
                { name: 'list_events', description: 'List calendar events' },
                { name: 'create_event', description: 'Create new event' },
                { name: 'update_event', description: 'Update existing event' },
                { name: 'get_free_busy', description: 'Get availability' },
                { name: 'smart_schedule', description: 'Auto-schedule meeting' },
            ],
            requiredPlan: 'FREE',
        },
        {
            type: 'web',
            name: 'Web Agent',
            description: 'Web search, research, weather, news',
            tools: [
                { name: 'search_web', description: 'Search the web' },
                { name: 'fetch_page', description: 'Fetch webpage content' },
                { name: 'get_weather', description: 'Get weather forecast' },
                { name: 'research_with_perplexity', description: 'Deep research' },
                { name: 'extract_data', description: 'Extract structured data' },
            ],
            requiredPlan: 'FREE',
        },
        {
            type: 'task',
            name: 'Task Agent',
            description: 'Task management: Google Tasks, Asana, Monday.com',
            tools: [
                { name: 'create_task', description: 'Create new task' },
                { name: 'update_task', description: 'Update task' },
                { name: 'list_tasks', description: 'List tasks' },
                { name: 'get_task_summary', description: 'Get task statistics' },
                { name: 'batch_create_tasks', description: 'Create multiple tasks' },
            ],
            requiredPlan: 'STARTER',
        },
        {
            type: 'orchestrator',
            name: 'Ultimate AI Agent',
            description: 'Central orchestrator coordinating all agents',
            tools: [
                { name: 'delegate_to_agent', description: 'Delegate to specialized agent' },
                { name: 'classify_intent', description: 'Classify user intent' },
                { name: 'retrieve_memory', description: 'Retrieve relevant memories' },
                { name: 'store_memory', description: 'Store important information' },
            ],
            requiredPlan: 'FREE',
        },
    ];
    res.json({
        success: true,
        data: agents,
    });
});
/**
 * GET /api/docs/webhooks
 * Webhook documentation
 */
router.get('/webhooks', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), (req, res) => {
    res.json({
        success: true,
        data: {
            stripe: {
                endpoint: 'POST /api/webhooks/stripe',
                description: 'Stripe webhook receiver for payment events',
                events: [
                    'customer.subscription.created',
                    'customer.subscription.updated',
                    'customer.subscription.deleted',
                    'invoice.paid',
                    'invoice.payment_failed',
                    'checkout.session.completed',
                ],
                signature: 'Stripe-Signature header required',
                idempotency: 'Events are processed idempotently using event ID',
            },
            setup: {
                url: `${process.env.APP_URL || 'https://yourdomain.com'}/api/webhooks/stripe`,
                secret: process.env.STRIPE_WEBHOOK_SECRET,
            },
        },
    });
});
/**
 * GET /api/docs/errors
 * Error code reference
 */
router.get('/errors', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), (req, res) => {
    res.json({
        success: true,
        data: {
            auth: [
                { code: 'UNAUTHORIZED', status: 401, message: 'Authentication required' },
                { code: 'INVALID_TOKEN', status: 401, message: 'Invalid or expired token' },
                { code: 'INVALID_CREDENTIALS', status: 401, message: 'Invalid email or password' },
                { code: 'TOKEN_EXPIRED', status: 401, message: 'Token has expired' },
            ],
            billing: [
                { code: 'PLAN_LIMIT_EXCEEDED', status: 402, message: 'Feature not available on current plan' },
                { code: 'USAGE_LIMIT_REACHED', status: 429, message: 'Monthly usage limit exceeded' },
                { code: 'INVOICE_NOT_FOUND', status: 404, message: 'Invoice not found' },
                { code: 'SUBSCRIPTION_NOT_FOUND', status: 404, message: 'Subscription not found' },
            ],
            validation: [
                { code: 'VALIDATION_ERROR', status: 400, message: 'Invalid input data' },
                { code: 'MISSING_FIELD', status: 400, message: 'Required field missing' },
                { code: 'INVALID_EMAIL', status: 400, message: 'Invalid email format' },
            ],
            resource: [
                { code: 'NOT_FOUND', status: 404, message: 'Resource not found' },
                { code: 'USER_NOT_FOUND', status: 404, message: 'User not found' },
                { code: 'AGENT_NOT_FOUND', status: 404, message: 'Agent not found' },
            ],
            rateLimit: [
                { code: 'RATE_LIMIT_EXCEEDED', status: 429, message: 'Too many requests' },
                { code: 'LOGIN_RATE_LIMIT', status: 429, message: 'Too many login attempts' },
            ],
            server: [
                { code: 'INTERNAL_ERROR', status: 500, message: 'Internal server error' },
                { code: 'SERVICE_UNAVAILABLE', status: 503, message: 'Service temporarily unavailable' },
            ],
        },
    });
});
/**
 * Helper function to get action description
 */
function getActionDescription(actionType) {
    const descriptions = {
        AI_EMAIL_PROCESS: 'Process and analyze an email using AI',
        AI_EMAIL_REPLY: 'Generate an AI-powered reply to an email',
        AI_CONTENT_TEXT: 'Generate text content using AI',
        AI_CONTENT_IMAGE: 'Generate image using DALL-E or Stable Diffusion',
        AI_CONTENT_VIDEO: 'Generate video using Runway or Pika',
        AI_SOCIAL_POST: 'Generate social media post content',
        AI_CALENDAR_SCHEDULE: 'AI-powered calendar scheduling',
        AI_TASK_CREATE: 'Create task using AI assistance',
        AI_WEB_SEARCH: 'Perform web search using AI',
        AI_ORCHESTRATOR: 'Orchestrate multiple agents for complex tasks',
        API_EMAIL_FETCH: 'Fetch emails from Gmail API',
        API_EMAIL_SEND: 'Send email via Gmail API',
        API_DRIVE_UPLOAD: 'Upload file to Google Drive',
        API_DRIVE_DOWNLOAD: 'Download file from Google Drive',
        API_SOCIAL_POST: 'Post to social media platform',
        API_CALENDAR_GET: 'Get calendar events from Google Calendar',
        API_CALENDAR_CREATE: 'Create calendar event in Google Calendar',
        API_TASK_GET: 'Get tasks from task provider',
        API_TASK_UPDATE: 'Update task in task provider',
        API_WEB_SCRAPE: 'Scrape and extract webpage content',
    };
    return descriptions[actionType] || 'Standard API operation';
}
exports.default = router;
//# sourceMappingURL=docs.routes.js.map