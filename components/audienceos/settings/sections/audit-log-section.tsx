"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSettingsStore } from "@/stores/settings-store"
import {
  Shield,
  Search,
  Calendar,
  User,
  Settings,
  Users,
  Bot,
  Bell,
  Workflow,
  ChevronRight,
  Loader2,
} from "lucide-react"
import type { AuditLogEntry } from "@/types/settings"

// Mock audit log data
const MOCK_AUDIT_LOG: AuditLogEntry[] = [
  {
    id: "1",
    agency_id: "demo",
    user_id: "1",
    action: "update",
    entity_type: "agency_settings",
    entity_id: "demo",
    changes: {
      name: { before: "Acme Agency", after: "Acme Marketing Agency" },
    },
    ip_address: "192.168.1.1",
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    user_name: "Brent CEO",
  },
  {
    id: "2",
    agency_id: "demo",
    user_id: "1",
    action: "update",
    entity_type: "pipeline_stages",
    entity_id: "demo",
    changes: {
      stages: {
        before: ["Onboarding", "Installation", "Live", "Off-Boarding"],
        after: ["Onboarding", "Installation", "Audit", "Live", "Needs Support", "Off-Boarding"],
      },
    },
    ip_address: "192.168.1.1",
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    user_name: "Brent CEO",
  },
  {
    id: "3",
    agency_id: "demo",
    user_id: "1",
    action: "invite",
    entity_type: "user_invitation",
    entity_id: "inv-1",
    changes: {
      email: { before: null, after: "newuser@example.com" },
      role: { before: null, after: "user" },
    },
    ip_address: "192.168.1.1",
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    user_name: "Brent CEO",
  },
  {
    id: "4",
    agency_id: "demo",
    user_id: "2",
    action: "update",
    entity_type: "user_preferences",
    entity_id: "2",
    changes: {
      digest_mode: { before: false, after: true },
    },
    ip_address: "192.168.1.2",
    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    user_name: "Roderic Andrews",
  },
  {
    id: "5",
    agency_id: "demo",
    user_id: "1",
    action: "update",
    entity_type: "ai_configuration",
    entity_id: "demo",
    changes: {
      response_tone: { before: "casual", after: "professional" },
    },
    ip_address: "192.168.1.1",
    created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    user_name: "Brent CEO",
  },
]

// Map entity types to icons
const ENTITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  agency_settings: Settings,
  pipeline_stages: Workflow,
  user_invitation: Users,
  user_preferences: Bell,
  ai_configuration: Bot,
  user: User,
}

// Map actions to badge variants
function getActionBadge(action: string): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  switch (action) {
    case "create":
      return { label: "Created", variant: "default" }
    case "update":
      return { label: "Updated", variant: "secondary" }
    case "delete":
      return { label: "Deleted", variant: "destructive" }
    case "invite":
      return { label: "Invited", variant: "outline" }
    default:
      return { label: action, variant: "secondary" }
  }
}

function formatEntityType(type: string): string {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return "Just now"
  if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`
  return date.toLocaleDateString()
}

function formatChanges(changes: Record<string, { before: unknown; after: unknown }>): string {
  const entries = Object.entries(changes)
  if (entries.length === 0) return ""

  return entries
    .map(([key, { before, after }]) => {
      const formattedKey = key.replace(/_/g, " ")
      if (Array.isArray(before) || Array.isArray(after)) {
        return `${formattedKey} updated`
      }
      if (before === null) {
        return `${formattedKey}: ${after}`
      }
      return `${formattedKey}: ${before} → ${after}`
    })
    .join(", ")
}

export function AuditLogSection() {
  const { auditLog, setAuditLog, isLoadingAuditLog, setLoadingAuditLog: _setLoadingAuditLog } = useSettingsStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [_selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null)

  // Load mock data
  useEffect(() => {
    setAuditLog(MOCK_AUDIT_LOG)
  }, [setAuditLog])

  // Filter entries
  const filteredEntries = auditLog.filter((entry) => {
    const search = searchQuery.toLowerCase()
    return (
      entry.user_name?.toLowerCase().includes(search) ||
      entry.entity_type.toLowerCase().includes(search) ||
      entry.action.toLowerCase().includes(search)
    )
  })

  if (isLoadingAuditLog) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div>
        <h2 className="text-[12px] font-medium text-foreground flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5" />
          Audit Log
        </h2>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          View history of all settings changes
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Search by user, action, or entity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 bg-secondary border-border h-7 text-[11px]"
          />
        </div>
        <Button variant="outline" className="gap-1.5 h-7 text-[10px] bg-transparent">
          <Calendar className="h-3 w-3" />
          Filter by Date
        </Button>
      </div>

      {/* Audit Log Entries */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-[11px] font-medium">
            Recent Changes ({filteredEntries.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-3 pb-3">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-6 text-[11px] text-muted-foreground">
              No audit log entries found
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredEntries.map((entry) => {
                const Icon = ENTITY_ICONS[entry.entity_type] || Settings
                const actionBadge = getActionBadge(entry.action)

                return (
                  <div
                    key={entry.id}
                    className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0 group cursor-pointer hover:bg-muted/30 -mx-2 px-2 rounded-md transition-colors"
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[11px] font-medium">{entry.user_name}</span>
                        <Badge variant={actionBadge.variant} className="text-[9px] px-1 py-0">
                          {actionBadge.label}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {formatEntityType(entry.entity_type)}
                        </span>
                      </div>

                      <p className="text-[10px] text-muted-foreground truncate">
                        {formatChanges(entry.changes)}
                      </p>

                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        {formatRelativeTime(entry.created_at)}
                        {entry.ip_address && ` • ${entry.ip_address}`}
                      </p>
                    </div>

                    <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-2" />
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Load More */}
      {filteredEntries.length > 0 && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" className="h-7 text-[10px] bg-transparent">
            Load More
          </Button>
        </div>
      )}
    </div>
  )
}
