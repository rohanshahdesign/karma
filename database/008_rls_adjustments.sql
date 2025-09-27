-- 008_rls_adjustments.sql
-- Adjust policies to support onboarding flow (approach B)

-- 1) Allow creating a new workspace before having a profile
drop policy if exists "workspaces insert any" on public.workspaces;
create policy "workspaces insert any" on public.workspaces
for insert to authenticated with check (true);

-- 2) Allow users to insert their own profile (avoid recursion by not querying profiles here)
drop policy if exists "profiles insert none" on public.profiles;
drop policy if exists "profiles insert self or admin" on public.profiles;
create policy "profiles insert self" on public.profiles
for insert to authenticated with check (auth.uid() = auth_user_id);


