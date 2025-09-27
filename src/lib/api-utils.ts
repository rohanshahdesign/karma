// API utilities and middleware
// Provides common functionality for API routes

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile } from './permissions';
import { ApiError, ApiResponse, HTTP_STATUS, ERROR_CODES } from './api-types';
import { DatabaseError } from './database';

// ============================================================================
// REQUEST UTILITIES
// ============================================================================

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string;
    email: string;
    profile: any;
  };
}

export async function getAuthenticatedUser(req: NextRequest): Promise<{
  id: string;
  email: string;
  profile: any;
}> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      throw new ApiError(
        'User not authenticated',
        ERROR_CODES.UNAUTHORIZED,
        HTTP_STATUS.UNAUTHORIZED
      );
    }

    return {
      id: profile.auth_user_id,
      email: profile.email,
      profile,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      'Authentication failed',
      ERROR_CODES.UNAUTHORIZED,
      HTTP_STATUS.UNAUTHORIZED
    );
  }
}

export async function parseRequestBody<T>(req: NextRequest): Promise<T> {
  try {
    const body = await req.json();
    return body as T;
  } catch (error) {
    throw new ApiError(
      'Invalid JSON in request body',
      ERROR_CODES.VALIDATION_ERROR,
      HTTP_STATUS.BAD_REQUEST
    );
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
  details?: any
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
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const user = await getAuthenticatedUser(req);
      (req as AuthenticatedRequest).user = user;
      return await handler(req as AuthenticatedRequest);
    } catch (error) {
      if (error instanceof ApiError) {
        return createErrorResponse(
          error.message,
          error.code,
          error.status,
          error.details
        );
      }
      return createServerErrorResponse('Authentication middleware failed');
    }
  };
}

export function withPermissions(requiredPermissions: string[]) {
  return function (
    handler: (req: AuthenticatedRequest) => Promise<NextResponse>
  ) {
    return withAuth(
      async (req: AuthenticatedRequest): Promise<NextResponse> => {
        try {
          const { profile } = req.user;

          // Check if user has required permissions
          const hasPermission = requiredPermissions.every((permission) => {
            // This is a simplified permission check - you'd implement your own logic
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

          return await handler(req);
        } catch (error) {
          if (error instanceof ApiError) {
            return createErrorResponse(
              error.message,
              error.code,
              error.status,
              error.details
            );
          }
          return createServerErrorResponse('Permission middleware failed');
        }
      }
    );
  };
}

export function withValidation<T>(schema: any) {
  return function (
    handler: (req: AuthenticatedRequest, body: T) => Promise<NextResponse>
  ) {
    return withAuth(
      async (req: AuthenticatedRequest): Promise<NextResponse> => {
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

          return await handler(req, body);
        } catch (error) {
          if (error instanceof ApiError) {
            return createErrorResponse(
              error.message,
              error.code,
              error.status,
              error.details
            );
          }
          return createServerErrorResponse('Validation middleware failed');
        }
      }
    );
  };
}

export function withErrorHandling(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      return await handler(req);
    } catch (error) {
      console.error('API Error:', error);

      if (error instanceof ApiError) {
        return createErrorResponse(
          error.message,
          error.code,
          error.status,
          error.details
        );
      }

      if (error instanceof DatabaseError) {
        return createErrorResponse(
          error.message,
          error.code,
          error.status,
          error.details
        );
      }

      return createServerErrorResponse('An unexpected error occurred');
    }
  };
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
): ApiResponse<T[]> {
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
  return function (handler: (req: NextRequest) => Promise<NextResponse>) {
    return async (req: NextRequest): Promise<NextResponse> => {
      const clientId = req.ip || 'unknown';
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

      return await handler(req);
    };
  };
}

// ============================================================================
// CACHING UTILITIES (Simplified)
// ============================================================================

const cache = new Map<string, { data: any; expires: number }>();

export function withCache(
  ttl: number,
  keyGenerator?: (req: NextRequest) => string
) {
  return function (handler: (req: NextRequest) => Promise<NextResponse>) {
    return async (req: NextRequest): Promise<NextResponse> => {
      const cacheKey = keyGenerator ? keyGenerator(req) : req.url;
      const now = Date.now();

      // Check cache
      const cached = cache.get(cacheKey);
      if (cached && cached.expires > now) {
        return NextResponse.json(cached.data);
      }

      // Execute handler
      const response = await handler(req);

      // Cache response
      if (response.status === 200) {
        const data = await response.json();
        cache.set(cacheKey, {
          data,
          expires: now + ttl * 1000,
        });
      }

      return response;
    };
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
    throw new ApiError(
      'Invalid date format',
      ERROR_CODES.VALIDATION_ERROR,
      HTTP_STATUS.BAD_REQUEST
    );
  }
  return date;
}
