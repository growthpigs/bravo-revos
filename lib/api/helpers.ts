/**
 * API Route Helper Utilities
 *
 * Consolidated response helpers and authentication utilities
 * to eliminate boilerplate across 100+ API routes.
 *
 * @example
 * import { ok, unauthorized, requireAuth } from '@/lib/api';
 *
 * export async function GET() {
 *   const auth = await requireAuth();
 *   if (auth instanceof NextResponse) return auth;
 *   const { user, supabase } = auth;
 *   // ... your logic
 *   return ok({ items: data });
 * }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { ZodSchema, ZodError } from 'zod';

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Success response with data
 * @example return ok({ campaign: data })
 * @example return ok({ items: [], total: 0 })
 */
export function ok<T>(data: T): NextResponse {
  return NextResponse.json({ success: true, data });
}

/**
 * Success response with just a message (no data payload)
 * @example return okMessage('Campaign deleted successfully')
 */
export function okMessage(message: string): NextResponse {
  return NextResponse.json({ success: true, message });
}

/**
 * 401 Unauthorized response
 * @example return unauthorized()
 * @example return unauthorized('Session expired')
 */
export function unauthorized(message = 'Unauthorized'): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status: 401 });
}

/**
 * 400 Bad Request response
 * @example return badRequest('Missing required field: name')
 * @example return badRequest('Validation failed', zodError.issues)
 */
export function badRequest(message: string, details?: unknown): NextResponse {
  const body: { success: false; error: string; details?: unknown } = {
    success: false,
    error: message,
  };
  if (details !== undefined) {
    body.details = details;
  }
  return NextResponse.json(body, { status: 400 });
}

/**
 * 404 Not Found response
 * @example return notFound('Campaign not found')
 */
export function notFound(message = 'Not found'): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status: 404 });
}

/**
 * 403 Forbidden response
 * @example return forbidden('You do not have access to this resource')
 */
export function forbidden(message = 'Forbidden'): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status: 403 });
}

/**
 * 409 Conflict response
 * @example return conflict('Campaign with this name already exists')
 */
export function conflict(message: string): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status: 409 });
}

/**
 * 500 Internal Server Error response
 * @example return serverError('Database connection failed')
 */
export function serverError(message = 'Internal server error'): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status: 500 });
}

// ============================================================================
// Authentication Helpers
// ============================================================================

export interface AuthResult {
  user: User;
  supabase: SupabaseClient;
}

/**
 * Require authentication for an API route.
 * Returns either the authenticated context or a 401 response.
 *
 * @example
 * export async function GET() {
 *   const auth = await requireAuth();
 *   if (auth instanceof NextResponse) return auth;
 *   const { user, supabase } = auth;
 *   // user is guaranteed to exist here
 * }
 */
export async function requireAuth(): Promise<AuthResult | NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return unauthorized();
  }

  return { user, supabase };
}

// ============================================================================
// Validation Helpers
// ============================================================================

export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

export interface ValidationFailure {
  success: false;
  response: NextResponse;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/**
 * Validate request body against a Zod schema.
 * Returns either the validated data or a 400 response.
 *
 * @example
 * const validation = validateBody(campaignCreateSchema, await request.json());
 * if (!validation.success) return validation.response;
 * const { name, description } = validation.data;
 */
export function validateBody<T>(
  schema: ZodSchema<T>,
  body: unknown
): ValidationResult<T> {
  const result = schema.safeParse(body);

  if (!result.success) {
    const zodError = result.error as ZodError;
    const details = zodError.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    return {
      success: false,
      response: badRequest('Validation failed', details),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Validate query parameters against a Zod schema.
 * Extracts params from URL searchParams.
 *
 * @example
 * const validation = validateQuery(paginationSchema, request.nextUrl.searchParams);
 * if (!validation.success) return validation.response;
 * const { page, limit } = validation.data;
 */
export function validateQuery<T>(
  schema: ZodSchema<T>,
  searchParams: URLSearchParams
): ValidationResult<T> {
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return validateBody(schema, params);
}

// ============================================================================
// Request Parsing Helpers
// ============================================================================

/**
 * Safely parse JSON body from request.
 * Returns the parsed body or a 400 response if parsing fails.
 *
 * @example
 * const body = await parseJsonBody(request);
 * if (body instanceof NextResponse) return body;
 * // body is now the parsed JSON
 */
export async function parseJsonBody(
  request: Request
): Promise<unknown | NextResponse> {
  try {
    return await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }
}

/**
 * Combined auth check and body validation.
 * Useful for POST/PUT/PATCH routes that need both.
 *
 * @example
 * export async function POST(request: Request) {
 *   const result = await requireAuthAndValidate(request, campaignCreateSchema);
 *   if (result instanceof NextResponse) return result;
 *   const { user, supabase, data } = result;
 *   // All validated, proceed with creation
 * }
 */
export async function requireAuthAndValidate<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<(AuthResult & { data: T }) | NextResponse> {
  // First check auth
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  // Then parse and validate body
  const body = await parseJsonBody(request);
  if (body instanceof NextResponse) return body;

  const validation = validateBody(schema, body);
  if (!validation.success) return validation.response;

  return {
    ...auth,
    data: validation.data,
  };
}
