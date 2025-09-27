-- 004_rls.sql
-- Row Level Security policies for core tables
-- Assumptions:
-- - auth.users(id) represents the authenticated user id
-- - public.profiles.auth_user_id links to auth.users(id)
-- - Role values: employee | admin | super_admin

-- Helper: current profile for authenticated user
create or replace view public.current_profile as
  select p.*
  from public.profiles p
  where p.auth_user_id = auth.uid();

-- Enable RLS on all tables
alter table public.workspaces enable row level security;
alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_redemptions enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.integration_settings enable row level security;

-- Workspaces
-- Read: any member of the workspace can read
drop policy if exists "workspaces read" on public.workspaces;
create policy "workspaces read" on public.workspaces
for select
to authenticated
using (
  exists (
    select 1 from public.profiles pr
    where pr.workspace_id = workspaces.id and pr.auth_user_id = auth.uid()
  )
);

-- Update/Insert/Delete: admins or super_admins only
drop policy if exists "workspaces write" on public.workspaces;
create policy "workspaces write" on public.workspaces
for all
to authenticated
using (
  exists (
    select 1 from public.profiles pr
    where pr.workspace_id = workspaces.id
      and pr.auth_user_id = auth.uid()
      and pr.role in ('admin','super_admin')
  )
)
with check (
  exists (
    select 1 from public.profiles pr
    where pr.workspace_id = workspaces.id
      and pr.auth_user_id = auth.uid()
      and pr.role in ('admin','super_admin')
  )
);

-- Profiles
-- Read: members of same workspace can read limited profile fields
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles
for select
to authenticated
using (
  exists (
    select 1 from public.profiles me
    where me.workspace_id = profiles.workspace_id
      and me.auth_user_id = auth.uid()
  )
);

-- Update: user can update their own profile; admins can update any in workspace
drop policy if exists "profiles update self or admin" on public.profiles;
create policy "profiles update self or admin" on public.profiles
for update
to authenticated
using (
  profiles.auth_user_id = auth.uid()
  or exists (
    select 1 from public.profiles me
    where me.workspace_id = profiles.workspace_id
      and me.auth_user_id = auth.uid()
      and me.role in ('admin','super_admin')
  )
)
with check (
  profiles.auth_user_id = auth.uid()
  or exists (
    select 1 from public.profiles me
    where me.workspace_id = profiles.workspace_id
      and me.auth_user_id = auth.uid()
      and me.role in ('admin','super_admin')
  )
);

-- Insert: allow system-driven inserts only (e.g., via RPC/admin). Default deny.
drop policy if exists "profiles insert none" on public.profiles;
create policy "profiles insert none" on public.profiles
for insert to authenticated with check (false);

-- Transactions
-- Read: members of the same workspace
drop policy if exists "transactions read" on public.transactions;
create policy "transactions read" on public.transactions
for select
to authenticated
using (
  exists (
    select 1 from public.profiles me
    where me.workspace_id = transactions.workspace_id
      and me.auth_user_id = auth.uid()
  )
);

-- Insert: user can create transactions where they are the sender and in their workspace
drop policy if exists "transactions insert sender only" on public.transactions;
create policy "transactions insert sender only" on public.transactions
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles me
    where me.id = transactions.sender_profile_id
      and me.auth_user_id = auth.uid()
      and me.workspace_id = transactions.workspace_id
  )
);

-- Rewards
-- Read: members of workspace
drop policy if exists "rewards read" on public.rewards;
create policy "rewards read" on public.rewards
for select
to authenticated
using (
  exists (
    select 1 from public.profiles me
    where me.workspace_id = rewards.workspace_id
      and me.auth_user_id = auth.uid()
  )
);

-- Write: admins of workspace
drop policy if exists "rewards write admin" on public.rewards;
create policy "rewards write admin" on public.rewards
for all
to authenticated
using (
  exists (
    select 1 from public.profiles me
    where me.workspace_id = rewards.workspace_id
      and me.auth_user_id = auth.uid()
      and me.role in ('admin','super_admin')
  )
)
with check (
  exists (
    select 1 from public.profiles me
    where me.workspace_id = rewards.workspace_id
      and me.auth_user_id = auth.uid()
      and me.role in ('admin','super_admin')
  )
);

-- Reward redemptions
-- Read: members of workspace (so admins can review)
drop policy if exists "redemptions read" on public.reward_redemptions;
create policy "redemptions read" on public.reward_redemptions
for select
to authenticated
using (
  exists (
    select 1 from public.profiles me
    where me.workspace_id = reward_redemptions.workspace_id
      and me.auth_user_id = auth.uid()
  )
);

-- Insert: user can request redemption for themselves in their workspace
drop policy if exists "redemptions insert self" on public.reward_redemptions;
create policy "redemptions insert self" on public.reward_redemptions
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles me
    where me.id = reward_redemptions.profile_id
      and me.auth_user_id = auth.uid()
      and me.workspace_id = reward_redemptions.workspace_id
  )
);

-- Update: admins can change status (approve/reject/fulfill)
drop policy if exists "redemptions update admin" on public.reward_redemptions;
create policy "redemptions update admin" on public.reward_redemptions
for update
to authenticated
using (
  exists (
    select 1 from public.profiles me
    where me.workspace_id = reward_redemptions.workspace_id
      and me.auth_user_id = auth.uid()
      and me.role in ('admin','super_admin')
  )
)
with check (
  exists (
    select 1 from public.profiles me
    where me.workspace_id = reward_redemptions.workspace_id
      and me.auth_user_id = auth.uid()
      and me.role in ('admin','super_admin')
  )
);

-- Badges
-- Read: members of workspace
drop policy if exists "badges read" on public.badges;
create policy "badges read" on public.badges
for select to authenticated using (
  exists (
    select 1 from public.profiles me
    where me.workspace_id = badges.workspace_id
      and me.auth_user_id = auth.uid()
  )
);

-- Write: admins
drop policy if exists "badges write admin" on public.badges;
create policy "badges write admin" on public.badges
for all to authenticated using (
  exists (
    select 1 from public.profiles me
    where me.workspace_id = badges.workspace_id
      and me.auth_user_id = auth.uid()
      and me.role in ('admin','super_admin')
  )
) with check (
  exists (
    select 1 from public.profiles me
    where me.workspace_id = badges.workspace_id
      and me.auth_user_id = auth.uid()
      and me.role in ('admin','super_admin')
  )
);

-- User badges
-- Read: members of workspace
drop policy if exists "user_badges read" on public.user_badges;
create policy "user_badges read" on public.user_badges
for select to authenticated using (
  exists (
    select 1 from public.profiles me
    where me.workspace_id = user_badges.workspace_id
      and me.auth_user_id = auth.uid()
  )
);

-- Insert: admins (awarding badges)
drop policy if exists "user_badges insert admin" on public.user_badges;
create policy "user_badges insert admin" on public.user_badges
for insert to authenticated with check (
  exists (
    select 1 from public.profiles me
    where me.workspace_id = user_badges.workspace_id
      and me.auth_user_id = auth.uid()
      and me.role in ('admin','super_admin')
  )
);

-- Integration settings
-- Read: admins of workspace only (contains secrets)
drop policy if exists "integration_settings read admin" on public.integration_settings;
create policy "integration_settings read admin" on public.integration_settings
for select to authenticated using (
  exists (
    select 1 from public.profiles me
    where me.workspace_id = integration_settings.workspace_id
      and me.auth_user_id = auth.uid()
      and me.role in ('admin','super_admin')
  )
);

-- Write: admins only
drop policy if exists "integration_settings write admin" on public.integration_settings;
create policy "integration_settings write admin" on public.integration_settings
for all to authenticated using (
  exists (
    select 1 from public.profiles me
    where me.workspace_id = integration_settings.workspace_id
      and me.auth_user_id = auth.uid()
      and me.role in ('admin','super_admin')
  )
) with check (
  exists (
    select 1 from public.profiles me
    where me.workspace_id = integration_settings.workspace_id
      and me.auth_user_id = auth.uid()
      and me.role in ('admin','super_admin')
  )
);


