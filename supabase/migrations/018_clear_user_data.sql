-- Clear all user data while preserving table structure and default rewards/badges
-- This allows testing the full onboarding flow from scratch

-- Disable triggers temporarily to avoid conflicts
SET session_replication_role = replica;

-- Clear user-specific data in dependency order
DELETE FROM user_badges;
DELETE FROM redemptions;
DELETE FROM transactions;
DELETE FROM profiles;
DELETE FROM workspace_members;

-- Clear workspace-specific data
DELETE FROM rewards WHERE workspace_id IS NOT NULL;
DELETE FROM badges WHERE workspace_id IS NOT NULL;
DELETE FROM workspaces;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Reset sequences to start from 1 (optional)
-- This ensures clean IDs when testing
SELECT setval(pg_get_serial_sequence('workspaces', 'id'), 1, false);

-- Note: This preserves:
-- 1. All table structures
-- 2. All functions and triggers
-- 3. Auth schema (but clears auth.users would need to be done separately if needed)
-- 4. The default rewards/badges will be recreated when workspaces are created