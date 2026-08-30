-- enterprise-ai-agent-platform/apps/api/prisma/migrations/20250115000000_init/migration.sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,
  plan_id VARCHAR(50) NOT NULL DEFAULT 'FREE',
  plan_started_at TIMESTAMP DEFAULT NOW(),
  plan_expires_at TIMESTAMP,
  stripe_customer_id VARCHAR(255) UNIQUE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  api_key VARCHAR(64) UNIQUE,
  api_key_prefix VARCHAR(8),
  is_active BOOLEAN DEFAULT TRUE,
  role VARCHAR(20) DEFAULT 'USER',
  last_login_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- OAuth connections table
CREATE TABLE oauth_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  scope TEXT,
  provider_user_id VARCHAR(255),
  provider_email VARCHAR(255),
  webhook_url TEXT,
  last_synced_at TIMESTAMP,
  sync_status VARCHAR(20) DEFAULT 'PENDING',
  sync_error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Agent executions table
CREATE TABLE agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID,
  agent_type VARCHAR(50) NOT NULL,
  action_type VARCHAR(100) NOT NULL,
  input JSONB,
  output JSONB,
  tokens_used INTEGER DEFAULT 0,
  cost_usd DECIMAL(10,6) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  error_stack TEXT,
  duration_ms INTEGER,
  retry_count INTEGER DEFAULT 0,
  metadata JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Usage logs table
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  billing_period VARCHAR(7) NOT NULL,
  action_type VARCHAR(100) NOT NULL,
  count INTEGER DEFAULT 0,
  tokens_used BIGINT DEFAULT 0,
  cost_usd DECIMAL(12,6) DEFAULT 0,
  last_reset_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, billing_period, action_type)
);

-- Agent memory with vector embeddings
CREATE TABLE agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID,
  agent_type VARCHAR(50),
  memory_type VARCHAR(20) DEFAULT 'SHORT_TERM',
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB,
  importance FLOAT DEFAULT 0.5,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP,
  ttl_hours INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- Create vector similarity index
CREATE INDEX agent_memory_embedding_idx ON agent_memory USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Scheduled posts table
CREATE TABLE scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  media_urls JSONB DEFAULT '[]',
  metadata JSONB,
  scheduled_at TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'SCHEDULED',
  published_at TIMESTAMP,
  post_id VARCHAR(255),
  post_url TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP,
  engagement JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Webhook events table (idempotent)
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  source VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP,
  processing_error TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- API keys table
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash VARCHAR(255) UNIQUE NOT NULL,
  key_prefix VARCHAR(8) NOT NULL,
  name VARCHAR(100) NOT NULL,
  permissions JSONB NOT NULL,
  rate_limit INTEGER DEFAULT 100,
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP
);

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token VARCHAR(255) UNIQUE NOT NULL,
  access_token VARCHAR(255) UNIQUE,
  user_agent TEXT,
  ip_address VARCHAR(45),
  location VARCHAR(100),
  device_type VARCHAR(50),
  is_revoked BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,
  last_activity_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notification preferences
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT TRUE,
  slack_webhook_url TEXT,
  webhook_url TEXT,
  notify_on_success BOOLEAN DEFAULT FALSE,
  notify_on_failure BOOLEAN DEFAULT TRUE,
  notify_on_limit BOOLEAN DEFAULT TRUE,
  daily_digest BOOLEAN DEFAULT TRUE,
  weekly_report BOOLEAN DEFAULT TRUE,
  quiet_hours_start VARCHAR(5),
  quiet_hours_end VARCHAR(5),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Audit logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  changes JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Plan history
CREATE TABLE plan_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  old_plan VARCHAR(50) NOT NULL,
  new_plan VARCHAR(50) NOT NULL,
  changed_by VARCHAR(255) NOT NULL,
  reason TEXT,
  stripe_event_id VARCHAR(255),
  metadata JSONB,
  changed_at TIMESTAMP DEFAULT NOW()
);

-- Rate limits
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) UNIQUE NOT NULL,
  count INTEGER DEFAULT 0,
  window_start TIMESTAMP NOT NULL,
  window_end TIMESTAMP NOT NULL,
  blocked BOOLEAN DEFAULT FALSE,
  blocked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Content generations
CREATE TABLE content_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  model VARCHAR(50) NOT NULL,
  parameters JSONB NOT NULL,
  result JSONB,
  result_urls JSONB,
  status VARCHAR(20) DEFAULT 'PENDING',
  error_message TEXT,
  tokens_used INTEGER,
  cost_usd DECIMAL(10,6) DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Billing invoices
CREATE TABLE billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_invoice_id VARCHAR(255) UNIQUE NOT NULL,
  invoice_number VARCHAR(100),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  status VARCHAR(50) NOT NULL,
  pdf_url TEXT,
  hosted_invoice_url TEXT,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Email queue
CREATE TABLE email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  to_email VARCHAR(255) NOT NULL,
  to_name VARCHAR(255),
  subject TEXT NOT NULL,
  template VARCHAR(100) NOT NULL,
  template_data JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  error_message TEXT,
  sent_at TIMESTAMP,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_plan_id ON users(plan_id);
CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX idx_users_api_key ON users(api_key);

CREATE INDEX idx_oauth_connections_user_id ON oauth_connections(user_id);
CREATE INDEX idx_oauth_connections_provider ON oauth_connections(provider, provider_user_id);
CREATE INDEX idx_oauth_connections_sync_status ON oauth_connections(sync_status);

CREATE INDEX idx_agent_executions_user_created ON agent_executions(user_id, created_at DESC);
CREATE INDEX idx_agent_executions_agent_status ON agent_executions(agent_type, status);
CREATE INDEX idx_agent_executions_session ON agent_executions(session_id);
CREATE INDEX idx_agent_executions_created ON agent_executions(created_at);

CREATE INDEX idx_usage_logs_user_period ON usage_logs(user_id, billing_period);
CREATE INDEX idx_usage_logs_period ON usage_logs(billing_period);

CREATE INDEX idx_agent_memory_user_type ON agent_memory(user_id, memory_type);
CREATE INDEX idx_agent_memory_session ON agent_memory(session_id);
CREATE INDEX idx_agent_memory_expires ON agent_memory(expires_at);

CREATE INDEX idx_scheduled_posts_user_status ON scheduled_posts(user_id, status);
CREATE INDEX idx_scheduled_posts_scheduled ON scheduled_posts(scheduled_at);
CREATE INDEX idx_scheduled_posts_status_time ON scheduled_posts(status, scheduled_at);

CREATE INDEX idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX idx_webhook_events_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_source ON webhook_events(source);

CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_active ON api_keys(is_active);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

CREATE INDEX idx_plan_history_user ON plan_history(user_id, changed_at DESC);
CREATE INDEX idx_plan_history_plans ON plan_history(old_plan, new_plan);

CREATE INDEX idx_rate_limits_key_time ON rate_limits(key, window_end);
CREATE INDEX idx_rate_limits_blocked ON rate_limits(blocked, blocked_until);

CREATE INDEX idx_content_generations_user_status ON content_generations(user_id, status);
CREATE INDEX idx_content_generations_type ON content_generations(type);
CREATE INDEX idx_content_generations_created ON content_generations(created_at DESC);

CREATE INDEX idx_billing_invoices_user ON billing_invoices(user_id);
CREATE INDEX idx_billing_invoices_status ON billing_invoices(status);
CREATE INDEX idx_billing_invoices_period ON billing_invoices(period_start, period_end);

CREATE INDEX idx_email_queue_status ON email_queue(status);
CREATE INDEX idx_email_queue_created ON email_queue(created_at);

-- Add table comments
COMMENT ON TABLE users IS 'Core user accounts with plan and billing information';
COMMENT ON TABLE oauth_connections IS 'OAuth tokens for external service integrations';
COMMENT ON TABLE agent_executions IS 'Log of all agent actions with performance metrics';
COMMENT ON TABLE usage_logs IS 'Monthly usage tracking for billing and limits';
COMMENT ON TABLE agent_memory IS 'Vector-enabled memory storage for agent context';
COMMENT ON TABLE scheduled_posts IS 'Queue for scheduled social media posts';
COMMENT ON TABLE webhook_events IS 'Idempotent webhook event processing';
COMMENT ON TABLE api_keys IS 'API keys for programmatic access (PRO+ plans)';
COMMENT ON TABLE sessions IS 'User session management with refresh tokens';
COMMENT ON TABLE audit_logs IS 'Compliance audit trail for all actions';
COMMENT ON TABLE plan_history IS 'Historical record of plan changes';
COMMENT ON TABLE rate_limits IS 'Rate limiting tracking with sliding windows';
COMMENT ON TABLE content_generations IS 'AI content generation jobs queue';
COMMENT ON TABLE billing_invoices IS 'Cached Stripe invoice data for dashboard';
COMMENT ON TABLE email_queue IS 'Transactional email queue system';