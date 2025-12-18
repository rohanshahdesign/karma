-- 024_workspace_departments.sql
-- Add configurable departments feature to workspaces

-- ============================================================================
-- PHASE 1: Add departments column to workspace_settings
-- ============================================================================

-- Add departments JSONB column with default values
ALTER TABLE public.workspace_settings 
ADD COLUMN IF NOT EXISTS departments jsonb NOT NULL DEFAULT '["Frontend", "Backend", "UAT", "QA", "Design", "Marketing", "HR"]'::jsonb;

-- Update existing workspace_settings records to have default departments
UPDATE public.workspace_settings 
SET departments = '["Frontend", "Backend", "UAT", "QA", "Design", "Marketing", "HR"]'::jsonb
WHERE departments IS NULL OR departments = 'null'::jsonb;

-- ============================================================================
-- PHASE 2: Auto-assign "Frontend" to existing profiles without department
-- ============================================================================

UPDATE public.profiles 
SET department = 'Frontend'
WHERE department IS NULL OR department = '';

-- ============================================================================
-- PHASE 3: Helper function to get workspace departments
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_workspace_departments(
  p_workspace_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_departments jsonb;
BEGIN
  -- Get departments from workspace_settings
  SELECT departments INTO v_departments
  FROM public.workspace_settings
  WHERE workspace_id = p_workspace_id;
  
  -- Return departments or default if not found
  IF v_departments IS NULL THEN
    RETURN '["Frontend", "Backend", "UAT", "QA", "Design", "Marketing", "HR"]'::jsonb;
  END IF;
  
  RETURN v_departments;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_workspace_departments(uuid) TO authenticated;

-- ============================================================================
-- PHASE 4: Update create_workspace_with_owner to accept departments
-- ============================================================================

DROP FUNCTION IF EXISTS public.create_workspace_with_owner(
  text, text, text, integer, text, integer, integer, integer, integer,
  text, text, text, text, text, text
) CASCADE;

DROP FUNCTION IF EXISTS public.create_workspace_with_owner(
  text, text, text, integer, text, integer, integer, integer, integer,
  text, text, text, text, text, text, jsonb, text
) CASCADE;

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
  p_departments jsonb DEFAULT '["Frontend", "Backend", "UAT", "QA", "Design", "Marketing", "HR"]'::jsonb,
  p_user_department text DEFAULT NULL
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
  v_final_department text;
  v_avatar_url text;
BEGIN
  -- Get current authenticated user
  v_auth_user_id := auth.uid();
  
  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- If avatar_url not provided, fetch from Google metadata
  IF p_avatar_url IS NULL OR p_avatar_url = '' THEN
    SELECT COALESCE(
      user_metadata->>'picture',
      user_metadata->>'avatar_url'
    ) INTO v_avatar_url
    FROM auth.users
    WHERE id = v_auth_user_id;
  ELSE
    v_avatar_url := p_avatar_url;
  END IF;

  -- Check if user already has a profile (shouldn't happen, but safety check)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE auth_user_id = v_auth_user_id) THEN
    RAISE EXCEPTION 'User already has a profile in another workspace';
  END IF;

  -- Create workspace
  INSERT INTO public.workspaces (name, slug, currency_name, monthly_allowance)
  VALUES (p_name, p_slug, p_currency_name, p_monthly_allowance)
  RETURNING id INTO v_workspace_id;

  -- Create workspace settings with departments
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

  -- Set user department, default to first if not provided
  IF p_user_department IS NOT NULL AND p_user_department != '' THEN
    v_final_department := p_user_department;
  ELSE
    v_final_department := p_departments->>0;
  END IF;

  -- Create owner profile with super_admin role
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
    v_avatar_url,
    v_final_username,
    p_job_title,
    p_bio,
    p_portfolio_url,
    'super_admin',
    p_monthly_allowance,
    0,
    v_final_department,
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_workspace_with_owner(
  text, text, text, integer, text, integer, integer, integer, integer, 
  text, text, text, text, text, text, jsonb, text
) TO authenticated;

-- ============================================================================
-- PHASE 5: Update join_workspace_with_code_enhanced to validate department
-- ============================================================================

CREATE OR REPLACE FUNCTION public.join_workspace_with_code_enhanced(
  p_invitation_code text,
  p_auth_user_id uuid,
  p_user_email text,
  p_full_name text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL,
  p_username text DEFAULT NULL,
  p_job_title text DEFAULT NULL,
  p_bio text DEFAULT NULL,
  p_portfolio_url text DEFAULT NULL,
  p_department text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation record;
  v_workspace_id uuid;
  v_profile_id uuid;
  v_final_username text;
  v_final_department text;
  v_workspace_departments jsonb;
  v_avatar_url text;
BEGIN
  -- Validate authentication context
  IF p_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user id is required';
  END IF;

  -- If avatar_url not provided, fetch from Google metadata
  IF p_avatar_url IS NULL OR p_avatar_url = '' THEN
    SELECT COALESCE(
      user_metadata->>'picture',
      user_metadata->>'avatar_url'
    ) INTO v_avatar_url
    FROM auth.users
    WHERE id = p_auth_user_id;
  ELSE
    v_avatar_url := p_avatar_url;
  END IF;

  -- Validate invitation code
  SELECT * INTO v_invitation
  FROM public.invitations
  WHERE code = p_invitation_code AND active = true;
  
  IF v_invitation IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation code';
  END IF;
  
  -- Check invitation hasn't exceeded max uses
  IF v_invitation.max_uses IS NOT NULL AND v_invitation.uses_count >= v_invitation.max_uses THEN
    RAISE EXCEPTION 'Invitation code has reached maximum uses';
  END IF;
  
  -- Check invitation hasn't expired
  IF v_invitation.expires_at IS NOT NULL AND v_invitation.expires_at < now() THEN
    RAISE EXCEPTION 'Invitation code has expired';
  END IF;
  
  v_workspace_id := v_invitation.workspace_id;
  
  -- Get workspace departments
  SELECT departments INTO v_workspace_departments
  FROM public.workspace_settings
  WHERE workspace_id = v_workspace_id;
  
  -- If no departments found, use defaults
  IF v_workspace_departments IS NULL THEN
    v_workspace_departments := '["Frontend", "Backend", "UAT", "QA", "Design", "Marketing", "HR"]'::jsonb;
  END IF;
  
  -- Validate and set department
  IF p_department IS NOT NULL AND p_department != '' THEN
    -- Check if provided department exists in workspace departments
    IF NOT (v_workspace_departments @> to_jsonb(p_department)) THEN
      RAISE EXCEPTION 'Invalid department. Must be one of the workspace configured departments.';
    END IF;
    v_final_department := p_department;
  ELSE
    -- If no department provided, assign first department as default
    v_final_department := v_workspace_departments->0;
  END IF;
  
  -- Generate username if not provided
  IF p_username IS NULL OR p_username = '' THEN
    v_final_username := split_part(p_user_email, '@', 1);
    -- Ensure uniqueness within workspace
    WHILE EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE workspace_id = v_workspace_id AND username = v_final_username
    ) LOOP
      v_final_username := v_final_username || floor(random() * 1000)::text;
    END LOOP;
  ELSE
    v_final_username := p_username;
    -- Check username uniqueness
    IF EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE workspace_id = v_workspace_id AND username = v_final_username
    ) THEN
      RAISE EXCEPTION 'Username already taken in this workspace';
    END IF;
  END IF;
  
  -- Create profile with enhanced fields and department
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
    department,
    role,
    giving_balance,
    redeemable_balance,
    active
  ) VALUES (
    p_auth_user_id,
    v_workspace_id,
    p_user_email,
    p_full_name,
    v_avatar_url,
    v_final_username,
    p_job_title,
    p_bio,
    p_portfolio_url,
    v_final_department,
    'employee',
    100, -- Default giving balance
    0,   -- Default redeemable balance
    true
  ) RETURNING id INTO v_profile_id;
  
  -- Update invitation usage count
  UPDATE public.invitations
  SET uses_count = uses_count + 1
  WHERE id = v_invitation.id;
  
  -- Create default badges for workspace if none exist
  IF NOT EXISTS (SELECT 1 FROM public.badges WHERE workspace_id = v_workspace_id LIMIT 1) THEN
    PERFORM public.create_default_badges(v_workspace_id);
  END IF;
  
  -- Create default rewards for workspace if none exist
  IF NOT EXISTS (SELECT 1 FROM public.rewards WHERE workspace_id = v_workspace_id LIMIT 1) THEN
    PERFORM public.create_default_rewards(v_workspace_id);
  END IF;
  
  -- Add activity feed entry for new member
  PERFORM public.add_activity_feed_entry(
    v_workspace_id,
    'member_joined',
    v_profile_id,
    NULL,
    json_build_object(
      'username', v_final_username,
      'full_name', p_full_name,
      'department', v_final_department
    )::jsonb
  );
  
  -- Check for any immediate badge awards
  PERFORM public.check_and_award_badges(v_profile_id);
  
  RETURN v_workspace_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.join_workspace_with_code_enhanced(
  text, uuid, text, text, text, text, text, text, text, text
) TO authenticated;

-- ============================================================================
-- FINAL NOTES
-- ============================================================================

-- This migration adds:
-- ✅ Departments JSONB column to workspace_settings
-- ✅ Default departments for all existing workspaces
-- ✅ Auto-assign "Frontend" to existing profiles
-- ✅ Helper function to get workspace departments
-- ✅ Updated create_workspace_with_owner to accept custom departments
-- ✅ Updated join_workspace_with_code_enhanced to validate and assign department
-- ✅ Department validation against workspace's configured departments
