// Server-side database functions that use supabaseServer (bypasses RLS)
// These functions should ONLY be used in API routes, never in client components

import { supabaseServer } from './supabase-server';
import {
  Invitation,
  InvitationInsert,
  InvitationUpdate,
  InvitationWithDetails,
  Profile,
  ProfileInsert,
} from './supabase-types';
import { PaginatedResponse, QueryConfig } from './types';
import { handleDatabaseError } from './database';

// ============================================================================
// PROFILE OPERATIONS (Server-side with RLS bypass)
// ============================================================================

export async function createProfile(profile: ProfileInsert): Promise<Profile> {
  const { data, error } = await supabaseServer
    .from('profiles')
    .insert(profile)
    .select()
    .single();

  if (error) handleDatabaseError(error);
  return data;
}

// ============================================================================
// INVITATION OPERATIONS (Server-side with RLS bypass)
// ============================================================================

// Debug function to test invitation lookup
export async function debugInvitationLookup(code: string) {
  console.log('=== DEBUG INVITATION LOOKUP ===');
  console.log('Looking for code:', code);
  
  // Test 1: Check all invitations (using server client to bypass RLS)
  const { data: allInvitations } = await supabaseServer
    .from('invitations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
    
  console.log('Recent invitations in database:', allInvitations);
  
  // Test 2: Search by exact code (case sensitive)
  const { data: exactMatches } = await supabaseServer
    .from('invitations')
    .select('*')
    .eq('code', code);
    
  console.log('Exact code matches:', exactMatches);
  
  // Test 3: Search case-insensitive
  const { data: iLikeMatches } = await supabaseServer
    .from('invitations')
    .select('*')
    .ilike('code', code);
    
  console.log('Case-insensitive matches:', iLikeMatches);
  
  // Test 4: Check active field values
  const { data: activeCheck } = await supabaseServer
    .from('invitations')
    .select('code, active, created_at')
    .limit(5);
    
  console.log('Sample active field values:', activeCheck);
  
  return {
    allInvitations,
    exactMatches,
    iLikeMatches,
    activeCheck
  };
}

export async function getInvitationByCode(code: string): Promise<Invitation> {
  console.log('Searching for invitation with code:', code);
  
  // First, let's see if the code exists at all (ignoring active status)
  const { data: allMatches } = await supabaseServer
    .from('invitations')
    .select('*')
    .eq('code', code);
    
  console.log('All invitations with code:', code, allMatches);
  
  // Now search for active ones using server client to bypass RLS
  const { data, error } = await supabaseServer
    .from('invitations')
    .select('*')
    .eq('code', code)
    .eq('active', true)
    .single();

  console.log('Active invitation search result:', { data, error });

  if (error) {
    console.error('Database error finding invitation:', error);
    handleDatabaseError(error);
  }
  
  return data;
}

export async function getInvitationByToken(token: string): Promise<Invitation> {
  const { data, error } = await supabaseServer
    .from('invitations')
    .select('*')
    .eq('token', token)
    .eq('active', true)
    .single();

  if (error) handleDatabaseError(error);
  return data;
}

export async function createInvitation(
  invitation: InvitationInsert
): Promise<Invitation> {
  const { data, error } = await supabaseServer
    .from('invitations')
    .insert(invitation)
    .select()
    .single();

  if (error) handleDatabaseError(error);
  return data;
}

export async function updateInvitation(
  id: string,
  updates: InvitationUpdate
): Promise<Invitation> {
  const { data, error } = await supabaseServer
    .from('invitations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) handleDatabaseError(error);
  return data;
}

export async function deleteInvitation(id: string): Promise<void> {
  const { error } = await supabaseServer.from('invitations').delete().eq('id', id);

  if (error) handleDatabaseError(error);
}

export async function getInvitationsByWorkspace(
  workspaceId: string,
  config?: QueryConfig
): Promise<PaginatedResponse<InvitationWithDetails>> {
  const page = config?.page || 1;
  const limit = Math.min(config?.limit || 20, 100);
  const offset = (page - 1) * limit;

  let query = supabaseServer
    .from('invitations')
    .select(
      `
      *,
      workspace:workspaces (*),
      created_by_profile:profiles!created_by_profile_id (*)
    `,
      { count: 'exact' }
    )
    .eq('workspace_id', workspaceId);

  // Apply sorting
  if (config?.sort) {
    config.sort.forEach((sort) => {
      query = query.order(sort.field, { ascending: sort.order === 'asc' });
    });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) handleDatabaseError(error);

  return {
    data: data || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      total_pages: Math.ceil((count || 0) / limit),
      has_next: page < Math.ceil((count || 0) / limit),
      has_prev: page > 1,
    },
    success: true,
  };
}