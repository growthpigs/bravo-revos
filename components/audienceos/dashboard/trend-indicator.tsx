"use client"

import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TrendDirection } from "@/types/dashboard"

interface TrendIndicatorProps {
  trend: TrendDirection
  changePercent: number
  inverted?: boolean // For metrics where down is good (e.g., support hours)
  showPercentage?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

export function TrendIndicator({
  trend,
  changePercent,
  inverted = false,
  showPercentage = true,
  size = "sm",
  className,
}: TrendIndicatorProps) {
  const sizeConfig = {
    sm: { icon: "h-3.5 w-3.5", text: "text-xs" },
    md: { icon: "h-4 w-4", text: "text-sm" },
    lg: { icon: "h-5 w-5", text: "text-base" },
  }

  const { icon: iconSize, text: textSize } = sizeConfig[size]

  // Determine visual treatment based on trend and inversion
  const isPositive = inverted ? trend === "down" : trend === "up"

  const getIcon = () => {
    switch (trend) {
      case "up":
        return <TrendingUp className={cn(iconSize, isPositive ? "text-primary" : "text-status-red")} />
      case "down":
        return <TrendingDown className={cn(iconSize, isPositive ? "text-primary" : "text-status-red")} />
      case "stable":
        return <Minus className={cn(iconSize, "text-muted-foreground")} />
    }
  }

  const getColorClass = () => {
    if (trend === "stable") return "text-muted-foreground"
    return isPositive ? "text-primary" : "text-status-red"
  }

  const formatPercent = () => {
    if (changePercent === 0) return "No change"
    const sign = changePercent > 0 ? "+" : ""
    return `${sign}${changePercent}%`
  }

  return (
    <div
      className={cn("flex items-center gap-1.5", className)}
      role="status"
      aria-label={`Trend: ${trend}, ${formatPercent()}`}
    >
      {getIcon()}
      {showPercentage && (
        <span className={cn(textSize, getColorClass())}>
          {formatPercent()}
        </span>
      )}
    </div>
  )
}
