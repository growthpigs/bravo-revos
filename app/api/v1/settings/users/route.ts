/**
 * User Management API - List and Invite
 * GET /api/v1/settings/users - List agency users
 * POST /api/v1/settings/users/invite - Send user invitation
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withRateLimit, withCsrfProtection, sanitizeEmail, createErrorResponse } from '@/lib/audienceos/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'

// ============================================================================
// GET /api/v1/settings/users
// ============================================================================

export const GET = withPermission({ resource: 'users', action: 'manage' })(
  async (request: AuthenticatedRequest) => {
    // Rate limit: 100 requests per minute
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    try {
      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const agencyId = request.user.agencyId

      // Parse query params
      const { searchParams } = new URL(request.url)
      const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50), 100)
      const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10) || 0)
      const _search = searchParams.get('search') // TODO: implement search
      const isActive = searchParams.get('is_active')

      // Build query - join role table to get name and hierarchy_level for RBAC
      let query = supabase
        .from('user')
        .select(`
          id, email, first_name, last_name, avatar_url, is_active, last_active_at, created_at, role_id,
          role_info:role_id (
            name,
            hierarchy_level
          )
        `, { count: 'exact' })
        .eq('agency_id', agencyId)

      // Apply filters
      if (isActive === 'true') {
        query = query.eq('is_active', true)
      } else if (isActive === 'false') {
        query = query.eq('is_active', false)
      }

      // Note: Search filtering would require using a custom filter function or full-text search
      // For now, we'll handle search client-side or implement PostgreSQL full-text search separately
      // if (search) {
      //   const sanitizedSearch = sanitizeString(search).slice(0, 50)
      //   if (sanitizedSearch) {
      //     // Client-side filtering for now
      //   }
      // }

      const { data: users, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        return createErrorResponse(500, 'Failed to fetch users')
      }

      // Flatten role info from nested role_info into each user object
      const usersWithHierarchy = (users || []).map((user: any) => {
        const { role_info, ...rest } = user
        return {
          ...rest,
          role: role_info?.name ?? 'user', // Default to 'user' if role name not found
          hierarchy_level: role_info?.hierarchy_level ?? null,
        }
      })

      return NextResponse.json({
        data: usersWithHierarchy,
        pagination: {
          total: count || 0,
          limit,
          offset,
          has_more: (count || 0) > offset + limit,
        },
      })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// ============================================================================
// POST /api/v1/settings/users/invite
// ============================================================================

export const POST = withPermission({ resource: 'users', action: 'manage' })(
  async (request: AuthenticatedRequest) => {
    // Rate limit: 30 invites per minute
    const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    // CSRF protection (TD-005)
    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const agencyId = request.user.agencyId

      // Parse request body
      let body: Record<string, unknown>
      try {
        body = await request.json()
      } catch {
        return createErrorResponse(400, 'Invalid JSON body')
      }

      const { email, role } = body as { email?: unknown; role?: unknown }

      // Validate email
      if (!email || typeof email !== 'string') {
        return createErrorResponse(400, 'Email is required')
      }

      const sanitizedEmail = sanitizeEmail(email)
      if (!sanitizedEmail) {
        return createErrorResponse(400, 'Invalid email address')
      }

      // Validate role
      if (!role || typeof role !== 'string' || !['admin', 'user'].includes(role)) {
        return createErrorResponse(400, 'Role must be "admin" or "user"')
      }

      // Check if user already exists in this agency
      const { data: existingUser } = await supabase
        .from('user')
        .select('id')
        .eq('agency_id', agencyId)
        .eq('email', sanitizedEmail)
        .single()

      if (existingUser) {
        return createErrorResponse(400, 'User with this email already exists in your agency')
      }

      // TODO: Implement user invitations
      // This will be implemented after the user_invitations table is created
      // For now, return a not implemented response

      return createErrorResponse(501, 'User invitations feature is not yet implemented')
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
