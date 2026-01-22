/**
 * Google Ads Sync Module
 * Fetches data from diiiploy-gateway and transforms for ad_performance table
 *
 * Uses diiiploy-gateway (NOT chi-gateway) for multi-tenant SaaS infrastructure
 * See RUNBOOK.md for gateway documentation
 */

import type { SyncResult, AdPerformanceRecord, SyncJobConfig } from './types'

const DIIIPLOY_GATEWAY_URL = process.env.DIIIPLOY_GATEWAY_URL ||
  'https://diiiploy-gateway.roderic-andrews.workers.dev'
const DIIIPLOY_GATEWAY_API_KEY = process.env.DIIIPLOY_GATEWAY_API_KEY || ''

// Google Ads API Response Types (from diiiploy-gateway)
interface GoogleAdsCampaignResult {
  campaign: {
    id: string
    name: string
    status: string
  }
  campaignBudget?: {
    amountMicros: string
  }
  metrics: {
    impressions: string
    clicks: string
    costMicros: string
    conversions?: string
  }
}

interface GoogleAdsPerformanceResult {
  metrics: {
    impressions: string
    clicks: string
    costMicros: string
    conversions: string
    ctr: string
    averageCpc: string
  }
}

interface GoogleAdsApiResponse<T> {
  results?: T[]
  error?: string
}

/**
 * Fetch campaigns from diiiploy-gateway
 */
async function fetchCampaigns(): Promise<GoogleAdsCampaignResult[]> {
  const response = await fetch(`${DIIIPLOY_GATEWAY_URL}/google-ads/campaigns`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DIIIPLOY_GATEWAY_API_KEY}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to fetch campaigns: ${response.status} - ${error}`)
  }

  const data: GoogleAdsApiResponse<GoogleAdsCampaignResult> = await response.json()
  return data.results || []
}

/**
 * Fetch account-level performance from diiiploy-gateway
 */
async function fetchPerformance(days: number = 30): Promise<GoogleAdsPerformanceResult[]> {
  const response = await fetch(`${DIIIPLOY_GATEWAY_URL}/google-ads/performance?days=${days}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DIIIPLOY_GATEWAY_API_KEY}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to fetch performance: ${response.status} - ${error}`)
  }

  const data: GoogleAdsApiResponse<GoogleAdsPerformanceResult> = await response.json()
  return data.results || []
}

/**
 * Convert micros to actual currency value
 * Google Ads API returns monetary values in micros (1,000,000 = $1.00)
 */
function microsToAmount(micros: string | number): number {
  const value = typeof micros === 'string' ? parseInt(micros, 10) : micros
  return value / 1_000_000
}

/**
 * Transform Google Ads campaign data to ad_performance records
 */
function transformCampaignsToRecords(
  campaigns: GoogleAdsCampaignResult[],
  config: SyncJobConfig
): AdPerformanceRecord[] {
  const today = new Date().toISOString().split('T')[0]

  return campaigns.map((campaign) => ({
    agency_id: config.agencyId,
    client_id: config.clientId || config.agencyId, // Fallback to agency if no client
    account_id: (config.config?.accountId as string) || 'default',
    platform: 'google_ads' as const,
    campaign_id: campaign.campaign.id,
    date: today,
    impressions: parseInt(campaign.metrics.impressions || '0', 10),
    clicks: parseInt(campaign.metrics.clicks || '0', 10),
    spend: microsToAmount(campaign.metrics.costMicros || '0'),
    conversions: parseFloat(campaign.metrics.conversions || '0'),
    revenue: null, // Google Ads doesn't provide revenue directly
  }))
}

/**
 * Main sync function - fetches Google Ads data and returns records for upserting
 */
export async function syncGoogleAds(config: SyncJobConfig): Promise<{
  records: AdPerformanceRecord[]
  result: SyncResult
}> {
  const errors: string[] = []
  let recordsProcessed = 0

  try {
    // Fetch campaign data
    const campaigns = await fetchCampaigns()
    recordsProcessed = campaigns.length

    // Transform to ad_performance format
    const records = transformCampaignsToRecords(campaigns, config)

    return {
      records,
      result: {
        success: true,
        provider: 'google_ads',
        recordsProcessed,
        recordsCreated: records.length, // Will be updated by caller after upsert
        recordsUpdated: 0,
        errors,
        syncedAt: new Date().toISOString(),
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    errors.push(errorMessage)

    return {
      records: [],
      result: {
        success: false,
        provider: 'google_ads',
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        errors,
        syncedAt: new Date().toISOString(),
      },
    }
  }
}

/**
 * Fetch account-level summary (for dashboard display)
 */
export async function getGoogleAdsAccountSummary(days: number = 30): Promise<{
  impressions: number
  clicks: number
  spend: number
  conversions: number
  ctr: number
  avgCpc: number
} | null> {
  try {
    const performance = await fetchPerformance(days)

    if (!performance.length) {
      return null
    }

    const metrics = performance[0].metrics
    return {
      impressions: parseInt(metrics.impressions || '0', 10),
      clicks: parseInt(metrics.clicks || '0', 10),
      spend: microsToAmount(metrics.costMicros || '0'),
      conversions: parseFloat(metrics.conversions || '0'),
      ctr: parseFloat(metrics.ctr || '0'),
      avgCpc: microsToAmount(metrics.averageCpc || '0'),
    }
  } catch (error) {
    console.error('[google-ads-sync] Failed to get account summary:', error)
    return null
  }
}
