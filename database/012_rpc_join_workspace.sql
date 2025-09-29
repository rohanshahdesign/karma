-- 012_rpc_join_workspace.sql
-- RPC to join a workspace using invitation code with Google profile data

create or replace function public.join_workspace_with_code(
  p_invitation_code text,
  p_user_email text,
  p_full_name text default null,
  p_avatar_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_invitation_id uuid;
  v_auth_user uuid := auth.uid();
  v_monthly_allowance integer;
begin
  if v_auth_user is null then
    raise exception 'Not authenticated';
  end if;

  -- Find and validate the invitation
  select i.id, i.workspace_id, w.monthly_allowance
  into v_invitation_id, v_workspace_id, v_monthly_allowance
  from public.invitations i
  join public.workspaces w on w.id = i.workspace_id
  where i.code = p_invitation_code
    and i.active = true
    and (i.expires_at is null or i.expires_at > now())
    and (i.max_uses is null or i.uses_count < i.max_uses);

  if v_invitation_id is null then
    raise exception 'Invalid or expired invitation code';
  end if;

  -- Check if user is already a member
  if exists (select 1 from public.profiles where workspace_id = v_workspace_id and auth_user_id = v_auth_user) then
    raise exception 'User is already a member of this workspace';
  end if;

  -- Create profile for the new member
  insert into public.profiles (
    auth_user_id, workspace_id, email, full_name, avatar_url, role, giving_balance, redeemable_balance
  ) values (
    v_auth_user, v_workspace_id, p_user_email, p_full_name, p_avatar_url, 'employee', v_monthly_allowance, 0
  );

  -- Update invitation usage count
  update public.invitations
  set uses_count = uses_count + 1, updated_at = now()
  where id = v_invitation_id;

  -- Clean up any pending_users entry
  delete from public.pending_users where auth_user_id = v_auth_user;

  return v_workspace_id;
end;
$$;

grant execute on function public.join_workspace_with_code(text, text, text, text) to authenticated;