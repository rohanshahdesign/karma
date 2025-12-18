// Server-side only permission utilities
// IMPORTANT: Only import this in server-side code (API routes, server components)
// DO NOT import this in client components

import { supabaseServer } from './supabase-server';
import { Profile } from './supabase-types';

// Get current user's profile from auth token (server-side only)
export async function getCurrentProfileServer(token: string): Promise<Profile | null> {
  try {
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);
    if (authError || !user) return null;

    const { data: profile, error } = await supabaseServer
      .from('profiles')
      .select('*')
      .eq('auth_user_id', user.id)
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
