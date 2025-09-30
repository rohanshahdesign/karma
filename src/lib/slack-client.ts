'use client';

import { supabase } from './supabase';

export interface SlackIdentityPublic {
  id: string;
  profile_id: string;
  slack_user_id: string;
  slack_team_id: string;
  slack_email: string | null;
  created_at: string;
  updated_at: string;
}

export async function hasSlackConnected(profileId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('slack_identities')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) {
    console.error('Error checking Slack connection:', error);
    return false;
  }

  return !!data;
}

export async function getUserSlackIdentities(
  profileId: string
): Promise<SlackIdentityPublic[]> {
  const { data, error } = await supabase
    .from('slack_identities')
    .select('id, profile_id, slack_user_id, slack_team_id, slack_email, created_at, updated_at')
    .eq('profile_id', profileId);

  if (error) {
    console.error('Error getting user Slack identities:', error);
    return [];
  }

  return data || [];
}
