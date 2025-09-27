-- 014_update_workspace_creation.sql
-- Update workspace creation to include default settings

create or replace function public.create_workspace_with_owner(
  p_name text,
  p_slug text,
  p_currency_name text,
  p_monthly_allowance integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_auth_user uuid := auth.uid();
  v_user_email text;
begin
  if v_auth_user is null then
    raise exception 'Not authenticated';
  end if;

  -- Get user email
  select email into v_user_email from auth.users where id = v_auth_user;

  -- Create workspace
  insert into public.workspaces (name, slug, currency_name, monthly_allowance)
  values (p_name, p_slug, p_currency_name, p_monthly_allowance)
  returning id into v_workspace_id;

  -- Create default workspace settings
  insert into public.workspace_settings (
    workspace_id, 
    min_transaction_amount, 
    max_transaction_amount, 
    daily_limit_percentage,
    monthly_allowance,
    currency_name
  ) values (
    v_workspace_id, 
    5, 
    20, 
    30,
    p_monthly_allowance,
    p_currency_name
  );

  -- Create owner profile
  insert into public.profiles (
    auth_user_id, workspace_id, email, role, giving_balance, redeemable_balance
  ) values (
    v_auth_user, v_workspace_id, v_user_email, 'super_admin', p_monthly_allowance, 0
  );

  -- Clean up any pending_users entry
  delete from public.pending_users where auth_user_id = v_auth_user;

  return v_workspace_id;
end;
$$;

grant execute on function public.create_workspace_with_owner(text, text, text, integer) to authenticated;
