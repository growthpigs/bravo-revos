/**
 * Higher-Order Function Wrapper for Authenticated Routes
 *
 * Provides a clean wrapper pattern for routes that require authentication.
 * Handles auth check, error handling, and consistent response format.
 *
 * @example
 * import { withAuth } from '@/lib/api';
 *
 * export const GET = withAuth(async ({ user, supabase }, request) => {
 *   const { data } = await supabase
 *     .from('campaigns')
 *     .select('*')
 *     .eq('user_id', user.id);
 *   return { campaigns: data };
 * });
 */

import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { requireAuth, ok, serverError, type AuthResult } from './helpers';

/**
 * Context provided to authenticated route handlers
 */
export interface AuthenticatedContext {
  user: User;
  supabase: SupabaseClient;
}

/**
 * Route params passed to dynamic routes (e.g., [id])
 */
export interface RouteParams {
  params: Promise<Record<string, string>>;
}

/**
 * Handler function signature for authenticated routes
 */
export type AuthenticatedHandler<T = unknown> = (
  context: AuthenticatedContext,
  request: NextRequest,
  routeParams?: RouteParams
) => Promise<T | NextResponse>;

/**
 * Standard Next.js route handler type
 */
export type RouteHandler = (
  request: NextRequest,
  routeParams?: RouteParams
) => Promise<NextResponse>;

/**
 * Wrap an API route handler with authentication.
 *
 * Benefits:
 * - Automatic auth check (returns 401 if not authenticated)
 * - Automatic error handling (catches thrown errors, returns 500)
 * - Automatic response wrapping (plain objects become { success: true, data: ... })
 * - Type-safe user and supabase client injection
 *
 * @example Basic usage
 * export const GET = withAuth(async ({ user, supabase }) => {
 *   const { data } = await supabase.from('items').select('*');
 *   return { items: data };
 * });
 *
 * @example With request body
 * export const POST = withAuth(async ({ user, supabase }, request) => {
 *   const body = await request.json();
 *   const { data } = await supabase.from('items').insert({ ...body, user_id: user.id });
 *   return { item: data };
 * });
 *
 * @example With route params (dynamic routes)
 * export const GET = withAuth(async ({ user, supabase }, request, { params }) => {
 *   const { id } = await params;
 *   const { data } = await supabase.from('items').select('*').eq('id', id).single();
 *   return { item: data };
 * });
 *
 * @example Returning custom response
 * export const GET = withAuth(async ({ user, supabase }) => {
 *   if (someCondition) {
 *     return NextResponse.json({ error: 'Custom error' }, { status: 403 });
 *   }
 *   return { data: 'success' };
 * });
 */
export function withAuth<T = unknown>(
  handler: AuthenticatedHandler<T>
): RouteHandler {
  return async (
    request: NextRequest,
    routeParams?: RouteParams
  ): Promise<NextResponse> => {
    try {
      // Check authentication
      const auth = await requireAuth();
      if (auth instanceof NextResponse) {
        return auth;
      }

      // Call the handler with authenticated context
      const result = await handler(auth, request, routeParams);

      // If handler returned NextResponse, pass it through
      if (result instanceof NextResponse) {
        return result;
      }

      // Otherwise wrap the result in standard success format
      return ok(result);
    } catch (error) {
      // Log error for debugging (in production, use proper error tracking)
      console.error('[API_ERROR]', error);

      // Return generic server error
      // Don't expose internal error details to client
      return serverError();
    }
  };
}

/**
 * Variant that doesn't wrap results in ok() - useful when you want
 * to return the raw data without the { success: true, data: ... } wrapper.
 *
 * @example
 * export const GET = withAuthRaw(async ({ supabase }) => {
 *   const { data } = await supabase.from('items').select('*');
 *   return NextResponse.json(data); // Returns raw array
 * });
 */
export function withAuthRaw(
  handler: (
    context: AuthenticatedContext,
    request: NextRequest,
    routeParams?: RouteParams
  ) => Promise<NextResponse>
): RouteHandler {
  return async (
    request: NextRequest,
    routeParams?: RouteParams
  ): Promise<NextResponse> => {
    try {
      const auth = await requireAuth();
      if (auth instanceof NextResponse) {
        return auth;
      }

      return await handler(auth, request, routeParams);
    } catch (error) {
      console.error('[API_ERROR]', error);
      return serverError();
    }
  };
}
