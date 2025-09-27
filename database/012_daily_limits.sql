-- 012_daily_limits.sql
-- Track daily transaction amounts per user

create table if not exists public.daily_transaction_limits (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  transaction_date date not null default current_date,
  total_amount_sent integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, transaction_date)
);

create index if not exists idx_daily_limits_profile_date on public.daily_transaction_limits(profile_id, transaction_date);

alter table public.daily_transaction_limits enable row level security;

-- Read: workspace members (for transparency)
drop policy if exists "daily_limits read" on public.daily_transaction_limits;
create policy "daily_limits read" on public.daily_transaction_limits
for select to authenticated using (
  exists (
    select 1 from public.profiles p
    where p.id = daily_transaction_limits.profile_id
      and public.is_member_of_workspace(p.workspace_id)
  )
);

-- Write: system only (via RPC)
drop policy if exists "daily_limits write system" on public.daily_transaction_limits;
create policy "daily_limits write system" on public.daily_transaction_limits
for all to authenticated with check (false);

-- Add trigger for updated_at
drop trigger if exists trg_daily_limits_updated_at on public.daily_transaction_limits;
create trigger trg_daily_limits_updated_at
before update on public.daily_transaction_limits
for each row execute function public.set_updated_at();
