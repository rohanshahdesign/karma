# Database schema run order

Run these files in order in the Supabase SQL editor (or psql):

1. 001_tables.sql
2. 002_triggers.sql
3. 003_indexes.sql
4. 004_rls.sql
5. 005_secure_current_profile.sql
6. 006_pending_users.sql
7. 007_invitations.sql
8. 008_rls_adjustments.sql
9. 009_policy_helpers.sql
10. 010_rpc_create_workspace.sql
11. 011_workspace_settings.sql
12. 012_daily_limits.sql
13. 013_transaction_validation.sql
14. 014_update_workspace_creation.sql
15. 015_role_management.sql

Notes

- These scripts assume hosted Supabase with `auth.users` available.
- Row Level Security (RLS) policies are included in 004_rls.sql (Task 3.3).
- If you already have some tables, run only the relevant parts or adjust `IF NOT EXISTS` accordingly.
