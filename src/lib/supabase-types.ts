// Supabase-specific types and utilities
// Generated types for database tables and RPC functions

import { Database } from './database.types';

// ============================================================================
// DATABASE TYPES (Generated from Supabase)
// ============================================================================

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];

// ============================================================================
// TABLE TYPES
// ============================================================================

export type Workspace = Tables<'workspaces'>;
export type Profile = Tables<'profiles'>;
export type Transaction = Tables<'transactions'>;
export type Invitation = Tables<'invitations'>;
export type PendingUser = Tables<'pending_users'>;
export type DailySentKarma = Tables<'daily_sent_karma'>;

// ============================================================================
// INSERT TYPES
// ============================================================================

export type WorkspaceInsert =
  Database['public']['Tables']['workspaces']['Insert'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type TransactionInsert =
  Database['public']['Tables']['transactions']['Insert'];
export type InvitationInsert =
  Database['public']['Tables']['invitations']['Insert'];
export type PendingUserInsert =
  Database['public']['Tables']['pending_users']['Insert'];
export type DailySentKarmaInsert =
  Database['public']['Tables']['daily_sent_karma']['Insert'];

// ============================================================================
// UPDATE TYPES
// ============================================================================

export type WorkspaceUpdate =
  Database['public']['Tables']['workspaces']['Update'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
export type TransactionUpdate =
  Database['public']['Tables']['transactions']['Update'];
export type InvitationUpdate =
  Database['public']['Tables']['invitations']['Update'];
export type PendingUserUpdate =
  Database['public']['Tables']['pending_users']['Update'];
export type DailySentKarmaUpdate =
  Database['public']['Tables']['daily_sent_karma']['Update'];

// ============================================================================
// RPC FUNCTION TYPES
// ============================================================================

export type CreateWorkspaceWithOwnerArgs =
  Database['public']['Functions']['create_workspace_with_owner']['Args'];
export type CreateWorkspaceWithOwnerReturn =
  Database['public']['Functions']['create_workspace_with_owner']['Returns'];

export type ValidateAndCreateTransactionArgs =
  Database['public']['Functions']['validate_and_create_transaction']['Args'];
export type ValidateAndCreateTransactionReturn =
  Database['public']['Functions']['validate_and_create_transaction']['Returns'];

export type PromoteUserToAdminArgs =
  Database['public']['Functions']['promote_user_to_admin']['Args'];
export type PromoteUserToAdminReturn =
  Database['public']['Functions']['promote_user_to_admin']['Returns'];

export type DemoteAdminToEmployeeArgs =
  Database['public']['Functions']['demote_admin_to_employee']['Args'];
export type DemoteAdminToEmployeeReturn =
  Database['public']['Functions']['demote_admin_to_employee']['Returns'];

export type IsMemberOfWorkspaceArgs =
  Database['public']['Functions']['is_member_of_workspace']['Args'];
export type IsMemberOfWorkspaceReturn =
  Database['public']['Functions']['is_member_of_workspace']['Returns'];

export type IsAdminOfWorkspaceArgs =
  Database['public']['Functions']['is_admin_of_workspace']['Args'];
export type IsAdminOfWorkspaceReturn =
  Database['public']['Functions']['is_admin_of_workspace']['Returns'];

// ============================================================================
// VIEW TYPES
// ============================================================================

export type CurrentProfile =
  Database['public']['Views']['current_profile']['Row'];

// ============================================================================
// ENUM TYPES
// ============================================================================

export type UserRole = Enums<'user_role'>;

// ============================================================================
// QUERY TYPES
// ============================================================================

export interface WorkspaceQuery {
  select?: string;
  filters?: {
    id?: string;
    slug?: string;
    name?: string;
  };
  orderBy?: {
    column: keyof Workspace;
    ascending?: boolean;
  };
  limit?: number;
  offset?: number;
}

export interface ProfileQuery {
  select?: string;
  filters?: {
    id?: string;
    auth_user_id?: string;
    workspace_id?: string;
    email?: string;
    role?: UserRole;
    active?: boolean;
  };
  orderBy?: {
    column: keyof Profile;
    ascending?: boolean;
  };
  limit?: number;
  offset?: number;
}

export interface TransactionQuery {
  select?: string;
  filters?: {
    id?: string;
    workspace_id?: string;
    sender_profile_id?: string;
    receiver_profile_id?: string;
    amount?: {
      min?: number;
      max?: number;
    };
    created_at?: {
      from?: string;
      to?: string;
    };
  };
  orderBy?: {
    column: keyof Transaction;
    ascending?: boolean;
  };
  limit?: number;
  offset?: number;
}

export interface InvitationQuery {
  select?: string;
  filters?: {
    id?: string;
    workspace_id?: string;
    code?: string;
    token?: string;
    active?: boolean;
    expires_at?: {
      from?: string;
      to?: string;
    };
  };
  orderBy?: {
    column: keyof Invitation;
    ascending?: boolean;
  };
  limit?: number;
  offset?: number;
}

// ============================================================================
// RELATIONSHIP TYPES
// ============================================================================

export interface WorkspaceWithProfiles extends Workspace {
  profiles: Profile[];
}

export interface ProfileWithWorkspace extends Profile {
  workspace: Workspace;
}

export interface ProfileWithAuthUser extends Profile {
  auth_user: {
    id: string;
    email?: string;
    created_at: string;
  };
}

export interface TransactionWithProfiles extends Transaction {
  sender_profile: Profile;
  receiver_profile: Profile;
  workspace: Workspace;
}

export interface InvitationWithDetails extends Invitation {
  workspace: Workspace;
  created_by_profile: Profile;
}

// ============================================================================
// AGGREGATE TYPES
// ============================================================================

export interface WorkspaceStats {
  total_members: number;
  total_transactions: number;
  total_karma_sent: number;
  total_karma_received: number;
  active_members_today: number;
  active_members_this_week: number;
  active_members_this_month: number;
}

export interface ProfileStats {
  total_sent: number;
  total_received: number;
  transaction_count: number;
  average_sent_per_transaction: number;
  average_received_per_transaction: number;
  days_active: number;
  current_streak: number;
  longest_streak: number;
}

export interface TransactionStats {
  total_amount: number;
  total_count: number;
  average_amount: number;
  min_amount: number;
  max_amount: number;
  period: {
    start: string;
    end: string;
  };
}

// ============================================================================
// SEARCH TYPES
// ============================================================================

export interface SearchConfig {
  query: string;
  fields: string[];
  filters?: Record<string, any>;
  orderBy?: {
    column: string;
    ascending?: boolean;
  };
  limit?: number;
  offset?: number;
}

export interface SearchResult<T> {
  data: T[];
  total: number;
  query: string;
  filters: Record<string, any>;
}

// ============================================================================
// REAL-TIME TYPES
// ============================================================================

export interface RealtimeConfig {
  table: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  schema?: string;
}

export interface RealtimePayload<T = any> {
  schema: string;
  table: string;
  commit_timestamp: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: T;
  errors: string[] | null;
}

export interface RealtimeSubscription {
  id: string;
  config: RealtimeConfig;
  callback: (payload: RealtimePayload) => void;
  unsubscribe: () => void;
}

// ============================================================================
// STORAGE TYPES
// ============================================================================

export interface StorageConfig {
  bucket: string;
  path: string;
  options?: {
    cacheControl?: string;
    contentType?: string;
    upsert?: boolean;
  };
}

export interface FileUpload {
  file: File;
  path: string;
  bucket: string;
  options?: {
    cacheControl?: string;
    contentType?: string;
    upsert?: boolean;
  };
}

export interface FileDownload {
  path: string;
  bucket: string;
  options?: {
    transform?: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'origin' | 'webp' | 'avif';
    };
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Timestamptz = string;

export type Uuid = string;

export type Text = string;

export type Integer = number;

export type Boolean = boolean;

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isWorkspace(value: any): value is Workspace {
  return (
    value &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.slug === 'string' &&
    typeof value.currency_name === 'string' &&
    typeof value.monthly_allowance === 'number'
  );
}

export function isProfile(value: any): value is Profile {
  return (
    value &&
    typeof value.id === 'string' &&
    typeof value.auth_user_id === 'string' &&
    typeof value.workspace_id === 'string' &&
    typeof value.email === 'string' &&
    typeof value.role === 'string' &&
    typeof value.giving_balance === 'number' &&
    typeof value.redeemable_balance === 'number'
  );
}

export function isTransaction(value: any): value is Transaction {
  return (
    value &&
    typeof value.id === 'string' &&
    typeof value.workspace_id === 'string' &&
    typeof value.sender_profile_id === 'string' &&
    typeof value.receiver_profile_id === 'string' &&
    typeof value.amount === 'number'
  );
}

export function isInvitation(value: any): value is Invitation {
  return (
    value &&
    typeof value.id === 'string' &&
    typeof value.workspace_id === 'string' &&
    typeof value.code === 'string' &&
    typeof value.token === 'string'
  );
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const TABLE_NAMES = {
  WORKSPACES: 'workspaces',
  PROFILES: 'profiles',
  TRANSACTIONS: 'transactions',
  INVITATIONS: 'invitations',
  PENDING_USERS: 'pending_users',
  DAILY_SENT_KARMA: 'daily_sent_karma',
} as const;

export const RPC_FUNCTIONS = {
  CREATE_WORKSPACE_WITH_OWNER: 'create_workspace_with_owner',
  VALIDATE_AND_CREATE_TRANSACTION: 'validate_and_create_transaction',
  PROMOTE_USER_TO_ADMIN: 'promote_user_to_admin',
  DEMOTE_ADMIN_TO_EMPLOYEE: 'demote_admin_to_employee',
  IS_MEMBER_OF_WORKSPACE: 'is_member_of_workspace',
  IS_ADMIN_OF_WORKSPACE: 'is_admin_of_workspace',
} as const;

export const VIEW_NAMES = {
  CURRENT_PROFILE: 'current_profile',
} as const;

export const ENUM_NAMES = {
  USER_ROLE: 'user_role',
} as const;
