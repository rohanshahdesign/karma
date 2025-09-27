// TypeScript types for Karma Recognition Platform
// Generated from database schema and business logic

// ============================================================================
// CORE DATABASE TYPES
// ============================================================================

export type UserRole = 'employee' | 'admin' | 'super_admin';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  currency_name: string;
  monthly_allowance: number;
  min_transaction_amount: number;
  max_transaction_amount: number;
  daily_limit_percentage: number;
  reward_approval_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  auth_user_id: string;
  workspace_id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  giving_balance: number;
  redeemable_balance: number;
  department?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  workspace_id: string;
  sender_profile_id: string;
  receiver_profile_id: string;
  amount: number;
  message?: string;
  created_at: string;
  updated_at: string;
}

export interface Invitation {
  id: string;
  workspace_id: string;
  created_by_profile_id: string;
  code: string;
  token: string;
  expires_at?: string;
  max_uses?: number;
  uses_count: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PendingUser {
  auth_user_id: string;
  email: string;
  created_at: string;
}

export interface DailySentKarma {
  profile_id: string;
  day: string; // date string
  amount_sent: number;
}

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

export interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
  email_confirmed_at?: string;
  phone_confirmed_at?: string;
  last_sign_in_at?: string;
  app_metadata: Record<string, any>;
  user_metadata: Record<string, any>;
  aud: string;
  confirmation_sent_at?: string;
  recovery_sent_at?: string;
  email_change_sent_at?: string;
  new_email?: string;
  new_phone?: string;
  invited_at?: string;
  action_link?: string;
  email_change?: string;
  phone_change?: string;
  reauthentication_sent_at?: string;
  reauthentication_token?: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user: AuthUser;
}

// ============================================================================
// BUSINESS LOGIC TYPES
// ============================================================================

export interface UserProfile extends Profile {
  workspace: Workspace;
  auth_user: AuthUser;
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

export interface WorkspaceMember extends Profile {
  auth_user: AuthUser;
  total_sent: number;
  total_received: number;
  transaction_count: number;
}

export interface WorkspaceStats {
  total_members: number;
  total_transactions: number;
  total_karma_sent: number;
  total_karma_received: number;
  active_members_today: number;
  active_members_this_week: number;
  active_members_this_month: number;
}

export interface UserStats {
  total_sent: number;
  total_received: number;
  transaction_count: number;
  average_sent_per_transaction: number;
  average_received_per_transaction: number;
  days_active: number;
  current_streak: number;
  longest_streak: number;
}

// ============================================================================
// FORM & INPUT TYPES
// ============================================================================

export interface CreateWorkspaceInput {
  name: string;
  slug: string;
  currency_name: string;
  monthly_allowance: number;
  min_transaction_amount?: number;
  max_transaction_amount?: number;
  daily_limit_percentage?: number;
  reward_approval_threshold?: number;
}

export interface UpdateWorkspaceInput {
  name?: string;
  currency_name?: string;
  monthly_allowance?: number;
  min_transaction_amount?: number;
  max_transaction_amount?: number;
  daily_limit_percentage?: number;
  reward_approval_threshold?: number;
}

export interface CreateTransactionInput {
  receiver_profile_id: string;
  amount: number;
  message?: string;
}

export interface UpdateProfileInput {
  full_name?: string;
  department?: string;
  active?: boolean;
}

export interface JoinWorkspaceInput {
  invite_code: string;
}

export interface CreateInvitationInput {
  expires_at?: string;
  max_uses?: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface TransactionListResponse
  extends PaginatedResponse<TransactionWithProfiles> {
  filters?: {
    date_from?: string;
    date_to?: string;
    sender_id?: string;
    receiver_id?: string;
    min_amount?: number;
    max_amount?: number;
  };
}

export interface MemberListResponse extends PaginatedResponse<WorkspaceMember> {
  filters?: {
    role?: UserRole;
    department?: string;
    active?: boolean;
    search?: string;
  };
}

// ============================================================================
// PERMISSION & ROLE TYPES
// ============================================================================

export interface Permission {
  action: string;
  resource: string;
  conditions?: Record<string, any>;
}

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
}

export interface UserPermissions {
  user_id: string;
  role: UserRole;
  permissions: Permission[];
  workspace_id: string;
}

// ============================================================================
// DASHBOARD & UI TYPES
// ============================================================================

export interface DashboardStats {
  user_stats: UserStats;
  workspace_stats: WorkspaceStats;
  recent_transactions: TransactionWithProfiles[];
  top_receivers: Array<{
    profile: Profile;
    total_received: number;
    transaction_count: number;
  }>;
  top_senders: Array<{
    profile: Profile;
    total_sent: number;
    transaction_count: number;
  }>;
}

export interface LeaderboardEntry {
  rank: number;
  profile: Profile;
  total_received: number;
  total_sent: number;
  net_karma: number;
  transaction_count: number;
  period: 'week' | 'month' | 'all_time';
}

export interface ActivityFeedItem {
  id: string;
  type:
    | 'transaction_sent'
    | 'transaction_received'
    | 'member_joined'
    | 'member_promoted'
    | 'workspace_updated';
  title: string;
  description: string;
  timestamp: string;
  actor_profile?: Profile;
  target_profile?: Profile;
  metadata?: Record<string, any>;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiError {
  message: string;
  code: string;
  status: number;
  details?: ValidationError[];
  timestamp: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type SortOrder = 'asc' | 'desc';

export interface SortConfig {
  field: string;
  order: SortOrder;
}

export interface FilterConfig {
  field: string;
  operator:
    | 'eq'
    | 'neq'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'like'
    | 'in'
    | 'not_in';
  value: any;
}

export interface QueryConfig {
  page?: number;
  limit?: number;
  sort?: SortConfig[];
  filters?: FilterConfig[];
  search?: string;
}

// ============================================================================
// COMPONENT PROPS TYPES
// ============================================================================

export interface TransactionFormProps {
  onSubmit: (data: CreateTransactionInput) => Promise<void>;
  loading?: boolean;
  error?: string;
  availableBalance: number;
  minAmount: number;
  maxAmount: number;
  dailyLimit: number;
  dailyUsed: number;
}

export interface MemberCardProps {
  member: WorkspaceMember;
  currentUser: Profile;
  onPromote?: (memberId: string) => Promise<void>;
  onDemote?: (memberId: string) => Promise<void>;
  onDeactivate?: (memberId: string) => Promise<void>;
}

export interface WorkspaceSettingsProps {
  workspace: Workspace;
  onUpdate: (data: UpdateWorkspaceInput) => Promise<void>;
  loading?: boolean;
  error?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const USER_ROLES: Record<UserRole, string> = {
  employee: 'Employee',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  employee: 1,
  admin: 2,
  super_admin: 3,
};

export const DEFAULT_WORKSPACE_SETTINGS = {
  min_transaction_amount: 5,
  max_transaction_amount: 20,
  daily_limit_percentage: 30,
  reward_approval_threshold: 1000,
  monthly_allowance: 100,
} as const;

export const TRANSACTION_LIMITS = {
  MIN_AMOUNT: 1,
  MAX_AMOUNT: 1000,
  MIN_MESSAGE_LENGTH: 0,
  MAX_MESSAGE_LENGTH: 500,
} as const;

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isUserRole(value: any): value is UserRole {
  return ['employee', 'admin', 'super_admin'].includes(value);
}

export function isProfile(value: any): value is Profile {
  return (
    value &&
    typeof value.id === 'string' &&
    typeof value.auth_user_id === 'string' &&
    typeof value.workspace_id === 'string' &&
    typeof value.email === 'string' &&
    isUserRole(value.role) &&
    typeof value.giving_balance === 'number' &&
    typeof value.redeemable_balance === 'number' &&
    typeof value.active === 'boolean'
  );
}

export function isWorkspace(value: any): value is Workspace {
  return (
    value &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.slug === 'string' &&
    typeof value.currency_name === 'string' &&
    typeof value.monthly_allowance === 'number' &&
    typeof value.min_transaction_amount === 'number' &&
    typeof value.max_transaction_amount === 'number' &&
    typeof value.daily_limit_percentage === 'number' &&
    typeof value.reward_approval_threshold === 'number'
  );
}

export function isTransaction(value: any): value is Transaction {
  return (
    value &&
    typeof value.id === 'string' &&
    typeof value.workspace_id === 'string' &&
    typeof value.sender_profile_id === 'string' &&
    typeof value.receiver_profile_id === 'string' &&
    typeof value.amount === 'number' &&
    typeof value.created_at === 'string'
  );
}
