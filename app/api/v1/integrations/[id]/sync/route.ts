/**
 * Integration Sync API
 * POST /api/v1/integrations/[id]/sync - Trigger manual sync
 * GET /api/v1/integrations/[id]/sync - Check sync status
 *
 * RBAC: Requires integrations:manage permission
 *
 * Sync Data Flow:
 * 1. Read integration record (get provider, tokens)
 * 2. Call provider-specific sync function
 * 3. Upsert to ad_performance / communication tables
 * 4. Update integration.last_sync_at
 * 5. Return sync summary
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withCsrfProtection } from '@/lib/audienceos/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import { decryptToken, deserializeEncryptedToken } from '@/lib/crypto'
import { syncGoogleAds } from '@/lib/audienceos/sync/google-ads-sync'
import { syncGmail } from '@/lib/audienceos/sync/gmail-sync'
import { syncSlack } from '@/lib/audienceos/sync/slack-sync'
import type { SyncJobConfig, SyncResult } from '@/lib/audienceos/sync/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/v1/integrations/[id]/sync - Trigger manual sync
export const POST = withPermission({ resource: 'integrations', action: 'manage' })(
  async (request: AuthenticatedRequest, { params }: RouteParams) => {
    // CSRF protection (TD-005)
    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id } = await params
      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const agencyId = request.user.agencyId

    // Fetch integration
    const { data: integration, error } = await supabase
      .from('integration')
      .select('*')
      .eq('id', id)
      .eq('agency_id', agencyId) // Multi-tenant isolation (SEC-007)
      .single()

    if (error || !integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    if (!integration.is_connected) {
      return NextResponse.json(
        { error: 'Integration not connected' },
        { status: 400 }
      )
    }

    // Build sync job config
    // Note: integration is agency-scoped. clientId comes from config or defaults to agency
    const integrationConfig = (integration.config as Record<string, unknown>) || {}

    // Decrypt tokens before passing to sync workers
    // Tokens are stored encrypted with AES-256-GCM in the database
    let decryptedAccessToken = ''
    let decryptedRefreshToken: string | undefined

    if (integration.access_token) {
      try {
        const accessTokenEncrypted = deserializeEncryptedToken(integration.access_token)
        if (accessTokenEncrypted) {
          decryptedAccessToken = decryptToken(accessTokenEncrypted) || ''
        }
      } catch (e) {
        console.error('[sync] Failed to decrypt access token:', e)
        return NextResponse.json(
          { error: 'Failed to decrypt credentials. Please reconnect the integration.' },
          { status: 400 }
        )
      }
    }

    if (integration.refresh_token) {
      try {
        const refreshTokenEncrypted = deserializeEncryptedToken(integration.refresh_token)
        if (refreshTokenEncrypted) {
          decryptedRefreshToken = decryptToken(refreshTokenEncrypted) || undefined
        }
      } catch (e) {
        console.error('[sync] Failed to decrypt refresh token:', e)
        // Non-fatal - some providers don't use refresh tokens
      }
    }

    if (!decryptedAccessToken) {
      return NextResponse.json(
        { error: 'No valid access token available. Please reconnect the integration.' },
        { status: 400 }
      )
    }

    const syncConfig: SyncJobConfig = {
      integrationId: id,
      agencyId,
      clientId: (integrationConfig.clientId as string) || agencyId, // Fallback to agency
      provider: integration.provider,
      accessToken: decryptedAccessToken,
      refreshToken: decryptedRefreshToken,
      config: integrationConfig,
    }

    let syncResult: SyncResult

    // Execute provider-specific sync
    switch (integration.provider) {
      case 'google_ads': {
        const { records, result } = await syncGoogleAds(syncConfig)
        syncResult = result

        // Upsert ad_performance records if we have any
        if (records.length > 0) {
          const { error: upsertError } = await supabase
            .from('ad_performance')
            .upsert(
              records.map((r) => ({
                ...r,
                updated_at: new Date().toISOString(),
              })),
              {
                onConflict: 'agency_id,client_id,platform,campaign_id,date',
                ignoreDuplicates: false,
              }
            )

          if (upsertError) {
            console.error('[sync] ad_performance upsert error:', upsertError)
            syncResult.errors.push(`Database upsert failed: ${upsertError.message}`)
            syncResult.success = false
          } else {
            syncResult.recordsCreated = records.length
          }
        }
        break
      }

      case 'slack': {
        const { records, result } = await syncSlack(syncConfig)
        syncResult = result

        // Upsert communication records if we have any
        if (records.length > 0) {
          const { error: upsertError } = await supabase
            .from('communication')
            .upsert(
              records.map((r) => ({
                id: r.id,
                agency_id: r.agency_id,
                client_id: r.client_id,
                platform: r.platform,
                message_id: r.message_id,
                sender_name: r.sender_name,
                sender_email: r.sender_email,
                subject: r.subject,
                content: r.content,
                created_at: r.created_at,
                received_at: r.received_at,
                thread_id: r.thread_id,
                is_inbound: r.is_inbound,
                needs_reply: r.needs_reply,
                replied_at: r.replied_at,
                replied_by: r.replied_by,
              })),
              {
                onConflict: 'agency_id,client_id,platform,message_id',
                ignoreDuplicates: false,
              }
            )

          if (upsertError) {
            console.error('[sync] communication upsert error:', upsertError)
            syncResult.errors.push(`Database upsert failed: ${upsertError.message}`)
            syncResult.success = false
          } else {
            syncResult.recordsCreated = records.length
          }
        }
        break
      }

      case 'gmail': {
        const { records, result } = await syncGmail(syncConfig)
        syncResult = result

        // Upsert communication records if we have any
        if (records.length > 0) {
          const { error: upsertError } = await supabase
            .from('communication')
            .upsert(
              records.map((r) => ({
                id: r.id,
                agency_id: r.agency_id,
                client_id: r.client_id,
                platform: r.platform,
                message_id: r.message_id,
                sender_name: r.sender_name,
                sender_email: r.sender_email,
                subject: r.subject,
                content: r.content,
                created_at: r.created_at,
                received_at: r.received_at,
                thread_id: r.thread_id,
                is_inbound: r.is_inbound,
                needs_reply: r.needs_reply,
                replied_at: r.replied_at,
                replied_by: r.replied_by,
              })),
              {
                onConflict: 'agency_id,client_id,platform,message_id',
                ignoreDuplicates: false,
              }
            )

          if (upsertError) {
            console.error('[sync] communication upsert error:', upsertError)
            syncResult.errors.push(`Database upsert failed: ${upsertError.message}`)
            syncResult.success = false
          } else {
            syncResult.recordsCreated = records.length
          }
        }
        break
      }

      case 'meta_ads':
        // TODO: Implement Meta Ads sync
        syncResult = {
          success: true,
          provider: 'meta_ads',
          recordsProcessed: 0,
          recordsCreated: 0,
          recordsUpdated: 0,
          errors: ['Meta Ads sync not yet implemented'],
          syncedAt: new Date().toISOString(),
        }
        break

      default:
        syncResult = {
          success: false,
          provider: integration.provider,
          recordsProcessed: 0,
          recordsCreated: 0,
          recordsUpdated: 0,
          errors: [`Unknown provider: ${integration.provider}`],
          syncedAt: new Date().toISOString(),
        }
    }

    // Update last sync time and store result
    const { error: updateError } = await supabase
      .from('integration')
      .update({
        last_sync_at: syncResult.syncedAt,
        config: {
          ...((integration.config as object) || {}),
          lastManualSync: syncResult.syncedAt,
          syncTrigger: 'manual',
          lastSyncResult: {
            success: syncResult.success,
            recordsProcessed: syncResult.recordsProcessed,
            recordsCreated: syncResult.recordsCreated,
            errors: syncResult.errors,
          },
        },
      })
      .eq('id', id)
      .eq('agency_id', agencyId) // Multi-tenant isolation (SEC-007)

    if (updateError) {
      console.error('[sync] Error updating sync status:', updateError)
      // Don't fail the whole request, just log it
    }

    return NextResponse.json({
      data: {
        status: syncResult.success ? 'completed' : 'failed',
        syncedAt: syncResult.syncedAt,
        provider: integration.provider,
        recordsProcessed: syncResult.recordsProcessed,
        recordsCreated: syncResult.recordsCreated,
        recordsUpdated: syncResult.recordsUpdated,
        errors: syncResult.errors,
        message: syncResult.success
          ? `${integration.provider} sync completed: ${syncResult.recordsCreated} records synced`
          : `${integration.provider} sync failed: ${syncResult.errors.join(', ')}`,
      },
    })
    } catch (error) {
      console.error('Sync trigger error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
)

// GET /api/v1/integrations/[id]/sync - Check sync status
export const GET = withPermission({ resource: 'integrations', action: 'manage' })(
  async (request: AuthenticatedRequest, { params }: RouteParams) => {
    try {
      const { id } = await params
      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const agencyId = request.user.agencyId

    const { data: integration, error } = await supabase
      .from('integration')
      .select('last_sync_at, config, provider, is_connected')
      .eq('id', id)
      .eq('agency_id', agencyId) // Multi-tenant isolation (SEC-007)
      .single()

    if (error || !integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    return NextResponse.json({
      data: {
        provider: integration.provider,
        isConnected: integration.is_connected,
        lastSyncAt: integration.last_sync_at,
        status: integration.is_connected ? 'idle' : 'disconnected',
      },
      })
    } catch (error) {
      console.error('Sync status error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
)
