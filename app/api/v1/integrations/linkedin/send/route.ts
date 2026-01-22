import { NextRequest, NextResponse } from 'next/server'
import { LinkedInService } from '@/lib/audienceos/integrations/linkedin-service'

/**
 * POST /api/v1/integrations/linkedin/send
 * Sends a direct message to a LinkedIn connection.
 * Uses the authenticated user's LinkedIn account via UniPile.
 *
 * SECURITY:
 * - Requires INTERNAL_API_KEY header (Bearer token)
 * - Only called from internal processes or trusted frontend
 * - Validates all input parameters
 * - Does not expose sensitive data
 *
 * FLOW:
 * 1. Validate INTERNAL_API_KEY header
 * 2. Extract userId, recipientId, and message from request body
 * 3. Validate all required fields
 * 4. Call LinkedInService.sendMessage()
 * 5. Return message ID and success status
 * 6. Handle errors gracefully (rate limits, not connected, etc.)
 *
 * REQUEST BODY:
 * {
 *   userId: string (required) - The user sending the message
 *   recipientId: string (required) - LinkedIn user ID of recipient
 *   message: string (required) - Message text (max 10,000 chars)
 * }
 *
 * RESPONSE (200 OK):
 * {
 *   success: true,
 *   messageId: string,
 *   timestamp: ISO string
 * }
 *
 * ERROR RESPONSES:
 * 401 - Missing/invalid INTERNAL_API_KEY
 * 400 - Missing/invalid required fields
 * 404 - LinkedIn credential not found for user
 * 429 - Rate limit exceeded (LinkedIn daily DM limit)
 * 500 - Server error (decryption failure, UniPile error, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: Validate authorization header
    const authHeader = request.headers.get('Authorization')
    const expectedKey = process.env.INTERNAL_API_KEY

    if (!authHeader || !expectedKey) {
      console.warn('[LinkedIn Send] Missing or misconfigured authorization')
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Missing or invalid authorization' },
        { status: 401 }
      )
    }

    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/)
    if (!tokenMatch || tokenMatch[1] !== expectedKey) {
      console.warn('[LinkedIn Send] Invalid authorization token')
      return NextResponse.json(
        { error: 'Forbidden', message: 'Invalid authorization token' },
        { status: 403 }
      )
    }

    // Step 2: Extract parameters from request body
    let body: any
    try {
      body = await request.json()
    } catch (e) {
      console.warn('[LinkedIn Send] Invalid JSON in request body')
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { userId, recipientId, message } = body

    // Step 3: Validate required fields
    if (!userId || typeof userId !== 'string') {
      console.warn('[LinkedIn Send] Missing or invalid userId')
      return NextResponse.json(
        { error: 'Bad Request', message: 'userId is required and must be a string' },
        { status: 400 }
      )
    }

    if (!recipientId || typeof recipientId !== 'string') {
      console.warn('[LinkedIn Send] Missing or invalid recipientId')
      return NextResponse.json(
        { error: 'Bad Request', message: 'recipientId is required and must be a string' },
        { status: 400 }
      )
    }

    if (!message || typeof message !== 'string') {
      console.warn('[LinkedIn Send] Missing or invalid message')
      return NextResponse.json(
        { error: 'Bad Request', message: 'message is required and must be a string' },
        { status: 400 }
      )
    }

    if (message.length === 0) {
      console.warn('[LinkedIn Send] Empty message text')
      return NextResponse.json(
        { error: 'Bad Request', message: 'message cannot be empty' },
        { status: 400 }
      )
    }

    if (message.length > 10000) {
      console.warn('[LinkedIn Send] Message exceeds max length', { length: message.length })
      return NextResponse.json(
        { error: 'Bad Request', message: 'message cannot exceed 10,000 characters' },
        { status: 400 }
      )
    }

    // Sending message - do not log userId or recipientId

    // Step 4: Call LinkedInService.sendMessage()
    const result = await LinkedInService.sendMessage(userId, recipientId, message)

    // Message sent - do not log userId or recipientId

    // Step 5: Return success response
    return NextResponse.json(
      {
        success: result.success,
        messageId: result.messageId,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[LinkedIn Send] Error during send:', error)

    // Step 6: Handle errors gracefully
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Handle specific error cases
    if (errorMessage.includes('RATE_LIMIT_EXCEEDED')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          message: 'LinkedIn daily DM limit reached. Try again tomorrow.',
          retryAfter: 86400, // 24 hours
          timestamp: new Date().toISOString(),
        },
        { status: 429 }
      )
    }

    if (errorMessage.includes('NOT_CONNECTED')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not connected',
          message: 'Can only send DMs to LinkedIn connections.',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    if (errorMessage.includes('not found') || errorMessage.includes('no agency context')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not found',
          message: 'User or LinkedIn credential not found.',
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      )
    }

    if (errorMessage.includes('LinkedIn not connected')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not connected',
          message: 'LinkedIn account is not connected for this user.',
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      )
    }

    // Generic error response (don't expose internal details)
    return NextResponse.json(
      {
        success: false,
        error: 'Send failed',
        message: 'Failed to send message. Please try again.',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
