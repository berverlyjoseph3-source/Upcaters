// enterprise-ai-agent-platform/apps/api/src/config/env-validator.ts
import { z } from 'zod';
import { logger } from '../utils/logger';

// ============================================
// Environment Schema Definitions
// ============================================

// Core Application Schema
const CoreSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  BUILD_NUMBER: z.string().optional().default('1'),
});

// Database Schema - Redis now REQUIRED in production
const DatabaseSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL').min(1),
  DATABASE_POOL_MIN: z.coerce.number().int().min(1).max(50).default(2),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(20),
  DATABASE_IDLE_TIMEOUT: z.coerce.number().int().min(1000).max(60000).default(10000),
  DATABASE_CONNECTION_TIMEOUT: z.coerce.number().int().min(1000).max(30000).default(5000),
  
  // Redis - Enhanced validation
  REDIS_URL: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_TLS: z.coerce.boolean().default(false),
  REDIS_KEY_PREFIX: z.string().default('aiagent:'),
  REDIS_MAX_RETRIES: z.coerce.number().int().min(1).max(10).default(3),
  REDIS_RETRY_DELAY_MS: z.coerce.number().int().min(100).max(5000).default(1000),
  
  // MongoDB - For vector storage
  MONGODB_URL: z.string().optional(),
  MONGODB_REPLICA_SET: z.string().optional().default('rs0'),
  MONGODB_SSL: z.coerce.boolean().default(false),
});

// JWT & Security Schema - Enhanced
const JwtSchema = z.object({
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  ENCRYPTION_KEY: z.string()
    .length(64, 'ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)')
    .regex(/^[0-9a-fA-F]+$/, 'ENCRYPTION_KEY must be hex encoded'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('30d'),
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).default(100),
  RATE_LIMIT_AUTHENTICATED_MAX: z.coerce.number().int().min(1).default(1000),
  RATE_LIMIT_API_KEY_MAX: z.coerce.number().int().min(1).default(2000),
  
  // Login security
  MAX_LOGIN_ATTEMPTS: z.coerce.number().int().min(3).max(20).default(5),
  LOGIN_LOCKOUT_MINUTES: z.coerce.number().int().min(5).max(480).default(30),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),
  
  // Session
  SESSION_TIMEOUT_MINUTES: z.coerce.number().int().min(5).max(480).default(30),
  MAX_CONCURRENT_SESSIONS: z.coerce.number().int().min(1).max(20).default(5),
});

// AI Providers Schema - Enhanced with fallback chain
const AISchemaBase = z.object({
  // OpenAI (Primary)
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_ORG_ID: z.string().optional(),
  OPENAI_TIMEOUT: z.coerce.number().int().min(5000).max(120000).default(30000),
  OPENAI_MAX_RETRIES: z.coerce.number().int().min(1).max(10).default(3),
  
  // Anthropic (Fallback 1)
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_TIMEOUT: z.coerce.number().int().min(5000).max(120000).default(60000),
  ANTHROPIC_MAX_RETRIES: z.coerce.number().int().min(1).max(10).default(3),
  
  // Google Gemini (Fallback 2)
  GOOGLE_AI_API_KEY: z.string().optional(),
  GOOGLE_AI_TIMEOUT: z.coerce.number().int().min(5000).max(120000).default(30000),
  GOOGLE_AI_MAX_RETRIES: z.coerce.number().int().min(1).max(10).default(3),
  
  // AI Provider Fallback Chain (comma-separated: openai,anthropic,google)
  AI_PROVIDER_FALLBACK_CHAIN: z.string().default('openai,anthropic,google'),
  DEFAULT_AI_MODEL: z.string().default('gpt-4-turbo-preview'),
  
  // Embedding Configuration
  EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  EMBEDDING_CACHE_TTL: z.coerce.number().int().min(60).max(86400).default(3600),
  EMBEDDING_BATCH_SIZE: z.coerce.number().int().min(1).max(100).default(10),
  
  // Model Fallback Configuration
  MODEL_FALLBACK_ENABLED: z.coerce.boolean().default(true),
  MODEL_FALLBACK_CHAIN: z.string().default('openai,anthropic,gemini'),
});
// NOTE: the "at least one AI provider key" validation that used to live in a
// .refine() here is now applied directly on EnvironmentSchema below —
// .refine() wraps a schema in ZodEffects, which has no .shape property,
// so keeping it here broke the ...AISchema.shape spread used to compose
// EnvironmentSchema.

// OAuth Schema - Enhanced for multi-platform
const OAuthSchema = z.object({
  // Google
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  
  // LinkedIn
  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),
  LINKEDIN_REDIRECT_URI: z.string().url().optional(),
  
  // Facebook
  FACEBOOK_APP_ID: z.string().optional(),
  FACEBOOK_APP_SECRET: z.string().optional(),
  FACEBOOK_REDIRECT_URI: z.string().url().optional(),
  
  // X/Twitter
  TWITTER_CLIENT_ID: z.string().optional(),
  TWITTER_CLIENT_SECRET: z.string().optional(),
  TWITTER_REDIRECT_URI: z.string().url().optional(),
  TWITTER_API_KEY: z.string().optional(),
  TWITTER_API_SECRET: z.string().optional(),
  TWITTER_BEARER_TOKEN: z.string().optional(),
  
  // Microsoft 365
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_REDIRECT_URI: z.string().url().optional(),
});

// Stripe Schema - Updated for new pricing
const StripeSchema = z.object({
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_API_VERSION: z.string().default('2024-12-18.acacia'),
  
  // Updated Pricing Products (2025 pricing)
  STRIPE_STARTER_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_STARTER_YEARLY_PRICE_ID: z.string().optional(),
  STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_PROFESSIONAL_YEARLY_PRICE_ID: z.string().optional(),
  STRIPE_ENTERPRISE_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_ENTERPRISE_YEARLY_PRICE_ID: z.string().optional(),
  
  // Overage Prices
  STRIPE_AI_ACTIONS_OVERAGE_PRICE_ID: z.string().optional(),
  STRIPE_API_CALLS_OVERAGE_PRICE_ID: z.string().optional(),
  STRIPE_IMAGE_OVERAGE_PRICE_ID: z.string().optional(),
  STRIPE_VIDEO_OVERAGE_PRICE_ID: z.string().optional(),
  
  // Billing Configuration
  STRIPE_USAGE_REPORTING_ENABLED: z.coerce.boolean().default(true),
  STRIPE_USAGE_REPORTING_INTERVAL: z.coerce.number().int().min(3600).default(86400),
  BILLING_RESET_CRON: z.string().default('0 0 1 * *'),
  WEEKLY_DIGEST_CRON: z.string().default('0 9 * * 1'),
});

// Email Schema
const EmailSchema = z.object({
  SENDGRID_API_KEY: z.string().optional(),
  FROM_EMAIL: z.string().email('FROM_EMAIL must be a valid email').optional(),
  FROM_NAME: z.string().default('AI Agent Platform'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.coerce.boolean().default(false),
  
  // Email notifications
  USAGE_WARNING_EMAIL_ENABLED: z.coerce.boolean().default(true),
  USAGE_CRITICAL_EMAIL_ENABLED: z.coerce.boolean().default(true),
  WEEKLY_DIGEST_ENABLED: z.coerce.boolean().default(true),
});

// Web Search APIs
const WebSearchSchema = z.object({
  BRAVE_SEARCH_API_KEY: z.string().optional(),
  OPENWEATHERMAP_API_KEY: z.string().optional(),
  PERPLEXITY_API_KEY: z.string().optional(),
});

// Task Management APIs
const TaskManagementSchema = z.object({
  ASANA_ACCESS_TOKEN: z.string().optional(),
  MONDAY_API_KEY: z.string().optional(),
});

// Monitoring Schema
const MonitoringSchema = z.object({
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
  SENTRY_ENVIRONMENT: z.string().optional(),
  DATADOG_API_KEY: z.string().optional(),
  DATADOG_APP_KEY: z.string().optional(),
  PROMETHEUS_ENABLED: z.coerce.boolean().default(true),
});

// NEW: Orchestrator Configuration Schema
const OrchestratorSchema = z.object({
  // Execution Control
  MAX_CONCURRENT_EXECUTIONS: z.coerce.number().int().min(1).max(100).default(10),
  EXECUTION_TIMEOUT_MS: z.coerce.number().int().min(30000).max(600000).default(300000),
  DEFAULT_STEP_TIMEOUT_MS: z.coerce.number().int().min(10000).max(120000).default(30000),
  MAX_STEPS_PER_PLAN: z.coerce.number().int().min(1).max(50).default(10),
  MAX_RETRIES_PER_STEP: z.coerce.number().int().min(1).max(10).default(3),
  MAX_PLAN_RETRIES: z.coerce.number().int().min(1).max(5).default(2),
  
  // Retry Configuration
  RETRY_BASE_DELAY_MS: z.coerce.number().int().min(100).max(10000).default(1000),
  RETRY_MAX_DELAY_MS: z.coerce.number().int().min(1000).max(60000).default(30000),
  RETRY_MULTIPLIER: z.coerce.number().min(1.5).max(4).default(2),
  
  // Circuit Breaker
  ENABLE_CIRCUIT_BREAKER: z.coerce.boolean().default(true),
  CIRCUIT_BREAKER_THRESHOLD: z.coerce.number().int().min(2).max(20).default(5),
  CIRCUIT_BREAKER_TIMEOUT_MS: z.coerce.number().int().min(10000).max(300000).default(60000),
  
  // Backpressure
  ENABLE_BACKPRESSURE: z.coerce.boolean().default(true),
  MAX_PENDING_EXECUTIONS: z.coerce.number().int().min(10).max(1000).default(100),
  
  // Memory Management
  ENABLE_MEMORY_CONSOLIDATION: z.coerce.boolean().default(true),
  ENABLE_VECTOR_SEARCH: z.coerce.boolean().default(true),
  MAX_SHORT_TERM_MEMORIES: z.coerce.number().int().min(10).max(200).default(50),
  SHORT_TERM_TTL_SECONDS: z.coerce.number().int().min(300).max(86400).default(3600),
  LONG_TERM_IMPORTANCE_THRESHOLD: z.coerce.number().min(0.1).max(1).default(0.7),
  
  // Pre-Execution Checks
  ENABLE_PRE_EXECUTION_COST_CHECK: z.coerce.boolean().default(true),
  ENABLE_PLAN_OPTIMIZATION: z.coerce.boolean().default(true),
  ENABLE_AUTOMATIC_FALLBACKS: z.coerce.boolean().default(true),
  
  // Execution Persistence
  ENABLE_EXECUTION_PERSISTENCE: z.coerce.boolean().default(true),
  PERSISTENCE_CLEANUP_DAYS: z.coerce.number().int().min(1).max(90).default(7),
  
  // Streaming
  ENABLE_STREAMING: z.coerce.boolean().default(true),
  STREAMING_CHUNK_DELAY_MS: z.coerce.number().int().min(10).max(500).default(50),
  MAX_CHUNK_SIZE: z.coerce.number().int().min(50).max(500).default(200),
  
  // Reflection
  ENABLE_EXECUTION_REFLECTION: z.coerce.boolean().default(true),
  REFLECTION_MODEL: z.string().default('gpt-4-turbo-preview'),
  
  // Rate Limiting (Orchestrator Level)
  ORCHESTRATOR_REQUESTS_PER_MINUTE: z.coerce.number().int().min(10).max(1000).default(60),
  ORCHESTRATOR_TOKENS_PER_MINUTE: z.coerce.number().int().min(1000).max(500000).default(90000),
  ORCHESTRATOR_COST_PER_HOUR: z.coerce.number().min(1).max(1000).default(50),
});

// NEW: Intent Classifier Configuration Schema
const IntentClassifierSchema = z.object({
  ENABLE_INTENT_LEARNING: z.coerce.boolean().default(true),
  INTENT_CONFIDENCE_THRESHOLD: z.coerce.number().min(0.1).max(1).default(0.6),
  INTENT_MAX_ALTERNATIVES: z.coerce.number().int().min(1).max(10).default(3),
  INTENT_CACHE_TTL: z.coerce.number().int().min(60).max(86400).default(3600),
  INTENT_CACHE_ENABLED: z.coerce.boolean().default(true),
  INTENT_CLASSIFICATION_METHOD: z.enum(['keyword', 'ai', 'hybrid', 'auto']).default('auto'),
  INTENT_AMBIGUITY_DETECTION: z.coerce.boolean().default(true),
  INTENT_MULTI_INTENT_DETECTION: z.coerce.boolean().default(true),
  MAX_CORRECTION_HISTORY: z.coerce.number().int().min(100).max(10000).default(1000),
  CORRECTION_LEARNING_ENABLED: z.coerce.boolean().default(true),
  CORRECTION_SIMILARITY_THRESHOLD: z.coerce.number().min(0.5).max(1).default(0.7),
});

// Feature Flags Schema - Enhanced
const FeatureFlagsSchema = z.object({
  // Core Features
  ENABLE_REGISTRATION: z.coerce.boolean().default(true),
  ENABLE_MAINTENANCE_MODE: z.coerce.boolean().default(false),
  MAINTENANCE_MESSAGE: z.string().optional(),
  
  // Agent Features
  ENABLE_VIDEO_GENERATION: z.coerce.boolean().default(false),
  ENABLE_WHITE_LABEL: z.coerce.boolean().default(false),
  ENABLE_CUSTOM_INTEGRATIONS: z.coerce.boolean().default(false),
  
  // AI Features
  ENABLE_AI_CONTENT_MODERATION: z.coerce.boolean().default(true),
  ENABLE_AI_IMAGE_GENERATION: z.coerce.boolean().default(true),
  ENABLE_AI_VIDEO_GENERATION: z.coerce.boolean().default(false),
  
  // Security Features
  ENABLE_EMAIL_VERIFICATION: z.coerce.boolean().default(false),
  ENABLE_TWO_FACTOR: z.coerce.boolean().default(false),
  ENABLE_API_RATE_LIMITING: z.coerce.boolean().default(true),
  ENABLE_CSRF_PROTECTION: z.coerce.boolean().default(true),
  
  // Orchestrator Features
  ENABLE_ORCHESTRATOR: z.coerce.boolean().default(true),
  ENABLE_EXECUTION_LOGGING: z.coerce.boolean().default(true),
  ENABLE_PERFORMANCE_METRICS: z.coerce.boolean().default(true),
  
  // Memory Features
  ENABLE_MEMORY_DEDUPLICATION: z.coerce.boolean().default(true),
  ENABLE_MEMORY_COMPRESSION: z.coerce.boolean().default(true),
  ENABLE_MEMORY_RELATIONSHIPS: z.coerce.boolean().default(true),
  
  // Billing Features
  ENABLE_BILLING: z.coerce.boolean().default(true),
  ENABLE_OVERAGE_TRACKING: z.coerce.boolean().default(true),
  ENABLE_UPGRADE_RECOMMENDATIONS: z.coerce.boolean().default(true),
  
  // Analytics
  ENABLE_ANALYTICS: z.coerce.boolean().default(true),
  ENABLE_USAGE_FORECASTING: z.coerce.boolean().default(true),
  
  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:3001'),
  TRUST_PROXY: z.coerce.boolean().default(false),
  
  // Debug
  ENABLE_DEBUG_MODE: z.coerce.boolean().default(false),
  DEBUG_NAMESPACE: z.string().default('ai-agent:*'),
  ENABLE_API_DOCS: z.coerce.boolean().default(true),
});

// ============================================
// Plan Limits Schema
// ============================================

const PlanLimitsSchema = z.object({
  // Free Plan
  AI_ACTIONS_LIMIT_FREE: z.coerce.number().int().default(50),
  API_CALLS_LIMIT_FREE: z.coerce.number().int().default(100),
  TEAM_MEMBERS_LIMIT_FREE: z.coerce.number().int().default(1),
  STORAGE_GB_LIMIT_FREE: z.coerce.number().default(0.1),
  
  // Starter Plan
  AI_ACTIONS_LIMIT_STARTER: z.coerce.number().int().default(500),
  API_CALLS_LIMIT_STARTER: z.coerce.number().int().default(2000),
  TEAM_MEMBERS_LIMIT_STARTER: z.coerce.number().int().default(3),
  STORAGE_GB_LIMIT_STARTER: z.coerce.number().int().default(1),
  
  // Professional Plan
  AI_ACTIONS_LIMIT_PROFESSIONAL: z.coerce.number().int().default(2500),
  API_CALLS_LIMIT_PROFESSIONAL: z.coerce.number().int().default(15000),
  TEAM_MEMBERS_LIMIT_PROFESSIONAL: z.coerce.number().int().default(10),
  STORAGE_GB_LIMIT_PROFESSIONAL: z.coerce.number().int().default(10),
  
  // Enterprise Plan
  AI_ACTIONS_LIMIT_ENTERPRISE: z.coerce.number().int().default(10000),
  API_CALLS_LIMIT_ENTERPRISE: z.coerce.number().int().default(50000),
  TEAM_MEMBERS_LIMIT_ENTERPRISE: z.coerce.number().int().default(100),
  STORAGE_GB_LIMIT_ENTERPRISE: z.coerce.number().int().default(100),
  
  // Default Plan for new users
  DEFAULT_PLAN: z.enum(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']).default('FREE'),
  TRIAL_DAYS: z.coerce.number().int().min(0).max(30).default(14),
});

// ============================================
// Complete Environment Schema
// ============================================

const EnvironmentSchema = z.object({
  // Sub-schemas
  ...CoreSchema.shape,
  ...DatabaseSchema.shape,
  ...JwtSchema.shape,
  ...AISchemaBase.shape,
  ...OAuthSchema.shape,
  ...StripeSchema.shape,
  ...EmailSchema.shape,
  ...WebSearchSchema.shape,
  ...TaskManagementSchema.shape,
  ...MonitoringSchema.shape,
  ...OrchestratorSchema.shape,
  ...IntentClassifierSchema.shape,
  ...FeatureFlagsSchema.shape,
  ...PlanLimitsSchema.shape,
}).refine(
  data => data.OPENAI_API_KEY || data.ANTHROPIC_API_KEY || data.GOOGLE_AI_API_KEY,
  { message: 'At least one AI provider API key must be configured (OPENAI, ANTHROPIC, or GOOGLE)' }
);

// ============================================
// Production-Specific Requirements
// ============================================

const ProductionRequirements = z.object({
  NODE_ENV: z.literal('production'),
  
  // Enhanced security requirements
  JWT_SECRET: z.string().min(64, 'JWT_SECRET must be at least 64 characters in production'),
  JWT_REFRESH_SECRET: z.string().min(64, 'JWT_REFRESH_SECRET must be at least 64 characters in production'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(12, 'BCRYPT_ROUNDS must be at least 12 in production'),
  
  // Redis required in production
  REDIS_URL: z.string().min(1, 'REDIS_URL is required in production'),
  
  // CORS must not include localhost
  CORS_ORIGINS: z.string().refine(
    val => !val.includes('localhost'),
    'CORS_ORIGINS must not include localhost in production'
  ),
  
  // Trust proxy required
  TRUST_PROXY: z.literal(true, { message: 'TRUST_PROXY must be true in production' }),
  
  // Logging should be minimal
  LOG_LEVEL: z.enum(['info', 'warn', 'error']).default('info'),
  
  // Monitoring required
  SENTRY_DSN: z.string().url('SENTRY_DSN is required in production').optional(),
  
  // Stripe required if billing enabled
  ENABLE_BILLING: z.coerce.boolean().default(true),
  
  // At least one AI provider required
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
}).refine(
  data => {
    if (data.ENABLE_BILLING) {
      return process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET;
    }
    return true;
  },
  { message: 'STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are required when billing is enabled' }
);

// ============================================
// Staging-Specific Requirements
// ============================================

const StagingRequirements = z.object({
  NODE_ENV: z.literal('staging'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  REDIS_URL: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('debug'),
  CORS_ORIGINS: z.string(),
});

// ============================================
// Validation Result Types
// ============================================

interface ValidationWarning {
  variable: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
  category?: 'security' | 'performance' | 'reliability' | 'cost' | 'compliance';
}

interface ValidationResult {
  success: boolean;
  errors: Array<{ path: string; message: string; category: string }>;
  warnings: ValidationWarning[];
  missingCritical: string[];
  missingOptional: string[];
  recommendations: string[];
  environmentSummary: Record<string, any>;
}

// ============================================
// Environment Validator Class
// ============================================

export class EnvironmentValidator {
  private static validated = false;
  private static validationCache: ValidationResult | null = null;

  /**
   * Validate all environment variables on startup
   */
  static validate(forceRevalidate: boolean = false): ValidationResult {
    if (this.validated && !forceRevalidate && this.validationCache) {
      logger.debug('Environment already validated, returning cached result');
      return this.validationCache;
    }

    logger.info('🔍 Validating environment configuration...');

    const result: ValidationResult = {
      success: true,
      errors: [],
      warnings: [],
      missingCritical: [],
      missingOptional: [],
      recommendations: [],
      environmentSummary: {},
    };

    try {
      // Step 1: Parse and validate base schema
      const parsed = EnvironmentSchema.safeParse(process.env);

      if (!parsed.success) {
        for (const error of parsed.error.errors) {
          const path = error.path.join('.');
          result.errors.push({
            path,
            message: error.message,
            category: this.categorizeError(path),
          });

          if (this.isCriticalVariable(path)) {
            result.missingCritical.push(path);
          }
        }
        result.success = result.errors.length === 0;
      }

      // Step 2: Environment-specific validation
      const environment = process.env.NODE_ENV || 'development';
      
      if (environment === 'production') {
        const prodResult = ProductionRequirements.safeParse(process.env);
        if (!prodResult.success) {
          for (const error of prodResult.error.errors) {
            result.errors.push({
              path: error.path.join('.'),
              message: error.message,
              category: 'production_requirement',
            });
          }
          result.success = false;
        }
      } else if (environment === 'staging') {
        const stagingResult = StagingRequirements.safeParse(process.env);
        if (!stagingResult.success) {
          for (const error of stagingResult.error.errors) {
            result.errors.push({
              path: error.path.join('.'),
              message: error.message,
              category: 'staging_requirement',
            });
          }
        }
      }

      // Step 3: Generate warnings
      result.warnings = this.generateWarnings(process.env, environment);

      // Step 4: Check optional variables
      result.missingOptional = this.checkOptionalVariables(process.env);

      // Step 5: Generate recommendations
      result.recommendations = this.generateRecommendations(process.env, environment);

      // Step 6: Build environment summary
      result.environmentSummary = this.buildEnvironmentSummary(process.env);

      this.validated = true;
      this.validationCache = result;
      this.logValidationResults(result);

      return result;
    } catch (error) {
      logger.error({ error }, '❌ Environment validation failed catastrophically');
      return {
        success: false,
        errors: [
          {
            path: 'unknown',
            message: 'Environment validation failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
            category: 'system',
          },
        ],
        warnings: [],
        missingCritical: ['ENVIRONMENT_VALIDATION_FAILED'],
        missingOptional: [],
        recommendations: ['Check system logs for details'],
        environmentSummary: {},
      };
    }
  }

  /**
   * Categorize an error based on the variable path
   */
  private static categorizeError(path: string): string {
    if (path.includes('DATABASE_URL') || path.includes('REDIS') || path.includes('MONGODB'))
      return 'database';
    if (path.includes('JWT') || path.includes('ENCRYPTION') || path.includes('BCRYPT'))
      return 'security';
    if (path.includes('STRIPE') || path.includes('BILLING'))
      return 'billing';
    if (path.includes('OPENAI') || path.includes('ANTHROPIC') || path.includes('GEMINI') || path.includes('GOOGLE_AI'))
      return 'ai_provider';
    if (path.includes('OAUTH') || path.includes('CLIENT_ID') || path.includes('CLIENT_SECRET'))
      return 'oauth';
    if (path.includes('SENDGRID') || path.includes('SMTP') || path.includes('EMAIL'))
      return 'email';
    if (path.includes('ORCHESTRATOR') || path.includes('EXECUTION') || path.includes('CIRCUIT_BREAKER'))
      return 'orchestration';
    return 'general';
  }

  /**
   * Check if a variable is critical for operation
   */
  private static isCriticalVariable(path: string): boolean {
    const criticalVars = [
      'DATABASE_URL',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'ENCRYPTION_KEY',
      'PORT',
      'NODE_ENV',
    ];
    return criticalVars.includes(path);
  }

  /**
   * Generate warnings for suboptimal configuration
   */
  private static generateWarnings(env: NodeJS.ProcessEnv, environment: string): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // === SECURITY WARNINGS ===

    if (environment === 'production') {
      if (env.JWT_SECRET && env.JWT_SECRET.length < 64) {
        warnings.push({
          variable: 'JWT_SECRET',
          message: 'JWT secret is shorter than recommended (64+ characters)',
          severity: 'high',
          recommendation: 'Generate a cryptographically secure random string of at least 64 characters',
          category: 'security',
        });
      }

      if (env.JWT_REFRESH_SECRET && env.JWT_REFRESH_SECRET.length < 64) {
        warnings.push({
          variable: 'JWT_REFRESH_SECRET',
          message: 'JWT refresh secret is shorter than recommended (64+ characters)',
          severity: 'high',
          recommendation: 'Generate a cryptographically secure random string of at least 64 characters',
          category: 'security',
        });
      }

      if (env.BCRYPT_ROUNDS && parseInt(env.BCRYPT_ROUNDS) < 12) {
        warnings.push({
          variable: 'BCRYPT_ROUNDS',
          message: 'Bcrypt rounds lower than recommended (12+)',
          severity: 'medium',
          recommendation: 'Increase BCRYPT_ROUNDS to at least 12 for production',
          category: 'security',
        });
      }

      if (!env.SENTRY_DSN) {
        warnings.push({
          variable: 'SENTRY_DSN',
          message: 'Sentry is not configured. Error tracking is disabled.',
          severity: 'medium',
          recommendation: 'Configure Sentry for production error monitoring',
          category: 'reliability',
        });
      }
    }

    // === REDIS WARNINGS ===

    if (!env.REDIS_URL && environment === 'production') {
      warnings.push({
        variable: 'REDIS_URL',
        message: 'Redis is not configured. Usage metering, caching, and session management will be degraded.',
        severity: 'critical',
        recommendation: 'Configure Redis for production workloads. This is REQUIRED for production.',
        category: 'reliability',
      });
    }

    // === AI PROVIDER WARNINGS ===

    const aiProviders = [];
    if (env.OPENAI_API_KEY) aiProviders.push('OpenAI');
    if (env.ANTHROPIC_API_KEY) aiProviders.push('Anthropic');
    if (env.GOOGLE_AI_API_KEY) aiProviders.push('Google');

    if (aiProviders.length === 0) {
      warnings.push({
        variable: 'AI_API_KEYS',
        message: 'No AI provider API keys configured. AI features will NOT work.',
        severity: 'critical',
        recommendation: 'Configure at least one AI provider (OpenAI, Anthropic, or Google)',
        category: 'reliability',
      });
    } else if (aiProviders.length === 1) {
      warnings.push({
        variable: 'AI_PROVIDER_FALLBACK_CHAIN',
        message: `Only ${aiProviders[0]} configured. No fallback provider available.`,
        severity: 'medium',
        recommendation: 'Configure additional AI providers for fallback reliability',
        category: 'reliability',
      });
    }

    // === ORCHESTRATOR WARNINGS ===

    if (env.ENABLE_PRE_EXECUTION_COST_CHECK !== 'false') {
      // Good - this is enabled by default
    } else {
      warnings.push({
        variable: 'ENABLE_PRE_EXECUTION_COST_CHECK',
        message: 'Pre-execution cost checking is disabled. Users may incur unexpected charges.',
        severity: 'low',
        recommendation: 'Enable pre-execution cost checking to warn users before expensive operations',
        category: 'cost',
      });
    }

    if (env.ENABLE_CIRCUIT_BREAKER === 'false') {
      warnings.push({
        variable: 'ENABLE_CIRCUIT_BREAKER',
        message: 'Circuit breaker is disabled. Failed services may degrade system performance.',
        severity: 'medium',
        recommendation: 'Enable circuit breaker to prevent cascading failures',
        category: 'reliability',
      });
    }

    // === MEMORY WARNINGS ===

    if (!env.MONGODB_URL && environment === 'production') {
      warnings.push({
        variable: 'MONGODB_URL',
        message: 'MongoDB is not configured. Vector search and memory features will be unavailable.',
        severity: 'medium',
        recommendation: 'Configure MongoDB for vector storage and agent memory',
        category: 'reliability',
      });
    }

    // === BILLING WARNINGS ===

    if (env.ENABLE_BILLING !== 'false' && !env.STRIPE_SECRET_KEY) {
      warnings.push({
        variable: 'STRIPE_SECRET_KEY',
        message: 'Billing is enabled but Stripe is not configured. Subscription management will fail.',
        severity: 'critical',
        recommendation: 'Configure Stripe keys or disable billing with ENABLE_BILLING=false',
        category: 'cost',
      });
    }

    // === PERFORMANCE WARNINGS ===

    if (env.MAX_CONCURRENT_EXECUTIONS && parseInt(env.MAX_CONCURRENT_EXECUTIONS) > 50) {
      warnings.push({
        variable: 'MAX_CONCURRENT_EXECUTIONS',
        message: 'High concurrent execution limit may cause resource exhaustion',
        severity: 'medium',
        recommendation: 'Consider reducing to 20-30 for optimal performance',
        category: 'performance',
      });
    }

    if (env.DATABASE_POOL_MAX && parseInt(env.DATABASE_POOL_MAX) > 50) {
      warnings.push({
        variable: 'DATABASE_POOL_MAX',
        message: 'Database pool max is very high (>50), may cause connection exhaustion',
        severity: 'medium',
        recommendation: 'Consider reducing pool size based on actual connection usage',
        category: 'performance',
      });
    }

    return warnings;
  }

  /**
   * Check for optional but recommended variables
   */
  private static checkOptionalVariables(env: NodeJS.ProcessEnv): string[] {
    const missing: string[] = [];
    const optionalVars = [
      'SENTRY_DSN',
      'DATADOG_API_KEY',
      'GRAFANA_URL',
      'SLACK_WEBHOOK_URL',
      'PAGERDUTY_API_KEY',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'AWS_S3_BUCKET',
      'AWS_REGION',
    ];

    for (const varName of optionalVars) {
      if (!env[varName]) {
        missing.push(varName);
      }
    }

    return missing;
  }

  /**
   * Generate recommendations based on current configuration
   */
  private static generateRecommendations(env: NodeJS.ProcessEnv, environment: string): string[] {
    const recommendations: string[] = [];

    if (environment === 'production') {
      recommendations.push('🔐 Enable 2FA for admin accounts');
      recommendations.push('📊 Set up Grafana dashboards for monitoring');
      recommendations.push('🔄 Configure automated database backups');
      recommendations.push('📝 Set up audit log retention policies');
    }

    if (!env.REDIS_URL && environment !== 'production') {
      recommendations.push('💾 Configure Redis for improved caching and session management');
    }

    if (env.ANTHROPIC_API_KEY && env.OPENAI_API_KEY && env.GOOGLE_AI_API_KEY) {
      recommendations.push('🔄 AI provider fallback chain is fully configured for maximum reliability');
    }

    return recommendations;
  }

  /**
   * Build a summary of the environment configuration
   */
  private static buildEnvironmentSummary(env: NodeJS.ProcessEnv): Record<string, any> {
    const aiProviders = [];
    if (env.OPENAI_API_KEY) aiProviders.push('openai');
    if (env.ANTHROPIC_API_KEY) aiProviders.push('anthropic');
    if (env.GOOGLE_AI_API_KEY) aiProviders.push('google');

    const oauthProviders = [];
    if (env.GOOGLE_CLIENT_ID) oauthProviders.push('google');
    if (env.LINKEDIN_CLIENT_ID) oauthProviders.push('linkedin');
    if (env.FACEBOOK_APP_ID) oauthProviders.push('facebook');
    if (env.TWITTER_CLIENT_ID) oauthProviders.push('twitter');
    if (env.MICROSOFT_CLIENT_ID) oauthProviders.push('microsoft');

    return {
      environment: env.NODE_ENV || 'development',
      database: env.DATABASE_URL ? 'configured' : 'missing',
      redis: env.REDIS_URL ? 'configured' : 'missing',
      mongodb: env.MONGODB_URL ? 'configured' : 'missing',
      ai: {
        providers: aiProviders,
        count: aiProviders.length,
        hasFallback: aiProviders.length > 1,
        defaultModel: env.DEFAULT_AI_MODEL || 'gpt-4-turbo-preview',
        embeddingModel: env.EMBEDDING_MODEL || 'text-embedding-3-small',
      },
      oauth: {
        providers: oauthProviders,
        count: oauthProviders.length,
      },
      stripe: !!env.STRIPE_SECRET_KEY,
      email: !!(env.SENDGRID_API_KEY || env.SMTP_HOST),
      monitoring: {
        sentry: !!env.SENTRY_DSN,
        datadog: !!env.DATADOG_API_KEY,
        prometheus: env.PROMETHEUS_ENABLED !== 'false',
      },
      features: {
        orchestrator: env.ENABLE_ORCHESTRATOR !== 'false',
        circuitBreaker: env.ENABLE_CIRCUIT_BREAKER !== 'false',
        backpressure: env.ENABLE_BACKPRESSURE !== 'false',
        preExecutionCostCheck: env.ENABLE_PRE_EXECUTION_COST_CHECK !== 'false',
        executionPersistence: env.ENABLE_EXECUTION_PERSISTENCE !== 'false',
        memoryConsolidation: env.ENABLE_MEMORY_CONSOLIDATION !== 'false',
        vectorSearch: env.ENABLE_VECTOR_SEARCH !== 'false',
        intentLearning: env.ENABLE_INTENT_LEARNING !== 'false',
        videoGeneration: env.ENABLE_VIDEO_GENERATION === 'true',
        whiteLabel: env.ENABLE_WHITE_LABEL === 'true',
        customIntegrations: env.ENABLE_CUSTOM_INTEGRATIONS === 'true',
        billing: env.ENABLE_BILLING !== 'false',
        analytics: env.ENABLE_ANALYTICS !== 'false',
      },
      security: {
        jwtSecretLength: env.JWT_SECRET?.length || 0,
        bcryptRounds: parseInt(env.BCRYPT_ROUNDS || '12'),
        twoFactor: env.ENABLE_TWO_FACTOR === 'true',
        emailVerification: env.ENABLE_EMAIL_VERIFICATION === 'true',
        csrf: env.ENABLE_CSRF_PROTECTION !== 'false',
      },
      performance: {
        maxConcurrentExecutions: parseInt(env.MAX_CONCURRENT_EXECUTIONS || '10'),
        executionTimeoutMs: parseInt(env.EXECUTION_TIMEOUT_MS || '300000'),
        databasePoolMax: parseInt(env.DATABASE_POOL_MAX || '20'),
      },
    };
  }

  /**
   * Log validation results
   */
  private static logValidationResults(result: ValidationResult): void {
    if (result.errors.length > 0) {
      logger.error({
        errorCount: result.errors.length,
        errors: result.errors.map(e => `${e.path} [${e.category}]: ${e.message}`),
      }, '❌ Environment validation FAILED');
    }

    if (result.warnings.length > 0) {
      const criticalWarnings = result.warnings.filter(w => w.severity === 'critical');
      const highWarnings = result.warnings.filter(w => w.severity === 'high');

      logger.warn({
        warningCount: result.warnings.length,
        criticalCount: criticalWarnings.length,
        highCount: highWarnings.length,
        criticalWarnings: criticalWarnings.map(w => `${w.variable}: ${w.message}`),
      }, '⚠️ Environment validation warnings');
    }

    if (result.missingCritical.length > 0) {
      logger.error({
        missingCritical: result.missingCritical,
      }, '🔴 Missing critical environment variables');
    }

    if (result.success) {
      logger.info('✅ Environment validation passed');
    }

    // Log startup summary
    logger.info({
      ...result.environmentSummary,
    }, 'Environment configuration summary');
  }

  // ============================================
  // Utility Methods
  // ============================================

  static get<T>(key: string, defaultValue?: T): T {
    const value = process.env[key];
    if (value === undefined) {
      if (defaultValue !== undefined) return defaultValue;
      throw new Error(`Environment variable ${key} is not set`);
    }
    return value as unknown as T;
  }

  static getBoolean(key: string, defaultValue: boolean = false): boolean {
    const value = process.env[key];
    if (value === undefined) return defaultValue;
    return value === 'true' || value === '1' || value === 'yes';
  }

  static getNumber(key: string, defaultValue?: number): number {
    const value = process.env[key];
    if (value === undefined) {
      if (defaultValue !== undefined) return defaultValue;
      throw new Error(`Environment variable ${key} is not set`);
    }
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) throw new Error(`Environment variable ${key} is not a valid number`);
    return parsed;
  }

  static isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  static isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  }

  static isStaging(): boolean {
    return process.env.NODE_ENV === 'staging';
  }

  static generateSecret(length: number = 64): string {
    return require('crypto').randomBytes(length).toString('hex');
  }
}

// Export singleton
export const envValidator = EnvironmentValidator;