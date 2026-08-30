// enterprise-ai-agent-platform/apps/api/src/auth/dto/google-oauth.dto.ts
import { z } from 'zod';

/**
 * Google OAuth Authorization Request DTO
 */
export const GoogleOAuthAuthDtoSchema = z.object({
  redirectUri: z.string()
    .url('Invalid redirect URI')
    .optional(),
  
  state: z.string()
    .max(500, 'State parameter too long')
    .optional(),
  
  accessType: z.enum(['online', 'offline'])
    .optional()
    .default('offline'),
  
  prompt: z.enum(['none', 'consent', 'select_account'])
    .optional()
    .default('consent'),
  
  scope: z.array(z.string())
    .optional(),
});

export type GoogleOAuthAuthDto = z.infer < typeof GoogleOAuthAuthDtoSchema > ;

/**
 * Google OAuth Callback Request DTO
 */
export const GoogleOAuthCallbackDtoSchema = z.object({
  code: z.string()
    .min(1, 'Authorization code is required'),
  
  state: z.string()
    .optional(),
  
  error: z.string()
    .optional(),
  
  error_description: z.string()
    .optional(),
});

export type GoogleOAuthCallbackDto = z.infer < typeof GoogleOAuthCallbackDtoSchema > ;

/**
 * Google OAuth Token Response
 */
export interface GoogleOAuthTokenResponse {
  access_token: string;
  refresh_token ? : string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token ? : string;
}

/**
 * Google User Info Response
 */
export interface GoogleUserInfoResponse {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
  hd ? : string; // Hosted domain (for G Suite)
}

/**
 * Google OAuth Error Response
 */
export interface GoogleOAuthErrorResponse {
  error: string;
  error_description ? : string;
  error_uri ? : string;
}

/**
 * Google Service Connection DTO
 */
export const GoogleServiceConnectionDtoSchema = z.object({
  service: z.enum(['gmail', 'drive', 'calendar', 'tasks']),
  code: z.string().min(1, 'Authorization code is required'),
  redirectUri: z.string().url().optional(),
});

export type GoogleServiceConnectionDto = z.infer < typeof GoogleServiceConnectionDtoSchema > ;

/**
 * Google OAuth State Data (stored in state parameter)
 */
export interface GoogleOAuthStateData {
  userId ? : string;
  service ? : 'gmail' | 'drive' | 'calendar' | 'tasks';
  redirectTo ? : string;
  csrfToken: string;
  timestamp: number;
  action: 'login' | 'connect' | 'reauth';
}

/**
 * Google OAuth Configuration
 */
export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  accessType: 'online' | 'offline';
  prompt: 'none' | 'consent' | 'select_account';
  includeGrantedScopes: boolean;
}

/**
 * Google Service Connection Result
 */
export interface GoogleServiceConnectionResult {
  success: boolean;
  service: string;
  error ? : string;
  scopesGranted ? : string[];
  expiresAt ? : Date;
}

/**
 * Google Token Refresh Result
 */
export interface GoogleTokenRefreshResult {
  success: boolean;
  accessToken ? : string;
  expiresIn ? : number;
  error ? : string;
}

/**
 * Available Google OAuth Scopes
 */
export const GOOGLE_OAUTH_SCOPES = {
  // User Profile
  USERINFO_EMAIL: 'https://www.googleapis.com/auth/userinfo.email',
  USERINFO_PROFILE: 'https://www.googleapis.com/auth/userinfo.profile',
  
  // Gmail
  GMAIL_READONLY: 'https://www.googleapis.com/auth/gmail.readonly',
  GMAIL_MODIFY: 'https://www.googleapis.com/auth/gmail.modify',
  GMAIL_COMPOSE: 'https://www.googleapis.com/auth/gmail.compose',
  GMAIL_SEND: 'https://www.googleapis.com/auth/gmail.send',
  GMAIL_FULL: 'https://www.googleapis.com/auth/gmail.full',
  
  // Google Drive
  DRIVE_READONLY: 'https://www.googleapis.com/auth/drive.readonly',
  DRIVE_FILE: 'https://www.googleapis.com/auth/drive.file',
  DRIVE_METADATA: 'https://www.googleapis.com/auth/drive.metadata',
  DRIVE_APPDATA: 'https://www.googleapis.com/auth/drive.appdata',
  DRIVE_FULL: 'https://www.googleapis.com/auth/drive',
  
  // Google Calendar
  CALENDAR_READONLY: 'https://www.googleapis.com/auth/calendar.readonly',
  CALENDAR_EVENTS: 'https://www.googleapis.com/auth/calendar.events',
  CALENDAR_FULL: 'https://www.googleapis.com/auth/calendar',
  
  // Google Tasks
  TASKS_READONLY: 'https://www.googleapis.com/auth/tasks.readonly',
  TASKS_FULL: 'https://www.googleapis.com/auth/tasks',
};

/**
 * Scope groups for common use cases
 */
export const GOOGLE_SCOPE_GROUPS = {
  // Basic authentication (minimum required)
  basic: [
    GOOGLE_OAUTH_SCOPES.USERINFO_EMAIL,
    GOOGLE_OAUTH_SCOPES.USERINFO_PROFILE,
  ],
  
  // Email agent needs
  email: [
    GOOGLE_OAUTH_SCOPES.GMAIL_MODIFY,
    GOOGLE_OAUTH_SCOPES.GMAIL_COMPOSE,
    GOOGLE_OAUTH_SCOPES.GMAIL_SEND,
  ],
  
  // Drive agent needs
  drive: [
    GOOGLE_OAUTH_SCOPES.DRIVE_FILE,
    GOOGLE_OAUTH_SCOPES.DRIVE_METADATA,
  ],
  
  // Calendar agent needs
  calendar: [
    GOOGLE_OAUTH_SCOPES.CALENDAR_EVENTS,
  ],
  
  // Tasks agent needs
  tasks: [
    GOOGLE_OAUTH_SCOPES.TASKS_FULL,
  ],
  
  // Full platform access (all features)
  full: [
    GOOGLE_OAUTH_SCOPES.USERINFO_EMAIL,
    GOOGLE_OAUTH_SCOPES.USERINFO_PROFILE,
    GOOGLE_OAUTH_SCOPES.GMAIL_MODIFY,
    GOOGLE_OAUTH_SCOPES.DRIVE_FILE,
    GOOGLE_OAUTH_SCOPES.CALENDAR_EVENTS,
    GOOGLE_OAUTH_SCOPES.TASKS_FULL,
  ],
};