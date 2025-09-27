-- 011_workspace_settings.sql
-- Workspace settings for transaction limits and admin controls

create table if not exists public.workspace_settings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  min_transaction_amount integer not null default 5,
  max_transaction_amount integer not null default 20,
  daily_limit_percentage integer not null default 30, -- % of monthly allowance
  monthly_allowance integer not null default 100,
  currency_name text not null default 'Karma',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_workspace_settings_workspace on public.workspace_settings(workspace_id);

alter table public.workspace_settings enable row level security;

-- Read: workspace members
drop policy if exists "workspace_settings read" on public.workspace_settings;
create policy "workspace_settings read" on public.workspace_settings
for select to authenticated using (
  public.is_member_of_workspace(workspace_settings.workspace_id)
);

-- Write: admins only
drop policy if exists "workspace_settings write admin" on public.workspace_settings;
create policy "workspace_settings write admin" on public.workspace_settings
for all to authenticated using (
  public.is_admin_of_workspace(workspace_settings.workspace_id)
) with check (
  public.is_admin_of_workspace(workspace_settings.workspace_id)
);

-- Add trigger for updated_at
drop trigger if exists trg_workspace_settings_updated_at on public.workspace_settings;
create trigger trg_workspace_settings_updated_at
before update on public.workspace_settings
for each row execute function public.set_updated_at();
