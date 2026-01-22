"use client"

import { useRouter } from "next/navigation"
import { KPICard, KPICardSkeleton } from "./kpi-card"
import type { DashboardKPIs, KPIType } from "@/types/dashboard"

interface KPIGridProps {
  kpis: DashboardKPIs | null
  isLoading?: boolean
}

const kpiOrder: { key: keyof DashboardKPIs; type: KPIType; isNorthStar?: boolean }[] = [
  { key: "activeOnboardings", type: "active_onboardings" },
  { key: "atRiskClients", type: "at_risk_clients" },
  { key: "avgInstallTime", type: "avg_install_time" },
  { key: "supportHoursWeek", type: "support_hours", isNorthStar: true },
]

export function KPIGrid({ kpis, isLoading = false }: KPIGridProps) {
  const router = useRouter()

  const handleDrillDown = (url: string) => {
    router.push(url)
  }

  if (isLoading || !kpis) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KPICardSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      role="region"
      aria-label="Key Performance Indicators"
    >
      {kpiOrder.map(({ key, type, isNorthStar }) => (
        <KPICard
          key={type}
          kpi={kpis[key]}
          type={type}
          onDrillDown={handleDrillDown}
          isNorthStar={isNorthStar}
        />
      ))}
    </div>
  )
}
