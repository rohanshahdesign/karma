-- Drop all tables script
-- This will completely reset the database by dropping all tables
-- Run this with caution as all data will be lost

-- Drop tables in reverse dependency order to avoid foreign key constraints

-- Drop RPC functions first
DROP FUNCTION IF EXISTS create_workspace_with_owner(text, text, text, text, text, text);
DROP FUNCTION IF EXISTS join_workspace_with_code(text, uuid, text, text, text);

-- Drop tables (in reverse dependency order)
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS workspace_members CASCADE;
DROP TABLE IF EXISTS pending_users CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;

-- Drop any remaining views or materialized views
DROP VIEW IF EXISTS member_balances CASCADE;

-- Drop any custom types
DROP TYPE IF EXISTS workspace_role CASCADE;

-- Drop any sequences that might exist
DROP SEQUENCE IF EXISTS transactions_id_seq CASCADE;
DROP SEQUENCE IF EXISTS workspaces_id_seq CASCADE;
DROP SEQUENCE IF EXISTS profiles_id_seq CASCADE;

-- Note: This script drops all application tables and functions
-- The auth schema (managed by Supabase Auth) will remain intact
-- You'll need to re-run all migrations after this to recreate the schema