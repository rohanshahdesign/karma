-- 020_slack_integration_schema.sql
-- Slack Integration Database Schema
-- Adds tables and fields required for Slack OAuth integration and workspace mapping

-- Add slack_team_id to workspaces table for Slack team mapping
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS slack_team_id TEXT UNIQUE;

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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_slack_identities_profile_id ON public.slack_identities(profile_id);
CREATE INDEX IF NOT EXISTS idx_slack_identities_slack_user_id ON public.slack_identities(slack_user_id);
CREATE INDEX IF NOT EXISTS idx_slack_identities_slack_team_id ON public.slack_identities(slack_team_id);

CREATE INDEX IF NOT EXISTS idx_slack_memberships_workspace_id ON public.slack_memberships(workspace_id);
CREATE INDEX IF NOT EXISTS idx_slack_memberships_slack_user_id ON public.slack_memberships(slack_user_id);
CREATE INDEX IF NOT EXISTS idx_slack_memberships_profile_id ON public.slack_memberships(profile_id);

CREATE INDEX IF NOT EXISTS idx_workspaces_slack_team_id ON public.workspaces(slack_team_id) WHERE slack_team_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON TABLE public.slack_identities IS 'Stores Slack OAuth connections for users, linking platform profiles to Slack identities';
COMMENT ON TABLE public.slack_memberships IS 'Tracks Slack workspace memberships and their association with platform users';
COMMENT ON COLUMN public.workspaces.slack_team_id IS 'Slack team ID for workspaces connected to Slack teams';

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