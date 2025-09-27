// API-specific types for Next.js API routes
// Extends base types with API-specific functionality

import { ApiResponse, PaginatedResponse, QueryConfig } from './types';

// ============================================================================
// API ROUTE TYPES
// ============================================================================

export interface ApiRouteHandler<T = any> {
  (req: Request, context?: any): Promise<Response>;
}

export interface ApiRouteContext {
  params: Record<string, string>;
  searchParams: Record<string, string>;
}

// ============================================================================
// REQUEST TYPES
// ============================================================================

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    profile: any;
  };
}

export interface CreateWorkspaceRequest {
  name: string;
  slug: string;
  currency_name: string;
  monthly_allowance: number;
  min_transaction_amount?: number;
  max_transaction_amount?: number;
  daily_limit_percentage?: number;
  reward_approval_threshold?: number;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  currency_name?: string;
  monthly_allowance?: number;
  min_transaction_amount?: number;
  max_transaction_amount?: number;
  daily_limit_percentage?: number;
  reward_approval_threshold?: number;
}

export interface CreateTransactionRequest {
  receiver_profile_id: string;
  amount: number;
  message?: string;
}

export interface JoinWorkspaceRequest {
  invite_code: string;
}

export interface UpdateProfileRequest {
  full_name?: string;
  department?: string;
  active?: boolean;
}

export interface PromoteUserRequest {
  target_profile_id: string;
}

export interface DemoteUserRequest {
  target_profile_id: string;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface WorkspaceResponse extends ApiResponse {
  data: {
    workspace: any;
    profile: any;
  };
}

export interface TransactionResponse extends ApiResponse {
  data: {
    transaction: any;
    sender_balance: number;
    receiver_balance: number;
  };
}

export interface MemberListResponse extends PaginatedResponse {
  data: any[];
  filters: {
    role?: string;
    department?: string;
    active?: boolean;
    search?: string;
  };
}

export interface TransactionListResponse extends PaginatedResponse {
  data: any[];
  filters: {
    date_from?: string;
    date_to?: string;
    sender_id?: string;
    receiver_id?: string;
    min_amount?: number;
    max_amount?: number;
  };
}

export interface DashboardResponse extends ApiResponse {
  data: {
    user_stats: any;
    workspace_stats: any;
    recent_transactions: any[];
    top_receivers: any[];
    top_senders: any[];
  };
}

export interface LeaderboardResponse extends ApiResponse {
  data: {
    entries: any[];
    period: 'week' | 'month' | 'all_time';
    total_participants: number;
  };
}

// ============================================================================
// ERROR RESPONSE TYPES
// ============================================================================

export interface ValidationErrorResponse extends ApiResponse {
  error: string;
  code: 'VALIDATION_ERROR';
  details: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

export interface UnauthorizedResponse extends ApiResponse {
  error: string;
  code: 'UNAUTHORIZED';
  status: 401;
}

export interface ForbiddenResponse extends ApiResponse {
  error: string;
  code: 'FORBIDDEN';
  status: 403;
}

export interface NotFoundResponse extends ApiResponse {
  error: string;
  code: 'NOT_FOUND';
  status: 404;
}

export interface ConflictResponse extends ApiResponse {
  error: string;
  code: 'CONFLICT';
  status: 409;
}

export interface RateLimitResponse extends ApiResponse {
  error: string;
  code: 'RATE_LIMITED';
  status: 429;
}

export interface ServerErrorResponse extends ApiResponse {
  error: string;
  code: 'INTERNAL_SERVER_ERROR';
  status: 500;
}

// ============================================================================
// API ENDPOINT TYPES
// ============================================================================

export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  handler: ApiRouteHandler;
  middleware?: Array<(req: Request) => Promise<Request>>;
  validation?: {
    body?: any;
    query?: any;
    params?: any;
  };
}

export interface ApiRouteConfig {
  endpoint: ApiEndpoint;
  permissions?: string[];
  rateLimit?: {
    windowMs: number;
    max: number;
  };
  cache?: {
    ttl: number;
    key?: string;
  };
}

// ============================================================================
// MIDDLEWARE TYPES
// ============================================================================

export interface AuthMiddleware {
  (req: Request): Promise<AuthenticatedRequest>;
}

export interface PermissionMiddleware {
  (permissions: string[]): (
    req: AuthenticatedRequest
  ) => Promise<AuthenticatedRequest>;
}

export interface ValidationMiddleware {
  (schema: any): (req: Request) => Promise<Request>;
}

export interface RateLimitMiddleware {
  (config: { windowMs: number; max: number }): (
    req: Request
  ) => Promise<Request>;
}

// ============================================================================
// QUERY BUILDER TYPES
// ============================================================================

export interface DatabaseQuery {
  table: string;
  select?: string[];
  where?: Record<string, any>;
  orderBy?: Array<{ column: string; direction: 'asc' | 'desc' }>;
  limit?: number;
  offset?: number;
  joins?: Array<{
    table: string;
    on: string;
    type?: 'inner' | 'left' | 'right' | 'full';
  }>;
}

export interface QueryBuilder {
  select(columns: string[]): QueryBuilder;
  from(table: string): QueryBuilder;
  where(condition: Record<string, any>): QueryBuilder;
  orderBy(column: string, direction?: 'asc' | 'desc'): QueryBuilder;
  limit(count: number): QueryBuilder;
  offset(count: number): QueryBuilder;
  join(
    table: string,
    on: string,
    type?: 'inner' | 'left' | 'right' | 'full'
  ): QueryBuilder;
  build(): DatabaseQuery;
}

// ============================================================================
// CACHE TYPES
// ============================================================================

export interface CacheConfig {
  ttl: number;
  key: string;
  tags?: string[];
}

export interface CacheManager {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  invalidate(tags: string[]): Promise<void>;
  clear(): Promise<void>;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type HttpStatus =
  | 200
  | 201
  | 204
  | 400
  | 401
  | 403
  | 404
  | 409
  | 422
  | 429
  | 500
  | 502
  | 503
  | 504;

export interface ApiError extends Error {
  status: HttpStatus;
  code: string;
  details?: any;
}

export interface ApiSuccess<T = any> {
  data: T;
  message?: string;
  meta?: Record<string, any>;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isApiError(error: any): error is ApiError {
  return (
    error && typeof error.status === 'number' && typeof error.code === 'string'
  );
}

export function isValidationError(
  error: any
): error is ValidationErrorResponse {
  return (
    error && error.code === 'VALIDATION_ERROR' && Array.isArray(error.details)
  );
}

export function isUnauthorizedError(error: any): error is UnauthorizedResponse {
  return error && error.code === 'UNAUTHORIZED' && error.status === 401;
}

export function isForbiddenError(error: any): error is ForbiddenResponse {
  return error && error.code === 'FORBIDDEN' && error.status === 403;
}

export function isNotFoundError(error: any): error is NotFoundResponse {
  return error && error.code === 'NOT_FOUND' && error.status === 404;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

export const DEFAULT_PAGINATION = {
  page: 1,
  limit: 20,
  max_limit: 100,
} as const;

export const CACHE_TTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const;
