import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withRateLimit, isValidUUID, createErrorResponse } from '@/lib/audienceos/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import type { Database } from '@/types/database'

type Communication = Database['public']['Tables']['communication']['Row']

/**
 * GET /api/v1/communications/[id]/thread
 * Get full thread for a communication (all replies)
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
      const { id: messageId } = await params

      // Validate UUID format
      if (!isValidUUID(messageId)) {
        return createErrorResponse(400, 'Invalid message ID format')
      }

      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const agencyId = request.user.agencyId

      // First, get the message to find its thread_id and client_id
      const { data: message, error: msgError } = await supabase
        .from('communication')
        .select('thread_id, client_id')
        .eq('id', messageId)
        .single()

      if (msgError) {
        if (msgError.code === 'PGRST116') {
          return createErrorResponse(404, 'Message not found')
        }
        throw msgError
      }

      const msgData = message as { thread_id: string | null; client_id: string }

      // Verify the communication's client belongs to user's agency (SEC-007)
      const { data: client, error: clientError } = await supabase
        .from('client')
        .select('id')
        .eq('id', msgData.client_id)
        .eq('agency_id', agencyId)
        .single()

      if (clientError || !client) {
        return createErrorResponse(404, 'Message not found')
      }

      // Use thread_id if it exists, otherwise the message is the thread root
      const threadId = msgData.thread_id || messageId

      // Get all messages in the thread
      const { data: threadMessages, error: threadError } = await supabase
        .from('communication')
        .select('*')
        .or(`id.eq.${threadId},thread_id.eq.${threadId}`)
        .order('received_at', { ascending: true })

      if (threadError) {
        throw threadError
      }

      return NextResponse.json({
        thread_id: threadId,
        messages: (threadMessages || []) as Communication[],
        count: threadMessages?.length || 0,
      })
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error fetching thread:', error)
      }
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
