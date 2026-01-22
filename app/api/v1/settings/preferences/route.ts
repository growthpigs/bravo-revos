/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Temporary: Generated Database types have Insert type mismatch after RBAC migration
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withRateLimit, withCsrfProtection, createErrorResponse } from '@/lib/audienceos/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import type { PreferenceCategory } from '@/types/database'
import type { NotificationPreferences } from '@/types/settings'

const VALID_CATEGORIES: PreferenceCategory[] = ['notifications', 'ai', 'display']

// Default notification preferences
const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  email_alerts: true,
  email_tickets: true,
  email_mentions: true,
  slack_channel_id: undefined,
  digest_mode: false,
  digest_time: undefined,
  digest_days: undefined,
  quiet_hours_start: undefined,
  quiet_hours_end: undefined,
  timezone: undefined,
  muted_clients: [],
}

// GET /api/v1/settings/preferences - Get user preferences
export const GET = withPermission({ resource: 'settings', action: 'read' })(
  async (request: AuthenticatedRequest) => {
  const rateLimitResponse = withRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = await createRouteHandlerClient(cookies)
    const { id: userId, agencyId } = request.user

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') as PreferenceCategory | null

    let query = supabase
      .from('user_preference')
      .select('*')
      .eq('user_id', userId)
      .eq('agency_id', agencyId)

    if (category && VALID_CATEGORIES.includes(category)) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
      return createErrorResponse(500, 'Failed to fetch preferences')
    }

    // Transform key-value pairs into structured object
    const preferences: Record<string, Record<string, unknown>> = {
      notifications: { ...DEFAULT_NOTIFICATION_PREFERENCES },
      ai: {},
      display: {},
    }

    for (const pref of data || []) {
      if (preferences[pref.category]) {
        preferences[pref.category][pref.key] = pref.value
      }
    }

    return NextResponse.json({ data: preferences })
  } catch {
    return createErrorResponse(500, 'Internal server error')
  }
})

// PATCH /api/v1/settings/preferences - Update user preferences
export const PATCH = withPermission({ resource: 'settings', action: 'write' })(
  async (request: AuthenticatedRequest) => {
  const rateLimitResponse = withRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  try {
    const supabase = await createRouteHandlerClient(cookies)
    const { id: userId, agencyId } = request.user

    const body = await request.json()
    const { category, preferences } = body as {
      category: PreferenceCategory
      preferences: Record<string, unknown>
    }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return createErrorResponse(400, 'Invalid category')
    }

    if (!preferences || typeof preferences !== 'object') {
      return createErrorResponse(400, 'Invalid preferences')
    }

    // Validate notification preferences if provided
    if (category === 'notifications') {
      const { quiet_hours_start, quiet_hours_end, digest_time, digest_days } = preferences as Partial<NotificationPreferences>
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/

      if (quiet_hours_start && !timeRegex.test(quiet_hours_start)) {
        return createErrorResponse(400, 'Invalid quiet hours start time format (HH:mm)')
      }
      if (quiet_hours_end && !timeRegex.test(quiet_hours_end)) {
        return createErrorResponse(400, 'Invalid quiet hours end time format (HH:mm)')
      }
      if (digest_time && !timeRegex.test(digest_time)) {
        return createErrorResponse(400, 'Invalid digest time format (HH:mm)')
      }
      if (digest_days && (!Array.isArray(digest_days) || digest_days.some(d => typeof d !== 'string'))) {
        return createErrorResponse(400, 'Invalid digest days format (must be array of strings)')
      }
    }

    // Upsert each preference key
    const upsertPromises = Object.entries(preferences).map(async ([key, value]) => {
      // Check if preference exists
      const { data: existing } = await supabase
        .from('user_preference')
        .select('id')
        .eq('user_id', userId)
        .eq('agency_id', agencyId)
        .eq('category', category)
        .eq('key', key)
        .single()

      // Cast value to Json type for Supabase
      const jsonValue = value as import('@/types/database').Json

      if (existing) {
        // Update existing
        return supabase
          .from('user_preference')
          .update({ value: jsonValue, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
      } else {
        // Insert new
        return supabase
          .from('user_preference')
          .insert({
            user_id: userId,
            agency_id: agencyId,
            category,
            key,
            value: jsonValue,
          })
      }
    })

    const results = await Promise.all(upsertPromises)
    const errors = results.filter(r => r.error)

    if (errors.length > 0) {
      return createErrorResponse(500, 'Failed to save some preferences')
    }

    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully'
    })
  } catch {
    return createErrorResponse(500, 'Internal server error')
  }
})
