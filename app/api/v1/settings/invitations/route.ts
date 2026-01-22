import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withRateLimit, createErrorResponse } from '@/lib/audienceos/security'
import { sendInvitationEmail } from '@/lib/audienceos/email/invitation'
import type { UserRole } from '@/types/database'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'

/**
 * POST /api/v1/settings/invitations
 * Send a new user invitation
 */
export const POST = withPermission({ resource: 'users', action: 'manage' })(
  async (request: AuthenticatedRequest) => {
    const rateLimitResponse = withRateLimit(request, { maxRequests: 10, windowMs: 3600000 })
    if (rateLimitResponse) return rateLimitResponse

    try {
      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const agencyId = request.user.agencyId
      const user = request.user

      // Parse request body
      const body = await request.json()
      const { email, role } = body

      // Validate input
      if (!email || typeof email !== 'string') {
        return createErrorResponse(400, 'Email is required')
      }

      if (!role || !['admin', 'user'].includes(role)) {
        return createErrorResponse(400, 'Valid role is required (admin or user)')
      }

      const trimmedEmail = email.toLowerCase().trim()

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(trimmedEmail)) {
        return createErrorResponse(400, 'Invalid email format')
      }

      // Check if user already exists in agency
      const { data: existingUser, error: userExistsError } = await supabase
        .from('user')
        .select('id')
        .eq('agency_id', agencyId)
        .eq('email', trimmedEmail)
        .single()

      // PGRST116 = "No rows found" - this is expected when user doesn't exist
      if (userExistsError && userExistsError.code !== 'PGRST116') {
        return createErrorResponse(500, 'Database error checking user')
      }

      if (existingUser) {
        return createErrorResponse(400, 'User with this email already exists in your agency')
      }

      // Check if invitation already exists (pending)
      const { data: existingInvitation, error: invitationExistsError } = await (supabase
        .from('user_invitations' as any)
        .select('id')
        .eq('agency_id', agencyId)
        .eq('email', trimmedEmail)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .single() as any)

      // PGRST116 = "No rows found" - this is expected when no pending invitation exists
      if (invitationExistsError && invitationExistsError.code !== 'PGRST116') {
        return createErrorResponse(500, 'Database error checking invitations')
      }

      if (existingInvitation) {
        return createErrorResponse(400, 'This email has already been invited. You can resend the invitation.')
      }

      // Generate secure token (random UUID)
      const token = crypto.getRandomValues(new Uint8Array(32))
      const tokenHex = Array.from(token)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      // Set expiration to 7 days from now
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      // Create invitation record
      const { data: invitation, error: inviteError } = await (supabase
        .from('user_invitations' as any)
        .insert({
          agency_id: agencyId,
          email: trimmedEmail,
          role: role as UserRole,
          token: tokenHex,
          expires_at: expiresAt.toISOString(),
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single() as any)

      if (inviteError || !invitation) {
        console.error('Failed to create invitation:', inviteError)
        return createErrorResponse(500, 'Failed to create invitation')
      }

      // Send invitation email
      let emailSent = false
      try {
        const { data: agencyData } = await supabase
          .from('agency')
          .select('name')
          .eq('id', agencyId)
          .single()

        await sendInvitationEmail({
          to: trimmedEmail,
          inviterName: user.email || 'An administrator',
          agencyName: agencyData?.name || 'the agency',
          acceptUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${tokenHex}`,
          role: role as UserRole,
        })
        emailSent = true
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError)
        // Don't fail the request if email fails - invitation is still created
        // Log for monitoring/alerting
      }

      return NextResponse.json(
        {
          message: emailSent
            ? 'Invitation sent successfully'
            : 'Invitation created but email delivery failed - please resend or contact support',
          invitation: {
            id: invitation.id,
            email: invitation.email,
            role: invitation.role,
            expires_at: invitation.expires_at,
            created_at: invitation.created_at,
          },
          email_status: emailSent ? 'sent' : 'failed',
        },
        { status: 201 }
      )
    } catch (error) {
      console.error('Invitation creation error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

/**
 * GET /api/v1/settings/invitations
 * List pending invitations for the agency
 */
export const GET = withPermission({ resource: 'users', action: 'manage' })(
  async (request: AuthenticatedRequest) => {
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    try {
      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const agencyId = request.user.agencyId

      // Get pending invitations
      const { data: invitations, error } = await (supabase
        .from('user_invitations' as any)
        .select(
          'id, email, role, expires_at, created_at, created_by, accepted_at'
        )
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false }) as any)

      if (error) {
        return createErrorResponse(500, 'Failed to fetch invitations')
      }

      // Mark expired invitations
      const now = new Date()
      const invitationsWithStatus = (invitations || []).map((inv: any) => ({
        ...inv,
        is_expired: new Date(inv.expires_at) < now,
        is_accepted: inv.accepted_at !== null,
      }))

      return NextResponse.json({
        invitations: invitationsWithStatus,
        total: invitationsWithStatus.length,
        pending: invitationsWithStatus.filter((i: any) => !i.is_accepted && !i.is_expired).length,
      })
    } catch (error) {
      console.error('Invitations list error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
