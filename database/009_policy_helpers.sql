-- 009_policy_helpers.sql
-- Helper functions to avoid recursive policies on profiles

-- Ensure predictable search path
create or replace function public.is_member_of_workspace(w_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.workspace_id = w_id and p.auth_user_id = auth.uid()
  );
$$;

create or replace function public.is_admin_of_workspace(w_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.workspace_id = w_id
      and p.auth_user_id = auth.uid()
      and p.role in ('admin','super_admin')
  );
$$;

grant execute on function public.is_member_of_workspace(uuid) to authenticated;
grant execute on function public.is_admin_of_workspace(uuid) to authenticated;

-- Recreate profiles policies without self-referential subqueries
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles
for select to authenticated using (
  public.is_member_of_workspace(profiles.workspace_id)
);

drop policy if exists "profiles update self or admin" on public.profiles;
create policy "profiles update self or admin" on public.profiles
for update to authenticated using (
  profiles.auth_user_id = auth.uid() or public.is_admin_of_workspace(profiles.workspace_id)
) with check (
  profiles.auth_user_id = auth.uid() or public.is_admin_of_workspace(profiles.workspace_id)
);


