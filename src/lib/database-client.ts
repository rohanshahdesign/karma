'use client';

// Client-side database utilities that respect RLS policies
// Use this for client-side operations that need to respect user permissions

import { supabase } from './supabase';
import {
  Profile,
  Workspace,
  Transaction,
  TransactionInsert,
  TransactionWithProfiles,
  ProfileStats,
  TransactionStats,
} from './supabase-types';
import { PaginatedResponse, QueryConfig } from './types';

// ============================================================================
// ERROR HANDLING
// ============================================================================

export class ClientDatabaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ClientDatabaseError';
  }
}

export function handleClientDatabaseError(error: unknown): never {
  console.error('Client database error:', error);

  if (error && typeof error === 'object' && 'code' in error) {
    const dbError = error as { code: string; message?: string };
    
    if (dbError.code === 'PGRST116') {
      throw new ClientDatabaseError('Resource not found', 'NOT_FOUND', 404);
    }

    if (dbError.code === '23505') {
      throw new ClientDatabaseError('Resource already exists', 'CONFLICT', 409);
    }

    if (dbError.code === '42501') {
      throw new ClientDatabaseError('Insufficient permissions', 'FORBIDDEN', 403);
    }
  }

  const message = error && typeof error === 'object' && 'message' in error 
    ? (error as { message: string }).message 
    : 'Database operation failed';
    
  throw new ClientDatabaseError(
    message,
    'DATABASE_ERROR',
    500,
    error
  );
}

// ============================================================================
// WORKSPACE OPERATIONS
// ============================================================================

export async function getWorkspaceClient(id: string): Promise<Workspace> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', id)
    .single();

  if (error) handleClientDatabaseError(error);
  return data;
}

export async function getCurrentWorkspaceClient(): Promise<Workspace | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching profile:', profileError);
      return null;
    }

    if (!profile) return null;
    
    return await getWorkspaceClient(profile.workspace_id);
  } catch {
    return null;
  }
}

// ============================================================================
// PROFILE OPERATIONS
// ============================================================================

export async function getCurrentProfileClient(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
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
}

export async function getProfileClient(id: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) handleClientDatabaseError(error);
  return data;
}

export async function getProfilesByWorkspaceClient(
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

  if (error) handleClientDatabaseError(error);

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
// TRANSACTION OPERATIONS
// ============================================================================

export async function getTransactionClient(id: string): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) handleClientDatabaseError(error);
  return data;
}

export async function createTransactionClient(
  transaction: TransactionInsert
): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .insert(transaction)
    .select()
    .single();

  if (error) handleClientDatabaseError(error);
  return data;
}

export async function getTransactionsByProfileClient(
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

  if (error) handleClientDatabaseError(error);

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

export async function getTransactionsByWorkspaceClient(
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

  if (error) handleClientDatabaseError(error);

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
// RPC FUNCTION CALLS (Client-side)
// ============================================================================

export async function validateAndCreateTransactionClient(args: {
  p_receiver_profile_id: string;
  p_amount: number;
  p_message?: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc(
    'validate_and_create_transaction',
    args
  );

  if (error) handleClientDatabaseError(error);
  return data;
}

export async function isMemberOfWorkspaceClient(
  workspaceId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_member_of_workspace', {
    p_workspace_id: workspaceId,
  });

  if (error) handleClientDatabaseError(error);
  return data;
}

export async function isAdminOfWorkspaceClient(
  workspaceId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin_of_workspace', {
    p_workspace_id: workspaceId,
  });

  if (error) handleClientDatabaseError(error);
  return data;
}

// ============================================================================
// STATS OPERATIONS (Client-side)
// ============================================================================

export async function getProfileStatsClient(
  profileId: string
): Promise<ProfileStats> {
  const { data, error } = await supabase.rpc('get_profile_stats', {
    p_profile_id: profileId,
  });

  if (error) handleClientDatabaseError(error);
  return data;
}

export async function getTransactionStatsClient(
  workspaceId: string,
  period?: { from: string; to: string }
): Promise<TransactionStats> {
  const { data, error } = await supabase.rpc('get_transaction_stats', {
    p_workspace_id: workspaceId,
    p_from: period?.from,
    p_to: period?.to,
  });

  if (error) handleClientDatabaseError(error);
  return data;
}