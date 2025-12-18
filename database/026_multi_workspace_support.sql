-- 026_multi_workspace_support.sql
-- Enable multi-workspace support with workspace logos and user preferences
-- Key constraint: 1 user = 1 profile per workspace (unique on auth_user_id, workspace_id)

-- ============================================================================
-- PHASE 1: Schema Updates
-- ============================================================================

-- Add logo_url to workspaces table
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS logo_url text;

-- Remove UNIQUE constraint on auth_user_id to allow user in multiple workspaces
-- Note: profiles table already has unique(workspace_id, email) and unique(workspace_id, auth_user_id)
-- We need to drop the global UNIQUE on auth_user_id and ensure unique per workspace

ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_auth_user_id_key;

-- Create user_preferences table to track current active workspace
CREATE TABLE IF NOT EXISTS public.user_preferences (
  auth_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create unique constraint on workspace per user (drop if exists, then add)
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_auth_user_id_workspace_id_unique;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_auth_user_id_workspace_id_unique 
UNIQUE (auth_user_id, workspace_id);

-- ============================================================================
-- PHASE 2: RLS Policies for new tables
-- ============================================================================

-- Enable RLS on user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read and write their own preferences
DROP POLICY IF EXISTS "user_preferences self" ON public.user_preferences;
CREATE POLICY "user_preferences self" ON public.user_preferences
FOR ALL
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- ============================================================================
-- PHASE 3: New RPC Functions
-- ============================================================================

-- Get all workspaces for authenticated user
CREATE OR REPLACE FUNCTION public.get_user_workspaces()
RETURNS TABLE (
  workspace_id uuid,
  workspace_name text,
  workspace_slug text,
  logo_url text,
  currency_name text,
  user_role text,
  profile_id uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    w.id,
    w.name,
    w.slug,
    w.logo_url,
    w.currency_name,
    p.role,
    p.id
  FROM public.workspaces w
  INNER JOIN public.profiles p ON p.workspace_id = w.id
  WHERE p.auth_user_id = auth.uid()
  ORDER BY p.updated_at DESC;
$$;

-- Get current active workspace for user
CREATE OR REPLACE FUNCTION public.get_current_workspace()
RETURNS TABLE (
  workspace_id uuid,
  workspace_name text,
  workspace_slug text,
  logo_url text,
  currency_name text,
  user_role text,
  profile_id uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    w.id,
    w.name,
    w.slug,
    w.logo_url,
    w.currency_name,
    p.role,
    p.id
  FROM public.workspaces w
  INNER JOIN public.profiles p ON p.workspace_id = w.id
  LEFT JOIN public.user_preferences up ON up.auth_user_id = auth.uid()
  WHERE p.auth_user_id = auth.uid()
    AND (
      up.current_workspace_id = w.id 
      OR (up.current_workspace_id IS NULL AND p.role = 'super_admin')
      OR (up.current_workspace_id IS NULL AND w.id = (
        SELECT workspace_id FROM public.profiles 
        WHERE auth_user_id = auth.uid() 
        ORDER BY role DESC LIMIT 1
      ))
    )
  LIMIT 1;
$$;

-- Switch user's active workspace
CREATE OR REPLACE FUNCTION public.switch_workspace(p_workspace_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user_id uuid;
  v_has_access boolean;
BEGIN
  v_auth_user_id := auth.uid();
  
  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify user has profile in target workspace
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE auth_user_id = v_auth_user_id 
      AND workspace_id = p_workspace_id
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'User does not have access to workspace';
  END IF;

  -- Upsert user preference
  INSERT INTO public.user_preferences (auth_user_id, current_workspace_id, updated_at)
  VALUES (v_auth_user_id, p_workspace_id, now())
  ON CONFLICT (auth_user_id) 
  DO UPDATE SET current_workspace_id = p_workspace_id, updated_at = now();

  RETURN true;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_workspaces() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_workspace() TO authenticated;
GRANT EXECUTE ON FUNCTION public.switch_workspace(uuid) TO authenticated;

-- ============================================================================
-- PHASE 4: Update create_workspace_with_owner function
-- ============================================================================

-- Drop old versions and recreate with avatar_url auto-fetch
DROP FUNCTION IF EXISTS public.create_workspace_with_owner(
  text, text, text, integer, text, integer, integer, integer, integer,
  text, text, text, text, text, text, jsonb, text, text
) CASCADE;

DROP FUNCTION IF EXISTS public.create_workspace_with_owner(
  text, text, text, integer, text, integer, integer, integer, integer,
  text, text, text, text, text, text, jsonb, text
) CASCADE;

DROP FUNCTION IF EXISTS public.create_workspace_with_owner(
  text, text, text, integer, text, integer, integer, integer, integer,
  text, text, text, text, text, text, jsonb
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
  p_logo_url text DEFAULT NULL,
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

  -- Create workspace with optional logo
  INSERT INTO public.workspaces (name, slug, currency_name, monthly_allowance, logo_url)
  VALUES (p_name, p_slug, p_currency_name, p_monthly_allowance, p_logo_url)
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

  -- Set user department, default to first if not provided
  IF p_user_department IS NOT NULL AND p_user_department != '' THEN
    v_final_department := p_user_department;
  ELSE
    v_final_department := p_departments->>0;
  END IF;

  -- Create owner profile with super_admin role (no more uniqueness check on auth_user_id)
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

  -- Set this as user's current workspace
  INSERT INTO public.user_preferences (auth_user_id, current_workspace_id)
  VALUES (v_auth_user_id, v_workspace_id)
  ON CONFLICT (auth_user_id) DO UPDATE SET current_workspace_id = v_workspace_id;

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
  text, text, text, text, text, text, jsonb, text, text
) TO authenticated;

-- ============================================================================
-- CONSOLIDATION NOTES
-- ============================================================================
-- Multi-Workspace Support Implementation:
-- 
-- Key Design Decisions:
-- ✅ One profile per user per workspace (unique on auth_user_id, workspace_id)
-- ✅ user_preferences table tracks currently active workspace
-- ✅ Separate bucket per workspace: {slug}-{id}
-- ✅ Logo is optional on workspaces table
-- ✅ All RLS policies already workspace-scoped, work transparently
--
-- New Capabilities:
-- ✅ Users can be members of multiple workspaces
-- ✅ Each workspace can be switched to via switch_workspace()
-- ✅ Frontend can query get_user_workspaces() to show workspace list
-- ✅ Workspace logos support branding
--
-- Migration Path:
-- ✅ Existing single-workspace users automatically work
-- ✅ First workspace stays as primary, others can be joined
-- ✅ RLS policies unchanged, work with new architecture
