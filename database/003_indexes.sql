-- 003_indexes.sql
-- Helpful indexes for common lookups

-- Profiles
create index if not exists idx_profiles_workspace on public.profiles(workspace_id);
create index if not exists idx_profiles_auth_user on public.profiles(auth_user_id);

-- Transactions (most frequent filters)
create index if not exists idx_tx_workspace_created on public.transactions(workspace_id, created_at desc);
create index if not exists idx_tx_sender on public.transactions(sender_profile_id, created_at desc);
create index if not exists idx_tx_receiver on public.transactions(receiver_profile_id, created_at desc);

-- Rewards & redemptions
create index if not exists idx_rewards_workspace_active on public.rewards(workspace_id, active);
create index if not exists idx_redemptions_workspace_status on public.reward_redemptions(workspace_id, status, created_at desc);

-- Badges
create index if not exists idx_badges_workspace_active on public.badges(workspace_id, active);
create index if not exists idx_user_badges_profile on public.user_badges(profile_id);

-- Integration settings
create index if not exists idx_integration_settings_workspace on public.integration_settings(workspace_id);


