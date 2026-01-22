/**
 * SEO Enrichment Service
 *
 * Routes through diiiploy-gateway for SEO data (DataForSEO).
 * Product infrastructure - does NOT use chi-gateway (personal PAI).
 *
 * Gateway handles credentials, rate limiting, and audit logging.
 * Cost: ~$0.02 per enrichment (domain metrics + competitors call)
 */

const DIIIPLOY_GATEWAY = process.env.DIIIPLOY_GATEWAY_URL || 'https://diiiploy-gateway.roderic-andrews.workers.dev'

export interface SEOSummary {
  total_keywords: number
  traffic_value: number
  top_10_keywords: number
  competitors_count: number
  domain_rank: number | null
  backlinks: number | null
}

export interface SEOEnrichmentResult {
  success: boolean
  domain: string
  summary: SEOSummary | null
  competitors: Array<{
    domain: string
    intersecting_keywords: number
  }>
  fetched_at: string
  error?: string
}

/**
 * Validates and normalizes a domain from user input
 */
export function validateDomain(url: string): { valid: boolean; domain: string | null; error?: string } {
  if (!url || url.trim() === '') {
    return { valid: true, domain: null } // Empty is OK, skip enrichment
  }

  try {
    // Add protocol if missing
    const normalized = url.startsWith('http') ? url : `https://${url}`
    const parsed = new URL(normalized)
    const domain = parsed.hostname.replace(/^www\./, '')

    // Must have TLD
    if (!domain.includes('.') || domain.endsWith('.')) {
      return { valid: false, domain: null, error: 'Please enter a valid domain (e.g., example.com)' }
    }

    return { valid: true, domain }
  } catch {
    return { valid: false, domain: null, error: 'Invalid URL format' }
  }
}

/**
 * Get gateway API key from environment
 */
function getGatewayApiKey(): string | null {
  return process.env.DIIIPLOY_GATEWAY_API_KEY || null
}

/**
 * Fetch from diiiploy-gateway with retry logic
 */
async function fetchFromGateway(
  endpoint: string,
  body: Record<string, unknown>,
  retries = 3
): Promise<Response> {
  const apiKey = getGatewayApiKey()

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  }

  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s timeout

      const response = await fetch(`${DIIIPLOY_GATEWAY}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (response.status === 429 && i < retries - 1) {
        // Rate limited - exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000))
        continue
      }

      return response
    } catch (error) {
      if (i === retries - 1) throw error
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  throw new Error('Max retries exceeded')
}

/**
 * Fetches domain SEO metrics via diiiploy-gateway
 */
export async function enrichDomainSEO(domain: string): Promise<SEOEnrichmentResult> {
  try {
    // Parallel fetch: domain metrics + competitors via gateway
    const [domainRes, competitorsRes] = await Promise.all([
      // Domain metrics (backlinks summary)
      fetchFromGateway('/dataforseo/domain', { target: domain }),
      // Competitors
      fetchFromGateway('/dataforseo/competitors', {
        target: domain,
        limit: 5,
        location: 2840, // USA
      }),
    ])

    const [domainData, competitorsData] = await Promise.all([
      domainRes.json(),
      competitorsRes.json(),
    ])

    // Parse domain metrics response (DataForSEO format)
    const domainMetrics = domainData.tasks?.[0]?.result?.[0] || {}

    // Parse competitors response
    const competitorItems = competitorsData.tasks?.[0]?.result?.[0]?.items || []

    const summary: SEOSummary = {
      total_keywords: 0, // Would need ranked_keywords endpoint
      traffic_value: 0, // Would need traffic analytics endpoint
      top_10_keywords: 0, // Would need ranked_keywords endpoint
      competitors_count: competitorItems.length,
      domain_rank: domainMetrics.rank || null,
      backlinks: domainMetrics.backlinks || null,
    }

    // Map competitors
    const competitors = competitorItems.slice(0, 5).map(
      (c: { domain: string; intersecting_keywords?: number }) => ({
        domain: c.domain,
        intersecting_keywords: c.intersecting_keywords || 0,
      })
    )

    return {
      success: true,
      domain,
      summary,
      competitors,
      fetched_at: new Date().toISOString(),
    }
  } catch (error) {
    console.error('SEO enrichment error via diiiploy-gateway:', error)
    return {
      success: false,
      domain,
      summary: null,
      competitors: [],
      fetched_at: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'SEO enrichment failed',
    }
  }
}
