import { NextRequest, NextResponse } from 'next/server'

/**
 * Verify cron request is authenticated with CRON_SECRET
 *
 * Usage in cron endpoints:
 * ```typescript
 * const authResult = verifyCronAuth(request)
 * if (!authResult.authorized) {
 *   return authResult.response
 * }
 * ```
 */
export function verifyCronAuth(request: NextRequest): {
  authorized: boolean
  response?: NextResponse
} {
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET

  if (!expectedSecret) {
    console.error('[CRON] CRON_SECRET not configured')
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Cron secret not configured' },
        { status: 500 }
      )
    }
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('[CRON] Unauthorized access attempt - no bearer token')
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }

  const providedSecret = authHeader.replace('Bearer ', '')

  if (providedSecret !== expectedSecret) {
    console.warn('[CRON] Unauthorized access attempt - invalid secret')
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }

  return { authorized: true }
}
