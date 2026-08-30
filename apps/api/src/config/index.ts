// enterprise-ai-agent-platform/apps/api/src/config/index.ts
import dotenv from 'dotenv';
import { EnvironmentValidator } from './env-validator';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config();

// Validate on startup
const validationResult = EnvironmentValidator.validate();

if (!validationResult.success && EnvironmentValidator.isProduction()) {
  logger.error('Environment validation failed in production - exiting');
  process.exit(1);
}

// ============================================
// Feature Flags
// ============================================

export interface FeatureFlags {
  videoGeneration: boolean;
  whiteLabel: boolean;
  customIntegrations: boolean;
  maintenanceMode: boolean;
  emailVerification: boolean;
  registration: boolean;
  twoFactor: boolean;
  apiRateLimiting: boolean;
  debugMode: boolean;
  analytics: boolean;
  billing: boolean;
  socialMediaPosting: boolean;
  aiContentGeneration: boolean;
  driveIntegration: boolean;
  calendarIntegration: boolean;
}

class FeatureFlagManager {
  private static flags: FeatureFlags | null = null;
  
  static initialize(): void {
    this.flags = {
      videoGeneration: EnvironmentValidator.getBoolean('ENABLE_VIDEO_GENERATION', false),
      whiteLabel: EnvironmentValidator.getBoolean('ENABLE_WHITE_LABEL', false),
      customIntegrations: EnvironmentValidator.getBoolean('ENABLE_CUSTOM_INTEGRATIONS', false),
      maintenanceMode: EnvironmentValidator.getBoolean('ENABLE_MAINTENANCE_MODE', false),
      emailVerification: EnvironmentValidator.getBoolean('ENABLE_EMAIL_VERIFICATION', false),
      registration: EnvironmentValidator.getBoolean('ENABLE_REGISTRATION', true),
      twoFactor: EnvironmentValidator.getBoolean('ENABLE_TWO_FACTOR', false),
      apiRateLimiting: EnvironmentValidator.getBoolean('ENABLE_API_RATE_LIMITING', true),
      debugMode: EnvironmentValidator.getBoolean('ENABLE_DEBUG_MODE', !EnvironmentValidator.isProduction()),
      analytics: EnvironmentValidator.getBoolean('ENABLE_ANALYTICS', true),
      billing: EnvironmentValidator.getBoolean('ENABLE_BILLING', true),
      socialMediaPosting: EnvironmentValidator.getBoolean('ENABLE_SOCIAL_MEDIA', true),
      aiContentGeneration: EnvironmentValidator.getBoolean('ENABLE_AI_CONTENT', true),
      driveIntegration: EnvironmentValidator.getBoolean('ENABLE_DRIVE', true),
      calendarIntegration: EnvironmentValidator.getBoolean('ENABLE_CALENDAR', true),
    };
    
    logger.info({ flags: this.getEnabledFlags() }, 'Feature flags initialized');
  }
  
  static isEnabled(flag: keyof FeatureFlags): boolean {
    if (!this.flags) this.initialize();
    return this.flags?.[flag] ?? false;
  }
  
  static isDisabled(flag: keyof FeatureFlags): boolean {
    return !this.isEnabled(flag);
  }
  
  static getEnabledFlags(): string[] {
    if (!this.flags) this.initialize();
    return Object.entries(this.flags || {})
      .filter(([_, value]) => value)
      .map(([key]) => key);
  }
  
  static getDisabledFlags(): string[] {
    if (!this.flags) this.initialize();
    return Object.entries(this.flags || {})
      .filter(([_, value]) => !value)
      .map(([key]) => key);
  }
}

// ============================================
// Main Configuration
// ============================================

export const config = {
  // Environment
  nodeEnv: EnvironmentValidator.get < string > ('NODE_ENV', 'development'),
  port: EnvironmentValidator.getNumber('PORT', 3000),
  apiUrl: EnvironmentValidator.get < string > ('API_URL', 'http://localhost:3000'),
  appUrl: EnvironmentValidator.get < string > ('APP_URL', 'http://localhost:3001'),
  isProduction: EnvironmentValidator.isProduction(),
  isDevelopment: EnvironmentValidator.isDevelopment(),
  isStaging: EnvironmentValidator.isStaging(),
  
  // Feature Flags
  features: FeatureFlagManager,
  
  // Database
  database: {
    url: EnvironmentValidator.get < string > ('DATABASE_URL'),
    poolMin: EnvironmentValidator.getNumber('DATABASE_POOL_MIN', 2),
    poolMax: EnvironmentValidator.getNumber('DATABASE_POOL_MAX', 20),
    idleTimeout: EnvironmentValidator.getNumber('DATABASE_IDLE_TIMEOUT', 10000),
    connectionTimeout: EnvironmentValidator.getNumber('DATABASE_CONNECTION_TIMEOUT', 5000),
  },
  
  redis: {
    url: EnvironmentValidator.get < string > ('REDIS_URL', ''),
  },
  
  mongodb: {
    url: EnvironmentValidator.get < string > ('MONGODB_URL', ''),
  },
  
  // JWT Configuration
  jwt: {
    secret: EnvironmentValidator.get < string > ('JWT_SECRET'),
    refreshSecret: EnvironmentValidator.get < string > ('JWT_REFRESH_SECRET'),
    encryptionKey: EnvironmentValidator.get < string > ('ENCRYPTION_KEY'),
    accessExpiresIn: EnvironmentValidator.get < string > ('JWT_ACCESS_EXPIRY', '15m'),
    refreshExpiresIn: EnvironmentValidator.get < string > ('JWT_REFRESH_EXPIRY', '30d'),
  },
  
  // Security
  security: {
    bcryptRounds: EnvironmentValidator.getNumber('BCRYPT_ROUNDS', 12),
    rateLimit: {
      windowMs: EnvironmentValidator.getNumber('RATE_LIMIT_WINDOW_MS', 60000),
      maxRequests: EnvironmentValidator.getNumber('RATE_LIMIT_MAX_REQUESTS', 100),
      authenticatedMax: EnvironmentValidator.getNumber('RATE_LIMIT_AUTHENTICATED_MAX', 1000),
    },
    session: {
      timeoutMinutes: EnvironmentValidator.getNumber('SESSION_TIMEOUT_MINUTES', 30),
      maxLoginAttempts: EnvironmentValidator.getNumber('MAX_LOGIN_ATTEMPTS', 5),
      maxConcurrentSessions: EnvironmentValidator.getNumber('MAX_CONCURRENT_SESSIONS', 5),
    },
    cors: {
      origins: EnvironmentValidator.get < string > ('CORS_ORIGINS', 'http://localhost:3001').split(',').map(s => s.trim()),
    },
    trustProxy: EnvironmentValidator.getBoolean('TRUST_PROXY', false),
  },
  
  // AI Providers
  ai: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: 'gpt-4-turbo-preview',
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      model: 'claude-3-5-sonnet-20241022',
    },
    google: {
      apiKey: process.env.GOOGLE_AI_API_KEY || '',
      model: 'gemini-1.5-pro',
    },
  },
  
  // Stripe
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  },
  
  // Email
  email: {
    sendgridApiKey: process.env.SENDGRID_API_KEY || '',
    fromEmail: process.env.FROM_EMAIL || 'noreply@aiagentplatform.com',
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: EnvironmentValidator.getNumber('SMTP_PORT', 587),
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  },
  
  // Monitoring
  monitoring: {
    sentryDsn: process.env.SENTRY_DSN || '',
    logLevel: process.env.LOG_LEVEL || 'info',
  },
};

// Initialize feature flags
FeatureFlagManager.initialize();

// Log configuration summary on startup
logger.info({
  environment: config.nodeEnv,
  features: FeatureFlagManager.getEnabledFlags(),
  security: {
    bcryptRounds: config.security.bcryptRounds,
    sessionTimeout: config.security.session.timeoutMinutes,
    maxLoginAttempts: config.security.session.maxLoginAttempts,
  },
}, 'Configuration loaded successfully');

export default config;