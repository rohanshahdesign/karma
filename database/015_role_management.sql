-- 015_role_management.sql
-- RPC functions for role management

-- Promote user to admin (super admin only)
create or replace function public.promote_user_to_admin(
  p_target_profile_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_profile_id uuid;
  v_current_role text;
  v_target_profile record;
begin
  -- Get current user's profile
  select id, role into v_current_profile_id, v_current_role
  from public.profiles
  where auth_user_id = auth.uid();
  
  if v_current_profile_id is null then
    raise exception 'Current user profile not found';
  end if;

  -- Check if current user is super admin
  if v_current_role != 'super_admin' then
    raise exception 'Only super admins can promote users to admin';
  end if;

  -- Get target profile
  select * into v_target_profile
  from public.profiles
  where id = p_target_profile_id;
  
  if v_target_profile is null then
    raise exception 'Target profile not found';
  end if;

  -- Check if target is in same workspace
  if v_target_profile.workspace_id != (
    select workspace_id from public.profiles where id = v_current_profile_id
  ) then
    raise exception 'Target user must be in same workspace';
  end if;

  -- Check if target is currently an employee
  if v_target_profile.role != 'employee' then
    raise exception 'Can only promote employees to admin';
  end if;

  -- Promote to admin
  update public.profiles
  set role = 'admin'
  where id = p_target_profile_id;

  return true;
end;
$$;

-- Demote admin to employee (super admin only)
create or replace function public.demote_admin_to_employee(
  p_target_profile_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_profile_id uuid;
  v_current_role text;
  v_target_profile record;
begin
  -- Get current user's profile
  select id, role into v_current_profile_id, v_current_role
  from public.profiles
  where auth_user_id = auth.uid();
  
  if v_current_profile_id is null then
    raise exception 'Current user profile not found';
  end if;

  -- Check if current user is super admin
  if v_current_role != 'super_admin' then
    raise exception 'Only super admins can demote admins';
  end if;

  -- Get target profile
  select * into v_target_profile
  from public.profiles
  where id = p_target_profile_id;
  
  if v_target_profile is null then
    raise exception 'Target profile not found';
  end if;

  -- Check if target is in same workspace
  if v_target_profile.workspace_id != (
    select workspace_id from public.profiles where id = v_current_profile_id
  ) then
    raise exception 'Target user must be in same workspace';
  end if;

  -- Check if target is currently an admin (not super admin)
  if v_target_profile.role != 'admin' then
    raise exception 'Can only demote admins to employee';
  end if;

  -- Demote to employee
  update public.profiles
  set role = 'employee'
  where id = p_target_profile_id;

  return true;
end;
$$;

grant execute on function public.promote_user_to_admin(uuid) to authenticated;
grant execute on function public.demote_admin_to_employee(uuid) to authenticated;
