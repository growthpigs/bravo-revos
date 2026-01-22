"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendIndicator } from "./trend-indicator"
import { cn } from "@/lib/utils"
import type { KPI, KPIType } from "@/types/dashboard"
import {
  Users,
  AlertTriangle,
  Clock,
  Headphones,
  AlertCircle,
  type LucideIcon,
} from "lucide-react"

interface KPICardProps {
  kpi: KPI
  type: KPIType
  isLoading?: boolean
  onDrillDown?: (url: string) => void
  isNorthStar?: boolean
  className?: string
}

// Icon mapping for each KPI type
const kpiIcons: Record<KPIType, LucideIcon> = {
  active_onboardings: Users,
  at_risk_clients: AlertTriangle,
  support_hours: Headphones,
  avg_install_time: Clock,
  clients_needing_attention: AlertCircle,
}

// Color configuration based on KPI type and value
function getKPIColors(type: KPIType, value: number) {
  switch (type) {
    case "at_risk_clients":
      return {
        text: value > 0 ? "text-status-red" : "text-primary",
        bg: value > 0 ? "bg-status-red/10" : "bg-primary/10",
      }
    case "support_hours":
      return {
        text: value <= 5 ? "text-primary" : "text-status-red",
        bg: value <= 5 ? "bg-primary/10" : "bg-status-red/10",
      }
    case "avg_install_time":
      return {
        text: value <= 7 ? "text-primary" : "text-status-yellow",
        bg: value <= 7 ? "bg-primary/10" : "bg-status-yellow/10",
      }
    case "clients_needing_attention":
      return {
        text: value > 0 ? "text-status-yellow" : "text-primary",
        bg: value > 0 ? "bg-status-yellow/10" : "bg-primary/10",
      }
    default:
      return {
        text: "text-primary",
        bg: "bg-primary/10",
      }
  }
}

// Subtitle text for each KPI type
const kpiSubtitles: Partial<Record<KPIType, string>> = {
  avg_install_time: "Target: <7 Days",
  support_hours: "Goal: <5h",
}

// Determine if trend should be inverted (down = good)
const invertedTrendKPIs: KPIType[] = [
  "at_risk_clients",
  "support_hours",
  "avg_install_time",
  "clients_needing_attention",
]

export function KPICard({
  kpi,
  type,
  isLoading = false,
  onDrillDown,
  isNorthStar = false,
  className,
}: KPICardProps) {
  const Icon = kpiIcons[type]
  const colors = getKPIColors(type, kpi.value)
  const subtitle = kpiSubtitles[type]
  const isInverted = invertedTrendKPIs.includes(type)

  const handleClick = () => {
    if (kpi.drillDownUrl && onDrillDown) {
      onDrillDown(kpi.drillDownUrl)
    }
  }

  if (isLoading) {
    return <KPICardSkeleton />
  }

  return (
    <Card
      className={cn(
        "border-border transition-all",
        isNorthStar && "ring-1 ring-primary/30",
        kpi.drillDownUrl && onDrillDown && "cursor-pointer hover:shadow-sm",
        className
      )}
      onClick={handleClick}
      role={kpi.drillDownUrl && onDrillDown ? "button" : undefined}
      tabIndex={kpi.drillDownUrl && onDrillDown ? 0 : undefined}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && kpi.drillDownUrl && onDrillDown) {
          e.preventDefault()
          handleClick()
        }
      }}
      aria-label={`${kpi.label}: ${kpi.displayValue}. ${kpi.drillDownUrl ? "Click to view details." : ""}`}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
            <p className={cn("text-xl font-semibold", colors.text)}>
              {kpi.displayValue}
            </p>
            {subtitle && (
              <p className="text-[10px] text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={cn("p-1.5 rounded-md", colors.bg)}>
            <Icon className={cn("h-3.5 w-3.5", colors.text)} aria-hidden="true" />
          </div>
        </div>
        <div className="mt-2">
          <TrendIndicator
            trend={kpi.trend}
            changePercent={kpi.changePercent}
            inverted={isInverted}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export function KPICardSkeleton() {
  return (
    <Card className="border-border">
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-2.5 w-14" />
          </div>
          <Skeleton className="h-6 w-6 rounded-md" />
        </div>
        <div className="mt-2">
          <Skeleton className="h-3 w-12" />
        </div>
      </CardContent>
    </Card>
  )
}
