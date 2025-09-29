-- 010_rpc_create_workspace.sql
-- RPC to create a workspace and owner profile atomically, avoiding RLS issues on initial insert

create or replace function public.create_workspace_with_owner(
  p_name text,
  p_slug text,
  p_currency_name text,
  p_monthly_allowance integer,
  p_owner_email text,
  p_min_transaction_amount integer default 5,
  p_max_transaction_amount integer default 20,
  p_daily_limit_percentage integer default 30,
  p_reward_approval_threshold integer default 1000,
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
  v_auth_user uuid := auth.uid();
begin
  if v_auth_user is null then
    raise exception 'Not authenticated';
  end if;

  -- Create workspace with basic info
  insert into public.workspaces (
    name, slug, currency_name, monthly_allowance
  ) values (
    p_name, p_slug, p_currency_name, p_monthly_allowance
  ) returning id into v_workspace_id;

  -- Create workspace settings
  insert into public.workspace_settings (
    workspace_id, 
    min_transaction_amount, 
    max_transaction_amount, 
    daily_limit_percentage,
    monthly_allowance,
    currency_name
  ) values (
    v_workspace_id, 
    p_min_transaction_amount,
    p_max_transaction_amount,
    p_daily_limit_percentage,
    p_monthly_allowance,
    p_currency_name
  );

  -- Create owner profile with Google data
  insert into public.profiles (
    auth_user_id, workspace_id, email, full_name, avatar_url, role, giving_balance, redeemable_balance
  ) values (
    v_auth_user, v_workspace_id, p_owner_email, p_full_name, p_avatar_url, 'super_admin', p_monthly_allowance, 0
  );

  -- clean up any pending_users entry
  delete from public.pending_users where auth_user_id = v_auth_user;

  return v_workspace_id;
end;
$$;

grant execute on function public.create_workspace_with_owner(
  text, text, text, integer, text, integer, integer, integer, integer, text, text
) to authenticated;


