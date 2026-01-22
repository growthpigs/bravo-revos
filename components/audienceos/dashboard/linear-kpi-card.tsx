"use client"

import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown } from "lucide-react"

export interface LinearKPIData {
  label: string
  value: string | number
  change: number
  changeLabel: string
  sparklineData?: number[]
}

interface LinearKPICardProps {
  data: LinearKPIData
  onClick?: () => void
  className?: string
}

function MiniSparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data || data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const height = 24
  const width = 60

  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((value - min) / range) * height
    return `${x},${y}`
  }).join(" ")

  return (
    <svg width={width} height={height} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={positive ? "#10b981" : "#ef4444"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function LinearKPICard({ data, onClick, className }: LinearKPICardProps) {
  const isPositive = data.change >= 0
  const TrendIcon = isPositive ? TrendingUp : TrendingDown

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card border border-border rounded-lg p-5 transition-colors",
        onClick && "cursor-pointer hover:border-primary/30",
        className
      )}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-semibold text-foreground">
            {data.value}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {data.label}
          </p>
          <div className={cn(
            "flex items-center gap-1 mt-2 text-xs",
            isPositive ? "text-emerald-500" : "text-rose-500"
          )}>
            <TrendIcon className="w-3 h-3" />
            <span>
              {isPositive ? "+" : ""}{data.change}% {data.changeLabel}
            </span>
          </div>
        </div>
        {data.sparklineData && (
          <MiniSparkline data={data.sparklineData} positive={isPositive} />
        )}
      </div>
    </div>
  )
}

export function LinearKPICardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-5 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="h-8 w-16 bg-muted rounded" />
          <div className="h-4 w-24 bg-muted rounded mt-2" />
          <div className="h-3 w-20 bg-muted rounded mt-2" />
        </div>
        <div className="w-[60px] h-6 bg-muted rounded" />
      </div>
    </div>
  )
}
