-- 019_update_create_workspace_with_profile.sql
-- Update the create_workspace_with_owner function to include profile fields

-- Drop the existing function first
drop function if exists public.create_workspace_with_owner(text, text, text, integer, text, integer, integer, integer, integer, text, text);

-- Recreate with additional profile parameters
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
  p_avatar_url text default null,
  p_username text default null,
  p_job_title text default null,
  p_bio text default null,
  p_portfolio_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_auth_user uuid := auth.uid();
  v_final_username text;
begin
  if v_auth_user is null then
    raise exception 'Not authenticated';
  end if;

  -- Generate username from email if not provided
  if p_username is null or p_username = '' then
    v_final_username := split_part(p_owner_email, '@', 1);
  else
    v_final_username := p_username;
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

  -- Create owner profile with complete data
  insert into public.profiles (
    auth_user_id, 
    workspace_id, 
    email, 
    username,
    full_name, 
    avatar_url, 
    job_title,
    bio,
    portfolio_url,
    role, 
    giving_balance, 
    redeemable_balance
  ) values (
    v_auth_user, 
    v_workspace_id, 
    p_owner_email, 
    v_final_username,
    p_full_name, 
    p_avatar_url, 
    p_job_title,
    p_bio,
    p_portfolio_url,
    'super_admin', 
    p_monthly_allowance, 
    0
  );

  -- Set up default rewards and badges for the workspace
  perform setup_default_rewards(v_workspace_id);
  
  -- Clean up any pending_users entry
  delete from public.pending_users where auth_user_id = v_auth_user;

  return v_workspace_id;
end;
$$;

-- Grant execute permissions
grant execute on function public.create_workspace_with_owner(
  text, text, text, integer, text, integer, integer, integer, integer, text, text, text, text, text, text
) to authenticated;