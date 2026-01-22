"use client"

import { useState, useEffect } from "react"
import { type Client } from "@/types/pipeline"
import { usePipelineStore, type Client as StoreClient } from "@/stores/pipeline-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle2, Clock, Search, ExternalLink, Download, Mail, Filter, Copy } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface OnboardingManagementViewProps {
  onClientClick?: (client: Client) => void
}

// Transform store client to display client format
// Note: onboardingData would come from a separate onboarding submissions API
function transformStoreClient(storeClient: StoreClient): Client {
  return {
    id: storeClient.id,
    name: storeClient.name,
    logo: storeClient.name.charAt(0),
    stage: storeClient.stage,
    health: storeClient.health_status,
    owner: (storeClient.owner as Client["owner"]) || "Brent",
    daysInStage: storeClient.days_in_stage,
    supportTickets: 0,
    installTime: 0,
    tier: "Core",
    tasks: [],
    comms: [],
    // onboardingData would be populated from onboarding submissions API
    // For now, clients fetched from pipeline don't have onboarding data
    onboardingData: undefined,
  }
}

export function OnboardingManagementView({ onClientClick }: OnboardingManagementViewProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const { toast } = useToast()

  // Get clients from store
  const { clients: storeClients, fetchClients, isLoading: _isLoading } = usePipelineStore()

  // Fetch clients on mount
  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  // Transform store clients to display format
  const displayClients = storeClients.map(transformStoreClient)

  // Filter clients that have onboarding data
  // Note: Until onboarding submissions API exists, this will be empty
  const onboardingClients = displayClients.filter((client) => client.onboardingData)

  const filteredClients = onboardingClients.filter((client) => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "complete" &&
        client.onboardingData?.accessGrants.meta &&
        client.onboardingData?.accessGrants.gtm &&
        client.onboardingData?.accessGrants.shopify) ||
      (statusFilter === "pending" &&
        (!client.onboardingData?.accessGrants.meta ||
          !client.onboardingData?.accessGrants.gtm ||
          !client.onboardingData?.accessGrants.shopify))

    return matchesSearch && matchesStatus
  })

  const getAccessStatus = (client: Client) => {
    if (!client.onboardingData) return { label: "No Data", variant: "outline" as const, count: 0 }

    const { meta, gtm, shopify } = client.onboardingData.accessGrants
    const complete = [meta, gtm, shopify].filter(Boolean).length

    if (complete === 3) return { label: "Complete", variant: "default" as const, count: 3 }
    if (complete > 0) return { label: `${complete}/3 Complete`, variant: "secondary" as const, count: complete }
    return { label: "Pending", variant: "outline" as const, count: 0 }
  }

  const handleCopyPortalLink = () => {
    const portalUrl = `${window.location.origin}/onboarding/start`
    navigator.clipboard.writeText(portalUrl)
    toast({
      title: "Link Copied",
      description: "Client portal link copied to clipboard",
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Onboarding Portal</h1>
          <p className="text-[11px] text-muted-foreground">Manage client onboarding submissions and access grants</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCopyPortalLink} className="h-7 text-[10px]">
            <Copy className="h-3 w-3 mr-1.5" />
            Copy Portal Link
          </Button>
          <Link href="/onboarding/start" target="_blank">
            <Button className="h-7 text-[10px]">
              <ExternalLink className="h-3 w-3 mr-1.5" />
              View Client Portal
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardDescription className="text-[10px] text-muted-foreground">Total Submissions</CardDescription>
            <CardTitle className="text-lg font-semibold text-foreground">{onboardingClients.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardDescription className="text-[10px] text-muted-foreground">Complete Access</CardDescription>
            <CardTitle className="text-lg font-semibold text-emerald-500">
              {
                onboardingClients.filter(
                  (c) =>
                    c.onboardingData?.accessGrants.meta &&
                    c.onboardingData?.accessGrants.gtm &&
                    c.onboardingData?.accessGrants.shopify,
                ).length
              }
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardDescription className="text-[10px] text-muted-foreground">Pending Access</CardDescription>
            <CardTitle className="text-lg font-semibold text-amber-500">
              {
                onboardingClients.filter(
                  (c) =>
                    !c.onboardingData?.accessGrants.meta ||
                    !c.onboardingData?.accessGrants.gtm ||
                    !c.onboardingData?.accessGrants.shopify,
                ).length
              }
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardDescription className="text-[10px] text-muted-foreground">Avg Response Time</CardDescription>
            <CardTitle className="text-lg font-semibold text-foreground">2.3 days</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-[11px] font-medium text-foreground">Onboarding Submissions</CardTitle>
          <CardDescription className="text-[10px] text-muted-foreground">
            View and manage all client onboarding data
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search by client name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 h-7 text-[11px] bg-secondary border-border"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48 h-7 text-[11px] bg-secondary border-border">
                <Filter className="h-3 w-3 mr-1.5" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-[11px]">All Submissions</SelectItem>
                <SelectItem value="complete" className="text-[11px]">Complete Access</SelectItem>
                <SelectItem value="pending" className="text-[11px]">Pending Access</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-foreground">Client</TableHead>
                  <TableHead className="text-foreground">Submitted</TableHead>
                  <TableHead className="text-foreground">Tech Stack</TableHead>
                  <TableHead className="text-foreground">Access Status</TableHead>
                  <TableHead className="text-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No onboarding submissions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client) => {
                    const status = getAccessStatus(client)
                    const data = client.onboardingData!

                    return (
                      <TableRow
                        key={client.id}
                        onClick={() => onClientClick?.(client)}
                        className="hover:bg-muted/30 cursor-pointer"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                              <span className="text-[11px] font-semibold text-primary">{client.name.charAt(0)}</span>
                            </div>
                            <div>
                              <p className="text-[11px] font-medium text-foreground">{client.name}</p>
                              <p className="text-[10px] text-muted-foreground">{data.contactEmail}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {data.submittedAt}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <code className="text-[9px] font-mono text-foreground bg-muted px-1.5 py-0.5 rounded">
                              {data.shopifyUrl}
                            </code>
                            <div className="flex gap-1">
                              {data.gtmContainerId && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0">
                                  GTM
                                </Badge>
                              )}
                              {data.metaPixelId && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0">
                                  Meta
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            <Badge
                              variant={status.variant}
                              className={cn(
                                "w-fit",
                                status.label === "Complete" &&
                                  "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20",
                                status.label.includes("/3") && "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20",
                              )}
                            >
                              {status.label === "Complete" ? (
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                              ) : status.label === "Pending" ? (
                                <Clock className="h-3 w-3 mr-1" />
                              ) : null}
                              {status.label}
                            </Badge>
                            <div className="flex gap-1">
                              {!data.accessGrants.meta && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 text-rose-500">
                                  Meta Pending
                                </Badge>
                              )}
                              {!data.accessGrants.gtm && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 text-rose-500">
                                  GTM Pending
                                </Badge>
                              )}
                              {!data.accessGrants.shopify && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 text-rose-500">
                                  Shopify Pending
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <Button variant="outline" className="h-6 text-[9px] px-2">
                              <Mail className="h-2.5 w-2.5 mr-1" />
                              Email
                            </Button>
                            <Button variant="outline" className="h-6 text-[9px] px-2">
                              <Download className="h-2.5 w-2.5 mr-1" />
                              Export
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
