// Server-side only permission utilities
// IMPORTANT: Only import this in server-side code (API routes, server components)
// DO NOT import this in client components

import { supabaseServer } from './supabase-server';
import { Profile } from './supabase-types';

// Get current user's profile from auth token (server-side only)
// In multi-workspace mode, fetches the profile for the user's current workspace preference
export async function getCurrentProfileServer(token: string): Promise<Profile | null> {
  try {
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);
    if (authError || !user) return null;

    // First, try to get user's current workspace preference
    const { data: userPref } = await supabaseServer
      .from('user_preferences')
      .select('current_workspace_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    let workspaceId: string | null = null;

    if (userPref?.current_workspace_id) {
      workspaceId = userPref.current_workspace_id;
    } else {
      // If no preference, get user's first workspace (prioritize super_admin)
      const { data: profiles } = await supabaseServer
        .from('profiles')
        .select('workspace_id, role')
        .eq('auth_user_id', user.id);
      
      if (profiles && profiles.length > 0) {
        // Prefer super_admin workspace, otherwise use first
        const superAdminProfile = profiles.find(p => p.role === 'super_admin');
        workspaceId = superAdminProfile?.workspace_id || profiles[0].workspace_id;
      }
    }

    if (!workspaceId) {
      return null; // User has no workspaces
    }

    // Get the profile for the current workspace
    const { data: profile, error } = await supabaseServer
      .from('profiles')
      .select('*')
      .eq('auth_user_id', user.id)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    // Return null if no profile exists (don't throw error)
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error);
      return null;
    }

    return profile;
  } catch (error) {
    console.error('Error in getCurrentProfileServer:', error);
    return null;
  }
}
