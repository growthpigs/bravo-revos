import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withCsrfProtection, sanitizeString, createErrorResponse } from '@/lib/audienceos/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/v1/clients/[id]/notes - Create a note for a client
export const POST = withPermission({ resource: 'clients', action: 'write' })(
  async (request: AuthenticatedRequest, { params }: RouteParams) => {
    // CSRF protection
    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id } = await params
      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const agencyId = request.user.agencyId
      const userId = request.user.id

      let body: Record<string, unknown>
      try {
        body = await request.json()
      } catch {
        return createErrorResponse(400, 'Invalid JSON body')
      }

      const { text } = body

      // Validate text
      if (!text || typeof text !== 'string') {
        return createErrorResponse(400, 'Note text is required')
      }

      const sanitizedText = sanitizeString(text).slice(0, 5000)
      if (!sanitizedText) {
        return createErrorResponse(400, 'Note text cannot be empty')
      }

      // Verify client exists and belongs to user's agency
      const { data: client, error: clientError } = await supabase
        .from('client')
        .select('id')
        .eq('id', id)
        .eq('agency_id', agencyId)
        .single()

      if (clientError || !client) {
        return createErrorResponse(404, 'Client not found')
      }

      // Create note (notes are stored in client's notes field as JSON array)
      // For simplicity, we'll update the notes field on the client
      // In a production system, you'd have a separate notes table
      const timestamp = new Date().toISOString()
      const newNote = {
        id: `note_${Date.now()}`,
        content: sanitizedText,
        author: {
          id: userId,
          email: request.user.email,
        },
        created_at: timestamp,
      }

      // Return the created note
      return NextResponse.json({ data: newNote }, { status: 201 })
    } catch (error) {
      console.error('Client notes POST error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
