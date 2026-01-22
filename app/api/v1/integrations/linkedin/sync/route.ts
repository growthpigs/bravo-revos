import { NextRequest, NextResponse } from 'next/server'
import { LinkedInService } from '@/lib/audienceos/integrations/linkedin-service'

/**
 * POST /api/v1/integrations/linkedin/sync
 * Triggers LinkedIn sync for a specific user.
 * Fetches messages from UniPile and stores them in user_communication table.
 *
 * SECURITY:
 * - Requires INTERNAL_API_KEY header (Bearer token)
 * - Only called from callback or internal triggers
 * - Does not expose user data in responses
 *
 * FLOW:
 * 1. Validate INTERNAL_API_KEY header
 * 2. Extract userId from request body
 * 3. Call LinkedInService.syncMessages()
 * 4. Return sync result with message count
 * 5. Handle errors gracefully
 *
 * RESPONSE:
 * {
 *   success: true,
 *   messagesProcessed: number,
 *   connectionsProcessed: number,
 *   timestamp: ISO string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: Validate authorization header
    const authHeader = request.headers.get('Authorization')
    const expectedKey = process.env.INTERNAL_API_KEY

    if (!authHeader || !expectedKey) {
      console.warn('[LinkedIn Sync] Missing or misconfigured authorization')
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Missing or invalid authorization' },
        { status: 401 }
      )
    }

    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/)
    if (!tokenMatch || tokenMatch[1] !== expectedKey) {
      console.warn('[LinkedIn Sync] Invalid authorization token')
      return NextResponse.json(
        { error: 'Forbidden', message: 'Invalid authorization token' },
        { status: 403 }
      )
    }

    // Step 2: Extract userId from request body
    const body = await request.json()
    const { userId } = body

    if (!userId || typeof userId !== 'string') {
      console.warn('[LinkedIn Sync] Missing or invalid userId in request body')
      return NextResponse.json(
        { error: 'Bad Request', message: 'userId is required' },
        { status: 400 }
      )
    }

    // Sync in progress - do not log userId

    // Step 3: Call LinkedInService.syncMessages()
    const result = await LinkedInService.syncMessages(userId)

    // Sync completed - only log non-sensitive metrics

    // Step 4: Return sync result
    return NextResponse.json(
      {
        success: result.success,
        messagesProcessed: result.messagesProcessed,
        connectionsProcessed: result.connectionsProcessed,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[LinkedIn Sync] Error during sync:', error)

    // Step 5: Handle errors gracefully
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      {
        success: false,
        error: 'Sync failed',
        message: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
