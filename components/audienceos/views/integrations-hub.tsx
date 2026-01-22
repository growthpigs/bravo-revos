"use client"

/**
 * Integrations Hub
 *
 * ============================================================
 * DATA SOURCE: Supabase `integration` table via /api/v1/integrations
 * STATUS: `is_connected` field determines connected/disconnected status
 * ============================================================
 *
 * This follows the "agency model" where each agency has their own
 * integration records in Supabase. OAuth flows store tokens per-agency.
 *
 * Fixed 2026-01-20: Changed from diiiploy-gateway (single-tenant) to
 * Supabase (multi-tenant) to properly show each agency's integrations.
 */

import React, { useState, useMemo, useEffect } from "react"
import { cn } from "@/lib/utils"
import { VerticalPageLayout, VerticalSection } from "@/components/linear/vertical-section"
import { Search, Check, AlertCircle, Clock, ExternalLink, Settings2, RefreshCw } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { integrationIcons } from "@/components/linear/integration-card"
import { IntegrationSettingsModal } from "@/components/linear/integration-settings-modal"
import { IntegrationConnectModal } from "@/components/linear/integration-connect-modal"
import { toast } from "sonner"
import type { Database } from "@/types/database"

type IntegrationProvider = Database['public']['Enums']['integration_provider']

// Database integration record (from /api/v1/integrations)
interface DbIntegration {
  id: string
  provider: IntegrationProvider
  is_connected: boolean
  last_sync_at?: string | null
  config?: Record<string, unknown>
}

type IntegrationStatus = "connected" | "disconnected" | "error" | "syncing"
type IntegrationCategory = "advertising" | "communication" | "analytics" | "crm" | "productivity"

interface Integration {
  id: string
  provider?: IntegrationProvider // Provider key for API calls (optional for future integrations)
  name: string
  description: string
  icon: React.ReactNode
  color: string
  category: IntegrationCategory
  status: IntegrationStatus
  lastSync?: string
  accounts?: number
}

// Integration metadata for all 8 integrations (4 MVP + 4 future)
interface IntegrationMetadata {
  name: string
  description: string
  icon: React.ReactNode
  color: string
  category: IntegrationCategory
}

const integrationMetadata: Record<IntegrationProvider, IntegrationMetadata> = {
  slack: {
    name: "Slack",
    description: "Get notifications and send messages directly from your workspace",
    icon: integrationIcons.slack,
    color: "bg-[#4A154B]",
    category: "communication",
  },
  gmail: {
    name: "Google Workspace",
    description: "Gmail, Calendar, Drive, Sheets & Docs - full workspace access",
    icon: integrationIcons.gmail,
    color: "bg-[#EA4335]",
    category: "productivity",
  },
  google_ads: {
    name: "Google Ads",
    description: "Import campaign performance data and manage ad accounts",
    icon: integrationIcons.googleAds,
    color: "bg-[#4285F4]",
    category: "advertising",
  },
  meta_ads: {
    name: "Meta Ads",
    description: "Connect Facebook and Instagram ad accounts for unified reporting",
    icon: integrationIcons.meta,
    color: "bg-[#0866FF]",
    category: "advertising",
  },
}

// Future integrations (not in DB yet, shown as "disconnected")
const futureIntegrations: Integration[] = [
  {
    id: "google-analytics",
    name: "Google Analytics",
    description: "Import website analytics and conversion data",
    icon: integrationIcons.googleAnalytics,
    color: "bg-[#E37400]",
    category: "analytics",
    status: "disconnected",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Sync contacts, deals, and marketing data",
    icon: integrationIcons.hubspot,
    color: "bg-[#FF7A59]",
    category: "crm",
    status: "disconnected",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Link documentation and project notes",
    icon: integrationIcons.notion,
    color: "bg-[#000000]",
    category: "productivity",
    status: "disconnected",
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Automate workflows with 5,000+ apps",
    icon: integrationIcons.zapier,
    color: "bg-[#FF4A00]",
    category: "productivity",
    status: "disconnected",
  },
]

// Removed: mapDbToUiIntegration - now using diiiploy-gateway status directly

const statusConfig: Record<IntegrationStatus, { icon: React.ReactNode; label: string; className: string }> = {
  connected: {
    icon: <Check className="w-3 h-3" />,
    label: "Connected",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 backdrop-blur-sm",
  },
  disconnected: {
    icon: null,
    label: "Not connected",
    className: "bg-rose-500/8 text-rose-500/80 dark:text-rose-400/70 backdrop-blur-sm",
  },
  error: {
    icon: <AlertCircle className="w-3 h-3" />,
    label: "Error",
    className: "bg-red-500/15 text-red-600 dark:text-red-400 backdrop-blur-sm",
  },
  syncing: {
    icon: <Clock className="w-3 h-3 animate-spin" />,
    label: "Syncing",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 backdrop-blur-sm",
  },
}

interface IntegrationCardProps {
  integration: Integration
  onClick?: () => void
  onConnect?: (provider: string) => void
}

function IntegrationCardComponent({ integration, onClick, onConnect }: IntegrationCardProps) {
  const status = statusConfig[integration.status]

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick?.()
    }
  }

  const handleConnectClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (integration.provider) {
      onConnect?.(integration.provider) // Use provider, not id (which could be UUID)
    }
  }

  const showConnectButton = integration.status === "disconnected" || integration.status === "error"

  return (
    <div
      className="relative bg-card border border-border rounded-lg p-5 hover:border-primary/50 transition-colors cursor-pointer group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Configure ${integration.name} integration`}
    >
      {/* Status badge - top right corner with glassmorphic style */}
      <span
        className={cn(
          "absolute top-3 right-3 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium",
          status.className
        )}
      >
        {status.icon}
        {status.label}
      </span>

      <div className="flex items-start gap-4">
        <div
          className={cn(
            "w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0",
            integration.color
          )}
        >
          {integration.icon}
        </div>
        <div className="flex-1 min-w-0 pr-20">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-foreground">{integration.name}</h3>
            <button
              className="p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              aria-label={`${integration.name} settings`}
              onClick={(e) => e.stopPropagation()}
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {integration.description}
          </p>
          {integration.accounts && integration.status === "connected" && (
            <p className="text-xs text-muted-foreground mb-3">
              {integration.accounts} account{integration.accounts > 1 ? "s" : ""} connected
            </p>
          )}
          {showConnectButton && (
            <Button
              size="sm"
              variant={integration.status === "error" ? "outline" : "secondary"}
              className="w-full"
              onClick={handleConnectClick}
            >
              {integration.status === "error" ? "Reconnect" : "Connect"}
            </Button>
          )}
          {integration.lastSync && integration.status !== "disconnected" && (
            <p className="text-xs text-muted-foreground mt-2">
              {integration.status === "syncing" ? "Syncing..." : `Last synced ${integration.lastSync}`}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Loading skeleton for integration cards
 */
function IntegrationCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-start gap-4">
        <Skeleton className="w-11 h-11 rounded-lg flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>
    </div>
  )
}

// Providers that can be connected from the UI (credential or OAuth-based)
const credentialBasedProviders: IntegrationProvider[] = ['slack', 'gmail', 'google_ads', 'meta_ads']

export function IntegrationsHub() {
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<IntegrationCategory | "all">("all")
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [connectingProvider, setConnectingProvider] = useState<IntegrationProvider | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [dbIntegrations, setDbIntegrations] = useState<DbIntegration[]>([])

  // Fetch integration status from Supabase via /api/v1/integrations
  const fetchIntegrationStatus = async () => {
    try {
      const response = await fetch('/api/v1/integrations', {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const { data } = await response.json() as { data: DbIntegration[] | null }
      setDbIntegrations(data ?? [])
    } catch (error) {
      console.error('Failed to fetch integration status:', error)
      toast.error('Failed to fetch integration status')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchIntegrationStatus()
  }, [])

  // Handle refresh button click
  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchIntegrationStatus()
    toast.success('Refreshing integration status...')
  }

  // Handle Connect button click - Agency model: credential-based only
  async function handleConnect(provider: string) {
    // Only credential-based providers can be connected from the UI
    if (credentialBasedProviders.includes(provider as IntegrationProvider)) {
      setConnectingProvider(provider as IntegrationProvider)
      return
    }

    // For Google Workspace (gmail), show agency model message
    toast.info('Google Workspace is managed centrally. Contact your administrator to connect.')
  }

  // Handle successful credential connection
  function handleCredentialSuccess() {
    fetchIntegrationStatus()
  }

  // Build integrations list from database records + metadata
  const allIntegrations = useMemo(() => {
    const integrations: Integration[] = []

    // Map MVP providers with their database status
    const mvpProviders: IntegrationProvider[] = ['slack', 'gmail', 'google_ads', 'meta_ads']

    for (const provider of mvpProviders) {
      const metadata = integrationMetadata[provider]

      // Find database record for this provider
      const dbRecord = dbIntegrations.find(i => i.provider === provider)

      // Determine status from database is_connected field
      let status: IntegrationStatus = 'disconnected'
      if (dbRecord) {
        status = dbRecord.is_connected ? 'connected' : 'disconnected'
      }

      // Format last sync time if available
      let lastSync: string | undefined
      if (dbRecord?.last_sync_at) {
        const syncDate = new Date(dbRecord.last_sync_at)
        const now = new Date()
        const diffMs = now.getTime() - syncDate.getTime()
        const diffMins = Math.floor(diffMs / 60000)

        if (diffMins < 1) {
          lastSync = 'Just now'
        } else if (diffMins < 60) {
          lastSync = `${diffMins} min ago`
        } else if (diffMins < 1440) {
          lastSync = `${Math.floor(diffMins / 60)} hours ago`
        } else {
          lastSync = `${Math.floor(diffMins / 1440)} days ago`
        }
      }

      integrations.push({
        id: dbRecord?.id || provider,
        provider,
        name: metadata.name,
        description: metadata.description,
        icon: metadata.icon,
        color: metadata.color,
        category: metadata.category,
        status,
        lastSync,
      })
    }

    // Add future integrations (always disconnected)
    return [...integrations, ...futureIntegrations]
  }, [dbIntegrations])

  // Filter integrations by search and category
  const filteredIntegrations = useMemo(() => {
    let result = allIntegrations

    if (categoryFilter !== "all") {
      result = result.filter((i) => i.category === categoryFilter)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(query) ||
          i.description.toLowerCase().includes(query)
      )
    }

    return result
  }, [allIntegrations, searchQuery, categoryFilter])

  const connectedCount = allIntegrations.filter((i) => i.status === "connected").length
  const errorCount = allIntegrations.filter((i) => i.status === "error").length

  const categories: { id: IntegrationCategory | "all"; label: string }[] = [
    { id: "all", label: "All" },
    { id: "advertising", label: "Advertising" },
    { id: "communication", label: "Communication" },
    { id: "analytics", label: "Analytics" },
    { id: "crm", label: "CRM" },
    { id: "productivity", label: "Productivity" },
  ]

  return (
    <VerticalPageLayout
      title="Integrations"
      description="Connect your tools and services to power your workflow"
    >
      {/* Stats + Refresh */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">
              {connectedCount} connected
            </span>
          </div>
          {errorCount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-muted-foreground">
                {errorCount} with errors
              </span>
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
          Refresh Status
        </Button>
      </div>

      {/* Search and filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-secondary border-border"
          />
        </div>
        <div className="flex items-center gap-1 bg-secondary rounded-md p-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={cn(
                "px-3 py-1.5 rounded text-sm font-medium transition-colors cursor-pointer",
                categoryFilter === cat.id
                  ? "bg-background text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Integration grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <IntegrationCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredIntegrations.map((integration) => (
            <IntegrationCardComponent
              key={integration.id}
              integration={integration}
              onClick={() => setSelectedIntegration(integration)}
              onConnect={handleConnect}
            />
          ))}
        </div>
      )}

      {!isLoading && filteredIntegrations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Search className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">No integrations found</p>
        </div>
      )}

      {/* Request integration */}
      <VerticalSection
        title="Missing an integration?"
        description="Request a new integration to be added to the platform"
        className="mt-8"
      >
        <button className="inline-flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer">
          <ExternalLink className="w-4 h-4" />
          Request an integration
        </button>
      </VerticalSection>

      {/* Integration Settings Modal */}
      <IntegrationSettingsModal
        integration={selectedIntegration ? {
          id: selectedIntegration.id,
          name: selectedIntegration.name,
          provider: selectedIntegration.provider || selectedIntegration.id, // provider ID
          status: selectedIntegration.status,
          lastSync: selectedIntegration.lastSync,
          accounts: selectedIntegration.accounts,
          icon: selectedIntegration.icon,
          color: selectedIntegration.color.replace('bg-[', '').replace(']', ''),
        } : null}
        isOpen={!!selectedIntegration}
        onClose={() => setSelectedIntegration(null)}
        onRefetch={fetchIntegrationStatus}
      />

      {/* Integration Connect Modal (for credential-based integrations) */}
      <IntegrationConnectModal
        provider={connectingProvider}
        isOpen={!!connectingProvider}
        onClose={() => setConnectingProvider(null)}
        onSuccess={handleCredentialSuccess}
        icon={connectingProvider ? integrationMetadata[connectingProvider]?.icon : undefined}
        color={connectingProvider ? integrationMetadata[connectingProvider]?.color.replace('bg-[', '').replace(']', '') : undefined}
      />
    </VerticalPageLayout>
  )
}
