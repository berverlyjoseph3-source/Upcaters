"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// enterprise-ai-agent-platform/apps/api/src/routes/index.ts
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth.routes"));
const user_routes_1 = __importDefault(require("./user.routes"));
const usage_routes_1 = __importDefault(require("./usage.routes"));
const agent_routes_1 = __importDefault(require("./agent.routes"));
const admin_routes_1 = __importDefault(require("./admin.routes"));
const health_routes_1 = __importDefault(require("../routes/health.routes"));
const docs_routes_1 = __importDefault(require("./docs.routes"));
const billing_routes_1 = __importDefault(require("../billing/routes/billing.routes"));
const webhook_routes_1 = __importDefault(require("../billing/routes/webhook.routes"));
const router = (0, express_1.Router)();
/**
 * API Routes Index
 * All routes are prefixed with /api
 * Health routes are at root level /health
 */
// Health routes (no /api prefix)
router.use('/health', health_routes_1.default);
// API v1 routes
router.use('/api/auth', auth_routes_1.default);
router.use('/api/user', user_routes_1.default);
router.use('/api/usage', usage_routes_1.default);
router.use('/api/agent', agent_routes_1.default);
router.use('/api/admin', admin_routes_1.default);
router.use('/api/billing', billing_routes_1.default);
router.use('/api/webhooks', webhook_routes_1.default);
router.use('/api/docs', docs_routes_1.default);
/**
 * GET /api
 * API information root
 */
router.get('/api', (req, res) => {
    res.json({
        name: 'Enterprise AI Agent Platform API',
        version: '1.0.0',
        documentation: '/api/docs',
        health: '/health',
        status: 'operational',
        endpoints: {
            auth: '/api/auth',
            user: '/api/user',
            usage: '/api/usage',
            agent: '/api/agent',
            billing: '/api/billing',
            admin: '/api/admin',
            docs: '/api/docs',
        },
    });
});
/**
 * GET /api/version
 * API version information
 */
router.get('/api/version', (req, res) => {
    res.json({
        version: '1.0.0',
        build: process.env.BUILD_NUMBER || 'dev',
        environment: process.env.NODE_ENV || 'development',
        apiVersion: 'v1',
        releasedAt: '2024-01-15',
        deprecations: [],
    });
});
exports.default = router;
//# sourceMappingURL=index.js.map