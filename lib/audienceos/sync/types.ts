/**
 * Sync Infrastructure Types
 * Types for data synchronization from external providers
 */

import type { IntegrationProvider } from '@/types/database'

// =============================================================================
// SYNC JOB TYPES
// =============================================================================

export interface SyncResult {
  success: boolean
  provider: IntegrationProvider
  recordsProcessed: number
  recordsCreated: number
  recordsUpdated: number
  errors: string[]
  syncedAt: string
}

export interface SyncJobConfig {
  integrationId: string
  agencyId: string
  clientId?: string
  provider: IntegrationProvider
  accessToken: string
  refreshToken?: string
  config?: Record<string, unknown>
}

// =============================================================================
// GOOGLE ADS TYPES
// =============================================================================

export interface GoogleAdsCampaignMetrics {
  campaign_id: string
  campaign_name: string
  impressions: number
  clicks: number
  cost: number // in account currency (not micros)
  conversions: number
  date: string
}

export interface GoogleAdsPerformanceResponse {
  campaigns?: Array<{
    id: string
    name: string
    status: string
  }>
  metrics?: {
    impressions: number
    clicks: number
    cost_micros: number
    conversions: number
  }
  // Chi-gateway response format
  performance?: Array<{
    campaign_id?: string
    campaign_name?: string
    impressions?: number
    clicks?: number
    cost?: number
    conversions?: number
    date?: string
  }>
}

export interface AdPerformanceRecord {
  agency_id: string
  client_id: string
  account_id: string
  platform: 'google_ads' | 'meta_ads'
  campaign_id: string | null
  date: string
  impressions: number
  clicks: number
  spend: number
  conversions: number
  revenue: number | null
}

// =============================================================================
// SLACK TYPES
// =============================================================================

export interface SlackMessage {
  ts: string
  user: string
  text: string
  thread_ts?: string
  reactions?: Array<{ name: string; count: number }>
  attachments?: unknown[]
}

export interface SlackConversationResponse {
  ok: boolean
  messages: SlackMessage[]
  has_more: boolean
  response_metadata?: {
    next_cursor?: string
  }
}

export interface CommunicationRecord {
  agency_id: string
  client_id: string
  platform: 'slack' | 'gmail'
  thread_id: string | null
  message_id: string
  sender_name: string | null
  sender_email: string | null
  subject: string | null
  content: string
  is_inbound: boolean
  needs_reply: boolean
  received_at: string
}
