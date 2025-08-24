-- CloudsLinker Database Seed Data
-- Initial data for development and testing

-- Insert demo user
INSERT INTO users (id, email, password_hash, first_name, last_name, subscription_tier, email_verified) VALUES
(
    'demo-user-uuid-1234-5678-abcd',
    'demo@cloudslinker.com',
    '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- password: demo123
    'Demo',
    'User',
    'pro',
    true
);

-- Insert sample cloud provider configurations (for development)
INSERT INTO cloud_providers (id, user_id, provider_type, alias, credentials, config, is_active, connection_status) VALUES
(
    'provider-pikpak-demo-uuid',
    'demo-user-uuid-1234-5678-abcd',
    'pikpak',
    'Demo PikPak Account',
    '{"type": "oauth", "client_id": "demo_client_id", "client_secret": "demo_client_secret"}',
    '{"api_endpoint": "https://api-drive.mypikpak.com", "upload_chunk_size": 1048576}',
    false,
    'disconnected'
),
(
    'provider-webdav-demo-uuid',
    'demo-user-uuid-1234-5678-abcd',
    'webdav',
    'Demo WebDAV Storage',
    '{"type": "basic", "username": "demo_user", "password": "demo_pass", "endpoint": "https://demo.webdav.server/"}',
    '{"timeout": 30000, "verify_ssl": true}',
    false,
    'disconnected'
),
(
    'provider-synology-demo-uuid',
    'demo-user-uuid-1234-5678-abcd',
    'synology',
    'Demo Synology NAS',
    '{"type": "account", "username": "demo_user", "password": "demo_pass", "host": "demo.synology.me", "port": 5001}',
    '{"secure": true, "api_version": "7.0"}',
    false,
    'disconnected'
);

-- Insert sample transfer job (completed)
INSERT INTO transfer_jobs (
    id, user_id, source_cloud_id, destination_cloud_id,
    source_path, destination_path, status, progress_percentage,
    files_total, files_completed, bytes_total, bytes_transferred,
    started_at, completed_at
) VALUES (
    'transfer-demo-completed-uuid',
    'demo-user-uuid-1234-5678-abcd',
    'provider-pikpak-demo-uuid',
    'provider-webdav-demo-uuid',
    '/Documents',
    '/Backup/Documents',
    'completed',
    100,
    25,
    25,
    2147483648, -- 2GB
    2147483648,
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '30 minutes'
);

-- Insert sample sync job
INSERT INTO sync_jobs (
    id, user_id, source_cloud_id, destination_cloud_id,
    source_path, destination_path, sync_mode, schedule_cron,
    is_active, last_sync, next_sync, last_sync_status
) VALUES (
    'sync-demo-daily-uuid',
    'demo-user-uuid-1234-5678-abcd',
    'provider-pikpak-demo-uuid',
    'provider-synology-demo-uuid',
    '/Photos',
    '/Backup/Photos',
    'one_way',
    '0 2 * * *', -- Daily at 2 AM
    true,
    NOW() - INTERVAL '1 day',
    NOW() + INTERVAL '1 day' - INTERVAL '2 hours',
    'completed'
);

-- Insert sample file transfer logs
INSERT INTO file_transfer_logs (
    transfer_job_id, file_path, file_size, status, transferred_at
) VALUES
(
    'transfer-demo-completed-uuid',
    '/Documents/report.pdf',
    1048576,
    'completed',
    NOW() - INTERVAL '1 hour'
),
(
    'transfer-demo-completed-uuid',
    '/Documents/presentation.pptx',
    5242880,
    'completed',
    NOW() - INTERVAL '50 minutes'
),
(
    'transfer-demo-completed-uuid',
    '/Documents/spreadsheet.xlsx',
    2097152,
    'completed',
    NOW() - INTERVAL '45 minutes'
);

-- Insert audit log entries
INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address) VALUES
(
    'demo-user-uuid-1234-5678-abcd',
    'user_login',
    'user',
    'demo-user-uuid-1234-5678-abcd',
    '{"login_method": "email_password"}',
    '127.0.0.1'
),
(
    'demo-user-uuid-1234-5678-abcd',
    'cloud_provider_connected',
    'cloud_provider',
    'provider-pikpak-demo-uuid',
    '{"provider_type": "pikpak", "alias": "Demo PikPak Account"}',
    '127.0.0.1'
),
(
    'demo-user-uuid-1234-5678-abcd',
    'transfer_job_created',
    'transfer_job',
    'transfer-demo-completed-uuid',
    '{"source_path": "/Documents", "destination_path": "/Backup/Documents"}',
    '127.0.0.1'
);