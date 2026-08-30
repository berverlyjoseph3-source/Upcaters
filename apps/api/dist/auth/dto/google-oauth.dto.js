"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GOOGLE_SCOPE_GROUPS = exports.GOOGLE_OAUTH_SCOPES = exports.GoogleServiceConnectionDtoSchema = exports.GoogleOAuthCallbackDtoSchema = exports.GoogleOAuthAuthDtoSchema = void 0;
// enterprise-ai-agent-platform/apps/api/src/auth/dto/google-oauth.dto.ts
const zod_1 = require("zod");
/**
 * Google OAuth Authorization Request DTO
 */
exports.GoogleOAuthAuthDtoSchema = zod_1.z.object({
    redirectUri: zod_1.z.string()
        .url('Invalid redirect URI')
        .optional(),
    state: zod_1.z.string()
        .max(500, 'State parameter too long')
        .optional(),
    accessType: zod_1.z.enum(['online', 'offline'])
        .optional()
        .default('offline'),
    prompt: zod_1.z.enum(['none', 'consent', 'select_account'])
        .optional()
        .default('consent'),
    scope: zod_1.z.array(zod_1.z.string())
        .optional(),
});
/**
 * Google OAuth Callback Request DTO
 */
exports.GoogleOAuthCallbackDtoSchema = zod_1.z.object({
    code: zod_1.z.string()
        .min(1, 'Authorization code is required'),
    state: zod_1.z.string()
        .optional(),
    error: zod_1.z.string()
        .optional(),
    error_description: zod_1.z.string()
        .optional(),
});
/**
 * Google Service Connection DTO
 */
exports.GoogleServiceConnectionDtoSchema = zod_1.z.object({
    service: zod_1.z.enum(['gmail', 'drive', 'calendar', 'tasks']),
    code: zod_1.z.string().min(1, 'Authorization code is required'),
    redirectUri: zod_1.z.string().url().optional(),
});
/**
 * Available Google OAuth Scopes
 */
exports.GOOGLE_OAUTH_SCOPES = {
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
exports.GOOGLE_SCOPE_GROUPS = {
    // Basic authentication (minimum required)
    basic: [
        exports.GOOGLE_OAUTH_SCOPES.USERINFO_EMAIL,
        exports.GOOGLE_OAUTH_SCOPES.USERINFO_PROFILE,
    ],
    // Email agent needs
    email: [
        exports.GOOGLE_OAUTH_SCOPES.GMAIL_MODIFY,
        exports.GOOGLE_OAUTH_SCOPES.GMAIL_COMPOSE,
        exports.GOOGLE_OAUTH_SCOPES.GMAIL_SEND,
    ],
    // Drive agent needs
    drive: [
        exports.GOOGLE_OAUTH_SCOPES.DRIVE_FILE,
        exports.GOOGLE_OAUTH_SCOPES.DRIVE_METADATA,
    ],
    // Calendar agent needs
    calendar: [
        exports.GOOGLE_OAUTH_SCOPES.CALENDAR_EVENTS,
    ],
    // Tasks agent needs
    tasks: [
        exports.GOOGLE_OAUTH_SCOPES.TASKS_FULL,
    ],
    // Full platform access (all features)
    full: [
        exports.GOOGLE_OAUTH_SCOPES.USERINFO_EMAIL,
        exports.GOOGLE_OAUTH_SCOPES.USERINFO_PROFILE,
        exports.GOOGLE_OAUTH_SCOPES.GMAIL_MODIFY,
        exports.GOOGLE_OAUTH_SCOPES.DRIVE_FILE,
        exports.GOOGLE_OAUTH_SCOPES.CALENDAR_EVENTS,
        exports.GOOGLE_OAUTH_SCOPES.TASKS_FULL,
    ],
};
//# sourceMappingURL=google-oauth.dto.js.map