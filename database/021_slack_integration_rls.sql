-- 021_slack_integration_rls.sql
-- Row Level Security policies for Slack integration tables
-- Ensures proper access control for slack_identities and slack_memberships

-- Enable RLS on new tables
ALTER TABLE public.slack_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slack_memberships ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SLACK_IDENTITIES RLS POLICIES
-- ============================================================================

-- Users can view their own Slack identities
CREATE POLICY "Users can view own slack identities" ON public.slack_identities
  FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM public.profiles 
      WHERE auth_user_id = auth.uid()
    )
  );

-- Users can insert their own Slack identities
CREATE POLICY "Users can create own slack identities" ON public.slack_identities
  FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.profiles 
      WHERE auth_user_id = auth.uid()
    )
  );

-- Users can update their own Slack identities
CREATE POLICY "Users can update own slack identities" ON public.slack_identities
  FOR UPDATE
  USING (
    profile_id IN (
      SELECT id FROM public.profiles 
      WHERE auth_user_id = auth.uid()
    )
  );

-- Users can delete their own Slack identities
CREATE POLICY "Users can delete own slack identities" ON public.slack_identities
  FOR DELETE
  USING (
    profile_id IN (
      SELECT id FROM public.profiles 
      WHERE auth_user_id = auth.uid()
    )
  );

-- Admins can view all Slack identities in their workspace
CREATE POLICY "Admins can view workspace slack identities" ON public.slack_identities
  FOR SELECT
  USING (
    profile_id IN (
      SELECT p1.id FROM public.profiles p1
      INNER JOIN public.profiles p2 ON p1.workspace_id = p2.workspace_id
      WHERE p2.auth_user_id = auth.uid() 
        AND p2.role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- SLACK_MEMBERSHIPS RLS POLICIES  
-- ============================================================================

-- Users can view Slack memberships in their workspace
CREATE POLICY "Users can view workspace slack memberships" ON public.slack_memberships
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.profiles 
      WHERE auth_user_id = auth.uid()
    )
  );

-- Admins can manage Slack memberships in their workspace
CREATE POLICY "Admins can manage workspace slack memberships" ON public.slack_memberships
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.profiles 
      WHERE auth_user_id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    )
  );

-- System can create Slack memberships (for OAuth flow)
CREATE POLICY "System can create slack memberships" ON public.slack_memberships
  FOR INSERT
  WITH CHECK (true);

-- System can update Slack memberships (for sync)
CREATE POLICY "System can update slack memberships" ON public.slack_memberships
  FOR UPDATE
  USING (true);

-- ============================================================================
-- HELPER FUNCTIONS FOR SLACK INTEGRATION
-- ============================================================================

-- Function to get slack identity by profile ID
CREATE OR REPLACE FUNCTION get_slack_identity_by_profile(p_profile_id UUID, p_team_id TEXT DEFAULT NULL)
RETURNS TABLE(
  id UUID,
  profile_id UUID,
  slack_user_id TEXT,
  slack_team_id TEXT,
  slack_email TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    si.id,
    si.profile_id,
    si.slack_user_id,
    si.slack_team_id,
    si.slack_email,
    si.created_at,
    si.updated_at
  FROM public.slack_identities si
  WHERE si.profile_id = p_profile_id
    AND (p_team_id IS NULL OR si.slack_team_id = p_team_id);
END;
$$ LANGUAGE plpgsql;

-- Function to get profile by Slack user ID
CREATE OR REPLACE FUNCTION get_profile_by_slack_user(p_slack_user_id TEXT, p_team_id TEXT)
RETURNS TABLE(
  id UUID,
  auth_user_id UUID,
  workspace_id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT
) SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.auth_user_id,
    p.workspace_id,
    p.email,
    p.full_name,
    p.role
  FROM public.profiles p
  INNER JOIN public.slack_identities si ON p.id = si.profile_id
  WHERE si.slack_user_id = p_slack_user_id
    AND si.slack_team_id = p_team_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check if workspace is linked to Slack team
CREATE OR REPLACE FUNCTION is_workspace_linked_to_slack(p_workspace_id UUID, p_team_id TEXT)
RETURNS BOOLEAN SECURITY DEFINER AS $$
DECLARE
  workspace_team_id TEXT;
BEGIN
  SELECT slack_team_id INTO workspace_team_id
  FROM public.workspaces
  WHERE id = p_workspace_id;
  
  RETURN workspace_team_id = p_team_id;
END;
$$ LANGUAGE plpgsql;

-- Function to link workspace to Slack team
CREATE OR REPLACE FUNCTION link_workspace_to_slack_team(p_workspace_id UUID, p_team_id TEXT)
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
  -- Only allow linking if current user is admin of the workspace
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE workspace_id = p_workspace_id
      AND auth_user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
  ) THEN
    RETURN FALSE;
  END IF;

  UPDATE public.workspaces
  SET slack_team_id = p_team_id,
      updated_at = now()
  WHERE id = p_workspace_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;