/**
 * Slack Sync Worker
 *
 * Fetches messages directly from Slack API using user's bot token
 * Normalizes to AudienceOS communication schema
 * Stores in multi-tenant database
 *
 * Architecture: Multi-tenant - each workspace's bot token fetches their own messages
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
 * Sync Slack using direct Slack API
 * Uses workspace's bot token for authentication
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

    // Call Slack API directly with bot token
    // Uses: conversations.list and conversations.history endpoints
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
 * Fetch Slack messages using direct Slack API
 * Uses bot token for authentication (xoxb-...)
 *
 * Slack API: https://api.slack.com/methods/conversations.list
 * Slack API: https://api.slack.com/methods/conversations.history
 */
async function fetchSlackMessages(
  accessToken: string
): Promise<Array<SlackMessage & { channel: string; channel_id: string }>> {
  const SLACK_API_BASE = 'https://slack.com/api'
  const allMessages: Array<SlackMessage & { channel: string; channel_id: string }> = []

  try {
    // Step 1: Get list of channels the bot is in
    const channelsResponse = await fetch(
      `${SLACK_API_BASE}/conversations.list?types=public_channel,private_channel&limit=100`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!channelsResponse.ok) {
      throw new Error(`Slack API conversations.list failed: ${channelsResponse.status}`)
    }

    const channelsData = (await channelsResponse.json()) as {
      ok: boolean
      channels?: SlackChannel[]
      error?: string
    }

    if (!channelsData.ok) {
      throw new Error(`Slack API error: ${channelsData.error || 'Unknown error'}`)
    }

    const channels = channelsData.channels || []
    console.log(`[slack-sync] Found ${channels.length} channels`)

    // Step 2: Fetch recent messages from each channel (bot must be member)
    const memberChannels = channels.filter((c) => c.is_member)
    console.log(`[slack-sync] Bot is member of ${memberChannels.length} channels`)

    for (const channel of memberChannels.slice(0, 10)) {
      // Limit to 10 channels for performance
      try {
        const historyResponse = await fetch(
          `${SLACK_API_BASE}/conversations.history?channel=${channel.id}&limit=50`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        )

        if (!historyResponse.ok) {
          console.warn(`[slack-sync] Failed to fetch history for #${channel.name}`)
          continue
        }

        const historyData = (await historyResponse.json()) as {
          ok: boolean
          messages?: SlackMessage[]
          error?: string
        }

        if (!historyData.ok) {
          console.warn(`[slack-sync] Slack error for #${channel.name}: ${historyData.error}`)
          continue
        }

        const messages = historyData.messages || []
        console.log(`[slack-sync] Fetched ${messages.length} messages from #${channel.name}`)

        // Add channel info to each message
        for (const msg of messages) {
          allMessages.push({
            ...msg,
            channel: channel.name,
            channel_id: channel.id,
          })
        }
      } catch (e) {
        console.error(`[slack-sync] Error fetching #${channel.name}:`, e)
      }
    }

    console.log(`[slack-sync] Total messages fetched: ${allMessages.length}`)
    return allMessages
  } catch (error) {
    console.error('[slack-sync] Slack API error:', error)
    throw error
  }
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
