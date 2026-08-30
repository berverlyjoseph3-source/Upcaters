"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
// enterprise-ai-agent-platform/apps/api/src/config/index.ts
const dotenv_1 = __importDefault(require("dotenv"));
const env_validator_1 = require("./env-validator");
const logger_1 = require("../utils/logger");
// Load environment variables
dotenv_1.default.config();
// Validate on startup
const validationResult = env_validator_1.EnvironmentValidator.validate();
if (!validationResult.success && env_validator_1.EnvironmentValidator.isProduction()) {
    logger_1.logger.error('Environment validation failed in production - exiting');
    process.exit(1);
}
class FeatureFlagManager {
    static initialize() {
        this.flags = {
            videoGeneration: env_validator_1.EnvironmentValidator.getBoolean('ENABLE_VIDEO_GENERATION', false),
            whiteLabel: env_validator_1.EnvironmentValidator.getBoolean('ENABLE_WHITE_LABEL', false),
            customIntegrations: env_validator_1.EnvironmentValidator.getBoolean('ENABLE_CUSTOM_INTEGRATIONS', false),
            maintenanceMode: env_validator_1.EnvironmentValidator.getBoolean('ENABLE_MAINTENANCE_MODE', false),
            emailVerification: env_validator_1.EnvironmentValidator.getBoolean('ENABLE_EMAIL_VERIFICATION', false),
            registration: env_validator_1.EnvironmentValidator.getBoolean('ENABLE_REGISTRATION', true),
            twoFactor: env_validator_1.EnvironmentValidator.getBoolean('ENABLE_TWO_FACTOR', false),
            apiRateLimiting: env_validator_1.EnvironmentValidator.getBoolean('ENABLE_API_RATE_LIMITING', true),
            debugMode: env_validator_1.EnvironmentValidator.getBoolean('ENABLE_DEBUG_MODE', !env_validator_1.EnvironmentValidator.isProduction()),
            analytics: env_validator_1.EnvironmentValidator.getBoolean('ENABLE_ANALYTICS', true),
            billing: env_validator_1.EnvironmentValidator.getBoolean('ENABLE_BILLING', true),
            socialMediaPosting: env_validator_1.EnvironmentValidator.getBoolean('ENABLE_SOCIAL_MEDIA', true),
            aiContentGeneration: env_validator_1.EnvironmentValidator.getBoolean('ENABLE_AI_CONTENT', true),
            driveIntegration: env_validator_1.EnvironmentValidator.getBoolean('ENABLE_DRIVE', true),
            calendarIntegration: env_validator_1.EnvironmentValidator.getBoolean('ENABLE_CALENDAR', true),
        };
        logger_1.logger.info({ flags: this.getEnabledFlags() }, 'Feature flags initialized');
    }
    static isEnabled(flag) {
        if (!this.flags)
            this.initialize();
        return this.flags?.[flag] ?? false;
    }
    static isDisabled(flag) {
        return !this.isEnabled(flag);
    }
    static getEnabledFlags() {
        if (!this.flags)
            this.initialize();
        return Object.entries(this.flags || {})
            .filter(([_, value]) => value)
            .map(([key]) => key);
    }
    static getDisabledFlags() {
        if (!this.flags)
            this.initialize();
        return Object.entries(this.flags || {})
            .filter(([_, value]) => !value)
            .map(([key]) => key);
    }
}
FeatureFlagManager.flags = null;
// ============================================
// Main Configuration
// ============================================
exports.config = {
    // Environment
    nodeEnv: env_validator_1.EnvironmentValidator.get('NODE_ENV', 'development'),
    port: env_validator_1.EnvironmentValidator.getNumber('PORT', 3000),
    apiUrl: env_validator_1.EnvironmentValidator.get('API_URL', 'http://localhost:3000'),
    appUrl: env_validator_1.EnvironmentValidator.get('APP_URL', 'http://localhost:3001'),
    isProduction: env_validator_1.EnvironmentValidator.isProduction(),
    isDevelopment: env_validator_1.EnvironmentValidator.isDevelopment(),
    isStaging: env_validator_1.EnvironmentValidator.isStaging(),
    // Feature Flags
    features: FeatureFlagManager,
    // Database
    database: {
        url: env_validator_1.EnvironmentValidator.get('DATABASE_URL'),
        poolMin: env_validator_1.EnvironmentValidator.getNumber('DATABASE_POOL_MIN', 2),
        poolMax: env_validator_1.EnvironmentValidator.getNumber('DATABASE_POOL_MAX', 20),
        idleTimeout: env_validator_1.EnvironmentValidator.getNumber('DATABASE_IDLE_TIMEOUT', 10000),
        connectionTimeout: env_validator_1.EnvironmentValidator.getNumber('DATABASE_CONNECTION_TIMEOUT', 5000),
    },
    redis: {
        url: env_validator_1.EnvironmentValidator.get('REDIS_URL', ''),
    },
    mongodb: {
        url: env_validator_1.EnvironmentValidator.get('MONGODB_URL', ''),
    },
    // JWT Configuration
    jwt: {
        secret: env_validator_1.EnvironmentValidator.get('JWT_SECRET'),
        refreshSecret: env_validator_1.EnvironmentValidator.get('JWT_REFRESH_SECRET'),
        encryptionKey: env_validator_1.EnvironmentValidator.get('ENCRYPTION_KEY'),
        accessExpiresIn: env_validator_1.EnvironmentValidator.get('JWT_ACCESS_EXPIRY', '15m'),
        refreshExpiresIn: env_validator_1.EnvironmentValidator.get('JWT_REFRESH_EXPIRY', '30d'),
    },
    // Security
    security: {
        bcryptRounds: env_validator_1.EnvironmentValidator.getNumber('BCRYPT_ROUNDS', 12),
        rateLimit: {
            windowMs: env_validator_1.EnvironmentValidator.getNumber('RATE_LIMIT_WINDOW_MS', 60000),
            maxRequests: env_validator_1.EnvironmentValidator.getNumber('RATE_LIMIT_MAX_REQUESTS', 100),
            authenticatedMax: env_validator_1.EnvironmentValidator.getNumber('RATE_LIMIT_AUTHENTICATED_MAX', 1000),
        },
        session: {
            timeoutMinutes: env_validator_1.EnvironmentValidator.getNumber('SESSION_TIMEOUT_MINUTES', 30),
            maxLoginAttempts: env_validator_1.EnvironmentValidator.getNumber('MAX_LOGIN_ATTEMPTS', 5),
            maxConcurrentSessions: env_validator_1.EnvironmentValidator.getNumber('MAX_CONCURRENT_SESSIONS', 5),
        },
        cors: {
            origins: env_validator_1.EnvironmentValidator.get('CORS_ORIGINS', 'http://localhost:3001').split(',').map(s => s.trim()),
        },
        trustProxy: env_validator_1.EnvironmentValidator.getBoolean('TRUST_PROXY', false),
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
            port: env_validator_1.EnvironmentValidator.getNumber('SMTP_PORT', 587),
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
logger_1.logger.info({
    environment: exports.config.nodeEnv,
    features: FeatureFlagManager.getEnabledFlags(),
    security: {
        bcryptRounds: exports.config.security.bcryptRounds,
        sessionTimeout: exports.config.security.session.timeoutMinutes,
        maxLoginAttempts: exports.config.security.session.maxLoginAttempts,
    },
}, 'Configuration loaded successfully');
exports.default = exports.config;
//# sourceMappingURL=index.js.map