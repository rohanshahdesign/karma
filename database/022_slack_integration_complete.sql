-- 022_slack_integration_complete.sql
-- Complete Slack Integration Migration
-- Includes all Slack-related tables, policies, functions, and audit logging
-- Run this after all existing migrations (after 017_update_default_rewards.sql)

-- ============================================================================
-- SLACK INTEGRATION TABLES
-- ============================================================================

-- Add slack_team_id to workspaces table for Slack team mapping
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS slack_team_id TEXT UNIQUE;

-- Add index for Slack team lookups
CREATE INDEX IF NOT EXISTS idx_workspaces_slack_team_id ON public.workspaces(slack_team_id) WHERE slack_team_id IS NOT NULL;

-- Create SlackIdentity table to store Slack user connections
CREATE TABLE IF NOT EXISTS public.slack_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slack_user_id TEXT NOT NULL,
  slack_team_id TEXT NOT NULL,
  slack_email TEXT,
  access_token TEXT NOT NULL, -- Encrypted in application layer
  refresh_token TEXT,         -- Encrypted in application layer
  token_expires_at TIMESTAMPTZ,
  scope TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure one Slack identity per profile per team
  UNIQUE (profile_id, slack_team_id),
  -- Ensure one profile per slack user per team
  UNIQUE (slack_user_id, slack_team_id)
);

-- Create SlackMembership table to track Slack workspace memberships
CREATE TABLE IF NOT EXISTS public.slack_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  slack_user_id TEXT NOT NULL,
  slack_team_id TEXT NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure one membership record per slack user per workspace
  UNIQUE (workspace_id, slack_user_id)
);

-- Create Slack audit logs table for security and compliance
CREATE TABLE IF NOT EXISTS public.slack_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  slack_user_id TEXT,
  slack_team_id TEXT,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  command TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- SlackIdentity indexes
CREATE INDEX IF NOT EXISTS idx_slack_identities_profile_id ON public.slack_identities(profile_id);
CREATE INDEX IF NOT EXISTS idx_slack_identities_slack_user_id ON public.slack_identities(slack_user_id);
CREATE INDEX IF NOT EXISTS idx_slack_identities_slack_team_id ON public.slack_identities(slack_team_id);

-- SlackMembership indexes  
CREATE INDEX IF NOT EXISTS idx_slack_memberships_workspace_id ON public.slack_memberships(workspace_id);
CREATE INDEX IF NOT EXISTS idx_slack_memberships_slack_user_id ON public.slack_memberships(slack_user_id);
CREATE INDEX IF NOT EXISTS idx_slack_memberships_profile_id ON public.slack_memberships(profile_id);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_slack_audit_logs_event_type ON public.slack_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_slack_audit_logs_slack_team_id ON public.slack_audit_logs(slack_team_id);
CREATE INDEX IF NOT EXISTS idx_slack_audit_logs_profile_id ON public.slack_audit_logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_slack_audit_logs_workspace_id ON public.slack_audit_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_slack_audit_logs_created_at ON public.slack_audit_logs(created_at);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.slack_identities IS 'Stores Slack OAuth connections for users, linking platform profiles to Slack identities';
COMMENT ON TABLE public.slack_memberships IS 'Tracks Slack workspace memberships and their association with platform users';
COMMENT ON TABLE public.slack_audit_logs IS 'Audit trail for all Slack integration operations for security and compliance';
COMMENT ON COLUMN public.workspaces.slack_team_id IS 'Slack team ID for workspaces connected to Slack teams';

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

-- Add updated_at trigger for slack_identities
CREATE OR REPLACE FUNCTION update_slack_identities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_slack_identities_updated_at
  BEFORE UPDATE ON public.slack_identities
  FOR EACH ROW
  EXECUTE FUNCTION update_slack_identities_updated_at();

-- Add updated_at trigger for slack_memberships  
CREATE OR REPLACE FUNCTION update_slack_memberships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_slack_memberships_updated_at
  BEFORE UPDATE ON public.slack_memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_slack_memberships_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.slack_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slack_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slack_audit_logs ENABLE ROW LEVEL SECURITY;

-- SLACK_IDENTITIES RLS POLICIES

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

-- SLACK_MEMBERSHIPS RLS POLICIES  

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

-- SLACK_AUDIT_LOGS RLS POLICIES

-- Admins can view audit logs for their workspace
CREATE POLICY "Admins can view workspace slack audit logs" ON public.slack_audit_logs
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.profiles 
      WHERE auth_user_id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    )
  );

-- System can insert audit logs
CREATE POLICY "System can create slack audit logs" ON public.slack_audit_logs
  FOR INSERT
  WITH CHECK (true);

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

-- Function to get workspace by Slack team ID
CREATE OR REPLACE FUNCTION get_workspace_by_slack_team(p_team_id TEXT)
RETURNS TABLE(
  id UUID,
  name TEXT,
  slug TEXT,
  currency_name TEXT,
  slack_team_id TEXT
) SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.name,
    w.slug,
    w.currency_name,
    w.slack_team_id
  FROM public.workspaces w
  WHERE w.slack_team_id = p_team_id;
END;
$$ LANGUAGE plpgsql;

-- Function to sync Slack membership
CREATE OR REPLACE FUNCTION sync_slack_membership(
  p_workspace_id UUID,
  p_slack_user_id TEXT,
  p_slack_team_id TEXT,
  p_profile_id UUID DEFAULT NULL
)
RETURNS UUID SECURITY DEFINER AS $$
DECLARE
  membership_id UUID;
BEGIN
  INSERT INTO public.slack_memberships (
    workspace_id,
    slack_user_id,
    slack_team_id,
    profile_id,
    is_active
  ) VALUES (
    p_workspace_id,
    p_slack_user_id,
    p_slack_team_id,
    p_profile_id,
    true
  ) 
  ON CONFLICT (workspace_id, slack_user_id)
  DO UPDATE SET
    profile_id = EXCLUDED.profile_id,
    is_active = true,
    updated_at = now()
  RETURNING id INTO membership_id;
  
  RETURN membership_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MIGRATION COMPLETION LOG
-- ============================================================================

-- Log that this migration was completed
DO $$
BEGIN
  -- This will help track migration status
  RAISE NOTICE 'Slack Integration Migration (022_slack_integration_complete.sql) completed successfully';
  RAISE NOTICE 'Tables created: slack_identities, slack_memberships, slack_audit_logs';
  RAISE NOTICE 'RLS policies enabled for all Slack tables';
  RAISE NOTICE 'Helper functions created for Slack operations';
  RAISE NOTICE 'Workspace table updated with slack_team_id column';
END $$;