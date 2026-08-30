// enterprise-ai-agent-platform/apps/api/src/config/api.config.ts
import dotenv from 'dotenv';

dotenv.config();

export const apiConfig = {
  // Google APIs
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI!,
    gmail: {
      apiUrl: 'https://gmail.googleapis.com/gmail/v1/users/me',
      scope: 'https://www.googleapis.com/auth/gmail.modify',
    },
    drive: {
      apiUrl: 'https://www.googleapis.com/drive/v3',
      scope: 'https://www.googleapis.com/auth/drive.file',
    },
    calendar: {
      apiUrl: 'https://www.googleapis.com/calendar/v3',
      scope: 'https://www.googleapis.com/auth/calendar.events',
    },
    tasks: {
      apiUrl: 'https://tasks.googleapis.com/tasks/v1',
      scope: 'https://www.googleapis.com/auth/tasks',
    },
  },
  
  // AI Services
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
    apiUrl: 'https://api.openai.com/v1',
    models: {
      gpt4: 'gpt-4-turbo-preview',
      gpt35: 'gpt-3.5-turbo',
      embedding: 'text-embedding-3-small',
    },
    maxRetries: 3,
    timeout: 30000,
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY!,
    apiUrl: 'https://api.anthropic.com/v1',
    models: {
      claude3: 'claude-3-opus-20240229',
      claude35: 'claude-3-5-sonnet-20241022',
    },
    maxRetries: 3,
    timeout: 30000,
  },
  gemini: {
    apiKey: process.env.GOOGLE_AI_API_KEY!,
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: {
      pro: 'gemini-1.5-pro',
      flash: 'gemini-1.5-flash',
    },
    maxRetries: 3,
    timeout: 30000,
  },
  
  // Social Media APIs
  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID!,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
    redirectUri: process.env.LINKEDIN_REDIRECT_URI!,
    apiUrl: 'https://api.linkedin.com/v2',
    scopes: ['openid', 'profile', 'email', 'w_member_social'],
  },
  facebook: {
    appId: process.env.FACEBOOK_APP_ID!,
    appSecret: process.env.FACEBOOK_APP_SECRET!,
    apiUrl: 'https://graph.facebook.com/v18.0',
    scopes: ['pages_manage_posts', 'pages_read_engagement', 'instagram_basic', 'instagram_content_publish'],
  },
  twitter: {
    apiKey: process.env.TWITTER_API_KEY!,
    apiSecret: process.env.TWITTER_API_SECRET!,
    accessToken: process.env.TWITTER_ACCESS_TOKEN!,
    accessSecret: process.env.TWITTER_ACCESS_SECRET!,
    apiUrl: 'https://api.twitter.com/2',
    bearerToken: process.env.TWITTER_BEARER_TOKEN!,
  },
  
  // Web Search & Research
  brave: {
    apiKey: process.env.BRAVE_SEARCH_API_KEY!,
    apiUrl: 'https://api.search.brave.com/res/v1',
  },
  openweather: {
    apiKey: process.env.OPENWEATHERMAP_API_KEY!,
    apiUrl: 'https://api.openweathermap.org/data/2.5',
  },
  perplexity: {
    apiKey: process.env.PERPLEXITY_API_KEY!,
    apiUrl: 'https://api.perplexity.ai',
  },
  
  // Task Management APIs
  asana: {
    accessToken: process.env.ASANA_ACCESS_TOKEN!,
    apiUrl: 'https://app.asana.com/api/1.0',
  },
  monday: {
    apiKey: process.env.MONDAY_API_KEY!,
    apiUrl: 'https://api.monday.com/v2',
  },
  
  // Rate Limiting
  rateLimits: {
    gmail: { requestsPerMinute: 60, requestsPerDay: 10000 },
    drive: { requestsPerMinute: 60, requestsPerDay: 10000 },
    calendar: { requestsPerMinute: 60, requestsPerDay: 10000 },
    openai: { requestsPerMinute: 3500, tokensPerMinute: 90000 },
    anthropic: { requestsPerMinute: 50 },
    gemini: { requestsPerMinute: 60 },
    linkedin: { requestsPerMinute: 100 },
    facebook: { requestsPerMinute: 200 },
    twitter: { requestsPerMinute: 300 },
    brave: { requestsPerMinute: 10 },
    perplexity: { requestsPerMinute: 5 },
  },
  
  // Timeouts (milliseconds)
  timeouts: {
    default: 30000,
    ai: 60000,
    fileUpload: 120000,
    videoGeneration: 180000,
  },
};

// Validate required configuration
const requiredConfigs = [
  'OPENAI_API_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'LINKEDIN_CLIENT_ID',
  'LINKEDIN_CLIENT_SECRET',
  'FACEBOOK_APP_ID',
  'FACEBOOK_APP_SECRET',
  'TWITTER_API_KEY',
  'TWITTER_API_SECRET',
];

const missingConfigs = requiredConfigs.filter(key => !process.env[key]);
if (missingConfigs.length > 0) {
  console.warn(`⚠️ Missing API keys: ${missingConfigs.join(', ')}. Some features will be disabled.`);
}