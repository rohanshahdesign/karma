// Database utilities and query functions
// Provides type-safe database operations with error handling

import { supabase } from './supabase';
import { supabaseServer } from './supabase-server';
import {
  Profile,
  Workspace,
  Transaction,
  Invitation,
  PendingUser,
  DailySentKarma,
  ProfileInsert,
  WorkspaceInsert,
  TransactionInsert,
  InvitationInsert,
  PendingUserInsert,
  DailySentKarmaInsert,
  ProfileUpdate,
  WorkspaceUpdate,
  InvitationUpdate,
  TransactionWithProfiles,
  WorkspaceWithProfiles,
  ProfileWithWorkspace,
  InvitationWithDetails,
  WorkspaceStats,
  ProfileStats,
  TransactionStats,
} from './supabase-types';
import { PaginatedResponse, QueryConfig } from './types';

// ============================================================================
// ERROR HANDLING
// ============================================================================

export class DatabaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export function handleDatabaseError(error: unknown): never {
  console.error('Database error:', error);

  if (error && typeof error === 'object' && 'code' in error) {
    const dbError = error as { code: string; message?: string };
    
    if (dbError.code === 'PGRST116') {
      throw new DatabaseError('Resource not found', 'NOT_FOUND', 404);
    }

    if (dbError.code === '23505') {
      throw new DatabaseError('Resource already exists', 'CONFLICT', 409);
    }

    if (dbError.code === '23503') {
      throw new DatabaseError(
        'Foreign key constraint violation',
        'CONFLICT',
        409
      );
    }

    if (dbError.code === '42501') {
      throw new DatabaseError('Insufficient permissions', 'FORBIDDEN', 403);
    }
  }

  const message = error && typeof error === 'object' && 'message' in error 
    ? (error as { message: string }).message 
    : 'Database operation failed';
    
  throw new DatabaseError(
    message,
    'DATABASE_ERROR',
    500,
    error
  );
}

// ============================================================================
// QUERY BUILDERS
// ============================================================================

type SupabaseQueryBuilder = ReturnType<typeof supabase.from>;

export class QueryBuilder {
  private query: unknown;
  private table: string;

  constructor(table: string) {
    this.table = table;
    this.query = supabase.from(table);
  }

  select(columns: string | string[] = '*'): QueryBuilder {
    this.query = (this.query as SupabaseQueryBuilder).select(columns as string);
    return this;
  }

  where(column: string, operator: string, value: unknown): QueryBuilder {
    // Note: This is simplified - in practice you'd want proper typing for operators
    this.query = (this.query as unknown as Record<string, (col: string, val: unknown) => unknown>)[operator](column, value);
    return this;
  }

  eq(column: string, value: unknown): QueryBuilder {
    this.query = (this.query as Record<string, (col: string, val: unknown) => unknown>).eq(column, value);
    return this;
  }

  neq(column: string, value: unknown): QueryBuilder {
    this.query = (this.query as Record<string, (col: string, val: unknown) => unknown>).neq(column, value);
    return this;
  }

  gt(column: string, value: number | string): QueryBuilder {
    this.query = (this.query as Record<string, (col: string, val: number | string) => unknown>).gt(column, value);
    return this;
  }

  gte(column: string, value: number | string): QueryBuilder {
    this.query = (this.query as Record<string, (col: string, val: number | string) => unknown>).gte(column, value);
    return this;
  }

  lt(column: string, value: number | string): QueryBuilder {
    this.query = (this.query as Record<string, (col: string, val: number | string) => unknown>).lt(column, value);
    return this;
  }

  lte(column: string, value: number | string): QueryBuilder {
    this.query = (this.query as Record<string, (col: string, val: number | string) => unknown>).lte(column, value);
    return this;
  }

  like(column: string, pattern: string): QueryBuilder {
    this.query = (this.query as Record<string, (col: string, pattern: string) => unknown>).like(column, pattern);
    return this;
  }

  ilike(column: string, pattern: string): QueryBuilder {
    this.query = (this.query as Record<string, (col: string, pattern: string) => unknown>).ilike(column, pattern);
    return this;
  }

  in(column: string, values: unknown[]): QueryBuilder {
    this.query = (this.query as Record<string, (col: string, vals: unknown[]) => unknown>).in(column, values);
    return this;
  }

  is(column: string, value: null | boolean): QueryBuilder {
    this.query = (this.query as Record<string, (col: string, val: null | boolean) => unknown>).is(column, value);
    return this;
  }

  orderBy(column: string, options?: { ascending?: boolean }): QueryBuilder {
    this.query = (this.query as Record<string, (col: string, opts?: { ascending?: boolean }) => unknown>).order(column, options);
    return this;
  }

  limit(count: number): QueryBuilder {
    this.query = (this.query as Record<string, (count: number) => unknown>).limit(count);
    return this;
  }

  range(from: number, to: number): QueryBuilder {
    this.query = (this.query as Record<string, (from: number, to: number) => unknown>).range(from, to);
    return this;
  }

  single(): QueryBuilder {
    this.query = (this.query as Record<string, () => unknown>).single();
    return this;
  }

  maybeSingle(): QueryBuilder {
    this.query = (this.query as Record<string, () => unknown>).maybeSingle();
    return this;
  }

  async execute<T>(): Promise<T> {
    try {
      const { data, error } = await (this.query as Promise<{ data: T; error: unknown }>);
      if (error) throw error;
      return data;
    } catch (error) {
      handleDatabaseError(error);
    }
  }
}

// ============================================================================
// WORKSPACE OPERATIONS
// ============================================================================

export async function getWorkspace(id: string): Promise<Workspace> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', id)
    .single();

  if (error) handleDatabaseError(error);
  return data;
}

export async function getWorkspaceBySlug(slug: string): Promise<Workspace> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) handleDatabaseError(error);
  return data;
}

export async function createWorkspace(
  workspace: WorkspaceInsert
): Promise<Workspace> {
  const { data, error } = await supabase
    .from('workspaces')
    .insert(workspace)
    .select()
    .single();

  if (error) handleDatabaseError(error);
  return data;
}

export async function updateWorkspace(
  id: string,
  updates: WorkspaceUpdate
): Promise<Workspace> {
  const { data, error } = await supabase
    .from('workspaces')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) handleDatabaseError(error);
  return data;
}

export async function deleteWorkspace(id: string): Promise<void> {
  const { error } = await supabase.from('workspaces').delete().eq('id', id);

  if (error) handleDatabaseError(error);
}

export async function getWorkspaceWithProfiles(
  id: string
): Promise<WorkspaceWithProfiles> {
  const { data, error } = await supabase
    .from('workspaces')
    .select(
      `
      *,
      profiles (*)
    `
    )
    .eq('id', id)
    .single();

  if (error) handleDatabaseError(error);
  return data;
}

export async function getWorkspaceStats(
  workspaceId: string
): Promise<WorkspaceStats> {
  const { data, error } = await supabase.rpc('get_workspace_stats', {
    p_workspace_id: workspaceId,
  });

  if (error) handleDatabaseError(error);
  return data;
}

export async function getCurrentWorkspace(): Promise<Workspace | null> {
  try {
    const { getCurrentProfile } = await import('./permissions');
    const profile = await getCurrentProfile();
    if (!profile) return null;
    
    return await getWorkspace(profile.workspace_id);
  } catch {
    return null;
  }
}

// ============================================================================
// PROFILE OPERATIONS
// ============================================================================

export async function getProfile(id: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) handleDatabaseError(error);
  return data;
}

export async function getProfileByAuthUserId(
  authUserId: string
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single();

  if (error) handleDatabaseError(error);
  return data;
}

export async function getProfileByAuthUserIdSafe(
  authUserId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error) handleDatabaseError(error);
  return data;
}

export async function createProfile(profile: ProfileInsert): Promise<Profile> {
  const { data, error } = await supabaseServer
    .from('profiles')
    .insert(profile)
    .select()
    .single();

  if (error) handleDatabaseError(error);
  return data;
}

export async function updateProfile(
  id: string,
  updates: ProfileUpdate
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) handleDatabaseError(error);
  return data;
}

export async function deleteProfile(id: string): Promise<void> {
  const { error } = await supabase.from('profiles').delete().eq('id', id);

  if (error) handleDatabaseError(error);
}

export async function getProfilesByWorkspace(
  workspaceId: string,
  config?: QueryConfig
): Promise<PaginatedResponse<Profile>> {
  const page = config?.page || 1;
  const limit = Math.min(config?.limit || 20, 100);
  const offset = (page - 1) * limit;

  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId);

  // Apply filters
  if (config?.filters) {
    config.filters.forEach((filter) => {
      switch (filter.operator) {
        case 'eq':
          query = query.eq(filter.field, filter.value);
          break;
        case 'neq':
          query = query.neq(filter.field, filter.value);
          break;
        case 'like':
          query = query.ilike(filter.field, `%${filter.value}%`);
          break;
        case 'in':
          query = query.in(filter.field, Array.isArray(filter.value) ? filter.value : [filter.value]);
          break;
      }
    });
  }

  // Apply sorting
  if (config?.sort) {
    config.sort.forEach((sort) => {
      query = query.order(sort.field, { ascending: sort.order === 'asc' });
    });
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

export async function getProfileWithWorkspace(
  id: string
): Promise<ProfileWithWorkspace> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      `
      *,
      workspace:workspaces (*)
    `
    )
    .eq('id', id)
    .single();

  if (error) handleDatabaseError(error);
  return data;
}

export async function getProfileStats(
  profileId: string
): Promise<ProfileStats> {
  const { data, error } = await supabase.rpc('get_profile_stats', {
    p_profile_id: profileId,
  });

  if (error) handleDatabaseError(error);
  return data;
}

// ============================================================================
// TRANSACTION OPERATIONS
// ============================================================================

export async function getTransaction(id: string): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) handleDatabaseError(error);
  return data;
}

export async function createTransaction(
  transaction: TransactionInsert
): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .insert(transaction)
    .select()
    .single();

  if (error) handleDatabaseError(error);
  return data;
}

export async function getTransactionsByWorkspace(
  workspaceId: string,
  config?: QueryConfig
): Promise<PaginatedResponse<TransactionWithProfiles>> {
  const page = config?.page || 1;
  const limit = Math.min(config?.limit || 20, 100);
  const offset = (page - 1) * limit;

  let query = supabase
    .from('transactions')
    .select(
      `
      *,
      sender_profile:profiles!sender_profile_id (*),
      receiver_profile:profiles!receiver_profile_id (*),
      workspace:workspaces (*)
    `,
      { count: 'exact' }
    )
    .eq('workspace_id', workspaceId);

  // Apply filters
  if (config?.filters) {
    config.filters.forEach((filter) => {
      switch (filter.operator) {
        case 'eq':
          query = query.eq(filter.field, filter.value);
          break;
        case 'gte':
          query = query.gte(filter.field, filter.value);
          break;
        case 'lte':
          query = query.lte(filter.field, filter.value);
          break;
      }
    });
  }

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

export async function getTransactionsByProfile(
  profileId: string,
  config?: QueryConfig
): Promise<PaginatedResponse<TransactionWithProfiles>> {
  const page = config?.page || 1;
  const limit = Math.min(config?.limit || 20, 100);
  const offset = (page - 1) * limit;

  let query = supabase
    .from('transactions')
    .select(
      `
      *,
      sender_profile:profiles!sender_profile_id (*),
      receiver_profile:profiles!receiver_profile_id (*),
      workspace:workspaces (*)
    `,
      { count: 'exact' }
    )
    .or(
      `sender_profile_id.eq.${profileId},receiver_profile_id.eq.${profileId}`
    );

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

export async function getTransactionStats(
  workspaceId: string,
  period?: { from: string; to: string }
): Promise<TransactionStats> {
  const { data, error } = await supabase.rpc('get_transaction_stats', {
    p_workspace_id: workspaceId,
    p_from: period?.from,
    p_to: period?.to,
  });

  if (error) handleDatabaseError(error);
  return data;
}

// ============================================================================
// INVITATION OPERATIONS
// ============================================================================

export async function getInvitation(id: string): Promise<Invitation> {
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) handleDatabaseError(error);
  return data;
}

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

// ============================================================================
// PENDING USER OPERATIONS
// ============================================================================

export async function getPendingUser(authUserId: string): Promise<PendingUser> {
  const { data, error } = await supabase
    .from('pending_users')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single();

  if (error) handleDatabaseError(error);
  return data;
}

export async function getPendingUserSafe(
  authUserId: string
): Promise<PendingUser | null> {
  const { data, error } = await supabase
    .from('pending_users')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error) handleDatabaseError(error);
  return data;
}

export async function createPendingUser(
  pendingUser: PendingUserInsert
): Promise<PendingUser> {
  const { data, error } = await supabase
    .from('pending_users')
    .insert(pendingUser)
    .select()
    .single();

  if (error) handleDatabaseError(error);
  return data;
}

export async function deletePendingUser(authUserId: string): Promise<void> {
  const { error } = await supabase
    .from('pending_users')
    .delete()
    .eq('auth_user_id', authUserId);

  if (error) handleDatabaseError(error);
}

// ============================================================================
// DAILY SENT KARMA OPERATIONS
// ============================================================================

export async function getDailySentKarma(
  profileId: string,
  day: string
): Promise<DailySentKarma | null> {
  const { data, error } = await supabase
    .from('daily_sent_karma')
    .select('*')
    .eq('profile_id', profileId)
    .eq('day', day)
    .maybeSingle();

  if (error) handleDatabaseError(error);
  return data;
}

export async function upsertDailySentKarma(
  dailySentKarma: DailySentKarmaInsert
): Promise<DailySentKarma> {
  const { data, error } = await supabase
    .from('daily_sent_karma')
    .upsert(dailySentKarma)
    .select()
    .single();

  if (error) handleDatabaseError(error);
  return data;
}

// ============================================================================
// RPC FUNCTION CALLS
// ============================================================================

export async function createWorkspaceWithOwner(args: {
  p_name: string;
  p_slug: string;
  p_currency_name: string;
  p_monthly_allowance: number;
  p_owner_email: string;
  p_min_transaction_amount?: number;
  p_max_transaction_amount?: number;
  p_daily_limit_percentage?: number;
  p_reward_approval_threshold?: number;
}): Promise<string> {
  const { data, error } = await supabase.rpc(
    'create_workspace_with_owner',
    args
  );

  if (error) handleDatabaseError(error);
  return data;
}

export async function validateAndCreateTransaction(args: {
  p_sender_profile_id: string;
  p_receiver_profile_id: string;
  p_amount: number;
  p_message?: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc(
    'validate_and_create_transaction',
    args
  );

  if (error) handleDatabaseError(error);
  return data;
}

export async function promoteUserToAdmin(
  targetProfileId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('promote_user_to_admin', {
    p_target_profile_id: targetProfileId,
  });

  if (error) handleDatabaseError(error);
  return data;
}

export async function demoteAdminToEmployee(
  targetProfileId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('demote_admin_to_employee', {
    p_target_profile_id: targetProfileId,
  });

  if (error) handleDatabaseError(error);
  return data;
}

export async function isMemberOfWorkspace(
  workspaceId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_member_of_workspace', {
    p_workspace_id: workspaceId,
  });

  if (error) handleDatabaseError(error);
  return data;
}

export async function isAdminOfWorkspace(
  workspaceId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin_of_workspace', {
    p_workspace_id: workspaceId,
  });

  if (error) handleDatabaseError(error);
  return data;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function createQueryBuilder(table: string): QueryBuilder {
  return new QueryBuilder(table);
}

export async function executeTransaction<T>(
  operations: (() => Promise<T>)[]
): Promise<T[]> {
  const results: T[] = [];

  try {
    for (const operation of operations) {
      const result = await operation();
      results.push(result);
    }
    return results;
  } catch (error) {
    // Rollback would be handled by Supabase automatically
    handleDatabaseError(error);
  }
}
