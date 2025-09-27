-- 006_pending_users.sql
-- Store authenticated users who haven't joined/created a workspace yet

create table if not exists public.pending_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.pending_users enable row level security;

-- Read/insert/update only by the same authenticated user
drop policy if exists "pending_users self read" on public.pending_users;
create policy "pending_users self read" on public.pending_users
for select to authenticated using (auth_user_id = auth.uid());

drop policy if exists "pending_users self write" on public.pending_users;
create policy "pending_users self write" on public.pending_users
for all to authenticated using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());


