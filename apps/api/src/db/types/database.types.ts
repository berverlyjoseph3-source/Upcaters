// enterprise-ai-agent-platform/apps/api/src/db/types/database.types.ts
import { Prisma, User, AgentExecution, UsageLog, OAuthConnection } from '@prisma/client';

// Type-safe user with relations
export type UserWithRelations = User & {
  oauthConnections?: OAuthConnection[];
  agentExecutions?: AgentExecution[];
  usageLogs?: UsageLog[];
  apiKeys?: ApiKeyWithMetadata[];
};

export type ApiKeyWithMetadata = {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  rateLimit: number;
  lastUsedAt: Date | null;
  createdAt: Date;
};

// Plan configuration type
export interface PlanConfig {
  id: string;
  name: string;
  price: number;
  priceAnnual: number;
  currency: string;
  limits: {
    aiActions: number | 'unlimited';
    apiCalls: number | 'unlimited';
    teamMembers?: number;
    storage?: number;
  };
  features: {
    emailAgent: boolean;
    driveAgent: boolean;
    contentAgentText: boolean;
    contentAgentImage: boolean;
    contentAgentVideo: boolean;
    socialAgent: boolean;
    calendarAgent: boolean;
    webAgent: boolean;
    taskAgent: boolean;
    multiPlatformPosts: boolean;
    apiAccess: boolean;
    whiteLabel: boolean;
    customIntegrations: boolean;
    slaGuarantee: boolean;
  };
}

// Plan limits mapping
export const PLAN_LIMITS: Record<string, PlanConfig> = {
  FREE: {
    id: 'FREE',
    name: 'Free',
    price: 0,
    priceAnnual: 0,
    currency: 'usd',
    limits: {
      aiActions: 50,
      apiCalls: 100,
      teamMembers: 1,
      storage: 100, // MB
    },
    features: {
      emailAgent: true,
      driveAgent: false,
      contentAgentText: true,
      contentAgentImage: false,
      contentAgentVideo: false,
      socialAgent: false,
      calendarAgent: true,
      webAgent: true,
      taskAgent: false,
      multiPlatformPosts: false,
      apiAccess: false,
      whiteLabel: false,
      customIntegrations: false,
      slaGuarantee: false,
    },
  },
  STARTER: {
    id: 'STARTER',
    name: 'Starter',
    price: 29,
    priceAnnual: 278, // 20% off: 29 * 12 * 0.8
    currency: 'usd',
    limits: {
      aiActions: 500,
      apiCalls: 2000,
      teamMembers: 3,
      storage: 1024, // 1 GB
    },
    features: {
      emailAgent: true,
      driveAgent: true,
      contentAgentText: true,
      contentAgentImage: false,
      contentAgentVideo: false,
      socialAgent: true,
      calendarAgent: true,
      webAgent: true,
      taskAgent: true,
      multiPlatformPosts: false,
      apiAccess: false,
      whiteLabel: false,
      customIntegrations: false,
      slaGuarantee: false,
    },
  },
  PROFESSIONAL: {
    id: 'PROFESSIONAL',
    name: 'Professional',
    price: 99,
    priceAnnual: 950, // 20% off: 99 * 12 * 0.8
    currency: 'usd',
    limits: {
      aiActions: 2500,
      apiCalls: 15000,
      teamMembers: 10,
      storage: 10240, // 10 GB
    },
    features: {
      emailAgent: true,
      driveAgent: true,
      contentAgentText: true,
      contentAgentImage: true,
      contentAgentVideo: false,
      socialAgent: true,
      calendarAgent: true,
      webAgent: true,
      taskAgent: true,
      multiPlatformPosts: true,
      apiAccess: true,
      whiteLabel: false,
      customIntegrations: false,
      slaGuarantee: false,
    },
  },
  ENTERPRISE: {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    price: 499,
    priceAnnual: 4790, // 20% off: 499 * 12 * 0.8
    currency: 'usd',
    limits: {
      aiActions: 'unlimited',
      apiCalls: 'unlimited',
      teamMembers: 100,
      storage: 102400, // 100 GB
    },
    features: {
      emailAgent: true,
      driveAgent: true,
      contentAgentText: true,
      contentAgentImage: true,
      contentAgentVideo: true,
      socialAgent: true,
      calendarAgent: true,
      webAgent: true,
      taskAgent: true,
      multiPlatformPosts: true,
      apiAccess: true,
      whiteLabel: true,
      customIntegrations: true,
      slaGuarantee: true,
    },
  },
};

// Usage tracking types
export interface UsageStats {
  currentPeriod: {
    period: string;
    daysRemaining: number;
    aiActionsUsed: number;
    aiActionsLimit: number;
    apiCallsUsed: number;
    apiCallsLimit: number;
    percentageUsed: number;
    isOverLimit: boolean;
  };
  byAgent: Record<string, {
    count: number;
    costUsd: number;
  }>;
  historical: Array<{
    month: string;
    totalActions: number;
    totalCost: number;
  }>;
  topActions: Array<{
    actionType: string;
    count: number;
    costUsd: number;
  }>;
}

// Rate limit types
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  blockDurationMs?: number;
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  UNAUTHENTICATED: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    blockDurationMs: 5 * 60 * 1000, // 5 minutes
  },
  AUTHENTICATED: {
    windowMs: 60 * 1000,
    maxRequests: 1000,
  },
  API_KEY: {
    windowMs: 60 * 1000,
    maxRequests: 2000,
  },
  AGENT_EXECUTION: {
    windowMs: 60 * 1000,
    maxRequests: 60, // 1 per second
  },
};

// Database query types
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DateRangeFilter {
  fromDate?: Date;
  toDate?: Date;
}

export interface SearchFilter {
  search?: string;
  searchFields?: string[];
}

// Agent action type definitions
export interface AgentAction {
  type: string;
  cost: number; // in cents
  tokensPerAction?: number;
  requiresApiCall?: boolean;
}

export const AGENT_ACTIONS: Record<string, AgentAction> = {
  // Email Agent
  EMAIL_FETCH: { type: 'email_fetch', cost: 1, requiresApiCall: true },
  EMAIL_SEND: { type: 'email_send', cost: 2, requiresApiCall: true },
  EMAIL_REPLY: { type: 'email_reply', cost: 3, tokensPerAction: 500, requiresApiCall: true },
  EMAIL_LABEL: { type: 'email_label', cost: 0.5, requiresApiCall: true },
  
  // Content Agent
  CONTENT_TEXT: { type: 'content_text', cost: 5, tokensPerAction: 1000 },
  CONTENT_IMAGE: { type: 'content_image', cost: 10, requiresApiCall: true },
  CONTENT_VIDEO: { type: 'content_video', cost: 50, requiresApiCall: true },
  
  // Social Agent
  SOCIAL_POST: { type: 'social_post', cost: 2, requiresApiCall: true },
  SOCIAL_SCHEDULE: { type: 'social_schedule', cost: 1 },
  SOCIAL_ANALYTICS: { type: 'social_analytics', cost: 1, requiresApiCall: true },
  
  // Web Agent
  WEB_SEARCH: { type: 'web_search', cost: 1, requiresApiCall: true },
  WEB_SCRAPE: { type: 'web_scrape', cost: 2 },
  WEATHER: { type: 'weather', cost: 0.5, requiresApiCall: true },
  
  // Calendar Agent
  CALENDAR_GET: { type: 'calendar_get', cost: 0.5, requiresApiCall: true },
  CALENDAR_CREATE: { type: 'calendar_create', cost: 1, requiresApiCall: true },
  CALENDAR_UPDATE: { type: 'calendar_update', cost: 1, requiresApiCall: true },
  
  // Drive Agent
  DRIVE_UPLOAD: { type: 'drive_upload', cost: 2, requiresApiCall: true },
  DRIVE_DOWNLOAD: { type: 'drive_download', cost: 1, requiresApiCall: true },
  DRIVE_SEARCH: { type: 'drive_search', cost: 0.5, requiresApiCall: true },
  
  // Task Agent
  TASK_CREATE: { type: 'task_create', cost: 0.5, requiresApiCall: true },
  TASK_UPDATE: { type: 'task_update', cost: 0.5, requiresApiCall: true },
  TASK_LIST: { type: 'task_list', cost: 0.5, requiresApiCall: true },
  
  // Orchestrator
  ORCHESTRATOR_PARSE: { type: 'orchestrator_parse', cost: 3, tokensPerAction: 500 },
  ORCHESTRATOR_ROUTE: { type: 'orchestrator_route', cost: 1 },
};

// Webhook event types
export interface WebhookEvent {
  id: string;
  type: string;
  source: 'stripe' | 'google' | 'linkedin' | 'facebook' | 'twitter';
  payload: any;
  timestamp: Date;
}

// Memory types for vector storage
export interface MemoryEntry {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    agentType?: string;
    sessionId?: string;
    importance: number;
    timestamp: Date;
  };
}

// Scheduled post types
export interface ScheduledPostData {
  id: string;
  userId: string;
  platform: string;
  content: string;
  mediaUrls: string[];
  scheduledAt: Date;
  status: 'scheduled' | 'processing' | 'published' | 'failed';
}

// Export common types
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };