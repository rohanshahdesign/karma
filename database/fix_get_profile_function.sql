-- Fix the get_profile_by_username function to resolve ambiguous column reference and allow service clients to pass the requestor id
-- Run this in Supabase SQL editor

DROP FUNCTION IF EXISTS public.get_profile_by_username(text, uuid);
DROP FUNCTION IF EXISTS public.get_profile_by_username(text, uuid, uuid);

-- Recreate the function with proper table aliases and explicit requestor handling
CREATE OR REPLACE FUNCTION public.get_profile_by_username(
  p_username text,
  p_workspace_id uuid DEFAULT NULL,
  p_requestor_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  auth_user_id uuid,
  workspace_id uuid,
  email text,
  full_name text,
  avatar_url text,
  username text,
  job_title text,
  bio text,
  portfolio_url text,
  role text,
  giving_balance integer,
  redeemable_balance integer,
  department text,
  active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_workspace_id uuid;
  v_requestor_id uuid;
BEGIN
  v_requestor_id := COALESCE(p_requestor_id, auth.uid());

  IF v_requestor_id IS NULL THEN
    RETURN;
  END IF;

  IF p_workspace_id IS NULL THEN
    SELECT p.workspace_id INTO v_current_workspace_id
    FROM public.profiles p
    WHERE p.auth_user_id = v_requestor_id
    LIMIT 1;
  ELSE
    v_current_workspace_id := p_workspace_id;
  END IF;

  IF v_current_workspace_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT p.id, p.auth_user_id, p.workspace_id, p.email, p.full_name, p.avatar_url,
         p.username, p.job_title, p.bio, p.portfolio_url, p.role, p.giving_balance,
         p.redeemable_balance, p.department, p.active, p.created_at, p.updated_at
  FROM public.profiles p
  WHERE p.username = p_username 
    AND p.workspace_id = v_current_workspace_id
    AND p.active = true
    AND EXISTS (
      SELECT 1 FROM public.profiles me
      WHERE me.workspace_id = p.workspace_id
        AND me.auth_user_id = v_requestor_id
        AND me.active = true
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_profile_by_username(text, uuid, uuid) TO authenticated;