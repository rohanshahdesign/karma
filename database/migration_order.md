# Database Migration Order

After running `drop_all_tables.sql`, run these migrations in **exact order** to recreate the database schema:

## Core Schema (Required Foundation)
1. **001_tables.sql** - Core tables (workspaces, profiles, transactions, rewards, etc.)
2. **002_triggers.sql** - updated_at triggers  
3. **003_indexes.sql** - Performance indexes
4. **004_rls.sql** - Row Level Security policies

## Authentication & Security
5. **005_secure_current_profile.sql** - Profile security functions
6. **006_pending_users.sql** - Pending users table for onboarding
7. **007_invitations.sql** - Workspace invitations system
8. **008_rls_adjustments.sql** - RLS policy adjustments
9. **009_policy_helpers.sql** - Helper functions for policies

## Enhanced Features
10. **010_rpc_create_workspace.sql** - Workspace creation RPC (with Google profile support)
11. **011_workspace_settings.sql** - Workspace settings table  
12. **011_pending_users_profile_fields.sql** - Add Google profile fields to pending_users
13. **012_daily_limits.sql** - Daily transaction limits
14. **012_rpc_join_workspace.sql** - Join workspace RPC (with Google profile support)
15. **013_transaction_validation.sql** - Transaction validation rules
16. **014_update_workspace_creation.sql** - Updates to workspace creation flow
17. **015_role_management.sql** - Role management enhancements

## Advanced Features
18. **016_enhanced_profiles_rewards_badges.sql** - Enhanced profiles, badges, and rewards system
19. **017_update_default_rewards.sql** - Updated default rewards (Learning/Time Off focus) for all workspaces

## Notes:
- Run each file completely before moving to the next
- Some files have duplicate numbers (011, 012) - run all of them as listed above
- The schema includes Google profile support (`full_name`, `avatar_url`) in both `profiles` and `pending_users` tables
- RPC functions support Google profile data for workspace creation and joining

## Quick Command (PowerShell):
```powershell
# Run in Supabase SQL Editor or via CLI
Get-Content "database\001_tables.sql" | # paste into SQL editor and run
# ... repeat for each file in order
```