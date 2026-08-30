// enterprise-ai-agent-platform/apps/api/src/middleware/security-headers.middleware.ts
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import crypto from 'crypto';

// Custom CSP directives
const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: [
    "'self'",
    "'unsafe-inline'", // Required for some frontend frameworks
    "'unsafe-eval'", // Required for development
    'https://js.stripe.com',
    'https://cdn.jsdelivr.net',
    'https://unpkg.com',
  ],
  styleSrc: [
    "'self'",
    "'unsafe-inline'",
    'https://fonts.googleapis.com',
    'https://cdn.jsdelivr.net',
  ],
  fontSrc: [
    "'self'",
    'https://fonts.gstatic.com',
    'https://cdn.jsdelivr.net',
  ],
  imgSrc: [
    "'self'",
    'data:',
    'https:',
    'blob:',
    'https://lh3.googleusercontent.com', // Google profile pictures
    'https://platform-lookaside.fbsbx.com', // Facebook profile pictures
    'https://pbs.twimg.com', // Twitter profile pictures
    'https://media.licdn.com', // LinkedIn profile pictures
  ],
  connectSrc: [
    "'self'",
    'https://api.stripe.com',
    'https://api.openai.com',
    'https://api.anthropic.com',
    'https://generativelanguage.googleapis.com',
    'https://api.perplexity.ai',
    'https://api.brave.com',
    'https://api.openweathermap.org',
    'https://api.linkedin.com',
    'https://graph.facebook.com',
    'https://api.twitter.com',
    'https://www.googleapis.com',
  ],
  frameSrc: [
    "'self'",
    'https://js.stripe.com',
    'https://hooks.stripe.com',
  ],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
};

// HSTS configuration
const hstsConfig = {
  maxAge: 31536000, // 1 year
  includeSubDomains: true,
  preload: true,
};

// Permissions Policy
const permissionsPolicy = {
  geolocation: ["'self'"],
  microphone: ["'none'"],
  camera: ["'none'"],
  payment: ["'self'", 'https://js.stripe.com'],
  usb: ["'none'"],
};

/**
 * Configure all security headers
 */
export function securityHeaders() {
  return [
    // Helmet with custom configuration
    helmet({
      contentSecurityPolicy: {
        directives: cspDirectives as any,
      },
      hsts: hstsConfig,
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xssFilter: true,
      noSniff: true,
      hidePoweredBy: true,
    }),
    
    // Additional security headers
    (req: Request, res: Response, next: NextFunction) => {
      // Permissions Policy
      const policyString = Object.entries(permissionsPolicy)
        .map(([key, value]) => `${key}=(${value.join(' ')})`)
        .join(', ');
      res.setHeader('Permissions-Policy', policyString);
      
      // Cross-Origin Embedder Policy
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      
      // Cross-Origin Opener Policy
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      
      // Cross-Origin Resource Policy
      res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
      
      // Cache-Control for authenticated resources
      if (req.headers.authorization) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      }
      
      // Clear Site Data header (for logout)
      if (req.path === '/logout') {
        res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage"');
      }
      
      next();
    },
  ];
}

/**
 * CORS configuration
 */
export const corsConfig = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow ? : boolean) => void) => {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3001').split(',');
    
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-API-Key',
    'X-Refresh-Token',
    'X-Request-ID',
    'X-CSRF-Token',
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

/**
 * CSRF Protection middleware (for state-changing operations)
 */
export function csrfProtection() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip CSRF for GET, HEAD, OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }
    
    // Skip for API key authenticated requests
    if (req.headers['x-api-key']) {
      return next();
    }
    
    const csrfToken = req.headers['x-csrf-token'] as string;
    const sessionToken = (req.session as any)?.csrfToken;
    
    if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
      return res.status(403).json({
        success: false,
        error: 'Invalid CSRF token',
        code: 'CSRF_TOKEN_INVALID',
      });
    }
    
    next();
  };
}

/**
 * Generate CSRF token for session
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Request ID middleware
 */
export function requestId() {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = req.headers['x-request-id'] || crypto.randomBytes(16).toString('hex');
    req.id = requestId as string;
    res.setHeader('X-Request-ID', requestId as string);
    next();
  };
}

/**
 * Rate limit headers for API responses
 */
export function addRateLimitHeaders(
  res: Response,
  limit: number,
  remaining: number,
  reset: number
) {
  res.setHeader('X-RateLimit-Limit', limit);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', reset);
}

/**
 * Security.txt endpoint
 */
export function securityTxt() {
  return (req: Request, res: Response) => {
    const securityInfo = `Contact: mailto:${process.env.SECURITY_EMAIL || 'security@aiagentplatform.com'}
Expires: ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()}
Preferred-Languages: en
Canonical: ${process.env.APP_URL}/.well-known/security.txt
Encryption: ${process.env.SECURITY_PGP_KEY || 'https://keys.openpgp.org/search?q=security@aiagentplatform.com'}
Acknowledgments: ${process.env.APP_URL}/security/acknowledgments
`;
    res.setHeader('Content-Type', 'text/plain');
    res.send(securityInfo);
  };
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      id: string;
      session ? : any;
    }
  }
}