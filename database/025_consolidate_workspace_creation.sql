-- 025_consolidate_workspace_creation.sql
-- Consolidate workspace creation to remove function overloading ambiguity
-- Drop all existing conflicting versions and create ONE authoritative function

-- ============================================================================
-- PHASE 1: Drop all existing versions of create_workspace_with_owner
-- ============================================================================

-- Version 1: 5 params (from 017_update_default_rewards.sql)
DROP FUNCTION IF EXISTS public.create_workspace_with_owner(text, text, text, integer, text);

-- Version 2: 11 params (from 010_rpc_create_workspace.sql)
DROP FUNCTION IF EXISTS public.create_workspace_with_owner(text, text, text, integer, text, integer, integer, integer, integer, text, text);

-- Version 3: 16 params (from 019_update_create_workspace_with_profile.sql)
DROP FUNCTION IF EXISTS public.create_workspace_with_owner(text, text, text, integer, text, integer, integer, integer, integer, text, text, text, text, text, text);

-- Version 4: 16 params + jsonb (from 024_workspace_departments.sql - most complete)
DROP FUNCTION IF EXISTS public.create_workspace_with_owner(text, text, text, integer, text, integer, integer, integer, integer, text, text, text, text, text, text, jsonb);

-- ============================================================================
-- PHASE 2: Create SINGLE AUTHORITATIVE version with all features
-- ============================================================================
-- This is the consolidated version that includes:
-- ✅ Full workspace settings (currency, allowances, limits)
-- ✅ Complete profile fields (username, job_title, bio, portfolio_url)
-- ✅ Department configuration (JSONB array)
-- ✅ Default badges and rewards creation
-- ✅ All sensible defaults for optional parameters

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
  p_full_name text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL,
  p_username text DEFAULT NULL,
  p_job_title text DEFAULT NULL,
  p_bio text DEFAULT NULL,
  p_portfolio_url text DEFAULT NULL,
  p_departments jsonb DEFAULT '["Frontend", "Backend", "UAT", "QA", "Design", "Marketing", "HR"]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid;
  v_profile_id uuid;
  v_auth_user_id uuid;
  v_final_username text;
BEGIN
  -- Get current authenticated user
  v_auth_user_id := auth.uid();
  
  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user already has a profile (shouldn't happen, but safety check)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE auth_user_id = v_auth_user_id) THEN
    RAISE EXCEPTION 'User already has a profile in another workspace';
  END IF;

  -- Create workspace
  INSERT INTO public.workspaces (name, slug, currency_name, monthly_allowance)
  VALUES (p_name, p_slug, p_currency_name, p_monthly_allowance)
  RETURNING id INTO v_workspace_id;

  -- Create workspace settings with all configuration including departments
  INSERT INTO public.workspace_settings (
    workspace_id,
    min_transaction_amount,
    max_transaction_amount,
    daily_limit_percentage,
    monthly_allowance,
    currency_name,
    departments
  ) VALUES (
    v_workspace_id,
    p_min_transaction_amount,
    p_max_transaction_amount,
    p_daily_limit_percentage,
    p_monthly_allowance,
    p_currency_name,
    p_departments
  );

  -- Generate username if not provided
  IF p_username IS NULL OR p_username = '' THEN
    v_final_username := split_part(p_owner_email, '@', 1);
    -- Ensure uniqueness within workspace
    WHILE EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE workspace_id = v_workspace_id AND username = v_final_username
    ) LOOP
      v_final_username := v_final_username || floor(random() * 1000)::text;
    END LOOP;
  ELSE
    v_final_username := p_username;
  END IF;

  -- Create owner profile with super_admin role and all profile fields
  INSERT INTO public.profiles (
    auth_user_id,
    workspace_id,
    email,
    full_name,
    avatar_url,
    username,
    job_title,
    bio,
    portfolio_url,
    role,
    giving_balance,
    redeemable_balance,
    department,
    active
  ) VALUES (
    v_auth_user_id,
    v_workspace_id,
    p_owner_email,
    p_full_name,
    p_avatar_url,
    v_final_username,
    p_job_title,
    p_bio,
    p_portfolio_url,
    'super_admin',
    p_monthly_allowance,
    0,
    p_departments->>0, -- Assign first department as default
    true
  )
  RETURNING id INTO v_profile_id;

  -- Create default badges for workspace
  PERFORM public.create_default_badges(v_workspace_id);
  
  -- Create default rewards for workspace
  PERFORM public.create_default_rewards(v_workspace_id);

  RETURN v_workspace_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_workspace_with_owner(
  text, text, text, integer, text, integer, integer, integer, integer,
  text, text, text, text, text, text, jsonb
) TO authenticated;

-- ============================================================================
-- CONSOLIDATION NOTES
-- ============================================================================
-- This migration consolidates 4 conflicting function signatures into 1 authoritative version.
-- 
-- Removed versions:
-- - 5-param version (incomplete, caused ambiguity)
-- - 11-param version (outdated, missing profile fields and departments)
-- - 16-param version without departments (partial implementation)
-- - 16-param version with departments (now the ONLY version)
--
-- All existing calls continue to work because:
-- ✅ All parameters have sensible defaults
-- ✅ Frontend already calls with all 16 parameters
-- ✅ No breaking changes to function signature
--
-- Benefits:
-- ✅ No more "Could not choose best candidate function" errors
-- ✅ Clear, explicit function contract
-- ✅ Single source of truth for workspace creation
-- ✅ Supports full feature set: profiles, departments, rewards, badges
