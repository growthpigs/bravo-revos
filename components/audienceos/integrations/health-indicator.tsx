"use client"

import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface HealthIndicatorProps {
  score: number // 0-100
  previousScore?: number
  showTrend?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

export function HealthIndicator({
  score,
  previousScore,
  showTrend = true,
  size = "md",
  className,
}: HealthIndicatorProps) {
  const getHealthColor = (score: number): string => {
    if (score >= 80) return "text-emerald-500"
    if (score >= 60) return "text-amber-500"
    return "text-red-500"
  }

  const getHealthBg = (score: number): string => {
    if (score >= 80) return "bg-emerald-500/10"
    if (score >= 60) return "bg-amber-500/10"
    return "bg-red-500/10"
  }

  const getHealthLabel = (score: number): string => {
    if (score >= 80) return "Healthy"
    if (score >= 60) return "Fair"
    return "Needs Attention"
  }

  const trend = previousScore !== undefined ? score - previousScore : 0
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus
  const trendColor = trend > 0 ? "text-emerald-500" : trend < 0 ? "text-red-500" : "text-muted-foreground"

  const sizeClasses = {
    sm: "text-xs p-1",
    md: "text-sm p-2",
    lg: "text-base p-3",
  }

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-lg",
        getHealthBg(score),
        sizeClasses[size],
        className
      )}
    >
      <span className={cn("font-semibold", getHealthColor(score))}>
        {score}%
      </span>
      <span className={cn("text-muted-foreground", size === "sm" && "hidden")}>
        {getHealthLabel(score)}
      </span>
      {showTrend && previousScore !== undefined && (
        <TrendIcon className={cn(iconSizes[size], trendColor)} />
      )}
    </div>
  )
}

interface HealthRingProps {
  score: number
  size?: number
  strokeWidth?: number
  className?: string
}

export function HealthRing({
  score,
  size = 48,
  strokeWidth = 4,
  className,
}: HealthRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (score / 100) * circumference

  const getStrokeColor = (score: number): string => {
    if (score >= 80) return "#10b981" // emerald-500
    if (score >= 60) return "#f59e0b" // amber-500
    return "#ef4444" // red-500
  }

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-secondary"
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getStrokeColor(score)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute text-xs font-semibold">{score}</span>
    </div>
  )
}
