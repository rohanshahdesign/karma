-- Clear all data from tables (preserves table structure)
-- This script truncates all tables to remove data while keeping the schema intact

-- Disable triggers temporarily for faster truncation
SET session_replication_role = replica;

-- Clear data in reverse dependency order to avoid foreign key constraints
TRUNCATE TABLE transactions CASCADE;
TRUNCATE TABLE reward_redemptions CASCADE;
TRUNCATE TABLE user_badges CASCADE;
TRUNCATE TABLE profiles CASCADE;
TRUNCATE TABLE pending_users CASCADE;
TRUNCATE TABLE invitations CASCADE;
TRUNCATE TABLE rewards CASCADE;
TRUNCATE TABLE badges CASCADE;
TRUNCATE TABLE workspace_settings CASCADE;
TRUNCATE TABLE integration_settings CASCADE;
TRUNCATE TABLE workspaces CASCADE;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Note: This clears all application data but preserves:
-- - Table structure and constraints  
-- - Indexes and triggers
-- - RPC functions and policies
-- - Auth users (Supabase Auth schema is untouched)