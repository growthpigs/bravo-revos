"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { motion, AnimatePresence, useReducedMotion } from "motion/react"
import {
  LinearKPICard,
  FirehoseFeed,
  DashboardTabs,
  type LinearKPIData,
  type FirehoseItemData,
  type DashboardTab,
  type FirehoseTab,
} from "./dashboard"
import { type MinimalClient, getOwnerData } from "@/types/client"
import { useDashboardStore } from "@/stores/dashboard-store"
import { cn } from "@/lib/utils"
import { Clock, AlertCircle, ExternalLink, X, CheckCircle2, CheckSquare, AlertTriangle, TrendingUp, Sparkles, PenLine, ArrowUpCircle, Clock3 } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface DashboardViewProps {
  clients: MinimalClient[]
  onClientClick: (client: MinimalClient) => void
  onOpenClientDetail?: (clientId: string) => void
  onSendToAI?: (prompt: string) => void
}

// Generate firehose items from real client data
// TODO: In future, this should fetch from /api/v1/dashboard/firehose for tasks, performance, etc.
function generateFirehoseItems(clients: MinimalClient[]): FirehoseItemData[] {
  const items: FirehoseItemData[] = []
  const now = new Date()

  // Generate alerts from clients with Red health
  clients.filter(c => c.health === "Red").forEach(client => {
    items.push({
      id: `alert-${client.id}`,
      severity: "critical",
      title: client.blocker || "Client at Risk",
      description: `${client.name} needs immediate attention - ${client.statusNote || "health is red"}`,
      timestamp: new Date(now.getTime() - Math.random() * 4 * 60 * 60 * 1000),
      clientName: client.name,
      clientId: client.id,
      targetTab: "alerts",
    })
  })

  // Generate warnings from clients with Yellow health
  clients.filter(c => c.health === "Yellow").forEach(client => {
    items.push({
      id: `warn-${client.id}`,
      severity: "warning",
      title: "Needs Attention",
      description: `${client.name} - ${client.statusNote || "review recommended"}`,
      timestamp: new Date(now.getTime() - Math.random() * 8 * 60 * 60 * 1000),
      clientName: client.name,
      clientId: client.id,
      targetTab: "clients",
    })
  })

  // Generate info items for clients with long time in stage (> 7 days)
  clients.filter(c => c.daysInStage > 7 && c.health !== "Red").forEach(client => {
    items.push({
      id: `stale-${client.id}`,
      severity: "info",
      title: "Long Time in Stage",
      description: `${client.name} has been in ${client.stage} for ${client.daysInStage} days`,
      timestamp: new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000),
      clientName: client.name,
      clientId: client.id,
      targetTab: "clients",
    })
  })

  // Sort by timestamp (most recent first)
  return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
}

// Tasks by Assignee Widget
function TasksByAssigneeWidget({
  firehoseItems,
  onOwnerClick
}: {
  firehoseItems: FirehoseItemData[]
  onOwnerClick: (owner: string) => void
}) {
  // Count tasks from firehose items that have assignees
  const tasksByOwner = firehoseItems.reduce((acc, item) => {
    if (item.assignee) {
      acc[item.assignee] = (acc[item.assignee] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  const totalTasks = Object.values(tasksByOwner).reduce((a, b) => a + b, 0)

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="text-sm font-medium text-foreground mb-3">Tasks by Assignee</h3>
      <div className="space-y-2">
        {totalTasks === 0 ? (
          <p className="text-xs text-muted-foreground">No tasks assigned</p>
        ) : Object.entries(tasksByOwner).slice(0, 4).map(([owner, count]) => {
          const ownerData = getOwnerData(owner)
          return (
            <button
              key={owner}
              onClick={() => onOwnerClick(owner)}
              className="flex items-center gap-2 w-full hover:bg-muted/50 rounded-md p-1.5 -mx-1.5 transition-colors cursor-pointer"
            >
              <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white", ownerData?.color || "bg-gray-500")}>
                {ownerData?.avatar || owner[0]}
              </div>
              <span className="text-xs text-muted-foreground w-14 truncate text-left">{owner.split(" ")[0]}</span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full", ownerData?.color || "bg-gray-500")}
                  style={{ width: `${totalTasks > 0 ? (count / totalTasks) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs text-foreground w-6 text-right">{count}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Client Progress Widget
function ClientProgressWidget({
  clients,
  onClientClick
}: {
  clients: MinimalClient[]
  onClientClick: (client: MinimalClient) => void
}) {
  // Calculate progress based on stage (Live = 100%, Installation = 75%, etc.)
  const getProgress = (client: MinimalClient): number => {
    const stageProgress: Record<string, number> = {
      "Live": 100,
      "Installation": 75,
      "Audit": 50,
      "Onboarding": 25,
      "Needs Support": 60, // Needs support but has progressed
    }
    return stageProgress[client.stage] || 50
  }

  // Show top 5 clients by progress
  const sortedClients = [...clients]
    .sort((a, b) => getProgress(b) - getProgress(a))
    .slice(0, 5)

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="text-sm font-medium text-foreground mb-3">Client Progress</h3>
      <div className="space-y-2">
        {sortedClients.map(client => {
          const owner = getOwnerData(client.owner)
          const progress = getProgress(client)
          return (
            <button
              key={client.id}
              onClick={() => onClientClick(client)}
              className="flex items-center gap-2 w-full hover:bg-muted/50 rounded-md p-1.5 -mx-1.5 transition-colors cursor-pointer"
            >
              <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white", owner?.color || "bg-gray-500")}>
                {client.logo}
              </div>
              <span className="text-xs text-muted-foreground w-20 truncate text-left">{client.name}</span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-foreground w-8 text-right">{progress}%</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Clients by Stage Widget
function ClientsByStageWidget({
  clients,
  onStageClick
}: {
  clients: MinimalClient[]
  onStageClick: (stage: string) => void
}) {
  const stages = [
    { name: "Live", color: "bg-emerald-500" },
    { name: "Installation", color: "bg-blue-500" },
    { name: "Onboarding", color: "bg-purple-500" },
    { name: "Audit", color: "bg-amber-500" },
    { name: "Needs Support", color: "bg-red-500" },
  ]

  const clientsByStage = clients.reduce((acc, client) => {
    acc[client.stage] = (acc[client.stage] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="text-sm font-medium text-foreground mb-3">Clients by Stage</h3>
      <div className="space-y-2">
        {stages.map(stage => (
          <button
            key={stage.name}
            onClick={() => onStageClick(stage.name)}
            className="flex items-center gap-2 w-full hover:bg-muted/50 rounded-md p-1 -mx-1 transition-colors cursor-pointer"
          >
            <span className="text-xs text-muted-foreground w-24 text-left">{stage.name}</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full", stage.color)}
                style={{ width: `${clients.length > 0 ? ((clientsByStage[stage.name] || 0) / clients.length) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs text-foreground w-4 text-right">{clientsByStage[stage.name] || 0}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// Clients by Tier Widget (vertical bar chart)
function ClientsByTierWidget({
  clients,
  onTierClick
}: {
  clients: MinimalClient[]
  onTierClick: (tier: string) => void
}) {
  // Always show all three tiers, even if empty
  const tiers = [
    { label: "Enterprise", color: "bg-blue-500" },
    { label: "Core", color: "bg-blue-400" },
    { label: "Starter", color: "bg-amber-500" },
  ]

  const clientsByTier = clients.reduce((acc, client) => {
    const tier = client.tier || "Core"
    acc[tier] = (acc[tier] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const data = tiers.map(tier => ({
    label: tier.label,
    value: clientsByTier[tier.label] || 0,
    color: tier.color
  }))

  const maxValue = Math.max(...data.map(d => d.value), 1)

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="text-sm font-medium text-foreground mb-3">Clients by Tier</h3>
      <div className="flex items-end justify-around gap-4 h-32">
        {data.map(item => (
          <button
            key={item.label}
            onClick={() => onTierClick(item.label)}
            className="flex flex-col items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="text-xs text-foreground font-medium">{item.value}</span>
            <div
              className={cn("w-12 rounded-t transition-all", item.color)}
              style={{ height: `${maxValue > 0 ? (item.value / maxValue) * 80 : 0}px`, minHeight: item.value > 0 ? '8px' : '0px' }}
            />
            <span className="text-[10px] text-muted-foreground">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// Load by Status Widget (donut chart style)
function LoadByStatusWidget({ clients }: { clients: MinimalClient[] }) {
  const healthCounts = clients.reduce((acc, client) => {
    acc[client.health] = (acc[client.health] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const total = clients.length
  const statuses = [
    { name: "Green", color: "bg-emerald-500", textColor: "text-emerald-500" },
    { name: "Yellow", color: "bg-amber-500", textColor: "text-amber-500" },
    { name: "Red", color: "bg-red-500", textColor: "text-red-500" },
    { name: "Blocked", color: "bg-purple-500", textColor: "text-purple-500" },
  ]

  // Calculate percentages for donut chart
  const segments = statuses.map(status => ({
    ...status,
    count: healthCounts[status.name] || 0,
    percent: total > 0 ? Math.round(((healthCounts[status.name] || 0) / total) * 100) : 0
  }))

  // Create SVG donut segments
  let cumulativePercent = 0
  const radius = 40
  const circumference = 2 * Math.PI * radius

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="text-sm font-medium text-foreground mb-3">Load by Status</h3>
      <div className="flex items-center gap-4">
        {/* Donut Chart */}
        <div className="relative w-24 h-24">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            {segments.map((segment) => {
              const strokeDasharray = `${(segment.percent / 100) * circumference} ${circumference}`
              const strokeDashoffset = -cumulativePercent / 100 * circumference
              cumulativePercent += segment.percent
              return (
                <circle
                  key={segment.name}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  strokeWidth="12"
                  className={segment.color.replace('bg-', 'stroke-')}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                />
              )
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-semibold text-foreground">{total}</span>
          </div>
        </div>
        {/* Legend */}
        <div className="flex-1 space-y-1">
          {segments.map(segment => (
            <div key={segment.name} className="flex items-center gap-2 text-xs">
              <span className={cn("w-2 h-2 rounded-full", segment.color)} />
              <span className="text-muted-foreground">{segment.name}</span>
              <span className={cn("ml-auto font-medium", segment.textColor)}>{segment.count} ({segment.percent}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Task Detail Drawer
function TaskDetailDrawer({
  item,
  onClose,
  onMarkComplete,
  onSendToAI
}: {
  item: FirehoseItemData
  onClose: () => void
  onMarkComplete?: (itemId: string) => void
  onSendToAI?: (prompt: string) => void
}) {
  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div className="flex flex-col h-full bg-card border-l border-b border-border">
      <header className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <CheckSquare className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">{item.title}</span>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <h3 className="text-xs text-muted-foreground mb-1">Status</h3>
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              item.severity === "critical" ? "bg-red-500/10 text-red-500 border-red-500/30" :
              item.severity === "warning" ? "bg-amber-500/10 text-amber-500 border-amber-500/30" :
              "bg-blue-500/10 text-blue-500 border-blue-500/30"
            )}
          >
            {item.severity === "critical" ? "Urgent" : item.severity === "warning" ? "Needs Review" : "Info"}
          </Badge>
        </div>

        <div>
          <h3 className="text-xs text-muted-foreground mb-1">Description</h3>
          <p className="text-sm text-foreground">{item.description}</p>
        </div>

        {item.assignee && (
          <div>
            <h3 className="text-xs text-muted-foreground mb-1">Assignee</h3>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6 bg-primary">
                <AvatarFallback className="bg-primary text-xs text-white">{item.assignee[0]}</AvatarFallback>
              </Avatar>
              <span className="text-sm">{item.assignee}</span>
            </div>
          </div>
        )}

        {item.clientName && (
          <div>
            <h3 className="text-xs text-muted-foreground mb-1">Client</h3>
            <Badge variant="secondary" className="text-xs">{item.clientName}</Badge>
          </div>
        )}

        <div>
          <h3 className="text-xs text-muted-foreground mb-1">Created</h3>
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Clock className="w-4 h-4 text-muted-foreground" />
            {formatTimestamp(item.timestamp)}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-border space-y-2">
        <Button
          variant="outline"
          className="w-full bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-600 hover:text-amber-700"
          size="sm"
          onClick={() => {
            const prompt = `Help me with task: "${item.title || 'Untitled'}" for ${item.clientName || 'client'}. ${item.description || 'No description provided'}`
            onSendToAI?.(prompt)
            onClose() // Close drawer after sending to AI
          }}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Send to AI
        </Button>
        <Button
          className="w-full"
          size="sm"
          onClick={() => onMarkComplete?.(item.id)}
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Mark Complete
        </Button>
      </div>
    </div>
  )
}

// Client Detail Drawer (Simplified for Dashboard)
function ClientDetailDrawer({
  client,
  onClose,
  onClientClick,
  onOpenClientDetail,
  onSendToAI
}: {
  client: MinimalClient
  onClose: () => void
  onClientClick?: (client: MinimalClient) => void
  onOpenClientDetail?: (clientId: string) => void
  onSendToAI?: (prompt: string) => void
}) {
  const ownerData = getOwnerData(client.owner)

  return (
    <div className="flex flex-col h-full bg-card border-l border-b border-border">
      <header className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn("w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white", ownerData?.color || "bg-gray-500")}>
            {client.logo}
          </div>
          <span className="text-sm font-medium text-foreground truncate">{client.name}</span>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <h3 className="text-xs text-muted-foreground mb-1">Stage</h3>
          <span className="text-sm text-foreground">{client.stage}</span>
        </div>

        <div>
          <h3 className="text-xs text-muted-foreground mb-1">Health</h3>
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              client.health === "Green" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" :
              client.health === "Yellow" ? "bg-amber-500/10 text-amber-500 border-amber-500/30" :
              client.health === "Red" ? "bg-red-500/10 text-red-500 border-red-500/30" :
              "bg-purple-500/10 text-purple-500 border-purple-500/30"
            )}
          >
            {client.health}
          </Badge>
        </div>

        <div>
          <h3 className="text-xs text-muted-foreground mb-1">Owner</h3>
          <div className="flex items-center gap-2">
            <Avatar className={cn("h-6 w-6", ownerData?.color || "bg-gray-500")}>
              <AvatarFallback className={cn(ownerData?.color || "bg-gray-500", "text-xs text-white")}>
                {ownerData?.avatar || client.owner[0]}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{client.owner}</span>
          </div>
        </div>

        <div>
          <h3 className="text-xs text-muted-foreground mb-1">Days in Stage</h3>
          <span className={cn(
            "text-sm tabular-nums",
            client.daysInStage > 4 ? "text-red-500 font-medium" : "text-foreground"
          )}>
            {client.daysInStage} days
          </span>
        </div>

        <div>
          <h3 className="text-xs text-muted-foreground mb-1">Tier</h3>
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              client.tier === "Enterprise" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" :
              client.tier === "Core" ? "bg-primary/10 text-primary border-primary/30" :
              "bg-muted text-muted-foreground border-border"
            )}
          >
            {client.tier || "Core"}
          </Badge>
        </div>

        {client.blocker && (
          <div>
            <h3 className="text-xs text-muted-foreground mb-1">Blocker</h3>
            <Badge variant="outline" className="text-xs bg-red-500/10 text-red-500 border-red-500/30">
              {client.blocker}
            </Badge>
          </div>
        )}

        {client.statusNote && (
          <div>
            <h3 className="text-xs text-muted-foreground mb-1">Notes</h3>
            <p className="text-sm text-foreground p-2 bg-muted/50 rounded">{client.statusNote}</p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border space-y-2">
        <Button
          variant="outline"
          className="w-full bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-600 hover:text-amber-700"
          size="sm"
          onClick={() => {
            const healthStatus = client.health === "Green" ? "healthy" : client.health === "Yellow" ? "needs attention" : client.health === "Red" ? "at risk" : "blocked"
            const prompt = `Tell me about ${client.name || 'this client'} - currently in ${client.stage || 'unknown'} stage, ${healthStatus}. ${client.statusNote ? `Notes: ${client.statusNote}` : ''} ${client.blocker ? `Blocker: ${client.blocker}` : ''}`
            onSendToAI?.(prompt)
            onClose() // Close drawer after sending to AI
          }}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Send to AI
        </Button>
        <Button
          variant="outline"
          className="w-full"
          size="sm"
          onClick={() => onOpenClientDetail?.(client.id)}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          View Full Details
        </Button>
      </div>
    </div>
  )
}

// Alert Detail Drawer - Enhanced with HGC features (Draft Response, Escalate, Snooze)
function AlertDetailDrawer({
  item,
  onClose,
  onMarkComplete,
  onSendToAI,
  onEscalate,
  onSnooze
}: {
  item: FirehoseItemData
  onClose: () => void
  onMarkComplete?: (itemId: string) => void
  onSendToAI?: (prompt: string) => void
  onEscalate?: (itemId: string) => void
  onSnooze?: (itemId: string) => void
}) {
  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div className="flex flex-col h-full bg-card border-l border-b border-border">
      <header className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">{item.title}</span>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <h3 className="text-xs text-muted-foreground mb-1">Severity</h3>
          <Badge variant="outline" className="text-xs bg-red-500/10 text-red-500 border-red-500/30">
            Critical
          </Badge>
        </div>

        <div>
          <h3 className="text-xs text-muted-foreground mb-1">Description</h3>
          <p className="text-sm text-foreground">{item.description}</p>
        </div>

        {item.clientName && (
          <div>
            <h3 className="text-xs text-muted-foreground mb-1">Affected Client</h3>
            <Badge variant="secondary" className="text-xs bg-red-500/10 text-red-600">{item.clientName}</Badge>
          </div>
        )}

        <div>
          <h3 className="text-xs text-muted-foreground mb-1">Triggered</h3>
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Clock className="w-4 h-4 text-muted-foreground" />
            {formatTimestamp(item.timestamp)}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-border space-y-2">
        {/* Draft Response - sends prompt to draft a client response */}
        <Button
          variant="outline"
          className="w-full"
          size="sm"
          onClick={() => {
            const prompt = `Draft a professional response email for ${item.clientName || 'the client'} regarding: "${item.title || 'this alert'}". Context: ${item.description || 'No additional details'}`
            onSendToAI?.(prompt)
            onClose()
          }}
        >
          <PenLine className="w-4 h-4 mr-2" />
          Draft Response
        </Button>

        {/* Send to AI - analyze the alert */}
        <Button
          variant="outline"
          className="w-full bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-600 hover:text-amber-700"
          size="sm"
          onClick={() => {
            const prompt = `Analyze this critical alert: "${item.title || 'Untitled Alert'}" affecting ${item.clientName || 'a client'}. ${item.description || 'No details provided'}`
            onSendToAI?.(prompt)
            onClose()
          }}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Send to AI
        </Button>

        {/* Action buttons row */}
        <div className="flex gap-2">
          <Button
            className="flex-1"
            size="sm"
            variant="destructive"
            onClick={() => onMarkComplete?.(item.id)}
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            Take Action
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onEscalate?.(item.id)
              onClose()
            }}
            title="Escalate to manager"
          >
            <ArrowUpCircle className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onSnooze?.(item.id)
              onClose()
            }}
            title="Snooze for 24 hours"
          >
            <Clock3 className="w-4 h-4" />
          </Button>
        </div>

        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          size="sm"
          onClick={() => onMarkComplete?.(item.id)}
        >
          Dismiss Alert
        </Button>
      </div>
    </div>
  )
}

// Performance Detail Drawer
function PerformanceDetailDrawer({
  item,
  onClose,
  onMarkComplete,
  onSendToAI
}: {
  item: FirehoseItemData
  onClose: () => void
  onMarkComplete?: (itemId: string) => void
  onSendToAI?: (prompt: string) => void
}) {
  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div className="flex flex-col h-full bg-card border-l border-b border-border">
      <header className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <TrendingUp className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">{item.title}</span>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <h3 className="text-xs text-muted-foreground mb-1">Status</h3>
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              item.severity === "critical" ? "bg-red-500/10 text-red-500 border-red-500/30" :
              item.severity === "warning" ? "bg-amber-500/10 text-amber-500 border-amber-500/30" :
              "bg-blue-500/10 text-blue-500 border-blue-500/30"
            )}
          >
            {item.severity === "critical" ? "Critical" : item.severity === "warning" ? "Warning" : "Info"}
          </Badge>
        </div>

        <div>
          <h3 className="text-xs text-muted-foreground mb-1">Description</h3>
          <p className="text-sm text-foreground">{item.description}</p>
        </div>

        {item.clientName && (
          <div>
            <h3 className="text-xs text-muted-foreground mb-1">Client</h3>
            <Badge variant="secondary" className="text-xs">{item.clientName}</Badge>
          </div>
        )}

        <div>
          <h3 className="text-xs text-muted-foreground mb-1">Detected</h3>
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Clock className="w-4 h-4 text-muted-foreground" />
            {formatTimestamp(item.timestamp)}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-border space-y-2">
        <Button
          variant="outline"
          className="w-full bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-600 hover:text-amber-700"
          size="sm"
          onClick={() => {
            const severityText = item.severity === "critical" ? "Critical issue" : item.severity === "warning" ? "Warning" : "Performance update"
            const prompt = `${severityText}: "${item.title || 'Performance Issue'}" for ${item.clientName || 'client'}. ${item.description || 'No details provided'}. What should I do?`
            onSendToAI?.(prompt)
            onClose() // Close drawer after sending to AI
          }}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Send to AI
        </Button>
        <Button
          variant="outline"
          className="w-full"
          size="sm"
          onClick={() => {
            // Open Google Ads (placeholder - needs actual client ad account URL)
            window.open(`https://ads.google.com/`, '_blank')
            onClose()
          }}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          View in Google Ads
        </Button>
      </div>
    </div>
  )
}

export function DashboardView({ clients, onClientClick, onOpenClientDetail, onSendToAI }: DashboardViewProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview")
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null)
  const [selectedPerfId, setSelectedPerfId] = useState<string | null>(null)
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set())

  // Track previous tab to clear stale selections on tab switch
  const prevTabRef = useRef<DashboardTab>(activeTab)

  // Handler for marking items complete
  const handleMarkComplete = (itemId: string) => {
    setCompletedItems(prev => new Set(prev).add(itemId))
    setSelectedTaskId(null)
    setSelectedAlertId(null)
    setSelectedPerfId(null)
  }

  // Handler for escalating items to manager
  const handleEscalate = (itemId: string) => {
    // TODO: Integrate with actual escalation API/workflow
    console.log(`[Dashboard] Escalating item ${itemId} to manager`)
    // For now, mark as handled and close drawer
    setCompletedItems(prev => new Set(prev).add(itemId))
    setSelectedAlertId(null)
  }

  // Handler for snoozing items (24 hours)
  const handleSnooze = (itemId: string) => {
    // TODO: Integrate with actual snooze API (store snooze expiry)
    console.log(`[Dashboard] Snoozing item ${itemId} for 24 hours`)
    // For now, just close the drawer (item remains visible)
    setSelectedAlertId(null)
  }

  // Dashboard store - fetches KPIs from API
  const { kpis: storeKpis, kpisLoading, fetchKPIs } = useDashboardStore()

  // Fetch KPIs on mount
  useEffect(() => {
    fetchKPIs()
  }, [fetchKPIs])

  // Reduced motion support
  const prefersReducedMotion = useReducedMotion()
  const slideTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }

  const firehoseItems = useMemo(
    () => generateFirehoseItems(clients).filter(item => !completedItems.has(item.id)),
    [clients, completedItems]
  )

  // Transform store KPIs to LinearKPIData format
  const kpis: LinearKPIData[] = useMemo(() => {
    // If API data available, use it
    if (storeKpis) {
      return [
        {
          label: storeKpis.activeOnboardings?.label ?? "active onboardings",
          value: storeKpis.activeOnboardings?.displayValue ?? storeKpis.activeOnboardings?.value ?? 0,
          change: storeKpis.activeOnboardings?.changePercent ?? 0,
          changeLabel: storeKpis.activeOnboardings?.trend === "up" ? "increase" : storeKpis.activeOnboardings?.trend === "down" ? "decrease" : "no change",
          sparklineData: [], // API doesn't provide sparkline data
        },
        {
          label: storeKpis.atRiskClients?.label ?? "at risk clients",
          value: storeKpis.atRiskClients?.displayValue ?? storeKpis.atRiskClients?.value ?? 0,
          change: storeKpis.atRiskClients?.changePercent ?? 0,
          changeLabel: storeKpis.atRiskClients?.trend === "up" ? "increase" : storeKpis.atRiskClients?.trend === "down" ? "decrease" : "no change",
          sparklineData: [],
        },
        {
          label: storeKpis.supportHoursWeek?.label ?? "support hours",
          value: storeKpis.supportHoursWeek?.displayValue ?? `${storeKpis.supportHoursWeek?.value ?? 0}h`,
          change: storeKpis.supportHoursWeek?.changePercent ?? 0,
          changeLabel: "this week",
          sparklineData: [],
        },
        {
          label: storeKpis.avgInstallTime?.label ?? "avg install time",
          value: storeKpis.avgInstallTime?.displayValue ?? `${storeKpis.avgInstallTime?.value ?? 0}d`,
          change: storeKpis.avgInstallTime?.changePercent ?? 0,
          changeLabel: storeKpis.avgInstallTime?.trend === "up" ? "slower" : storeKpis.avgInstallTime?.trend === "down" ? "faster" : "no change",
          sparklineData: [],
        },
      ]
    }

    // Fallback to client-derived data while loading
    return [
      {
        label: "total clients",
        value: clients.length,
        change: 0,
        changeLabel: kpisLoading ? "loading..." : "no data",
        sparklineData: [],
      },
      {
        label: "at risk",
        value: clients.filter(c => c.health === "Red" || c.health === "Yellow").length,
        change: 0,
        changeLabel: kpisLoading ? "loading..." : "no data",
        sparklineData: [],
      },
      {
        label: "pending resolution",
        value: clients.filter(c => (c.supportTickets || 0) > 0).length,
        change: 0,
        changeLabel: kpisLoading ? "loading..." : "no data",
        sparklineData: [],
      },
      {
        label: "healthy",
        value: clients.filter(c => c.health === "Green").length,
        change: 0,
        changeLabel: kpisLoading ? "loading..." : "no data",
        sparklineData: [],
      },
    ]
  }, [storeKpis, clients, kpisLoading])

  const handleFirehoseItemClick = (item: FirehoseItemData) => {
    // Navigate to the correct tab
    const tabMap: Record<FirehoseTab, DashboardTab> = {
      tasks: "tasks",
      clients: "clients",
      alerts: "alerts",
      performance: "performance",
    }
    setActiveTab(tabMap[item.targetTab])
    // If client item, also select the client
    if (item.clientId) {
      const client = clients.find(c => c.id === item.clientId)
      if (client) onClientClick(client)
    }
  }

  const handleStageClick = (_stage: string) => {
    setActiveTab("clients")
    // In real app, would set filter to stage
  }

  const handleOwnerClick = (_owner: string) => {
    setActiveTab("tasks")
    // In real app, would set filter to owner
  }

  const handleTierClick = (_tier: string) => {
    setActiveTab("clients")
    // In real app, would set filter to tier
  }

  // Filter clients/items for each tab
  const taskItems = firehoseItems.filter(item => item.targetTab === "tasks")
  const alertItems = firehoseItems.filter(item => item.targetTab === "alerts" || item.severity === "critical")
  const perfItems = firehoseItems.filter(item => item.targetTab === "performance")

  // Clear stale selections when switching tabs to prevent drawer content mismatch
  useEffect(() => {
    const prevTab = prevTabRef.current
    if (prevTab !== activeTab) {
      // Tab changed - clear ALL selections to ensure clean state
      setSelectedTaskId(null)
      setSelectedClientId(null)
      setSelectedAlertId(null)
      setSelectedPerfId(null)
      prevTabRef.current = activeTab
    }
  }, [activeTab])

  // Auto-select first item when switching to a tab (runs after clearing effect)
  useEffect(() => {
    if (activeTab === "tasks" && taskItems.length > 0 && !selectedTaskId) {
      setSelectedTaskId(taskItems[0].id)
    } else if (activeTab === "clients" && clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0].id)
    } else if (activeTab === "alerts" && alertItems.length > 0 && !selectedAlertId) {
      setSelectedAlertId(alertItems[0].id)
    } else if (activeTab === "performance" && perfItems.length > 0 && !selectedPerfId) {
      setSelectedPerfId(perfItems[0].id)
    }
  }, [activeTab, taskItems, clients, alertItems, perfItems, selectedTaskId, selectedClientId, selectedAlertId, selectedPerfId])

  // Get selected items for detail panels
  const selectedTask = taskItems.find(t => t.id === selectedTaskId)
  const selectedClient = clients.find(c => c.id === selectedClientId)
  const selectedAlert = alertItems.find(a => a.id === selectedAlertId)
  const selectedPerf = perfItems.find(p => p.id === selectedPerfId)

  return (
    <div className="flex flex-col pb-[150px]">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3 mb-3">
        {kpis.map((kpi, i) => (
          <LinearKPICard key={i} data={kpi} />
        ))}
      </div>

      {/* Tabs */}
      <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content - natural flow, no nested scrollers */}
      <div className="mt-3">
        {activeTab === "overview" ? (
          <div className="grid grid-cols-5 gap-3 pb-5">
            {/* Left: Firehose Feed (40%) - natural flow, no nested scroll */}
            <div className="col-span-2">
              <FirehoseFeed
                items={firehoseItems}
                onItemClick={handleFirehoseItemClick}
              />
            </div>

            {/* Right: Widgets (60%) - determines overall height */}
            <div className="col-span-3 flex flex-col gap-3">
              {/* Tasks by Assignee - top */}
              <TasksByAssigneeWidget firehoseItems={firehoseItems} onOwnerClick={handleOwnerClick} />

              {/* 2-column grid of widgets */}
              <div className="grid grid-cols-2 gap-3">
                <ClientProgressWidget clients={clients} onClientClick={onClientClick} />
                <ClientsByStageWidget clients={clients} onStageClick={handleStageClick} />
              </div>

              {/* Another 2-column grid */}
              <div className="grid grid-cols-2 gap-3">
                <LoadByStatusWidget clients={clients} />
                <ClientsByTierWidget clients={clients} onTierClick={handleTierClick} />
              </div>
            </div>
          </div>
        ) : activeTab === "tasks" ? (
          <div className="flex">
            {/* List - natural flow */}
            <div className="flex-1 pr-3 pb-5">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground mb-3">Tasks ({taskItems.length})</h3>
                {taskItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pending tasks</p>
                ) : (
                  taskItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedTaskId(item.id)}
                      className={cn(
                        "w-full text-left bg-card border rounded-lg p-3 transition-colors cursor-pointer",
                        selectedTaskId === item.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "w-2 h-2 rounded-full",
                          item.severity === "critical" ? "bg-red-500" :
                          item.severity === "warning" ? "bg-amber-500" : "bg-blue-500"
                        )} />
                        <span className="text-sm font-medium text-foreground">{item.title}</span>
                        {item.assignee && (
                          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">@{item.assignee}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
            {/* Drawer */}
            <AnimatePresence mode="wait">
              {selectedTask && (
                <motion.div
                  key="task-drawer"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 384, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={slideTransition}
                  className="shrink-0 overflow-hidden"
                >
                  <TaskDetailDrawer
                    item={selectedTask}
                    onClose={() => setSelectedTaskId(null)}
                    onMarkComplete={handleMarkComplete}
                    onSendToAI={onSendToAI}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : activeTab === "clients" ? (
          <div className="flex">
            {/* List - natural flow */}
            <div className="flex-1 pr-3 pb-5">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground mb-3">All Clients ({clients.length})</h3>
                {clients.map(client => {
                  const owner = getOwnerData(client.owner)
                  return (
                    <button
                      key={client.id}
                      onClick={() => setSelectedClientId(client.id)}
                      className={cn(
                        "w-full text-left bg-card border rounded-lg p-3 transition-colors cursor-pointer",
                        selectedClientId === client.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm text-white", owner?.color || "bg-gray-500")}>
                          {client.logo}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-foreground">{client.name}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{client.stage}</span>
                            <span>•</span>
                            <span className={cn(
                              client.health === "Red" ? "text-red-500" :
                              client.health === "Yellow" ? "text-amber-500" :
                              client.health === "Blocked" ? "text-purple-500" : "text-emerald-500"
                            )}>{client.health}</span>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">{client.daysInStage}d</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
            {/* Drawer */}
            <AnimatePresence mode="wait">
              {selectedClient && (
                <motion.div
                  key="client-drawer"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 384, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={slideTransition}
                  className="shrink-0 overflow-hidden"
                >
                  <ClientDetailDrawer
                    client={selectedClient}
                    onClose={() => setSelectedClientId(null)}
                    onClientClick={onClientClick}
                    onOpenClientDetail={onOpenClientDetail}
                    onSendToAI={onSendToAI}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : activeTab === "alerts" ? (
          <div className="flex">
            {/* List - natural flow */}
            <div className="flex-1 pr-3 pb-5">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground mb-3">Alerts ({alertItems.length})</h3>
                {alertItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active alerts</p>
                ) : (
                  alertItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedAlertId(item.id)}
                      className={cn(
                        "w-full text-left bg-card border rounded-lg p-3 transition-colors cursor-pointer",
                        selectedAlertId === item.id
                          ? "border-red-500 bg-red-500/5"
                          : "border-red-500/30 hover:border-red-500/50"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-sm font-medium text-foreground">{item.title}</span>
                        {item.clientName && (
                          <span className="text-xs bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded">{item.clientName}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
            {/* Drawer */}
            <AnimatePresence mode="wait">
              {selectedAlert && (
                <motion.div
                  key="alert-drawer"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 384, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={slideTransition}
                  className="shrink-0 overflow-hidden"
                >
                  <AlertDetailDrawer
                    item={selectedAlert}
                    onClose={() => setSelectedAlertId(null)}
                    onMarkComplete={handleMarkComplete}
                    onSendToAI={onSendToAI}
                    onEscalate={handleEscalate}
                    onSnooze={handleSnooze}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : activeTab === "performance" ? (
          <div className="flex">
            {/* List - natural flow */}
            <div className="flex-1 pr-3 pb-5">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground mb-3">Performance ({perfItems.length})</h3>
                {perfItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No performance alerts</p>
                ) : (
                  perfItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedPerfId(item.id)}
                      className={cn(
                        "w-full text-left bg-card border rounded-lg p-3 transition-colors cursor-pointer",
                        selectedPerfId === item.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "w-2 h-2 rounded-full",
                          item.severity === "critical" ? "bg-red-500" :
                          item.severity === "warning" ? "bg-amber-500" : "bg-blue-500"
                        )} />
                        <span className="text-sm font-medium text-foreground">{item.title}</span>
                        {item.clientName && (
                          <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{item.clientName}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
            {/* Drawer */}
            <AnimatePresence mode="wait">
              {selectedPerf && (
                <motion.div
                  key="perf-drawer"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 384, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={slideTransition}
                  className="shrink-0 overflow-hidden"
                >
                  <PerformanceDetailDrawer
                    item={selectedPerf}
                    onClose={() => setSelectedPerfId(null)}
                    onMarkComplete={handleMarkComplete}
                    onSendToAI={onSendToAI}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : null}
      </div>

    </div>
  )
}
