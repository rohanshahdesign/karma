-- Apply the updated create_workspace_with_owner function
-- Run this manually in your Supabase SQL editor after clearing data

-- Drop the existing function first
DROP FUNCTION IF EXISTS public.create_workspace_with_owner(text, text, text, integer, text, integer, integer, integer, integer, text, text);

-- Recreate with additional profile parameters
CREATE OR REPLACE FUNCTION public.create_workspace_with_owner(
  p_name text,
  p_slug text,
  p_currency_name text,
  p_monthly_allowance integer,
  p_owner_email text,
  p_min_transaction_amount integer DEFAULT 5,
  p_max_transaction_amount integer DEFAULT 20,
  p_daily_limit_percentage integer DEFAULT 30,
  p_reward_approval_threshold integer DEFAULT 1000,
  p_full_name text DEFAULT null,
  p_avatar_url text DEFAULT null,
  p_username text DEFAULT null,
  p_job_title text DEFAULT null,
  p_bio text DEFAULT null,
  p_portfolio_url text DEFAULT null
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY definer
SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid;
  v_auth_user uuid := auth.uid();
  v_final_username text;
BEGIN
  IF v_auth_user IS null THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Generate username from email if not provided
  IF p_username IS null OR p_username = '' THEN
    v_final_username := split_part(p_owner_email, '@', 1);
  ELSE
    v_final_username := p_username;
  END IF;

  -- Create workspace with basic info
  INSERT INTO public.workspaces (
    name, slug, currency_name, monthly_allowance
  ) VALUES (
    p_name, p_slug, p_currency_name, p_monthly_allowance
  ) RETURNING id INTO v_workspace_id;

  -- Create workspace settings
  INSERT INTO public.workspace_settings (
    workspace_id, 
    min_transaction_amount, 
    max_transaction_amount, 
    daily_limit_percentage,
    monthly_allowance,
    currency_name
  ) VALUES (
    v_workspace_id, 
    p_min_transaction_amount,
    p_max_transaction_amount,
    p_daily_limit_percentage,
    p_monthly_allowance,
    p_currency_name
  );

  -- Create owner profile with complete data
  INSERT INTO public.profiles (
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
  ) VALUES (
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
  PERFORM setup_default_rewards(v_workspace_id);
  
  -- Clean up any pending_users entry
  DELETE FROM public.pending_users WHERE auth_user_id = v_auth_user;

  RETURN v_workspace_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_workspace_with_owner(
  text, text, text, integer, text, integer, integer, integer, integer, text, text, text, text, text, text
) TO authenticated;