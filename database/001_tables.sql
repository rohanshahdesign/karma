-- 001_tables.sql
-- Core tables: workspaces, profiles, transactions, rewards, reward_redemptions, badges, user_badges, integration_settings

-- Extensions (if needed)
create extension if not exists "uuid-ossp";

-- Workspaces
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  currency_name text not null default 'Karma',
  monthly_allowance integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Profiles (users per workspace)
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role text not null default 'employee', -- employee | admin | super_admin
  giving_balance integer not null default 0,
  redeemable_balance integer not null default 0,
  department text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, email)
);

-- Transactions (kudos transfers)
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  sender_profile_id uuid not null references public.profiles(id) on delete restrict,
  receiver_profile_id uuid not null references public.profiles(id) on delete restrict,
  amount integer not null check (amount > 0),
  message text,
  created_at timestamptz not null default now()
);

-- Rewards catalog
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

-- Reward redemptions
create table if not exists public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  reward_id uuid not null references public.rewards(id) on delete restrict,
  status text not null default 'pending', -- pending | approved | rejected | fulfilled
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Badges definitions
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

-- User badges
create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  achieved_at timestamptz not null default now(),
  unique (profile_id, badge_id)
);

-- Integration settings
create table if not exists public.integration_settings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  slack_webhook_url text,
  teams_webhook_url text,
  extra jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


