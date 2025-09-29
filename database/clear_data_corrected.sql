-- Clear all user data for fresh testing
-- Run this manually in your Supabase SQL editor
-- CORRECTED VERSION with correct table names

BEGIN;

-- Clear user-specific data in dependency order
DELETE FROM user_badges;
DELETE FROM reward_redemptions;
DELETE FROM transactions;
DELETE FROM profiles;
DELETE FROM invitations;

-- Clear workspace-specific data
DELETE FROM rewards WHERE workspace_id IS NOT NULL;
DELETE FROM badges WHERE workspace_id IS NOT NULL;
DELETE FROM workspace_settings;
DELETE FROM workspaces;

-- Clear any pending users
DELETE FROM pending_users;

-- Optional: Clear integration settings if they exist
DELETE FROM integration_settings;

-- You may also want to clear auth.users if you want completely fresh accounts
-- DELETE FROM auth.users; -- Uncomment if you want to clear auth users too

COMMIT;

-- Note: After running this, you'll need to:
-- 1. If you cleared auth.users, create new test accounts
-- 2. Go through the onboarding flow to test the new username collection
-- 3. Test both "Create Workspace" and "Join Workspace" flows