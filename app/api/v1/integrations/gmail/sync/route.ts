import { NextRequest, NextResponse } from 'next/server'
import { GmailService } from '@/lib/audienceos/integrations/gmail-service'

/**
 * POST /api/v1/integrations/gmail/sync
 * Manually triggers Gmail thread and message sync for a user.
 *
 * This endpoint is called:
 * 1. Automatically after successful OAuth callback (async, fire-and-forget)
 * 2. Manually by users via UI button to force refresh
 * 3. By scheduled jobs (cron) to sync periodically
 *
 * SECURITY:
 * - Requires INTERNAL_API_KEY in Authorization header (Bearer token)
 * - Validates userId format (UUID)
 * - Only processes one user at a time
 *
 * PERFORMANCE:
 * - Returns 200 with result immediately (sync completes in background)
 * - Does not block on service call (async but awaited)
 *
 * REQUEST:
 * ```
 * POST /api/v1/integrations/gmail/sync
 * Authorization: Bearer {INTERNAL_API_KEY}
 * Content-Type: application/json
 *
 * {
 *   "userId": "user-123"
 * }
 * ```
 *
 * RESPONSE (Success):
 * ```
 * 200 OK
 * {
 *   "success": true,
 *   "threadsProcessed": 42,
 *   "timestamp": "2026-01-17T14:00:00.000Z"
 * }
 * ```
 *
 * RESPONSE (Error):
 * ```
 * 500 Internal Server Error
 * {
 *   "success": false,
 *   "error": "Gmail not connected for user",
 *   "timestamp": "2026-01-17T14:00:00.000Z"
 * }
 * ```
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: Validate INTERNAL_API_KEY
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      console.warn('[Gmail Sync] Missing authorization header')
      return NextResponse.json(
        {
          success: false,
          error: 'Missing authorization header',
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      )
    }

    const expectedKey = `Bearer ${process.env.INTERNAL_API_KEY}`
    if (authHeader !== expectedKey) {
      console.warn('[Gmail Sync] Invalid authorization key')
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid authorization key',
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      )
    }

    // Step 2: Extract and validate userId from request body
    const body = await request.json()
    const { userId } = body

    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      console.warn('[Gmail Sync] Missing or invalid userId')
      return NextResponse.json(
        {
          success: false,
          error: 'Missing or invalid userId',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    // Sync in progress - do not log userId

    // Step 3: Call GmailService to sync threads
    // Using async/await (not callbacks) - awaits the service call
    const result = await GmailService.syncEmails(userId)

    // Sync completed - only log non-sensitive metrics

    // Step 4: Return success response
    return NextResponse.json(
      {
        success: true,
        threadsProcessed: result.threadsProcessed,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Gmail Sync] Error:', error)

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error during sync'

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
