-- 0001_initial.sql
-- Consolidated initial schema

-- Supabase SQL editor does not support psql \i includes.
-- Paste of ../001_tables.sql
create extension if not exists "uuid-ossp";
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  currency_name text not null default 'Karma',
  monthly_allowance integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role text not null default 'employee',
  giving_balance integer not null default 0,
  redeemable_balance integer not null default 0,
  department text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, email)
);
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  sender_profile_id uuid not null references public.profiles(id) on delete restrict,
  receiver_profile_id uuid not null references public.profiles(id) on delete restrict,
  amount integer not null check (amount > 0),
  message text,
  created_at timestamptz not null default now()
);
create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  description text,
  image_url text,
  price integer not null check (price > 0),
  category text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  reward_id uuid not null references public.rewards(id) on delete restrict,
  status text not null default 'pending',
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text,
  icon_url text,
  criteria jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  achieved_at timestamptz not null default now(),
  unique (profile_id, badge_id)
);
create table if not exists public.integration_settings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  slack_webhook_url text,
  teams_webhook_url text,
  extra jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ==== Triggers ====
-- Paste of ../002_triggers.sql (compatible with Supabase editor)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_workspaces_updated_at on public.workspaces;
create trigger trg_workspaces_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_rewards_updated_at on public.rewards;
create trigger trg_rewards_updated_at
before update on public.rewards
for each row execute function public.set_updated_at();

drop trigger if exists trg_reward_redemptions_updated_at on public.reward_redemptions;
create trigger trg_reward_redemptions_updated_at
before update on public.reward_redemptions
for each row execute function public.set_updated_at();

drop trigger if exists trg_badges_updated_at on public.badges;
create trigger trg_badges_updated_at
before update on public.badges
for each row execute function public.set_updated_at();

drop trigger if exists trg_integration_settings_updated_at on public.integration_settings;
create trigger trg_integration_settings_updated_at
before update on public.integration_settings
for each row execute function public.set_updated_at();

-- ==== Indexes ====
-- Paste of ../003_indexes.sql
create index if not exists idx_profiles_workspace on public.profiles(workspace_id);
create index if not exists idx_profiles_auth_user on public.profiles(auth_user_id);
create index if not exists idx_tx_workspace_created on public.transactions(workspace_id, created_at desc);
create index if not exists idx_tx_sender on public.transactions(sender_profile_id, created_at desc);
create index if not exists idx_tx_receiver on public.transactions(receiver_profile_id, created_at desc);
create index if not exists idx_rewards_workspace_active on public.rewards(workspace_id, active);
create index if not exists idx_redemptions_workspace_status on public.reward_redemptions(workspace_id, status, created_at desc);
create index if not exists idx_badges_workspace_active on public.badges(workspace_id, active);
create index if not exists idx_user_badges_profile on public.user_badges(profile_id);
create index if not exists idx_integration_settings_workspace on public.integration_settings(workspace_id);

-- ==== RLS Policies ====
-- Paste of ../004_rls.sql (with view creation removed since we use a function)
alter table public.workspaces enable row level security;
alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_redemptions enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.integration_settings enable row level security;
drop policy if exists "workspaces read" on public.workspaces;
create policy "workspaces read" on public.workspaces for select to authenticated using (
  exists (select 1 from public.profiles pr where pr.workspace_id = workspaces.id and pr.auth_user_id = auth.uid())
);
drop policy if exists "workspaces write" on public.workspaces;
create policy "workspaces write" on public.workspaces for all to authenticated using (
  exists (select 1 from public.profiles pr where pr.workspace_id = workspaces.id and pr.auth_user_id = auth.uid() and pr.role in ('admin','super_admin'))
) with check (
  exists (select 1 from public.profiles pr where pr.workspace_id = workspaces.id and pr.auth_user_id = auth.uid() and pr.role in ('admin','super_admin'))
);
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated using (
  exists (select 1 from public.profiles me where me.workspace_id = profiles.workspace_id and me.auth_user_id = auth.uid())
);
drop policy if exists "profiles update self or admin" on public.profiles;
create policy "profiles update self or admin" on public.profiles for update to authenticated using (
  profiles.auth_user_id = auth.uid() or exists (select 1 from public.profiles me where me.workspace_id = profiles.workspace_id and me.auth_user_id = auth.uid() and me.role in ('admin','super_admin'))
) with check (
  profiles.auth_user_id = auth.uid() or exists (select 1 from public.profiles me where me.workspace_id = profiles.workspace_id and me.auth_user_id = auth.uid() and me.role in ('admin','super_admin'))
);
drop policy if exists "profiles insert none" on public.profiles;
create policy "profiles insert none" on public.profiles for insert to authenticated with check (false);
drop policy if exists "transactions read" on public.transactions;
create policy "transactions read" on public.transactions for select to authenticated using (
  exists (select 1 from public.profiles me where me.workspace_id = transactions.workspace_id and me.auth_user_id = auth.uid())
);
drop policy if exists "transactions insert sender only" on public.transactions;
create policy "transactions insert sender only" on public.transactions for insert to authenticated with check (
  exists (select 1 from public.profiles me where me.id = transactions.sender_profile_id and me.auth_user_id = auth.uid() and me.workspace_id = transactions.workspace_id)
);
drop policy if exists "rewards read" on public.rewards;
create policy "rewards read" on public.rewards for select to authenticated using (
  exists (select 1 from public.profiles me where me.workspace_id = rewards.workspace_id and me.auth_user_id = auth.uid())
);
drop policy if exists "rewards write admin" on public.rewards;
create policy "rewards write admin" on public.rewards for all to authenticated using (
  exists (select 1 from public.profiles me where me.workspace_id = rewards.workspace_id and me.auth_user_id = auth.uid() and me.role in ('admin','super_admin'))
) with check (
  exists (select 1 from public.profiles me where me.workspace_id = rewards.workspace_id and me.auth_user_id = auth.uid() and me.role in ('admin','super_admin'))
);
drop policy if exists "redemptions read" on public.reward_redemptions;
create policy "redemptions read" on public.reward_redemptions for select to authenticated using (
  exists (select 1 from public.profiles me where me.workspace_id = reward_redemptions.workspace_id and me.auth_user_id = auth.uid())
);
drop policy if exists "redemptions insert self" on public.reward_redemptions;
create policy "redemptions insert self" on public.reward_redemptions for insert to authenticated with check (
  exists (select 1 from public.profiles me where me.id = reward_redemptions.profile_id and me.auth_user_id = auth.uid() and me.workspace_id = reward_redemptions.workspace_id)
);
drop policy if exists "redemptions update admin" on public.reward_redemptions;
create policy "redemptions update admin" on public.reward_redemptions for update to authenticated using (
  exists (select 1 from public.profiles me where me.workspace_id = reward_redemptions.workspace_id and me.auth_user_id = auth.uid() and me.role in ('admin','super_admin'))
) with check (
  exists (select 1 from public.profiles me where me.workspace_id = reward_redemptions.workspace_id and me.auth_user_id = auth.uid() and me.role in ('admin','super_admin'))
);
drop policy if exists "badges read" on public.badges;
create policy "badges read" on public.badges for select to authenticated using (
  exists (select 1 from public.profiles me where me.workspace_id = badges.workspace_id and me.auth_user_id = auth.uid())
);
drop policy if exists "badges write admin" on public.badges;
create policy "badges write admin" on public.badges for all to authenticated using (
  exists (select 1 from public.profiles me where me.workspace_id = badges.workspace_id and me.auth_user_id = auth.uid() and me.role in ('admin','super_admin'))
) with check (
  exists (select 1 from public.profiles me where me.workspace_id = badges.workspace_id and me.auth_user_id = auth.uid() and me.role in ('admin','super_admin'))
);
drop policy if exists "user_badges read" on public.user_badges;
create policy "user_badges read" on public.user_badges for select to authenticated using (
  exists (select 1 from public.profiles me where me.workspace_id = user_badges.workspace_id and me.auth_user_id = auth.uid())
);
drop policy if exists "user_badges insert admin" on public.user_badges;
create policy "user_badges insert admin" on public.user_badges for insert to authenticated with check (
  exists (select 1 from public.profiles me where me.workspace_id = user_badges.workspace_id and me.auth_user_id = auth.uid() and me.role in ('admin','super_admin'))
);
drop policy if exists "integration_settings read admin" on public.integration_settings;
create policy "integration_settings read admin" on public.integration_settings for select to authenticated using (
  exists (select 1 from public.profiles me where me.workspace_id = integration_settings.workspace_id and me.auth_user_id = auth.uid() and me.role in ('admin','super_admin'))
);
drop policy if exists "integration_settings write admin" on public.integration_settings;
create policy "integration_settings write admin" on public.integration_settings for all to authenticated using (
  exists (select 1 from public.profiles me where me.workspace_id = integration_settings.workspace_id and me.auth_user_id = auth.uid() and me.role in ('admin','super_admin'))
) with check (
  exists (select 1 from public.profiles me where me.workspace_id = integration_settings.workspace_id and me.auth_user_id = auth.uid() and me.role in ('admin','super_admin'))
);

-- ==== Secure current profile helper ====
-- Paste of ../005_secure_current_profile.sql
drop view if exists public.current_profile;
create or replace function public.get_current_profile()
returns setof public.profiles language sql security invoker as $$
  select p.* from public.profiles p where p.auth_user_id = auth.uid();
$$;
grant execute on function public.get_current_profile() to authenticated;

-- Record migration as applied (safe to re-run)
insert into public.schema_migrations(filename)
values ('0001_initial.sql')
on conflict do nothing;


