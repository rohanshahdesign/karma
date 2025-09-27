-- 007_invitations.sql
-- Workspace invitations via code and link token

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by_profile_id uuid not null references public.profiles(id) on delete cascade,
  code text not null, -- 6-char alphanumeric
  token uuid not null default gen_random_uuid(), -- for invite links
  expires_at timestamptz,
  max_uses integer,
  uses_count integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (workspace_id, code),
  unique (token)
);

create index if not exists idx_invitations_workspace on public.invitations(workspace_id);

alter table public.invitations enable row level security;

-- Read: workspace members (so they can see/manage invitations)
drop policy if exists "invitations read members" on public.invitations;
create policy "invitations read members" on public.invitations
for select to authenticated using (
  exists (
    select 1 from public.profiles me
    where me.workspace_id = invitations.workspace_id
      and me.auth_user_id = auth.uid()
  )
);

-- Write: admins/super_admins only
drop policy if exists "invitations write admin" on public.invitations;
create policy "invitations write admin" on public.invitations
for all to authenticated using (
  exists (
    select 1 from public.profiles me
    where me.workspace_id = invitations.workspace_id
      and me.auth_user_id = auth.uid()
      and me.role in ('admin','super_admin')
  )
) with check (
  exists (
    select 1 from public.profiles me
    where me.workspace_id = invitations.workspace_id
      and me.auth_user_id = auth.uid()
      and me.role in ('admin','super_admin')
  )
);


