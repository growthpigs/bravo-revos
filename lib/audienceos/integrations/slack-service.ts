import { WebClient } from '@slack/web-api'
import { createClient } from '@/lib/supabase'
import { decryptToken, deserializeEncryptedToken } from '@/lib/crypto'

/**
 * SlackService - Syncs Slack channels and messages into communications table
 *
 * FLOW:
 * 1. Fetch encrypted Slack token for user from user_oauth_credential
 * 2. Decrypt token using AES-256-GCM
 * 3. Create Slack Web API client
 * 4. Fetch list of channels (public + private)
 * 5. For each channel: fetch recent messages (max 20)
 * 6. Store as communication records with external_id deduplication
 * 7. Update last_sync_at timestamp
 * 8. Return sync result with message count
 *
 * ERROR HANDLING:
 * - If one channel fails, continue with others
 * - Non-critical failures (rate limits) don't stop sync
 * - Only critical failures (no token) cause early exit
 */
export class SlackService {
  static async syncChannels(userId: string) {
    try {
      const supabase = await createClient()

      // Step 0: Fetch user's agency_id for multi-tenant context
      const { data: userData, error: userError } = await supabase
        .from('user')
        .select('agency_id')
        .eq('id', userId)
        .single()

      if (userError || !userData) {
        throw new Error(`User not found or no agency context for user ${userId}`)
      }

      const agencyId = userData.agency_id

      // Step 1: Fetch encrypted Slack token
      const { data: integration, error } = await supabase
        .from('user_oauth_credential')
        .select('access_token')
        .eq('user_id', userId)
        .eq('type', 'slack')
        .single()

      if (error || !integration) {
        console.error('[Slack Sync] No Slack integration found', { error: error?.message })
        throw new Error('Slack not connected for user')
      }

      // Step 2: Decrypt token
      const accessTokenEncrypted = deserializeEncryptedToken(integration.access_token)
      if (!accessTokenEncrypted) {
        throw new Error('Failed to deserialize token')
      }

      const accessToken = decryptToken(accessTokenEncrypted)
      if (!accessToken) {
        throw new Error('Failed to decrypt token')
      }

      // Token decrypted - do not log userId

      // Step 3: Create Slack Web API client
      const slack = new WebClient(accessToken)

      // Step 4: Fetch channels
      const channelsRes = await slack.conversations.list({
        types: 'public_channel,private_channel',
        limit: 50,
      })

      const channels = channelsRes.channels || []
      // Channels fetched - do not log userId

      let messagesProcessed = 0

      // Step 5: Process each channel
      for (const channel of channels) {
        if (!channel.id) continue

        try {
          const processed = await this.processChannel(supabase, userId, agencyId, channel.id, slack)
          messagesProcessed += processed
        } catch (error) {
          // Log but continue with next channel
          console.error(`[Slack Channel] Error processing ${channel.id}:`, error)
          continue
        }
      }

      // Channel processing complete - do not log userId

      // Step 6: Update sync timestamp
      await supabase
        .from('user_oauth_credential')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('type', 'slack')

      // Sync complete - do not log userId
      return { success: true, messagesProcessed }
    } catch (error) {
      console.error('[Slack Sync] Fatal error:', error)
      throw error
    }
  }

  private static async processChannel(
    supabase: any,
    userId: string,
    agencyId: string,
    channelId: string,
    slack: WebClient
  ): Promise<number> {
    try {
      // Fetch recent messages from channel (max 20)
      const messagesRes = await slack.conversations.history({
        channel: channelId,
        limit: 20,
      })

      const messages = messagesRes.messages || []
      console.log('[Slack Channel] Fetched messages', { channelId, count: messages.length })

      let stored = 0

      // Store each message as a communication record
      for (const message of messages) {
        if (!message.ts) continue

        // Skip bot messages and other non-user messages
        if (!message.user) continue

        try {
          const { error } = await supabase.from('user_communication').upsert(
            {
              agency_id: agencyId,
              user_id: userId,
              platform: 'slack',
              message_id: message.ts,
              thread_id: channelId,
              subject: message.text?.substring(0, 100) || '',
              content: message.text || '',
              sender_email: message.user || 'unknown',
              is_inbound: true,
              metadata: {
                channelId,
                messageTs: message.ts,
                user: message.user,
                thread_ts: message.thread_ts,
              },
            },
            {
              onConflict: 'user_id,platform,message_id',
            }
          )

          if (!error) {
            stored++
          } else if (error) {
            console.warn('[Slack Message] Failed to store message', { message_id: message.ts, error })
          }
        } catch (error) {
          console.error('[Slack Message] Error storing message', { ts: message.ts, error })
          continue
        }
      }

      console.log('[Slack Channel] Messages stored', { channelId, count: stored })
      return stored
    } catch (error) {
      console.error(`[Slack Channel] Error processing ${channelId}:`, error)
      return 0
    }
  }
}
