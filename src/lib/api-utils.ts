// API utilities and middleware
// Provides common functionality for API routes

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfileServer } from './permissions-server';
import { HTTP_STATUS, ERROR_CODES, ApiError } from './api-types';
import { ApiResponse, PaginatedResponse } from './types';
import { DatabaseError } from './database';
import { Profile } from './supabase-types';
import { supabaseServer } from './supabase-server';

export type RouteHandler = (
  req: NextRequest,
  context: RouteContext
) => Promise<NextResponse>;

// ============================================================================
// REQUEST UTILITIES
// ============================================================================

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string;
    email: string;
    profile: Profile;
  };
}

export interface RouteContext {
  params: Promise<Record<string, string | string[] | undefined>>;
  [key: string]: unknown;
}

function ensureRouteContext(context?: RouteContext): RouteContext {
  if (context) {
    return context;
  }
  return {
    params: Promise.resolve({} as Record<string, string | string[] | undefined>),
  };
}

export interface AuthenticatedJoinRequest extends NextRequest {
  user: {
    id: string;
    email: string;
    profile: Profile | null;
    raw_user_metadata?: {
      full_name?: string;
      name?: string;
      avatar_url?: string;
      picture?: string;
    };
  };
  supabase: typeof supabaseServer;
}

export async function getAuthenticatedUser(req?: NextRequest): Promise<{
  id: string;
  email: string;
  profile: Profile;
}> {
  try {
    // Get token from request header if available
    let token: string | null = null;
    if (req) {
      const authorization = req.headers.get('authorization');
      if (authorization?.startsWith('Bearer ')) {
        token = authorization.replace('Bearer ', '');
      }
    }

    if (!token) {
      const error = new Error('No authorization token provided');
      Object.assign(error, {
        code: ERROR_CODES.UNAUTHORIZED,
        status: HTTP_STATUS.UNAUTHORIZED,
      });
      throw error;
    }

    const profile = await getCurrentProfileServer(token);
    if (!profile) {
      const error = new Error('User profile not found');
      Object.assign(error, {
        code: ERROR_CODES.UNAUTHORIZED,
        status: HTTP_STATUS.UNAUTHORIZED,
      });
      throw error;
    }

    return {
      id: profile.auth_user_id,
      email: profile.email,
      profile,
    };
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      'code' in error &&
      'status' in error
    ) {
      throw error;
    }
    const newError = new Error('Authentication failed');
    Object.assign(newError, {
      code: ERROR_CODES.UNAUTHORIZED,
      status: HTTP_STATUS.UNAUTHORIZED,
    });
    throw newError;
  }
}

// Special auth function for join API that doesn't require existing profile
export async function getAuthenticatedUserForJoin(req: NextRequest): Promise<{
  id: string;
  email: string;
  profile: Profile | null;
  raw_user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    picture?: string;
  };
}> {
  try {
    console.log('=== JOIN AUTH DEBUG ===');
    
    // Get the authorization header
    const authorization = req.headers.get('authorization');
    console.log('Authorization header present:', !!authorization);
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      console.log('No valid authorization header');
      const error = new Error('No valid authorization header');
      Object.assign(error, {
        code: ERROR_CODES.UNAUTHORIZED,
        status: HTTP_STATUS.UNAUTHORIZED,
      });
      throw error;
    }

    const token = authorization.replace('Bearer ', '');
    console.log('Token length:', token.length);
    
    // Use server-side supabase client to get user from token
    console.log('Validating token with server-side client...');
    console.log('supabaseServer type:', typeof supabaseServer);
    console.log('supabaseServer.auth type:', typeof supabaseServer.auth);
    console.log('supabaseServer.from type:', typeof supabaseServer.from);
    
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);
    
    console.log('Auth result:', { user: !!user, error: authError });
    
    if (authError || !user) {
      console.log('Token validation failed:', authError);
      const error = new Error('Invalid or expired token');
      Object.assign(error, {
        code: ERROR_CODES.UNAUTHORIZED,
        status: HTTP_STATUS.UNAUTHORIZED,
      });
      throw error;
    }

    console.log('User authenticated:', user.id, user.email);

    // Try to get profile using server client, but don't fail if it doesn't exist
    // In multi-workspace mode, fetch profile for current workspace preference
    let profile = null;
    try {
      console.log('Looking up profile for user:', user.id);
      
      // First, get user's current workspace preference
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
      
      // Query profile for the current workspace
      if (workspaceId) {
        const { data: profileData, error: profileError } = await supabaseServer
          .from('profiles')
          .select('*')
          .eq('auth_user_id', user.id)
          .eq('workspace_id', workspaceId)
          .maybeSingle();
          
        console.log('Profile lookup result:', { profile: !!profileData, error: profileError });
        profile = profileData;
      }
    } catch (err) {
      console.log('Profile lookup exception:', err);
      // Ignore profile lookup errors for join API
    }
    
    console.log('Join auth complete:', { userId: user.id, hasProfile: !!profile });
    
    return {
      id: user.id,
      email: user.email || '',
      profile,
      raw_user_metadata: user.user_metadata,
    };
  } catch (error) {
    console.log('Join auth error:', error);
    // Re-throw auth errors
    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      'code' in error &&
      'status' in error
    ) {
      throw error;
    }
    const newError = new Error('Authentication failed');
    Object.assign(newError, {
      code: ERROR_CODES.UNAUTHORIZED,
      status: HTTP_STATUS.UNAUTHORIZED,
    });
    throw newError;
  }
}

export async function parseRequestBody<T>(req: NextRequest): Promise<T> {
  try {
    const body = await req.json();
    return body as T;
  } catch {
    const newError = new Error('Invalid JSON in request body');
    Object.assign(newError, {
      code: ERROR_CODES.VALIDATION_ERROR,
      status: HTTP_STATUS.BAD_REQUEST,
    });
    throw newError;
  }
}

export function getQueryParams(req: NextRequest): Record<string, string> {
  const { searchParams } = new URL(req.url);
  const params: Record<string, string> = {};

  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return params;
}

export function getPathParams(
  req: NextRequest,
  pattern: string
): Record<string, string> {
  // This is a simplified version - in a real app, you'd use a proper router
  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const patternSegments = pattern.split('/').filter(Boolean);

  const params: Record<string, string> = {};

  for (let i = 0; i < patternSegments.length; i++) {
    const segment = patternSegments[i];
    if (segment.startsWith('[') && segment.endsWith(']')) {
      const paramName = segment.slice(1, -1);
      params[paramName] = pathSegments[i] || '';
    }
  }

  return params;
}

// ============================================================================
// RESPONSE UTILITIES
// ============================================================================

export function createSuccessResponse<T>(
  data: T,
  message?: string,
  status: number = HTTP_STATUS.OK
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    },
    { status }
  );
}

export function createErrorResponse(
  error: string,
  code: string,
  status: number,
  details?: unknown
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      code,
      details,
    },
    { status }
  );
}

export function createValidationErrorResponse(
  errors: Array<{ field: string; message: string; code: string }>
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: 'Validation failed',
      code: ERROR_CODES.VALIDATION_ERROR,
      details: errors,
    },
    { status: HTTP_STATUS.UNPROCESSABLE_ENTITY }
  );
}

export function createNotFoundResponse(
  resource: string = 'Resource'
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: `${resource} not found`,
      code: ERROR_CODES.NOT_FOUND,
    },
    { status: HTTP_STATUS.NOT_FOUND }
  );
}

export function createUnauthorizedResponse(
  message: string = 'Unauthorized'
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: ERROR_CODES.UNAUTHORIZED,
    },
    { status: HTTP_STATUS.UNAUTHORIZED }
  );
}

export function createForbiddenResponse(
  message: string = 'Forbidden'
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: ERROR_CODES.FORBIDDEN,
    },
    { status: HTTP_STATUS.FORBIDDEN }
  );
}

export function createBadRequestResponse(
  message: string = 'Bad Request'
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: ERROR_CODES.BAD_REQUEST,
    },
    { status: HTTP_STATUS.BAD_REQUEST }
  );
}

export function createConflictResponse(
  message: string = 'Resource already exists'
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: ERROR_CODES.CONFLICT,
    },
    { status: HTTP_STATUS.CONFLICT }
  );
}

export function createServerErrorResponse(
  message: string = 'Internal server error'
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
    },
    { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
  );
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

export function withAuth(
  handler: (
    req: AuthenticatedRequest,
    context: RouteContext
  ) => Promise<NextResponse>
): RouteHandler {
  return (async (
    req: NextRequest,
    context: RouteContext | undefined
  ): Promise<NextResponse> => {
    const resolvedContext = ensureRouteContext(context);
    try {
      const user = await getAuthenticatedUser(req);
      (req as AuthenticatedRequest).user = user;
      return await handler(req as AuthenticatedRequest, resolvedContext);
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'message' in error &&
        'code' in error &&
        'status' in error
      ) {
        const apiError = error as ApiError;
        return createErrorResponse(
          apiError.message,
          apiError.code,
          apiError.status,
          apiError.details
        );
      }
      return createServerErrorResponse('Authentication middleware failed');
    }
  }) as RouteHandler;
}

// Special auth middleware for join API that allows users without profiles
export function withJoinAuth(
  handler: (
    req: AuthenticatedJoinRequest,
    context: RouteContext
  ) => Promise<NextResponse>
): RouteHandler {
  return (async (
    req: NextRequest,
    context: RouteContext | undefined
  ): Promise<NextResponse> => {
    const resolvedContext = ensureRouteContext(context);
    try {
      const user = await getAuthenticatedUserForJoin(req);
      (req as AuthenticatedJoinRequest).user = user;
      (req as AuthenticatedJoinRequest).supabase = supabaseServer;
      return await handler(req as AuthenticatedJoinRequest, resolvedContext);
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'message' in error &&
        'code' in error &&
        'status' in error
      ) {
        const apiError = error as ApiError;
        return createErrorResponse(
          apiError.message,
          apiError.code,
          apiError.status,
          apiError.details
        );
      }
      return createServerErrorResponse('Join authentication middleware failed');
    }
  }) as RouteHandler;
}

export function withPermissions(requiredPermissions: string[]) {
  return function (
    handler: (
      req: AuthenticatedRequest,
      context: RouteContext
    ) => Promise<NextResponse>
  ) {
    return withAuth(
      async (
        req: AuthenticatedRequest,
        context: RouteContext
      ): Promise<NextResponse> => {
        try {
          const { profile } = req.user;

          // Check if user has required permissions using the existing permission system
          const hasPermission = requiredPermissions.every((permission) => {
            switch (permission) {
              case 'admin':
                return (
                  profile.role === 'admin' || profile.role === 'super_admin'
                );
              case 'super_admin':
                return profile.role === 'super_admin';
              case 'member':
                return (
                  profile.role === 'employee' ||
                  profile.role === 'admin' ||
                  profile.role === 'super_admin'
                );
              default:
                return false;
            }
          });

          if (!hasPermission) {
            return createForbiddenResponse('Insufficient permissions');
          }

          return await handler(req, context);
        } catch (error) {
          if (
            error &&
            typeof error === 'object' &&
            'message' in error &&
            'code' in error &&
            'status' in error
          ) {
            const apiError = error as ApiError;
            return createErrorResponse(
              apiError.message,
              apiError.code,
              apiError.status,
              apiError.details
            );
          }
          return createServerErrorResponse('Permission middleware failed');
        }
      }
    );
  };
}

export function withValidation<T>(schema: { required?: string[] }) {
  return function (
    handler: (
      req: AuthenticatedRequest,
      body: T,
      context: RouteContext
    ) => Promise<NextResponse>
  ) {
    return withAuth(
      async (
        req: AuthenticatedRequest,
        context: RouteContext
      ): Promise<NextResponse> => {
        try {
          const body = await parseRequestBody<T>(req);

          // Basic validation - you'd use a proper validation library like Zod
          const errors: Array<{
            field: string;
            message: string;
            code: string;
          }> = [];

          // This is a simplified validation - implement proper schema validation
          if (schema.required) {
            for (const field of schema.required) {
              if (
                !body ||
                typeof body !== 'object' ||
                body === null ||
                !(field in body) ||
                body[field as keyof T] === undefined ||
                body[field as keyof T] === null
              ) {
                errors.push({
                  field,
                  message: `${field} is required`,
                  code: 'REQUIRED',
                });
              }
            }
          }

          if (errors.length > 0) {
            return createValidationErrorResponse(errors);
          }

          return await handler(req, body, context);
        } catch (error) {
          if (
            error &&
            typeof error === 'object' &&
            'message' in error &&
            'code' in error &&
            'status' in error
          ) {
            const apiError = error as ApiError;
            return createErrorResponse(
              apiError.message,
              apiError.code,
              apiError.status,
              apiError.details
            );
          }
          return createServerErrorResponse('Validation middleware failed');
        }
      }
    );
  };
}

export function withErrorHandling(handler: RouteHandler): RouteHandler {
  return (async (
    req: NextRequest,
    context: RouteContext | undefined
  ): Promise<NextResponse> => {
    const resolvedContext = ensureRouteContext(context);
    try {
      return await handler(req, resolvedContext);
    } catch (error) {
      console.error('API Error:', error);

      if (
        error &&
        typeof error === 'object' &&
        'message' in error &&
        'code' in error &&
        'status' in error
      ) {
        const apiError = error as ApiError;
        return createErrorResponse(
          apiError.message,
          apiError.code,
          apiError.status,
          apiError.details
        );
      }

      if (
        error &&
        typeof error === 'object' &&
        'message' in error &&
        'code' in error &&
        'status' in error
      ) {
        const dbError = error as DatabaseError;
        return createErrorResponse(
          dbError.message,
          dbError.code,
          dbError.status,
          dbError.details
        );
      }

      return createServerErrorResponse('An unexpected error occurred');
    }
  }) as RouteHandler;
}

// ============================================================================
// PAGINATION UTILITIES
// ============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export function parsePaginationParams(req: NextRequest): PaginationParams {
  const params = getQueryParams(req);

  return {
    page: params.page ? Math.max(1, parseInt(params.page, 10)) : 1,
    limit: params.limit
      ? Math.min(100, Math.max(1, parseInt(params.limit, 10)))
      : 20,
  };
}

export function createPaginationResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);

  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1,
    },
  };
}

// ============================================================================
// CORS UTILITIES
// ============================================================================

export function setCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );
  return response;
}

export function handleCors(req: NextRequest): NextResponse | null {
  if (req.method === 'OPTIONS') {
    return setCorsHeaders(new NextResponse(null, { status: 200 }));
  }
  return null;
}

// ============================================================================
// RATE LIMITING (Simplified)
// ============================================================================

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function withRateLimit(windowMs: number, maxRequests: number) {
  return function (
    handler: (
      req: NextRequest,
      context: RouteContext
    ) => Promise<NextResponse>
  ) {
    return (async (
      req: NextRequest,
      context: RouteContext | undefined
    ): Promise<NextResponse> => {
      const resolvedContext = ensureRouteContext(context);
      // Get client IP from headers (Next.js doesn't have direct ip property)
      const forwarded = req.headers.get('x-forwarded-for');
      const realIp = req.headers.get('x-real-ip');
      const clientId = forwarded?.split(',')[0] || realIp || 'unknown';
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean up old entries
      for (const [key, value] of rateLimitMap.entries()) {
        if (value.resetTime < windowStart) {
          rateLimitMap.delete(key);
        }
      }

      const current = rateLimitMap.get(clientId);

      if (!current || current.resetTime < windowStart) {
        rateLimitMap.set(clientId, { count: 1, resetTime: now });
      } else if (current.count >= maxRequests) {
        return createErrorResponse(
          'Rate limit exceeded',
          ERROR_CODES.RATE_LIMITED,
          HTTP_STATUS.TOO_MANY_REQUESTS
        );
      } else {
        current.count++;
      }

      return await handler(req, resolvedContext);
    }) as RouteHandler;
  };
}

// ============================================================================
// CACHING UTILITIES (Simplified)
// ============================================================================

const cache = new Map<string, { data: unknown; expires: number }>();

export function withCache(
  ttl: number,
  keyGenerator?: (req: NextRequest) => string
) {
  return function (
    handler: (
      req: NextRequest,
      context: RouteContext
    ) => Promise<NextResponse>
  ) {
    return (async (
      req: NextRequest,
      context: RouteContext | undefined
    ): Promise<NextResponse> => {
      const resolvedContext = ensureRouteContext(context);
      const cacheKey = keyGenerator ? keyGenerator(req) : req.url;
      const now = Date.now();

      // Check cache
      const cached = cache.get(cacheKey);
      if (cached && cached.expires > now) {
        return NextResponse.json(cached.data);
      }

      // Execute handler
      const response = await handler(req, resolvedContext);

      // Cache response
      if (response.status === 200) {
        const data = await response.json();
        cache.set(cacheKey, {
          data,
          expires: now + ttl * 1000,
        });
      }

      return response;
    }) as RouteHandler;
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidUuid(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function formatDate(date: string | Date): string {
  return new Date(date).toISOString();
}

export function parseDate(dateString: string): Date {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    const error = new Error('Invalid date format');
    Object.assign(error, {
      code: ERROR_CODES.VALIDATION_ERROR,
      status: HTTP_STATUS.BAD_REQUEST,
    });
    throw error;
  }
  return date;
}
