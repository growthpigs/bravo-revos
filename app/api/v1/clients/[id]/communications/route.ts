import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withRateLimit, isValidUUID, createErrorResponse } from '@/lib/audienceos/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import type { Database } from '@/types/database'

type Communication = Database['public']['Tables']['communication']['Row']

/**
 * GET /api/v1/clients/[id]/communications
 * List communications for a client with filtering and pagination
 */
export const GET = withPermission({ resource: 'communications', action: 'read' })(
  async (
    request: AuthenticatedRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    // Rate limit: 100 requests per minute
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    try {
      const { id: clientId } = await params

      // Validate UUID format
      if (!isValidUUID(clientId)) {
        return createErrorResponse(400, 'Invalid client ID format')
      }

      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const agencyId = request.user.agencyId

      // Verify client belongs to user's agency
      const { data: client, error: clientError } = await supabase
        .from('client')
        .select('id')
        .eq('id', clientId)
        .eq('agency_id', agencyId) // Multi-tenant isolation (SEC-007)
        .single()

      if (clientError || !client) {
        return createErrorResponse(404, 'Client not found')
      }

      const searchParams = request.nextUrl.searchParams

      // Parse query parameters
      const source = searchParams.get('source') // 'slack' | 'gmail' | null
      const needsReply = searchParams.get('needs_reply') === 'true'
      const threadId = searchParams.get('thread_id')
      const cursor = searchParams.get('cursor')
      const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 100)

      // Build query
      let query = supabase
        .from('communication')
        .select('*', { count: 'exact' })
        .eq('client_id', clientId)
        .order('received_at', { ascending: false })
        .limit(limit)

      // Apply filters
      if (source && (source === 'slack' || source === 'gmail')) {
        query = query.eq('platform', source)
      }

      if (needsReply) {
        query = query.eq('needs_reply', true)
      }

      if (threadId) {
        query = query.eq('thread_id', threadId)
      }

      // Cursor-based pagination
      if (cursor) {
        query = query.lt('received_at', cursor)
      }

      const { data, error, count } = await query

      if (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Error fetching communications:', error)
        }
        return createErrorResponse(500, 'Failed to fetch communications')
      }

      const items = (data || []) as Communication[]
      const lastItem = items[items.length - 1]
      const nextCursor = lastItem?.received_at || null
      const hasMore = items.length === limit

      return NextResponse.json({
        items,
        pagination: {
          cursor: nextCursor,
          has_more: hasMore,
          total: count || 0,
        },
      })
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Unexpected error:', error)
      }
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
