"use client"

import { cn } from "@/lib/utils"
import { LayoutGrid, CheckSquare, Users, AlertTriangle, TrendingUp } from "lucide-react"

export type DashboardTab = "overview" | "tasks" | "clients" | "alerts" | "performance"

interface DashboardTabsProps {
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
  className?: string
}

const tabs: { id: DashboardTab; label: string; icon: typeof LayoutGrid }[] = [
  { id: "overview", label: "Dash", icon: LayoutGrid },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "clients", label: "Clients", icon: Users },
  { id: "alerts", label: "Alerts", icon: AlertTriangle },
  { id: "performance", label: "Performance", icon: TrendingUp },
]

export function DashboardTabs({ activeTab, onTabChange, className }: DashboardTabsProps) {
  return (
    <div className={cn("flex items-center gap-1 border-b border-border", className)}>
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors relative cursor-pointer",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        )
      })}
    </div>
  )
}
