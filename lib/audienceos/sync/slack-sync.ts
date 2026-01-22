/**
 * Slack Sync Worker
 *
 * Fetches messages from Slack via chi-gateway MCP
 * Normalizes to AudienceOS communication schema
 * Stores in multi-tenant database
 */

import type { SyncJobConfig, SyncResult, SlackMessage } from './types'

export interface SlackChannel {
  id: string
  name: string
  is_member: boolean
  unlinked_count?: number
}

export interface NormalizedSlackMessage {
  id: string
  agency_id: string
  client_id: string
  platform: 'slack'
  message_id: string
  sender_name: string | null
  sender_email: string
  subject: string | null // channel name as subject
  content: string
  created_at: string
  received_at: string
  thread_id: string | null
  is_inbound: boolean
  needs_reply: boolean
  replied_at: string | null
  replied_by: string | null
}

/**
 * Sync Slack using chi-gateway MCP
 * Returns normalized messages ready to store in DB
 */
export async function syncSlack(config: SyncJobConfig): Promise<{
  records: NormalizedSlackMessage[]
  result: SyncResult
}> {
  const startTime = Date.now()
  const result: SyncResult = {
    success: true,
    provider: 'slack',
    recordsProcessed: 0,
    recordsCreated: 0,
    recordsUpdated: 0,
    errors: [],
    syncedAt: new Date().toISOString(),
  }

  const records: NormalizedSlackMessage[] = []

  try {
    if (!config.accessToken) {
      throw new Error('Slack bot token not configured')
    }

    // Call chi-gateway Slack MCP endpoint
    // chi-gateway MCP exposes: GET /slack/conversations and /slack/history
    const slackMessages = await fetchSlackMessages(config.accessToken)

    result.recordsProcessed = slackMessages.length

    // Normalize each message
    for (const message of slackMessages) {
      try {
        const normalized = normalizeSlackMessage(
          message,
          config.agencyId,
          config.clientId || config.agencyId
        )
        records.push(normalized)
      } catch (e) {
        console.error('[slack-sync] Error normalizing message:', e)
        result.errors.push(
          `Failed to normalize message ${message.ts}`
        )
      }
    }

    result.recordsCreated = records.length
    // Consider sync successful if we processed any records or less than 50% errors
    result.success =
      result.errors.length === 0 || result.errors.length < result.recordsProcessed / 2

    console.log('[slack-sync] Sync completed:', {
      duration: Date.now() - startTime,
      processed: result.recordsProcessed,
      created: result.recordsCreated,
      errors: result.errors.length,
    })
  } catch (error) {
    result.success = false
    result.errors.push(
      `Slack sync failed: ${error instanceof Error ? error.message : String(error)}`
    )
    console.error('[slack-sync] Sync error:', error)
  }

  return { records, result }
}

/**
 * Fetch Slack messages using chi-gateway
 *
 * ⚠️ STATUS: NOT YET IMPLEMENTED IN CHI-GATEWAY
 *
 * Chi-Gateway (v1.3.0) does not yet have Slack message endpoints.
 * Available routes: gmail, google-ads, drive, sheets, docs, calendar, etc.
 * Missing: /slack/conversations, /slack/history
 *
 * Workaround: This function will throw a clear error directing users to
 * enable Slack support in chi-gateway first.
 *
 * TODO: Implement Slack MCP in chi-gateway when the official Slack MCP is available
 * Reference: https://slack.com/intl/en-gb/apps/
 */
async function fetchSlackMessages(_accessToken: string): Promise<
  Array<SlackMessage & { channel: string; channel_id: string }>
> {
  throw new Error(
    `[slack-sync] Slack support not yet available in chi-gateway.\n` +
      `\n` +
      `Chi-Gateway (v1.3.0) needs to be updated with Slack MCP endpoints:\n` +
      `  - /slack/conversations (list channels)\n` +
      `  - /slack/history (fetch channel messages)\n` +
      `\n` +
      `Blocked Until: Chi-Gateway implements official Slack MCP integration\n` +
      `See: /lib/sync/slack-sync.ts for implementation details`
  )
}

/**
 * Normalize Slack message to AudienceOS communication schema
 */
function normalizeSlackMessage(
  message: SlackMessage & { channel: string; channel_id: string },
  agencyId: string,
  clientId: string
): NormalizedSlackMessage {
  const ts = message.ts
  const messageId = `${message.channel_id}_${ts}`
  const timestamp = new Date(parseFloat(ts) * 1000).toISOString()

  // Slack user ID is "U" followed by alphanumeric (e.g., U123456789)
  // In real scenario, we'd fetch user names via user lookup, but use ID as fallback
  const senderEmail = `${message.user}@slack.local`

  // Determine if message needs reply based on reaction count
  // (simplified - in real scenario, check for specific reaction like "eyes" or "eyes_watching")
  const needsReply = (message.reactions?.length || 0) === 0

  return {
    id: `slack_${messageId}`,
    agency_id: agencyId,
    client_id: clientId,
    platform: 'slack',
    message_id: messageId,
    sender_name: null, // Would need user lookup via Slack API
    sender_email: senderEmail,
    subject: `#${message.channel}`,
    content: message.text || '(no message text)',
    created_at: timestamp,
    received_at: timestamp,
    thread_id: message.thread_ts || null,
    is_inbound: true, // Slack channel messages are always inbound
    needs_reply: needsReply,
    replied_at: null,
    replied_by: null,
  }
}
