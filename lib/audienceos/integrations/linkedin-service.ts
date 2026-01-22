import { createClient } from '@/lib/supabase'
import { decryptToken, deserializeEncryptedToken } from '@/lib/crypto'
import * as UnipileClient from '@/lib/unipile-client'

/**
 * LinkedInService - Syncs LinkedIn direct messages into communications table
 *
 * FLOW:
 * 1. Fetch encrypted UniPile account ID for user from user_oauth_credential
 * 2. Decrypt account ID
 * 3. Fetch messages from UniPile API
 * 4. Transform messages to user_communication schema
 * 5. Store as communication records with external_id deduplication
 * 6. Update last_sync_at timestamp
 * 7. Return sync result with message count
 *
 * ERROR HANDLING:
 * - If one message fails, continue with others
 * - Non-critical failures (rate limits) don't stop sync
 * - Only critical failures (no token) cause early exit
 */
export class LinkedInService {
  static async sendMessage(
    userId: string,
    recipientId: string,
    message: string
  ): Promise<{ success: boolean; messageId: string }> {
    try {
      const supabase = await createClient()

      // Step 1: Fetch user's agency_id for multi-tenant context
      const { data: userData, error: userError } = await supabase
        .from('user')
        .select('agency_id')
        .eq('id', userId)
        .single()

      if (userError || !userData) {
        throw new Error(`User not found or no agency context for user ${userId}`)
      }

      const agencyId = userData.agency_id

      // Step 2: Fetch encrypted UniPile account ID
      const { data: integration, error } = await supabase
        .from('user_oauth_credential')
        .select('access_token')
        .eq('user_id', userId)
        .eq('type', 'linkedin')
        .single()

      if (error || !integration) {
        console.error('[LinkedIn Send] No LinkedIn integration found', { error: error?.message })
        throw new Error('LinkedIn not connected for user')
      }

      // Step 3: Decrypt account ID
      const accountIdEncrypted = deserializeEncryptedToken(integration.access_token)
      if (!accountIdEncrypted) {
        throw new Error('Failed to deserialize token')
      }

      const accountId = decryptToken(accountIdEncrypted)
      if (!accountId) {
        throw new Error('Failed to decrypt token')
      }

      // Token decrypted - do not log userId, accountId, or recipientId

      // Step 4: Send message via UniPile
      const result = await UnipileClient.sendDirectMessage(
        accountId,
        recipientId,
        message
      )

      console.log('[LinkedIn Send] Message sent successfully', {
        userId,
        recipientId,
        messageId: result.message_id,
      })

      return {
        success: true,
        messageId: result.message_id,
      }
    } catch (error) {
      console.error('[LinkedIn Send] Fatal error:', error)
      throw error
    }
  }

  static async syncMessages(userId: string) {
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

      // Step 1: Fetch encrypted UniPile account ID
      const { data: integration, error } = await supabase
        .from('user_oauth_credential')
        .select('access_token')
        .eq('user_id', userId)
        .eq('type', 'linkedin')
        .single()

      if (error || !integration) {
        console.error('[LinkedIn Sync] No LinkedIn integration found for user', { userId, error })
        throw new Error('LinkedIn not connected for user')
      }

      // Step 2: Decrypt account ID
      const accountIdEncrypted = deserializeEncryptedToken(integration.access_token)
      if (!accountIdEncrypted) {
        throw new Error('Failed to deserialize token')
      }

      const accountId = decryptToken(accountIdEncrypted)
      if (!accountId) {
        throw new Error('Failed to decrypt token')
      }

      console.log('[LinkedIn Sync] Token decrypted successfully', { userId, accountId })

      // Step 3: Fetch messages from UniPile
      let messages: UnipileClient.UnipileMessage[] = []
      try {
        messages = await UnipileClient.getMessages(accountId, 20)
      } catch (error) {
        console.error('[LinkedIn Sync] Failed to fetch messages from UniPile:', error)
        throw new Error('Failed to fetch LinkedIn messages')
      }

      console.log('[LinkedIn Sync] Fetched messages', { userId, count: messages.length })

      let messagesProcessed = 0

      // Step 4: Process each message
      for (const message of messages) {
        if (!message.id) continue

        try {
          const processed = await this.processMessage(supabase, userId, agencyId, message)
          if (processed) {
            messagesProcessed++
          }
        } catch (error) {
          // Log but continue with next message
          console.error(`[LinkedIn Message] Error processing ${message.id}:`, error)
          continue
        }
      }

      // Step 5: Fetch and process connection requests
      let connectionsProcessed = 0
      try {
        const connections = await UnipileClient.getConnections(accountId, 'PENDING', 20)
        console.log('[LinkedIn Sync] Fetched connection requests', { userId, count: connections.length })

        for (const connection of connections) {
          try {
            const processed = await this.processConnection(supabase, userId, agencyId, connection)
            if (processed) {
              connectionsProcessed++
            }
          } catch (error) {
            console.error(`[LinkedIn Connection] Error processing ${connection.id}:`, error)
            continue
          }
        }
      } catch (error) {
        console.warn('[LinkedIn Sync] Failed to fetch connection requests:', error)
        // Non-critical, continue with main sync
      }

      console.log('[LinkedIn Sync] Message processing complete', { userId, messagesProcessed, connectionsProcessed })

      // Step 6: Update sync timestamp
      await supabase
        .from('user_oauth_credential')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('type', 'linkedin')

      console.log('[LinkedIn Sync] Sync complete', { userId, messagesProcessed, connectionsProcessed })
      return { success: true, messagesProcessed, connectionsProcessed }
    } catch (error) {
      console.error('[LinkedIn Sync] Fatal error:', error)
      throw error
    }
  }

  private static async processMessage(
    supabase: any,
    userId: string,
    agencyId: string,
    message: UnipileClient.UnipileMessage
  ): Promise<boolean> {
    try {
      // Only process messages (skip system messages)
      if (!message.id || !message.text) {
        return false
      }

      // Determine if message is inbound or outbound
      const isInbound = message.message_type === 'INCOMING'

      const { error } = await supabase.from('user_communication').upsert(
        {
          agency_id: agencyId,
          user_id: userId,
          platform: 'linkedin',
          message_id: message.id,
          thread_id: message.thread_id || `linkedin-${isInbound ? message.from_id : message.to_id}`,
          subject: `LinkedIn ${isInbound ? 'from' : 'to'} ${isInbound ? message.from_name : message.to_name}`,
          content: message.text,
          sender_email: isInbound ? message.from_id : message.to_id,
          is_inbound: isInbound,
          metadata: {
            from_id: message.from_id,
            from_name: message.from_name,
            to_id: message.to_id,
            to_name: message.to_name,
            provider: 'LINKEDIN',
            message_type: message.message_type,
            attachments: message.attachments,
          },
        },
        {
          onConflict: 'user_id,platform,message_id',
        }
      )

      if (!error) {
        return true
      } else {
        console.warn('[LinkedIn Message] Failed to store message', { message_id: message.id, error })
        return false
      }
    } catch (error) {
      console.error('[LinkedIn Message] Error storing message', { id: message.id, error })
      return false
    }
  }

  private static async processConnection(
    supabase: any,
    userId: string,
    agencyId: string,
    connection: UnipileClient.UnipileConnection
  ): Promise<boolean> {
    try {
      // Process connection requests as special message type
      if (!connection.id || !connection.user_id) {
        return false
      }

      const connectionMessage = `${connection.user_name}${connection.headline ? ` (${connection.headline})` : ''} sent you a connection request`

      const { error } = await supabase.from('user_communication').upsert(
        {
          agency_id: agencyId,
          user_id: userId,
          platform: 'linkedin',
          message_id: `conn-${connection.id}`,
          thread_id: `linkedin-connection-${connection.user_id}`,
          subject: `Connection request from ${connection.user_name}`,
          content: connectionMessage,
          sender_email: connection.user_id,
          is_inbound: true,
          metadata: {
            type: 'connection_request',
            user_id: connection.user_id,
            user_name: connection.user_name,
            headline: connection.headline,
            profile_url: connection.profile_url,
            provider: 'LINKEDIN',
            status: connection.status,
          },
        },
        {
          onConflict: 'user_id,platform,message_id',
        }
      )

      if (!error) {
        return true
      } else {
        console.warn('[LinkedIn Connection] Failed to store connection request', {
          connection_id: connection.id,
          error,
        })
        return false
      }
    } catch (error) {
      console.error('[LinkedIn Connection] Error storing connection request', { id: connection.id, error })
      return false
    }
  }
}
