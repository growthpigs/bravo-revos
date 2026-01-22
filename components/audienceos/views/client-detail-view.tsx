"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  Circle,
  TrendingUp,
  TrendingDown,
  Minus,
  Send,
  Sparkles,
  RefreshCw,
  Play,
  Check,
  Share2,
} from "lucide-react"
import { owners } from "@/lib/constants/pipeline"
import { cn } from "@/lib/utils"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { useClientDetail } from "@/hooks/use-client-detail"
import { useAuth } from "@/hooks/use-auth"

interface ClientDetailViewProps {
  clientId: string
  onBack: () => void
}

/**
 * ClientDetailView - Renders full client details within the app shell
 * This component is designed to be used within LinearShell, preserving navigation context
 */
export function ClientDetailView({ clientId, onBack }: ClientDetailViewProps) {
  // Auth and detailed client data
  useAuth() // Ensure auth context is initialized
  const { client: detailedClient, isLoading, error } = useClientDetail(clientId)

  // Transform detailed client to UI format
  const client = detailedClient ? {
    id: detailedClient.id,
    name: detailedClient.name,
    logo: detailedClient.name.substring(0, 2).toUpperCase(),
    stage: detailedClient.stage,
    health: detailedClient.health_status === 'green' ? 'Green' : detailedClient.health_status === 'yellow' ? 'Yellow' : 'Red',
    owner: detailedClient.assignments?.[0]?.user ?
      `${detailedClient.assignments[0].user.first_name} ${detailedClient.assignments[0].user.last_name}` :
      'Unassigned',
    daysInStage: detailedClient.days_in_stage,
    tier: "Core" as const,
    // Real data from API
    tasks: detailedClient.tasks || [],
    tickets: detailedClient.tickets || [],
    communications: detailedClient.communications || [],
    stageEvents: detailedClient.stage_events || [],
    // Extended fields
    contact_email: detailedClient.contact_email,
    contact_name: detailedClient.contact_name,
    notes: detailedClient.notes,
    tags: detailedClient.tags,
    // Placeholder fields - will be fetched from dedicated APIs later
    metaAds: null as { spend: number; roas: number; cpa: number; trend: 'up' | 'down' | 'flat' } | null,
    googleAds: null as { impressions: number; clicks: number; conversions: number; trend: 'up' | 'down' | 'flat' } | null,
    performanceData: [] as { date: string; adSpend: number; roas: number }[],
    onboardingData: null as { shopifyUrl: string; gtmContainerId: string; metaPixelId: string; klaviyoApiKey: string } | null,
  } : null

  const [message, setMessage] = useState("")
  const [accessStatus, setAccessStatus] = useState({
    meta: false,
    gtm: false,
    shopify: false,
  })

  // Show loading state while fetching
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading client...</div>
      </div>
    )
  }

  // Show error or not found after loading completes
  if (error || !client) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h1 className="text-lg font-semibold text-foreground mb-4">
            {error?.includes('sign in') ? 'Authentication Required' : 'Client Not Found'}
          </h1>
          <p className="text-sm text-muted-foreground mb-4">
            {error || "This client doesn't exist or you don't have access."}
          </p>
          <Button onClick={onBack}>Return to Clients</Button>
        </Card>
      </div>
    )
  }

  // Compute ticket stats from real data
  const openTickets = client.tickets.filter(t => t.status !== 'resolved' && t.status !== 'closed').length
  const resolvedTickets = client.tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length

  // Format relative time for timeline
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins} minutes ago`
    if (diffHours < 24) return `${diffHours} hours ago`
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  const owner = owners.find((o) => o.name === client.owner)

  const handleVerifyAccess = (platform: "meta" | "gtm" | "shopify") => {
    setAccessStatus((prev) => ({ ...prev, [platform]: true }))
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>

              <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center">
                <span className="text-[11px] font-bold text-secondary-foreground">{client.logo}</span>
              </div>

              <div>
                <h1 className="text-lg font-semibold text-foreground">{client.name}</h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant="outline" className="text-[9px] px-1 py-0">
                    {client.tier}
                  </Badge>
                  <Badge variant="outline" className="text-[9px] px-1 py-0">
                    {client.stage}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{client.daysInStage} days in stage</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Avatar className={cn("h-8 w-8", owner?.color)}>
                <AvatarFallback className={cn(owner?.color, "text-xs text-white")}>{owner?.avatar}</AvatarFallback>
              </Avatar>
              <span className="text-[10px] text-muted-foreground">Owner: {client.owner}</span>

              <Button variant="outline" size="sm" className="ml-4 gap-2 bg-transparent">
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <ExternalLink className="h-4 w-4" />
                Open Shopify
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8 pb-[150px]">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="comms">Communications</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="media">Media & Files</TabsTrigger>
            <TabsTrigger value="techsetup">Tech Setup</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Status Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Health Status</p>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full",
                      client.health === "Green"
                        ? "bg-emerald-500"
                        : client.health === "Yellow"
                          ? "bg-amber-500"
                          : client.health === "Red"
                            ? "bg-rose-500"
                            : "bg-purple-500",
                    )}
                  />
                  <p className="text-lg font-semibold text-foreground">{client.health}</p>
                </div>
              </Card>

              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Support Tickets</p>
                <p className="text-lg font-semibold text-foreground">{client.tickets.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {openTickets} open, {resolvedTickets} resolved
                </p>
              </Card>

              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Last Contact</p>
                {client.communications.length > 0 ? (
                  <>
                    <p className="text-lg font-semibold text-foreground">
                      {formatTimeAgo(client.communications.sort((a, b) =>
                        new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
                      )[0].received_at)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 capitalize">
                      {client.communications.sort((a, b) =>
                        new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
                      )[0].platform} message
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-semibold text-foreground">No contact</p>
                    <p className="text-xs text-muted-foreground mt-1">No messages yet</p>
                  </>
                )}
              </Card>

              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Install Progress</p>
                <p className="text-lg font-semibold text-foreground">75%</p>
                <p className="text-xs text-muted-foreground mt-1">3 of 4 steps complete</p>
              </Card>
            </div>

            {/* Timeline */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Client Timeline</h3>
              {client.stageEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No stage history yet.</p>
                  <p className="text-xs mt-1">Stage transitions will appear here as the client progresses.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {client.stageEvents
                    .sort((a, b) => new Date(b.moved_at).getTime() - new Date(a.moved_at).getTime())
                    .map((event, index) => {
                      // Color based on stage
                      const stageColors: Record<string, string> = {
                        'Lead': 'bg-slate-500',
                        'Onboarding': 'bg-blue-500',
                        'Installation': 'bg-purple-500',
                        'Audit': 'bg-amber-500',
                        'Live': 'bg-emerald-500',
                        'Needs Support': 'bg-rose-500',
                        'Off-Boarding': 'bg-zinc-500',
                      }
                      const dotColor = stageColors[event.to_stage] || 'bg-muted'
                      const isLast = index === client.stageEvents.length - 1

                      return (
                        <div key={event.id} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={cn("w-3 h-3 rounded-full", dotColor)} />
                            {!isLast && <div className="w-0.5 h-full bg-border" />}
                          </div>
                          <div className={cn("flex-1", !isLast && "pb-4")}>
                            <p className="text-sm font-medium text-foreground">
                              {event.from_stage
                                ? `Moved from ${event.from_stage} to ${event.to_stage}`
                                : `Started at ${event.to_stage}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatTimeAgo(event.moved_at)}
                              {event.moved_by && ` by ${event.moved_by.first_name}`}
                            </p>
                            {event.notes && (
                              <p className="text-xs text-muted-foreground mt-1 italic">{event.notes}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="comms" className="space-y-4">
            {/* Full communications tab content */}
            <Card className="p-6">
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {client.communications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No communications yet.</p>
                    <p className="text-xs mt-1">Connect Slack or Gmail to sync messages.</p>
                  </div>
                ) : (
                  client.communications
                    .sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime())
                    .map((comm) => (
                      <div
                        key={comm.id}
                        className={cn(
                          "p-4 rounded-lg border",
                          comm.platform === 'slack' ? "bg-purple-500/10 border-purple-500/30" :
                          comm.platform === 'email' ? "bg-blue-500/10 border-blue-500/30" :
                          "bg-secondary/50 border-border",
                        )}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                            {comm.platform}
                          </Badge>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {formatTimeAgo(comm.received_at)}
                          </span>
                        </div>
                        {comm.subject && (
                          <p className="text-sm font-medium text-foreground mb-1">{comm.subject}</p>
                        )}
                        <p className="text-sm text-muted-foreground line-clamp-2">{comm.content}</p>
                      </div>
                    ))
                )}
              </div>

              <div className="space-y-3 pt-4 border-t border-border mt-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex-1"
                  />
                  <Button size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="outline" className="w-full bg-transparent">
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI Draft Reply
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            {/* Full tasks content */}
            <Card className="p-6">
              {client.tasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No tasks yet.</p>
                  <p className="text-xs mt-1">Tasks will appear as client progresses through stages.</p>
                </div>
              ) : (
                Array.from(new Set(client.tasks.map((t) => t.stage || 'General'))).map((stage) => (
                  <div key={stage} className="mb-6">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">{stage}</h4>
                    <div className="space-y-2">
                      {client.tasks
                        .filter((t) => (t.stage || 'General') === stage)
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center justify-between gap-3 p-4 rounded-lg bg-secondary/30 border border-border"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              {task.is_completed ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                              ) : (
                                <Circle className="h-5 w-5 text-muted-foreground" />
                              )}
                              <div className="flex flex-col">
                                <span
                                  className={cn(
                                    "text-sm",
                                    task.is_completed ? "text-muted-foreground line-through" : "text-foreground",
                                  )}
                                >
                                  {task.name}
                                </span>
                                {task.description && (
                                  <span className="text-xs text-muted-foreground">{task.description}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {task.assigned_to && (
                                <Badge variant="outline" className="text-xs">
                                  {task.assigned_to}
                                </Badge>
                              )}
                              {task.due_date && (
                                <span className="text-xs text-muted-foreground">
                                  {new Date(task.due_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))
              )}
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            {/* Performance charts and metrics */}
            {!client.metaAds && !client.googleAds && client.performanceData.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-sm text-muted-foreground">No performance data yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Connect Google Ads or Meta to sync performance metrics.</p>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {client.metaAds && (
                    <Card className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-foreground">Meta Ads</h4>
                        {client.metaAds.trend === "up" ? (
                          <TrendingUp className="h-4 w-4 text-emerald-500" />
                        ) : client.metaAds.trend === "down" ? (
                          <TrendingDown className="h-4 w-4 text-rose-500" />
                        ) : (
                          <Minus className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Spend</p>
                          <p className="text-lg font-semibold text-foreground">${client.metaAds.spend.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">ROAS</p>
                          <p
                            className={cn(
                              "text-lg font-semibold",
                              client.metaAds.roas >= 2 ? "text-emerald-400" : "text-rose-400",
                            )}
                          >
                            {client.metaAds.roas}x
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">CPA</p>
                          <p className="text-lg font-semibold text-foreground">${client.metaAds.cpa}</p>
                        </div>
                      </div>
                    </Card>
                  )}

                  {client.googleAds && (
                    <Card className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-foreground">Google Ads</h4>
                        {client.googleAds.trend === "up" ? (
                          <TrendingUp className="h-4 w-4 text-emerald-500" />
                        ) : client.googleAds.trend === "down" ? (
                          <TrendingDown className="h-4 w-4 text-rose-500" />
                        ) : (
                          <Minus className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Impressions</p>
                          <p className="text-lg font-semibold text-foreground">
                            {(client.googleAds.impressions / 1000).toFixed(0)}k
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Clicks</p>
                          <p className="text-lg font-semibold text-foreground">
                            {(client.googleAds.clicks / 1000).toFixed(1)}k
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Conversions</p>
                          <p className="text-lg font-semibold text-foreground">{client.googleAds.conversions}</p>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>

                {client.performanceData.length > 0 && (
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-medium text-foreground">Performance Over Time</h4>
                      <Button variant="outline" size="sm">
                        <RefreshCw className="h-3.5 w-3.5 mr-2" />
                        Sync Now
                      </Button>
                    </div>
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={client.performanceData}>
                          <defs>
                            <linearGradient id="adSpendGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="roasGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                          <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 10 }} />
                          <YAxis yAxisId="left" tick={{ fill: "#71717a", fontSize: 10 }} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fill: "#71717a", fontSize: 10 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#18181b",
                              border: "1px solid #27272a",
                              borderRadius: "8px",
                            }}
                          />
                          <Legend />
                          <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="adSpend"
                            stroke="#10b981"
                            fill="url(#adSpendGradient)"
                            name="Ad Spend"
                          />
                          <Area
                            yAxisId="right"
                            type="monotone"
                            dataKey="roas"
                            stroke="#3b82f6"
                            fill="url(#roasGradient)"
                            name="ROAS"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="media" className="space-y-4">
            {/* Media and recordings */}
            <Card className="p-6">
              <h4 className="text-sm font-medium text-foreground mb-4">Zoom Recordings</h4>
              <div className="space-y-3">
                {/* Sample recordings */}
                <div className="p-4 rounded-lg bg-secondary/30 border border-border space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Kickoff Call Recording</p>
                      <p className="text-xs text-muted-foreground">Dec 1, 2024 - 45:32</p>
                    </div>
                    <Button size="sm" variant="outline">
                      <Play className="h-3.5 w-3.5 mr-1" />
                      Play
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="techsetup" className="space-y-4">
            {/* Tech setup details */}
            {client.onboardingData ? (
              <>
                <Card className="p-6 space-y-4">
                  <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    Onboarding Submission
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-secondary/30 border border-border rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Shopify Store URL</p>
                      <p className="text-sm font-mono text-foreground">{client.onboardingData.shopifyUrl}</p>
                    </div>
                    <div className="p-3 bg-secondary/30 border border-border rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">GTM Container ID</p>
                      <p className="text-sm font-mono text-foreground">{client.onboardingData.gtmContainerId}</p>
                    </div>
                    <div className="p-3 bg-secondary/30 border border-border rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Meta Pixel ID</p>
                      <p className="text-sm font-mono text-foreground">{client.onboardingData.metaPixelId}</p>
                    </div>
                    <div className="p-3 bg-secondary/30 border border-border rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Klaviyo API Key</p>
                      <p className="text-sm font-mono text-foreground">{client.onboardingData.klaviyoApiKey}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 space-y-4">
                  <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">Access Status</h4>
                  <div className="space-y-2">
                    {([
                      { key: "meta", label: "Meta Business Manager" },
                      { key: "gtm", label: "Google Tag Manager" },
                      { key: "shopify", label: "Shopify Staff Account" },
                    ] as const).map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between p-4 bg-secondary/30 border border-border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              accessStatus[item.key]
                                ? "bg-emerald-500"
                                : "bg-amber-500 animate-pulse"
                            }`}
                          />
                          <span className="text-sm text-foreground">{item.label}</span>
                        </div>
                        {!accessStatus[item.key] ? (
                          <Button size="sm" variant="outline" onClick={() => handleVerifyAccess(item.key)}>
                            Verify Access
                          </Button>
                        ) : (
                          <span className="text-xs text-emerald-400 flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            Verified
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            ) : (
              <Card className="p-8 text-center">
                <p className="text-sm text-muted-foreground">No onboarding data submitted yet.</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
