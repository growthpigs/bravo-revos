"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { ExternalLink } from "lucide-react"
import {
  Sparkles,
  Send,
  CheckCircle2,
  Circle,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Play,
  FileText,
  Video,
  Check,
} from "lucide-react"
import { type Client, type ZoomRecording } from "@/types/pipeline"
import { owners } from "@/lib/constants/pipeline"
import { cn } from "@/lib/utils"
import { Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface ClientDetailSheetProps {
  client: Client | null
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTab?: string
}

function SlackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
    </svg>
  )
}

function GmailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
    </svg>
  )
}

function getHealthColor(health: string) {
  switch (health) {
    case "Green":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
    case "Yellow":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30"
    case "Red":
      return "bg-rose-500/20 text-rose-400 border-rose-500/30"
    case "Blocked":
      return "bg-purple-500/20 text-purple-400 border-purple-500/30"
    default:
      return "bg-muted text-muted-foreground"
  }
}

function getTierBadgeStyle(tier: string) {
  switch (tier) {
    case "Enterprise":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
    case "Core":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30"
    case "Starter":
      return "bg-slate-500/20 text-slate-400 border-slate-500/30"
    default:
      return "bg-muted text-muted-foreground"
  }
}

function getAiTagColor(tag: string) {
  switch (tag.toLowerCase()) {
    case "urgent":
      return "bg-rose-500/20 text-rose-400"
    case "bug":
      return "bg-amber-500/20 text-amber-400"
    case "blocker":
      return "bg-purple-500/20 text-purple-400"
    case "question":
      return "bg-blue-500/20 text-blue-400"
    case "feedback":
      return "bg-emerald-500/20 text-emerald-400"
    default:
      return "bg-secondary text-secondary-foreground"
  }
}

function getTrendIcon(trend: string) {
  switch (trend) {
    case "up":
      return <TrendingUp className="h-4 w-4 text-emerald-500" />
    case "down":
      return <TrendingDown className="h-4 w-4 text-rose-500" />
    default:
      return <Minus className="h-4 w-4 text-muted-foreground" />
  }
}

export function ClientDetailSheet({ client, open, onOpenChange, defaultTab = "overview" }: ClientDetailSheetProps) {
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [message, setMessage] = useState("")
  const [accessStatus, setAccessStatus] = useState({
    meta: false,
    gtm: false,
    shopify: false,
  })

  useEffect(() => {
    if (client) {
      setActiveTab(defaultTab)
      if (client.onboardingData) {
        setAccessStatus({
          meta: client.onboardingData.accessGrants.meta,
          gtm: client.onboardingData.accessGrants.gtm,
          shopify: client.onboardingData.accessGrants.shopify,
        })
      }
    }
  }, [client, defaultTab])

  const owner = owners.find((o) => o.name === client?.owner)
  // TODO: Replace with real recordings API when available
  const recordings: ZoomRecording[] = []

  const handleVerifyAccess = (platform: "meta" | "gtm" | "shopify") => {
    setAccessStatus((prev) => ({ ...prev, [platform]: true }))
    // TODO: Implement platform verification API call
  }

  const handleGenerateInstallPlan = () => {
    // TODO: Implement AI plan generation
    alert("AI is analyzing your tech stack and will generate implementation steps. Check back in a few minutes!")
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[600px] sm:max-w-[600px] p-0 overflow-y-auto bg-background">
        {client ? (
          <div className="flex flex-col h-full">
            <SheetHeader className="px-6 py-4 border-b border-border sticky top-0 bg-background z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-secondary-foreground">{client.logo}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <SheetTitle className="text-lg text-foreground truncate">{client.name}</SheetTitle>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {client.stage}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {client.tier}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Link href={`/client/${client.id}`}>
                  <Button variant="outline" size="sm" className="ml-2 gap-2 shrink-0 bg-transparent">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Full Page
                  </Button>
                </Link>
              </div>
            </SheetHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
              <TabsList className="grid w-full grid-cols-6 bg-secondary">
                <TabsTrigger
                  value="overview"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="comms"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs"
                >
                  Comms
                </TabsTrigger>
                <TabsTrigger
                  value="tasks"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs"
                >
                  Tasks
                </TabsTrigger>
                <TabsTrigger
                  value="performance"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs"
                >
                  Perf
                </TabsTrigger>
                <TabsTrigger
                  value="media"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs"
                >
                  Media
                </TabsTrigger>
                <TabsTrigger
                  value="techsetup"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs"
                >
                  Tech
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6 space-y-6 px-1">
                {/* Client Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Health Status</p>
                    <Badge variant="outline" className={cn("text-sm", getHealthColor(client.health))}>
                      {client.health}
                    </Badge>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Days in Stage</p>
                    <p className="text-lg font-bold text-foreground">{client.daysInStage}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Owner</p>
                    <div className="flex items-center gap-2">
                      <Avatar className={cn("h-6 w-6", owner?.color)}>
                        <AvatarFallback className={cn(owner?.color, "text-xs text-white")}>
                          {owner?.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-foreground">{client.owner}</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Tier</p>
                    <Badge variant="outline" className={cn("text-sm", getTierBadgeStyle(client.tier))}>
                      {client.tier}
                    </Badge>
                  </div>
                </div>

                {/* Stage History Timeline */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Stage History
                  </h4>
                  <div className="relative pl-6 space-y-4">
                    {/* Timeline line */}
                    <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />

                    {/* Current stage */}
                    <div className="relative flex items-start gap-3">
                      <div className="absolute left-[-15px] w-3 h-3 rounded-full bg-primary ring-4 ring-background" />
                      <div className="flex-1 p-3 rounded-lg bg-primary/10 border border-primary/30">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">{client.stage}</span>
                          <span className="text-xs text-muted-foreground">Current</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {client.daysInStage} {client.daysInStage === 1 ? "day" : "days"} ago
                        </p>
                      </div>
                    </div>

                    {/* Mock previous stages - in production would come from stage_event table */}
                    {client.stage !== "Onboarding" && (
                      <div className="relative flex items-start gap-3">
                        <div className="absolute left-[-15px] w-3 h-3 rounded-full bg-muted ring-4 ring-background" />
                        <div className="flex-1 p-3 rounded-lg bg-secondary/30 border border-border">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">
                              {client.stage === "Installation" ? "Onboarding" :
                               client.stage === "Audit" ? "Installation" :
                               client.stage === "Live" ? "Audit" :
                               client.stage === "Needs Support" ? "Live" :
                               "Previous Stage"}
                            </span>
                            <span className="text-xs text-muted-foreground">Completed</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Moved by {client.owner}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Initial onboarding */}
                    <div className="relative flex items-start gap-3">
                      <div className="absolute left-[-15px] w-3 h-3 rounded-full bg-muted ring-4 ring-background" />
                      <div className="flex-1 p-3 rounded-lg bg-secondary/30 border border-border">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">Client Created</span>
                          <span className="text-xs text-muted-foreground">Initial</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Added to pipeline
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Note */}
                {client.statusNote && (
                  <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <h4 className="text-sm font-medium text-amber-400 mb-1">Status Note</h4>
                    <p className="text-sm text-foreground">{client.statusNote}</p>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                    <Send className="h-3.5 w-3.5 mr-2" />
                    Send Message
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                    <Sparkles className="h-3.5 w-3.5 mr-2" />
                    AI Summary
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="comms" className="mt-6 space-y-4">
                <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                  {client.comms.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No messages yet</p>
                  ) : (
                    client.comms.map((comm) => (
                      <div
                        key={comm.id}
                        className={cn(
                          "p-3 rounded-lg border",
                          comm.isInternal ? "bg-secondary/50 border-border" : "bg-blue-500/10 border-blue-500/30",
                        )}
                      >
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {comm.source === "slack" ? (
                            <SlackIcon className="h-4 w-4 text-[#4A154B] shrink-0" />
                          ) : (
                            <GmailIcon className="h-4 w-4 text-rose-500 shrink-0" />
                          )}
                          <Avatar className="h-6 w-6 bg-secondary shrink-0">
                            <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                              {comm.avatar}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-foreground">{comm.sender}</span>
                          {comm.isInternal && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              Internal
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto">{comm.timestamp}</span>
                        </div>
                        {comm.channel && (
                          <p className="text-xs text-muted-foreground mb-1 pl-6 truncate">{comm.channel}</p>
                        )}
                        {comm.subject && (
                          <p className="text-xs text-muted-foreground mb-1 pl-6 truncate">Subject: {comm.subject}</p>
                        )}
                        <p className="text-sm text-muted-foreground pl-6 break-words">{comm.message}</p>
                        {comm.aiTags && comm.aiTags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2 pl-6">
                            {comm.aiTags.map((tag) => (
                              <Badge key={tag} className={cn("text-[10px] px-1.5 py-0", getAiTagColor(tag))}>
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-3 pt-4 border-t border-border">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="flex-1 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                    />
                    <Button size="icon" className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 bg-transparent"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI Draft Reply
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="tasks" className="mt-6 space-y-4">
                <div className="space-y-1">
                  {Array.from(new Set(client.tasks.map((t) => t.stage))).map((stage) => (
                    <div key={stage} className="mb-4">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        {stage}
                      </h4>
                      <div className="space-y-2">
                        {client.tasks
                          .filter((t) => t.stage === stage)
                          .map((task) => {
                            return (
                              <div
                                key={task.id}
                                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-secondary/30 border border-border"
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  {task.completed ? (
                                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                                  ) : (
                                    <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                                  )}
                                  <span
                                    className={cn(
                                      "text-sm truncate",
                                      task.completed ? "text-muted-foreground line-through" : "text-foreground",
                                    )}
                                  >
                                    {task.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Select defaultValue={task.assignee}>
                                    <SelectTrigger className="w-[90px] h-8 bg-secondary border-border text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {owners.map((o) => (
                                        <SelectItem key={o.name} value={o.name}>
                                          <div className="flex items-center gap-2">
                                            <Avatar className={cn("h-4 w-4", o.color)}>
                                              <AvatarFallback className={cn(o.color, "text-[8px] text-white")}>
                                                {o.avatar}
                                              </AvatarFallback>
                                            </Avatar>
                                            {o.name}
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {task.dueDate && (
                                    <span className="text-xs text-muted-foreground hidden sm:inline">
                                      {task.dueDate}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="performance" className="mt-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {client.metaAds && (
                    <div className="p-4 rounded-lg bg-secondary/30 border border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-foreground">Meta Ads</h4>
                        {getTrendIcon(client.metaAds.trend)}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Spend</p>
                          <p className="text-sm font-semibold text-foreground truncate">
                            ${client.metaAds.spend.toLocaleString()}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">ROAS</p>
                          <p
                            className={cn(
                              "text-sm font-semibold",
                              client.metaAds.roas >= 2 ? "text-emerald-400" : "text-rose-400",
                            )}
                          >
                            {client.metaAds.roas}x
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">CPA</p>
                          <p className="text-sm font-semibold text-foreground">${client.metaAds.cpa}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {client.googleAds && (
                    <div className="p-4 rounded-lg bg-secondary/30 border border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-foreground">Google Ads</h4>
                        {getTrendIcon(client.googleAds.trend)}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Impressions</p>
                          <p className="text-sm font-semibold text-foreground truncate">
                            {(client.googleAds.impressions / 1000).toFixed(0)}k
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Clicks</p>
                          <p className="text-sm font-semibold text-foreground">
                            {(client.googleAds.clicks / 1000).toFixed(1)}k
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Conversions</p>
                          <p className="text-sm font-semibold text-foreground">{client.googleAds.conversions}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Button variant="outline" size="sm" className="border-border bg-transparent">
                  <RefreshCw className="h-3.5 w-3.5 mr-2" />
                  Sync Now
                </Button>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={client.performanceData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#71717a", fontSize: 10 }}
                        axisLine={{ stroke: "#27272a" }}
                        tickLine={{ stroke: "#27272a" }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fill: "#71717a", fontSize: 10 }}
                        axisLine={{ stroke: "#27272a" }}
                        tickLine={{ stroke: "#27272a" }}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fill: "#71717a", fontSize: 10 }}
                        axisLine={{ stroke: "#27272a" }}
                        tickLine={{ stroke: "#27272a" }}
                        tickFormatter={(value) => `${value}x`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#18181b",
                          border: "1px solid #27272a",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        labelStyle={{ color: "#fafafa" }}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
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
              </TabsContent>

              <TabsContent value="media" className="mt-6 space-y-4">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Zoom Recordings
                  </h4>
                  {recordings.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No recordings available</p>
                  ) : (
                    <div className="space-y-3">
                      {recordings.map((recording) => (
                        <div
                          key={recording.id}
                          className="p-4 rounded-lg bg-secondary/30 border border-border space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground truncate">{recording.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {recording.date} • {recording.duration}
                              </p>
                            </div>
                            <Button size="sm" variant="outline" className="shrink-0 bg-transparent">
                              <Play className="h-3.5 w-3.5 mr-1" />
                              Play
                            </Button>
                          </div>
                          {recording.aiSummary && (
                            <div className="p-3 rounded bg-muted/50 border border-border">
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                                <span className="text-xs font-medium text-foreground">AI Summary</span>
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed break-words">
                                {recording.aiSummary}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="techsetup" className="mt-6 space-y-4">
                {client.onboardingData ? (
                  <>
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                        Onboarding Submission
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 bg-secondary/30 border border-border rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Shopify Store URL</p>
                          <p className="text-sm font-mono text-foreground break-all">
                            {client.onboardingData.shopifyUrl}
                          </p>
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
                          <p className="text-sm font-mono text-foreground truncate">
                            {client.onboardingData.klaviyoApiKey}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Submitted on {new Date(client.onboardingData.submittedAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-border">
                      <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">Access Status</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 bg-secondary/30 border border-border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                accessStatus.meta ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                              }`}
                            />
                            <span className="text-sm text-foreground">Meta Business Manager</span>
                          </div>
                          {!accessStatus.meta && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleVerifyAccess("meta")}
                              className="text-xs border-border"
                            >
                              Verify Access
                            </Button>
                          )}
                          {accessStatus.meta && (
                            <span className="text-xs text-emerald-400 flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              Verified
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between p-3 bg-secondary/30 border border-border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                accessStatus.gtm ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                              }`}
                            />
                            <span className="text-sm text-foreground">Google Tag Manager</span>
                          </div>
                          {!accessStatus.gtm && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleVerifyAccess("gtm")}
                              className="text-xs border-border"
                            >
                              Verify Access
                            </Button>
                          )}
                          {accessStatus.gtm && (
                            <span className="text-xs text-emerald-400 flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              Verified
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between p-3 bg-secondary/30 border border-border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                accessStatus.shopify ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                              }`}
                            />
                            <span className="text-sm text-foreground">Shopify Staff Account</span>
                          </div>
                          {!accessStatus.shopify && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleVerifyAccess("shopify")}
                              className="text-xs border-border"
                            >
                              Verify Access
                            </Button>
                          )}
                          {accessStatus.shopify && (
                            <span className="text-xs text-emerald-400 flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              Verified
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <Button
                        onClick={handleGenerateInstallPlan}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        AI: Generate Implementation Steps
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No onboarding data submitted yet.</p>
                    <Button
                      variant="outline"
                      className="mt-4 bg-transparent"
                      onClick={() => (window.location.href = "/onboarding/start")}
                    >
                      Start Onboarding
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
