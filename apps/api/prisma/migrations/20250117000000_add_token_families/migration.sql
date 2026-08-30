-- enterprise-ai-agent-platform/apps/api/prisma/migrations/20250117000000_add_token_families/migration.sql

-- Create token_families table for refresh token rotation
CREATE TABLE IF NOT EXISTS token_families (
id VARCHAR(32) PRIMARY KEY,
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
current_token_hash VARCHAR(64) NOT NULL,
previous_token_hash VARCHAR(64),
rotation_count INTEGER DEFAULT 0,
created_at TIMESTAMP DEFAULT NOW(),
last_rotated_at TIMESTAMP DEFAULT NOW(),
expires_at TIMESTAMP NOT NULL,
is_revoked BOOLEAN DEFAULT FALSE,
revoked_reason VARCHAR(20) DEFAULT NULL
);

-- Create indexes for fast token lookup
CREATE INDEX idx_token_families_user_id ON token_families(user_id);
CREATE INDEX idx_token_families_current_hash ON token_families(current_token_hash);
CREATE INDEX idx_token_families_previous_hash ON token_families(previous_token_hash);
CREATE INDEX idx_token_families_expires ON token_families(expires_at);

-- Add comment
COMMENT ON TABLE token_families IS 'Stores token rotation families for refresh token replay attack detection';

-- Add hash column to sessions table for faster lookup
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS token_hash VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);