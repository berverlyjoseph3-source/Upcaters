// enterprise-ai-agent-platform/apps/api/src/routes/index.ts
import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import usageRoutes from './usage.routes';
import agentRoutes from './agent.routes';
import adminRoutes from './admin.routes';
import healthRoutes from '../routes/health.routes';
import docsRoutes from './docs.routes';
import billingRoutes from '../billing/routes/billing.routes';
import webhookRoutes from '../billing/routes/webhook.routes';

const router = Router();

/**
 * API Routes Index
 * All routes are prefixed with /api
 * Health routes are at root level /health
 */

// Health routes (no /api prefix)
router.use('/health', healthRoutes);

// API v1 routes
router.use('/api/auth', authRoutes);
router.use('/api/user', userRoutes);
router.use('/api/usage', usageRoutes);
router.use('/api/agent', agentRoutes);
router.use('/api/admin', adminRoutes);
router.use('/api/billing', billingRoutes);
router.use('/api/webhooks', webhookRoutes);
router.use('/api/docs', docsRoutes);

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

export default router;