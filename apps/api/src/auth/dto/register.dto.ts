// enterprise-ai-agent-platform/apps/api/src/auth/dto/register.dto.ts
import { z } from 'zod';

/**
 * Registration Request DTO
 * Validates new user registration data
 */
export const RegisterDtoSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .max(255, 'Email must not exceed 255 characters')
    .email('Please provide a valid email address')
    .transform(val => val.toLowerCase().trim()),
  
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .regex(/^[a-zA-Z\s\-']+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
    .optional(),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must not exceed 100 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  
  confirmPassword: z.string()
    .min(1, 'Please confirm your password'),
  
  acceptTerms: z.boolean()
    .refine(val => val === true, 'You must accept the Terms of Service and Privacy Policy'),
  
  acceptMarketing: z.boolean()
    .optional()
    .default(false),
  
  referralCode: z.string()
    .max(50, 'Referral code too long')
    .optional()
    .nullable(),
  
  planId: z.enum(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'])
    .optional()
    .default('FREE'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type RegisterDto = z.infer < typeof RegisterDtoSchema > ;

/**
 * Registration Response DTO
 */
export interface RegisterResponseDto {
  success: boolean;
  data ? : {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: {
      id: string;
      email: string;
      name: string | null;
      avatarUrl: string | null;
      planId: string;
      role: string;
    };
  };
  error ? : string;
  code ? : string;
}

/**
 * Registration Validation Result
 */
export interface RegisterValidationResult {
  valid: boolean;
  errors: {
    field ? : string;
    message: string;
  } [];
}

/**
 * Email Validation Rules
 */
export const EMAIL_VALIDATION = {
  // Disposable email domains (commonly used for abuse)
  disposableDomains: [
    'tempmail.com', '10minutemail.com', 'guerrillamail.com',
    'mailinator.com', 'yopmail.com', 'throwawaymail.com',
    'temp-mail.org', 'fakeinbox.com', 'getnada.com'
  ],
  
  // Allowed email providers (empty = all allowed)
  allowedProviders: [], // Empty means all providers allowed
  
  // Max length
  maxLength: 255,
  
  // Min length
  minLength: 5,
};

/**
 * Password Validation Rules
 */
export const PASSWORD_VALIDATION = {
  minLength: 8,
  maxLength: 100,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  
  // Common passwords to reject
  commonPasswords: [
    'password123', 'admin123', '12345678', 'qwerty123',
    'letmein123', 'welcome123', 'passw0rd', '123456789',
    'password1', 'abc123456', 'admin1234', 'welcome1'
  ],
};

/**
 * Name Validation Rules
 */
export const NAME_VALIDATION = {
  minLength: 2,
  maxLength: 100,
  allowedPattern: /^[a-zA-Z\s\-']+$/,
  reservedNames: ['admin', 'root', 'system', 'test', 'user'],
};

/**
 * Registration Source Tracking
 */
export interface RegistrationSource {
  source: 'email' | 'google' | 'linkedin' | 'github';
  ipAddress: string;
  userAgent: string;
  referrer ? : string;
  utmSource ? : string;
  utmMedium ? : string;
  utmCampaign ? : string;
}

/**
 * Email Verification Token
 */
export interface EmailVerificationToken {
  token: string;
  userId: string;
  email: string;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Registration Analytics Event
 */
export interface RegistrationAnalytics {
  userId: string;
  email: string;
  planId: string;
  source: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  isFirstUser ? : boolean;
  timeToComplete ? : number; // milliseconds
}