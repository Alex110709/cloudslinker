-- CloudsLinker Database Initialization
-- PostgreSQL 15+ compatible

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_crypto";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    subscription_tier VARCHAR(50) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Cloud providers table
CREATE TABLE cloud_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider_type VARCHAR(50) NOT NULL CHECK (provider_type IN ('pikpak', 'webdav', 'synology', 'google_drive', 'onedrive', 'dropbox')),
    alias VARCHAR(100),
    credentials JSONB NOT NULL,
    config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_connected TIMESTAMP,
    connection_status VARCHAR(20) DEFAULT 'disconnected' CHECK (connection_status IN ('connected', 'disconnected', 'error')),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Transfer jobs table
CREATE TABLE transfer_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    source_cloud_id UUID REFERENCES cloud_providers(id) ON DELETE CASCADE,
    destination_cloud_id UUID REFERENCES cloud_providers(id) ON DELETE CASCADE,
    source_path TEXT NOT NULL,
    destination_path TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed', 'cancelled')),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    files_total INTEGER DEFAULT 0,
    files_completed INTEGER DEFAULT 0,
    files_failed INTEGER DEFAULT 0,
    bytes_total BIGINT DEFAULT 0,
    bytes_transferred BIGINT DEFAULT 0,
    transfer_speed BIGINT DEFAULT 0, -- bytes per second
    estimated_time_remaining INTEGER DEFAULT 0, -- seconds
    filters JSONB DEFAULT '{}',
    options JSONB DEFAULT '{}',
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Sync jobs table
CREATE TABLE sync_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    source_cloud_id UUID REFERENCES cloud_providers(id) ON DELETE CASCADE,
    destination_cloud_id UUID REFERENCES cloud_providers(id) ON DELETE CASCADE,
    source_path TEXT NOT NULL,
    destination_path TEXT NOT NULL,
    sync_mode VARCHAR(20) DEFAULT 'one_way' CHECK (sync_mode IN ('one_way', 'two_way', 'mirror')),
    schedule_cron VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    last_sync TIMESTAMP,
    next_sync TIMESTAMP,
    last_sync_status VARCHAR(20) DEFAULT 'pending' CHECK (last_sync_status IN ('pending', 'running', 'completed', 'failed')),
    filters JSONB DEFAULT '{}',
    options JSONB DEFAULT '{}',
    conflict_resolution VARCHAR(20) DEFAULT 'skip' CHECK (conflict_resolution IN ('skip', 'overwrite', 'rename')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- File transfer logs table
CREATE TABLE file_transfer_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_job_id UUID REFERENCES transfer_jobs(id) ON DELETE CASCADE,
    sync_job_id UUID REFERENCES sync_jobs(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'transferring', 'completed', 'failed', 'skipped')),
    error_message TEXT,
    transferred_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- OAuth tokens table (for provider authentication)
CREATE TABLE oauth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cloud_provider_id UUID REFERENCES cloud_providers(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    expires_at TIMESTAMP,
    scope TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User sessions table
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    user_agent TEXT,
    ip_address INET,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_subscription_tier ON users(subscription_tier);

CREATE INDEX idx_cloud_providers_user_id ON cloud_providers(user_id);
CREATE INDEX idx_cloud_providers_type ON cloud_providers(provider_type);
CREATE INDEX idx_cloud_providers_status ON cloud_providers(connection_status);

CREATE INDEX idx_transfer_jobs_user_id ON transfer_jobs(user_id);
CREATE INDEX idx_transfer_jobs_status ON transfer_jobs(status);
CREATE INDEX idx_transfer_jobs_created_at ON transfer_jobs(created_at);
CREATE INDEX idx_transfer_jobs_source_cloud ON transfer_jobs(source_cloud_id);
CREATE INDEX idx_transfer_jobs_dest_cloud ON transfer_jobs(destination_cloud_id);

CREATE INDEX idx_sync_jobs_user_id ON sync_jobs(user_id);
CREATE INDEX idx_sync_jobs_active ON sync_jobs(is_active);
CREATE INDEX idx_sync_jobs_next_sync ON sync_jobs(next_sync) WHERE is_active = true;

CREATE INDEX idx_file_transfer_logs_job_id ON file_transfer_logs(transfer_job_id);
CREATE INDEX idx_file_transfer_logs_sync_job_id ON file_transfer_logs(sync_job_id);
CREATE INDEX idx_file_transfer_logs_status ON file_transfer_logs(status);

CREATE INDEX idx_oauth_tokens_cloud_provider ON oauth_tokens(cloud_provider_id);
CREATE INDEX idx_oauth_tokens_expires_at ON oauth_tokens(expires_at);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cloud_providers_updated_at BEFORE UPDATE ON cloud_providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transfer_jobs_updated_at BEFORE UPDATE ON transfer_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_jobs_updated_at BEFORE UPDATE ON sync_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oauth_tokens_updated_at BEFORE UPDATE ON oauth_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();