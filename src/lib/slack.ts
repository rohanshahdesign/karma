// Slack Integration Utilities
// Functions for managing Slack OAuth, identity linking, and workspace associations

import { supabaseServer } from './supabase-server';
import {
  SlackIdentity,
  SlackMembership,
  SlackIdentityInsert,
  SlackMembershipInsert,
  Profile,
  Workspace,
} from './supabase-types';
import { handleDatabaseError } from './database';

// ============================================================================
// ENCRYPTION UTILITIES
// ============================================================================

// Simple encryption for tokens (in production, use proper encryption)
function encryptToken(token: string): string {
  // In production, implement proper encryption
  // For now, just base64 encode (NOT SECURE)
  return Buffer.from(token).toString('base64');
}

function decryptToken(encryptedToken: string): string {
  // In production, implement proper decryption
  // For now, just base64 decode (NOT SECURE)
  return Buffer.from(encryptedToken, 'base64').toString();
}

// ============================================================================
// SLACK OAUTH UTILITIES
// ============================================================================

export interface SlackOAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  scope: string;
  team_id: string;
  user_id: string;
  user_email?: string;
}

export async function saveSlackIdentity(
  profileId: string,
  tokens: SlackOAuthTokens
): Promise<SlackIdentity> {
  const slackIdentity: SlackIdentityInsert = {
    profile_id: profileId,
    slack_user_id: tokens.user_id,
    slack_team_id: tokens.team_id,
    slack_email: tokens.user_email || null,
    access_token: encryptToken(tokens.access_token),
    refresh_token: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
    token_expires_at: tokens.expires_at || null,
    scope: tokens.scope,
  };

  const { data, error } = await supabaseServer
    .from('slack_identities')
    .upsert(slackIdentity, {
      onConflict: 'profile_id,slack_team_id',
    })
    .select()
    .single();

  if (error) handleDatabaseError(error);
  return data;
}

export async function getSlackIdentity(
  profileId: string,
  teamId?: string
): Promise<SlackIdentity[]> {
  const { data, error } = await supabaseServer.rpc('get_slack_identity_by_profile', {
    p_profile_id: profileId,
    p_team_id: teamId,
  });

  if (error) handleDatabaseError(error);
  return data;
}

export async function getDecryptedSlackTokens(
  slackIdentity: SlackIdentity
): Promise<{
  access_token: string;
  refresh_token?: string;
}> {
  return {
    access_token: decryptToken(slackIdentity.access_token),
    refresh_token: slackIdentity.refresh_token 
      ? decryptToken(slackIdentity.refresh_token) 
      : undefined,
  };
}

export async function deleteSlackIdentity(
  profileId: string,
  teamId: string
): Promise<void> {
  const { error } = await supabaseServer
    .from('slack_identities')
    .delete()
    .eq('profile_id', profileId)
    .eq('slack_team_id', teamId);

  if (error) handleDatabaseError(error);
}

// ============================================================================
// SLACK USER RESOLUTION
// ============================================================================

export async function getProfileBySlackUser(
  slackUserId: string,
  teamId: string
): Promise<Profile | null> {
  const { data, error } = await supabaseServer.rpc('get_profile_by_slack_user', {
    p_slack_user_id: slackUserId,
    p_team_id: teamId,
  });

  if (error) {
    console.error('Error getting profile by slack user:', error);
    return null;
  }

  return data && data.length > 0 ? data[0] as Profile : null;
}

export async function resolveSlackMention(
  mention: string,
  teamId: string
): Promise<Profile | null> {
  // Extract user ID from Slack mention format: <@U123ABC> or <@U123ABC|username>
  const match = mention.match(/^<@([UW][A-Z0-9]+)(?:\|[^>]+)?>$/);
  if (!match) return null;

  const slackUserId = match[1];
  return getProfileBySlackUser(slackUserId, teamId);
}

// ============================================================================
// WORKSPACE ASSOCIATION
// ============================================================================

export async function linkWorkspaceToSlackTeam(
  workspaceId: string,
  teamId: string
): Promise<boolean> {
  const { data, error } = await supabaseServer.rpc('link_workspace_to_slack_team', {
    p_workspace_id: workspaceId,
    p_team_id: teamId,
  });

  if (error) {
    console.error('Error linking workspace to Slack team:', error);
    return false;
  }

  return data;
}

export async function isWorkspaceLinkedToSlack(
  workspaceId: string,
  teamId: string
): Promise<boolean> {
  const { data, error } = await supabaseServer.rpc('is_workspace_linked_to_slack', {
    p_workspace_id: workspaceId,
    p_team_id: teamId,
  });

  if (error) {
    console.error('Error checking workspace-slack link:', error);
    return false;
  }

  return data;
}

export async function getWorkspaceBySlackTeam(teamId: string): Promise<Workspace | null> {
  const { data, error } = await supabaseServer
    .from('workspaces')
    .select('*')
    .eq('slack_team_id', teamId)
    .maybeSingle();

  if (error) {
    console.error('Error getting workspace by Slack team:', error);
    return null;
  }

  return data;
}

// ============================================================================
// SLACK MEMBERSHIP MANAGEMENT
// ============================================================================

export async function createSlackMembership(
  membership: SlackMembershipInsert
): Promise<SlackMembership> {
  const { data, error } = await supabaseServer
    .from('slack_memberships')
    .upsert(membership, {
      onConflict: 'workspace_id,slack_user_id',
    })
    .select()
    .single();

  if (error) handleDatabaseError(error);
  return data;
}

export async function getSlackMembershipsByWorkspace(
  workspaceId: string
): Promise<SlackMembership[]> {
  const { data, error } = await supabaseServer
    .from('slack_memberships')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true);

  if (error) handleDatabaseError(error);
  return data || [];
}

export async function updateSlackMembershipProfile(
  workspaceId: string,
  slackUserId: string,
  profileId: string | null
): Promise<void> {
  const { error } = await supabaseServer
    .from('slack_memberships')
    .update({ profile_id: profileId })
    .eq('workspace_id', workspaceId)
    .eq('slack_user_id', slackUserId);

  if (error) handleDatabaseError(error);
}

// ============================================================================
// SLACK API UTILITIES
// ============================================================================

export interface SlackUser {
  id: string;
  name: string;
  real_name: string;
  email?: string;
  is_bot: boolean;
  deleted: boolean;
}

export async function fetchSlackUserInfo(
  accessToken: string,
  userId: string
): Promise<SlackUser | null> {
  try {
    const response = await fetch('https://slack.com/api/users.info', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user: userId,
      }),
    });

    const data = await response.json();
    
    if (!data.ok) {
      console.error('Slack API error:', data.error);
      return null;
    }

    return data.user;
  } catch (error) {
    console.error('Error fetching Slack user info:', error);
    return null;
  }
}

export async function validateSlackToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch('https://slack.com/api/auth.test', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

export function validateSlackUserId(userId: string): boolean {
  // Slack user IDs start with U or W and are followed by alphanumeric characters
  return /^[UW][A-Z0-9]+$/.test(userId);
}

export function validateSlackTeamId(teamId: string): boolean {
  // Slack team IDs start with T and are followed by alphanumeric characters
  return /^T[A-Z0-9]+$/.test(teamId);
}

export function parseSlackMention(mention: string): string | null {
  // Parse Slack mention format: <@U123ABC> or <@U123ABC|username>
  const match = mention.match(/^<@([UW][A-Z0-9]+)(?:\|[^>]+)?>$/);
  return match ? match[1] : null;
}

export function isSlackMention(text: string): boolean {
  return /^<@[UW][A-Z0-9]+(?:\|[^>]+)?>$/.test(text);
}