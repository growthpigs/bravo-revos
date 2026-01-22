import { createClient } from '@/lib/supabase'
import { decryptToken, deserializeEncryptedToken } from '@/lib/crypto'

/**
 * GmailService - Handles email thread syncing from Gmail API
 *
 * SECURITY:
 * - Decrypts tokens only when needed
 * - Never logs tokens or sensitive email data
 * - Validates user_id before fetching tokens
 * - Stores only sanitized metadata in communication table
 *
 * ARCHITECTURE:
 * - Fetches threads using Gmail API
 * - Processes each thread asynchronously
 * - Stores communication records (deduped by external_id)
 * - Updates last_sync_at timestamp on success
 */
export class GmailService {
  /**
   * Sync email threads from Gmail for a specific user
   */
  static async syncEmails(userId: string) {
    try {
      const supabase = await createClient()

      console.log('[Gmail Sync] Starting email sync for user', { userId })

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

      // Step 1: Fetch user's encrypted Gmail tokens from database
      const { data: integration, error } = await supabase
        .from('user_oauth_credential')
        .select('access_token, refresh_token')
        .eq('user_id', userId)
        .eq('type', 'gmail')
        .single()

      if (error || !integration) {
        throw new Error(`Gmail not connected for user ${userId}`)
      }

      console.log('[Gmail Sync] Retrieved credentials from database', { userId })

      // Step 2: Decrypt tokens
      const accessTokenEncrypted = deserializeEncryptedToken(integration.access_token)
      if (!accessTokenEncrypted) {
        throw new Error('Failed to deserialize encrypted access token')
      }

      const accessToken = decryptToken(accessTokenEncrypted)
      if (!accessToken) {
        throw new Error('Failed to decrypt access token')
      }

      console.log('[Gmail Sync] Successfully decrypted tokens', { userId })

      // Step 3: Fetch email threads
      // NOTE: Full Gmail API integration would go here
      // For now, we're setting up the structure
      const threads = await this.fetchThreads(accessToken, userId)

      console.log(`[Gmail Sync] Found ${threads.length} threads for user ${userId}`)

      // Step 4: Process each thread
      let processedCount = 0
      for (const thread of threads) {
        if (!thread.id) continue

        try {
          await this.processThread(supabase, userId, agencyId, thread.id, accessToken)
          processedCount++
        } catch (err) {
          console.error(`[Gmail Sync] Error processing thread ${thread.id}:`, err)
          // Continue processing other threads on error
        }
      }

      // Step 5: Update last sync timestamp
      await supabase
        .from('user_oauth_credential')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('type', 'gmail')

      console.log('[Gmail Sync] Sync completed', { userId, threadsProcessed: processedCount })

      return { success: true, threadsProcessed: processedCount }
    } catch (error) {
      console.error('[Gmail Sync] Fatal error:', error)

      // Update error status in database
      try {
        const supabase = await createClient()
        await supabase
          .from('user_oauth_credential')
          .update({
            is_connected: false,
            error_message: error instanceof Error ? error.message : 'Unknown sync error',
          })
          .eq('user_id', userId)
          .eq('type', 'gmail')
      } catch (updateErr) {
        console.error('[Gmail Sync] Failed to update error status:', updateErr)
      }

      throw error
    }
  }

  /**
   * Fetch email threads from Gmail API
   * Returns array of thread metadata (id, messageCount, etc.)
   */
  private static async fetchThreads(accessToken: string, userId: string): Promise<any[]> {
    try {
      // NOTE: This is a placeholder for actual Gmail API call
      // Full implementation would use googleapis client library:
      // const gmail = google.gmail('v1')
      // const res = await gmail.users.threads.list({
      //   auth: oauth2Client,
      //   userId: 'me',
      //   maxResults: 50,
      // })
      // return res.data.threads || []

      console.log('[Gmail API] Fetching threads for user', { userId })

      // Placeholder: return empty array for now
      // Real implementation will fetch from Gmail API
      return []
    } catch (error) {
      console.error('[Gmail API] Error fetching threads:', error)
      throw error
    }
  }

  /**
   * Process a single email thread and store communication records
   */
  private static async processThread(
    supabase: any,
    userId: string,
    agencyId: string,
    threadId: string,
    accessToken: string
  ) {
    try {
      console.log(`[Gmail Thread] Processing thread ${threadId}`)

      // NOTE: Placeholder for Gmail API thread.get() call
      // const gmail = google.gmail('v1')
      // const thread = await gmail.users.threads.get({
      //   auth: oauth2Client,
      //   userId: 'me',
      //   id: threadId,
      // })

      // Placeholder: skip actual API call for now
      const messages: any[] = []

      console.log(`[Gmail Thread] Processing ${messages.length} messages in thread ${threadId}`)

      // Extract and store message metadata
      for (const message of messages) {
        if (!message.id) continue

        try {
          const headers = message.payload?.headers || []
          const from = headers.find((h: any) => h.name === 'From')?.value || ''
          const subject = headers.find((h: any) => h.name === 'Subject')?.value || ''
          const date = headers.find((h: any) => h.name === 'Date')?.value || ''

          // Store to user_communication table with correct fields
          const { error } = await supabase.from('user_communication').upsert(
            {
              agency_id: agencyId,
              user_id: userId,
              platform: 'gmail',
              message_id: message.id,
              thread_id: threadId,
              subject,
              content: message.snippet || '',
              sender_email: from,
              is_inbound: true,
              metadata: {
                labels: message.labelIds || [],
              },
            },
            {
              onConflict: 'user_id,platform,message_id',
            }
          )

          if (error) {
            console.error(`[Gmail Thread] Error storing message ${message.id}:`, error)
          }
        } catch (err) {
          console.error(`[Gmail Thread] Error processing message ${message.id}:`, err)
        }
      }
    } catch (error) {
      console.error(`[Gmail Thread] Error processing thread ${threadId}:`, error)
      throw error
    }
  }
}
