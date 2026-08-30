// enterprise-ai-agent-platform/apps/api/src/config/auth.config.ts
import dotenv from 'dotenv';

dotenv.config();

export const authConfig = {
  // JWT Configuration
  jwt: {
    accessSecret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: '15m', // 15 minutes
    refreshExpiresIn: '30d', // 30 days
    issuer: process.env.APP_URL || 'https://api.aiagentplatform.com',
    audience: 'ai-agent-platform',
  },

  // Password Configuration
  password: {
    bcryptRounds: 12, // Cost factor for bcrypt
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
  },

  // Session Configuration
  session: {
    maxConcurrentSessions: 5, // Max active sessions per user
    sessionTimeoutMinutes: 30, // Inactivity timeout
    extendOnActivity: true, // Extend session on activity
  },

  // API Key Configuration
  apiKey: {
    prefix: 'ak_', // API key prefix: ak_xxxxxxxxxxxx
    length: 32, // Random bytes length
    hashAlgorithm: 'sha256' as const,
    rateLimitDefault: 100, // Default requests per minute
  },

  // Google OAuth Configuration
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback',
    scopes: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/tasks',
    ],
  },

  // Rate Limiting
  rateLimit: {
    login: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts
      blockDurationMs: 30 * 60 * 1000, // 30 minutes block
    },
    register: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // 3 registrations per IP per hour
    },
    refreshToken: {
      windowMs: 60 * 1000, // 1 minute
      max: 10, // 10 refresh attempts per minute
    },
    apiKey: {
      windowMs: 60 * 1000, // 1 minute
      max: 1000, // 1000 requests per minute
    },
  },

  // Security Headers
  security: {
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
    },
    cors: {
      allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3001').split(','),
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Refresh-Token'],
      credentials: true,
      maxAge: 86400, // 24 hours
    },
  },

  // Password Reset
  passwordReset: {
    tokenExpiresIn: '1h', // 1 hour
    rateLimitWindowMs: 60 * 60 * 1000, // 1 hour
    rateLimitMax: 3, // 3 reset requests per hour
  },

  // Email Verification
  emailVerification: {
    tokenExpiresIn: '7d', // 7 days
    requireVerification: process.env.NODE_ENV === 'production', // Require in production
  },
};

// Validate required config
const requiredConfigs = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

for (const configKey of requiredConfigs) {
  if (!process.env[configKey]) {
    throw new Error(`Missing required environment variable: ${configKey}`);
  }
}

// Warn about weak secrets in production
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  WARNING: JWT_SECRET should be at least 32 characters in production');
  }
  if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
    console.warn('⚠️  WARNING: JWT_REFRESH_SECRET should be at least 32 characters in production');
  }
}