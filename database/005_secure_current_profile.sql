-- 005_secure_current_profile.sql
-- Replace the public view with a SECURITY INVOKER function to avoid bypassing RLS.

-- Drop the view if it exists
drop view if exists public.current_profile;

-- Create a safe function that respects caller privileges and underlying RLS
create or replace function public.get_current_profile()
returns setof public.profiles
language sql
security invoker
as $$
  select p.*
  from public.profiles p
  where p.auth_user_id = auth.uid();
$$;

-- Optional: grant execute to authenticated users
grant execute on function public.get_current_profile() to authenticated;


