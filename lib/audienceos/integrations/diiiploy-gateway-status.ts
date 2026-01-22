/**
 * Diiiploy-Gateway Integration Status Service
 *
 * ============================================================
 * CRITICAL: AudienceOS uses DIIIPLOY-GATEWAY, NOT chi-gateway!
 * Chi-gateway is for personal PAI infrastructure only.
 * ============================================================
 *
 * Fetches integration connection status from diiiploy-gateway (Cloudflare Worker).
 * This follows the "agency model" where diiiploy-gateway is the single source of truth
 * for OAuth tokens - the app only reads status, never stores tokens.
 *
 * @see https://diiiploy-gateway.roderic-andrews.workers.dev/health/full
 */

// Diiiploy-gateway health response types
export interface DiiiplopyGatewayService {
  service: string
  status: 'ok' | 'error' | 'warning'
  message?: string
  hint?: string
}

export interface DiiiplopyGatewayHealthResponse {
  gateway: {
    status: 'ok' | 'down'
    version: string
    timestamp: string
    tools: number
  }
  services: DiiiplopyGatewayService[]
  summary: {
    healthy: number
    degraded: number
    failed: number
  }
}

// Mapped status for UI consumption
export interface IntegrationStatus {
  provider: string
  name: string
  isConnected: boolean
  status: 'ok' | 'error' | 'warning'
  message?: string
  hint?: string
  icon: string
  description: string
}

// Display names and metadata for each service
const SERVICE_METADATA: Record<string, { name: string; icon: string; description: string }> = {
  gmail: {
    name: 'Google Workspace',
    icon: 'Mail',
    description: 'Gmail, Calendar, Drive, Sheets, Docs',
  },
  calendar: {
    name: 'Google Calendar',
    icon: 'Calendar',
    description: 'Event scheduling and management',
  },
  drive: {
    name: 'Google Drive',
    icon: 'HardDrive',
    description: 'File storage and sharing',
  },
  sheets: {
    name: 'Google Sheets',
    icon: 'Table',
    description: 'Spreadsheet data management',
  },
  render: {
    name: 'Render',
    icon: 'Server',
    description: 'Backend service deployment',
  },
  sentry: {
    name: 'Sentry',
    icon: 'AlertTriangle',
    description: 'Error tracking and monitoring',
  },
  netlify: {
    name: 'Netlify',
    icon: 'Globe',
    description: 'Frontend deployment',
  },
  neon: {
    name: 'Neon',
    icon: 'Database',
    description: 'Serverless PostgreSQL',
  },
  supabase: {
    name: 'Supabase',
    icon: 'Database',
    description: 'Backend as a Service',
  },
  mercury: {
    name: 'Mercury',
    icon: 'CreditCard',
    description: 'Business banking',
  },
  meta_ads: {
    name: 'Meta Ads',
    icon: 'Target',
    description: 'Facebook & Instagram advertising',
  },
  google_ads: {
    name: 'Google Ads',
    icon: 'TrendingUp',
    description: 'Search and display advertising',
  },
  mem0: {
    name: 'Mem0',
    icon: 'Brain',
    description: 'AI memory system',
  },
  browser: {
    name: 'Browser Automation',
    icon: 'Monitor',
    description: 'Headless browser operations',
  },
}

/**
 * CRITICAL: AudienceOS uses diiiploy-gateway, NOT chi-gateway!
 */
const DIIIPLOY_GATEWAY_URL = 'https://diiiploy-gateway.roderic-andrews.workers.dev'

/**
 * Fetch full health status from diiiploy-gateway
 */
export async function fetchDiiiplopyGatewayHealth(): Promise<DiiiplopyGatewayHealthResponse | null> {
  try {
    const response = await fetch(`${DIIIPLOY_GATEWAY_URL}/health/full`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      // Short timeout since this is a health check
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      console.error(`Diiiploy-gateway health check failed: ${response.status}`)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Failed to fetch diiiploy-gateway health:', error)
    return null
  }
}

/**
 * Get integration status formatted for UI display
 */
export async function getIntegrationStatuses(): Promise<IntegrationStatus[]> {
  const health = await fetchDiiiplopyGatewayHealth()

  if (!health) {
    // Return empty array if gateway is unreachable
    // UI should handle this gracefully
    return []
  }

  return health.services.map((service) => {
    const metadata = SERVICE_METADATA[service.service] || {
      name: service.service,
      icon: 'Plug',
      description: 'External integration',
    }

    return {
      provider: service.service,
      name: metadata.name,
      isConnected: service.status === 'ok',
      status: service.status,
      message: service.message,
      hint: service.hint,
      icon: metadata.icon,
      description: metadata.description,
    }
  })
}

/**
 * Get status for a specific service
 */
export async function getServiceStatus(serviceId: string): Promise<IntegrationStatus | null> {
  const statuses = await getIntegrationStatuses()
  return statuses.find((s) => s.provider === serviceId) || null
}

/**
 * Get gateway summary (healthy/degraded/failed counts)
 */
export async function getGatewaySummary(): Promise<DiiiplopyGatewayHealthResponse['summary'] | null> {
  const health = await fetchDiiiplopyGatewayHealth()
  return health?.summary || null
}

/**
 * Check if diiiploy-gateway is reachable
 */
export async function isGatewayReachable(): Promise<boolean> {
  try {
    const response = await fetch(`${DIIIPLOY_GATEWAY_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    })
    return response.ok
  } catch {
    return false
  }
}
