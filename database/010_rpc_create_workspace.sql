-- 010_rpc_create_workspace.sql
-- RPC to create a workspace and owner profile atomically, avoiding RLS issues on initial insert

create or replace function public.create_workspace_with_owner(
  p_name text,
  p_slug text,
  p_currency_name text,
  p_monthly_allowance integer,
  p_owner_email text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_auth_user uuid := auth.uid();
begin
  if v_auth_user is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.workspaces (name, slug, currency_name, monthly_allowance)
  values (p_name, p_slug, p_currency_name, p_monthly_allowance)
  returning id into v_workspace_id;

  insert into public.profiles (
    auth_user_id, workspace_id, email, role, giving_balance, redeemable_balance
  ) values (
    v_auth_user, v_workspace_id, p_owner_email, 'super_admin', 100, 0
  );

  -- clean up any pending_users entry
  delete from public.pending_users where auth_user_id = v_auth_user;

  return v_workspace_id;
end;
$$;

grant execute on function public.create_workspace_with_owner(text, text, text, integer, text) to authenticated;


