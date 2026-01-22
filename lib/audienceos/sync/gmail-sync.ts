/**
 * Gmail Sync Worker
 *
 * Fetches emails directly from Gmail API using user's OAuth token
 * Normalizes to AudienceOS communication schema
 * Stores in multi-tenant database
 *
 * Architecture: Multi-tenant - each user's OAuth token fetches their own emails
 */

import type { SyncJobConfig, SyncResult } from './types'

export interface GmailMessage {
  id: string
  threadId: string
  labelIds: string[]
  snippet: string
  payload?: {
    headers: Array<{ name: string; value: string }>
    parts?: unknown[]
    body?: { data?: string }
  }
  internalDate: string
}

export interface NormalizedCommunication {
  id: string
  agency_id: string
  client_id: string
  platform: 'gmail'
  message_id: string // external_id mapped to message_id
  sender_name: string | null
  sender_email: string
  subject: string | null
  content: string // body_preview mapped to content
  created_at: string
  received_at: string
  thread_id: string | null
  is_inbound: boolean
  needs_reply: boolean
  replied_at: string | null
  replied_by: string | null
}

/**
 * Sync Gmail using direct Gmail API
 * Uses user's decrypted OAuth token for authentication
 * Returns normalized communications ready to store in DB
 */
export async function syncGmail(config: SyncJobConfig): Promise<{
  records: NormalizedCommunication[]
  result: SyncResult
}> {
  const startTime = Date.now()
  const result: SyncResult = {
    success: true,
    provider: 'gmail',
    recordsProcessed: 0,
    recordsCreated: 0,
    recordsUpdated: 0,
    errors: [],
    syncedAt: new Date().toISOString(),
  }

  const records: NormalizedCommunication[] = []

  try {
    if (!config.accessToken) {
      throw new Error('Gmail access token not configured')
    }

    // Call chi-gateway Gmail MCP endpoint
    // chi-gateway MCP exposes: GET /gmail/messages?maxResults=100&pageToken=...
    const gmailMessages = await fetchGmailMessages(config.accessToken)

    result.recordsProcessed = gmailMessages.length

    // Normalize each message
    for (const message of gmailMessages) {
      try {
        const normalized = normalizeGmailMessage(
          message,
          config.agencyId,
          config.clientId || config.agencyId
        )
        records.push(normalized)
      } catch (e) {
        console.error('[gmail-sync] Error normalizing message:', e)
        result.errors.push(`Failed to normalize message ${message.id}`)
      }
    }

    result.recordsCreated = records.length
    result.success = result.errors.length === 0 || result.errors.length < result.recordsProcessed / 2

    console.log('[gmail-sync] Sync completed:', {
      duration: Date.now() - startTime,
      processed: result.recordsProcessed,
      created: result.recordsCreated,
      errors: result.errors.length,
    })
  } catch (error) {
    result.success = false
    result.errors.push(`Gmail sync failed: ${error instanceof Error ? error.message : String(error)}`)
    console.error('[gmail-sync] Sync error:', error)
  }

  return { records, result }
}

/**
 * Fetch Gmail messages using direct Gmail API
 * Uses user's OAuth access token for multi-tenant authentication
 *
 * Gmail API: GET https://gmail.googleapis.com/gmail/v1/users/me/messages
 * Returns: { messages: [{id, threadId}], nextPageToken?, resultSizeEstimate }
 */
async function fetchGmailMessages(accessToken: string): Promise<GmailMessage[]> {
  const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'

  // Query: unread messages or messages from the last 7 days
  const query = 'is:unread OR newer_than:7d'
  const maxResults = 50 // Lower for initial sync, can paginate later

  try {
    // Step 1: Get message IDs
    const listResponse = await fetch(
      `${GMAIL_API_BASE}/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!listResponse.ok) {
      const errorText = await listResponse.text()
      throw new Error(`Gmail API list failed: ${listResponse.status} - ${errorText}`)
    }

    const listData = (await listResponse.json()) as {
      messages?: Array<{ id: string; threadId: string }>
      nextPageToken?: string
    }

    if (!listData.messages || listData.messages.length === 0) {
      console.log('[gmail-sync] No messages found matching query')
      return []
    }

    console.log(`[gmail-sync] Found ${listData.messages.length} message IDs`)

    // Step 2: Fetch full message details (batch in parallel, max 10 concurrent)
    const messages: GmailMessage[] = []
    const batchSize = 10

    for (let i = 0; i < listData.messages.length; i += batchSize) {
      const batch = listData.messages.slice(i, i + batchSize)
      const batchPromises = batch.map(async (msg) => {
        try {
          const msgResponse = await fetch(
            `${GMAIL_API_BASE}/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            }
          )

          if (!msgResponse.ok) {
            console.warn(`[gmail-sync] Failed to fetch message ${msg.id}: ${msgResponse.status}`)
            return null
          }

          return (await msgResponse.json()) as GmailMessage
        } catch (e) {
          console.error(`[gmail-sync] Error fetching message ${msg.id}:`, e)
          return null
        }
      })

      const batchResults = await Promise.all(batchPromises)
      messages.push(...batchResults.filter((m): m is GmailMessage => m !== null))
    }

    console.log(`[gmail-sync] Fetched ${messages.length} full message details`)
    return messages
  } catch (error) {
    console.error('[gmail-sync] Gmail API error:', error)
    throw error
  }
}

/**
 * Normalize Gmail message to AudienceOS communication schema
 */
function normalizeGmailMessage(
  message: GmailMessage,
  agencyId: string,
  clientId: string
): NormalizedCommunication {
  const headers = message.payload?.headers || []
  const headerMap = new Map(headers.map((h) => [h.name.toLowerCase(), h.value]))

  const fromEmail = headerMap.get('from') || 'unknown@unknown.com'
  const fromName = extractNameFromEmail(fromEmail)
  const subject = headerMap.get('subject') || null
  const timestamp = new Date(parseInt(message.internalDate)).toISOString()

  // Gmail messages are always inbound (from external senders) when synced
  // Outbound emails would need separate handling
  return {
    id: `gmail_${message.id}`,
    agency_id: agencyId,
    client_id: clientId,
    platform: 'gmail',
    message_id: message.id,
    sender_name: fromName,
    sender_email: fromEmail,
    subject,
    content: message.snippet || '(empty message)',
    created_at: timestamp,
    received_at: timestamp,
    thread_id: message.threadId || null,
    is_inbound: true,
    needs_reply: !message.labelIds?.includes('ANSWERED'),
    replied_at: null,
    replied_by: null,
  }
}

/**
 * Extract display name from email header
 * Handles formats like: "John Doe <john@example.com>"
 */
function extractNameFromEmail(email: string): string | null {
  const match = email.match(/^(.+?)\s*<(.+?)>$/)
  if (match) {
    return match[1].trim() || null
  }
  return null
}
