"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  primaryAction?: string
  secondaryAction?: string
  onPrimaryClick?: () => void
  onSecondaryClick?: () => void
  accentColor?: "blue" | "pink" | "purple" | "green" | "orange"
}

const accentColors = {
  blue: "text-blue-400 bg-blue-400/10",
  pink: "text-pink-400 bg-pink-400/10",
  purple: "text-purple-400 bg-purple-400/10",
  green: "text-emerald-400 bg-emerald-400/10",
  orange: "text-orange-400 bg-orange-400/10",
}

export function FeatureCard({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  onPrimaryClick,
  onSecondaryClick,
  accentColor = "blue",
}: FeatureCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-5 hover:border-primary/30 transition-colors">
      <div className="flex items-start gap-3 mb-4">
        <div
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
            accentColors[accentColor]
          )}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>

      {(primaryAction || secondaryAction) && (
        <div className="flex items-center gap-3">
          {primaryAction && (
            <Button size="sm" onClick={onPrimaryClick}>
              {primaryAction}
            </Button>
          )}
          {secondaryAction && (
            <button
              onClick={onSecondaryClick}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {secondaryAction}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
