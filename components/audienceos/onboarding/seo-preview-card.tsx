"use client"

import { TrendingUp, Users, Globe, Loader2 } from "lucide-react"

interface SEOSummary {
  total_keywords: number
  traffic_value: number
  top_10_keywords: number
  competitors_count: number
  domain_rank: number | null
  backlinks: number | null
}

interface Competitor {
  domain: string
  intersecting_keywords: number
}

interface SEOPreviewCardProps {
  loading: boolean
  domain: string
  summary: SEOSummary | null
  competitors: Competitor[]
  error?: string
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

export function SEOPreviewCard({ loading, domain, summary, competitors, error }: SEOPreviewCardProps) {
  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Fetching SEO data for {domain}...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )
  }

  if (!summary) {
    return null
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">SEO Intelligence for {domain}</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-md bg-muted p-2 text-center">
          <p className="text-xs text-muted-foreground">Domain Rank</p>
          <p className="text-lg font-semibold">
            {summary.domain_rank ? formatNumber(summary.domain_rank) : "—"}
          </p>
        </div>
        <div className="rounded-md bg-muted p-2 text-center">
          <p className="text-xs text-muted-foreground">Backlinks</p>
          <p className="text-lg font-semibold">
            {summary.backlinks ? formatNumber(summary.backlinks) : "—"}
          </p>
        </div>
        <div className="rounded-md bg-muted p-2 text-center">
          <p className="text-xs text-muted-foreground">Competitors</p>
          <p className="text-lg font-semibold">{summary.competitors_count}</p>
        </div>
      </div>

      {competitors.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>Top Competitors</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {competitors.slice(0, 5).map((competitor) => (
              <span
                key={competitor.domain}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
              >
                {competitor.domain}
                {competitor.intersecting_keywords > 0 && (
                  <span className="text-muted-foreground">
                    ({formatNumber(competitor.intersecting_keywords)})
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <TrendingUp className="h-3 w-3" />
        <span>SEO data will be saved to client profile</span>
      </div>
    </div>
  )
}
