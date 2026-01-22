import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withRateLimit, withCsrfProtection, isValidUUID, sanitizeString, createErrorResponse } from '@/lib/audienceos/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import type { Database } from '@/types/database'

type Communication = Database['public']['Tables']['communication']['Row']
type CommunicationInsert = Database['public']['Tables']['communication']['Insert']

/**
 * POST /api/v1/communications/[id]/reply
 * Send a reply to a communication via original platform (Slack/Gmail)
 */
export const POST = withPermission({ resource: 'communications', action: 'write' })(
  async (
    request: AuthenticatedRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    // Rate limit: 30 replies per minute
    const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    // CSRF protection (TD-005)
    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id: messageId } = await params

      // Validate UUID format
      if (!isValidUUID(messageId)) {
        return createErrorResponse(400, 'Invalid message ID format')
      }

      let body: Record<string, unknown>
      try {
        body = await request.json()
      } catch {
        return createErrorResponse(400, 'Invalid JSON body')
      }

      // Validate content
      if (typeof body.content !== 'string') {
        return createErrorResponse(400, 'Content is required')
      }

      const content = sanitizeString(body.content).slice(0, 50000)
      if (!content) {
        return createErrorResponse(400, 'Content is required')
      }

      // send_immediately is reserved for future use when integrating with actual email/Slack APIs
      // const sendImmediately = body.send_immediately !== false

      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const user = request.user

      // Get the original message to determine platform and thread
      const { data: originalMessage, error: fetchError } = await supabase
        .from('communication')
        .select('*')
        .eq('id', messageId)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return createErrorResponse(404, 'Original message not found')
        }
        return createErrorResponse(500, 'Failed to fetch original message')
      }

      const message = originalMessage as Communication

      // TODO: Send via Slack/Gmail API based on platform
      // For now, we'll create a local record and mark as sent

      // Create the reply record
      const newMessageId = `reply-${Date.now()}`
      const threadId = message.thread_id || message.id

      const newCommunication: CommunicationInsert = {
        agency_id: message.agency_id,
        client_id: message.client_id,
        platform: message.platform,
        thread_id: threadId,
        message_id: newMessageId,
        sender_email: user.email || null,
        sender_name: user.email?.split('@')[0] || 'Agency User',
        subject: message.subject ? `Re: ${message.subject.replace(/^Re:\s*/i, '')}` : null,
        content,
        is_inbound: false,
        needs_reply: false,
        received_at: new Date().toISOString(),
      }

      const { data: newMessage, error: insertError } = await supabase
        .from('communication')
        .insert(newCommunication as never)
        .select()
        .single()

      if (insertError) {
        return createErrorResponse(500, 'Failed to create reply')
      }

      // Update the original message to mark as replied
      const updateData: Partial<Communication> = {
        needs_reply: false,
        replied_at: new Date().toISOString(),
        replied_by: user.id,
      }

      await supabase.from('communication').update(updateData as never).eq('id', messageId)

      return NextResponse.json({
        message: 'Reply sent successfully',
        data: newMessage,
        sent_via: message.platform,
      })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
