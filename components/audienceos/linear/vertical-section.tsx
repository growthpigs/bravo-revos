"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { HelpCircle, X } from "lucide-react"

interface VerticalSectionProps {
  title: string
  description?: string
  helpText?: string
  children: React.ReactNode
  className?: string
}

export function VerticalSection({
  title,
  description,
  helpText,
  children,
  className,
}: VerticalSectionProps) {
  const [showHelp, setShowHelp] = useState(false)

  return (
    <section className={cn("mb-10", className)}>
      <header className="mb-5">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-medium text-foreground">{title}</h2>
          {helpText && (
            <div className="relative">
              <button
                className="text-muted-foreground hover:text-foreground transition-colors"
                onMouseEnter={() => setShowHelp(true)}
                onMouseLeave={() => setShowHelp(false)}
                onClick={() => setShowHelp(!showHelp)}
              >
                <HelpCircle className="w-4 h-4" />
              </button>
              {showHelp && (
                <div className="absolute top-6 left-0 z-10 w-72 p-4 bg-card border border-border rounded-lg shadow-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-foreground text-sm">About {title}</h3>
                    <button
                      onClick={() => setShowHelp(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground">{helpText}</p>
                </div>
              )}
            </div>
          )}
        </div>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

// Page layout for vertical content (single column, scrollable)
interface VerticalPageLayoutProps {
  title: string
  description?: string
  children: React.ReactNode
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl"
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
}

export function VerticalPageLayout({
  title,
  description,
  children,
  maxWidth = "4xl",
}: VerticalPageLayoutProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className={cn("mx-auto p-8 pb-[150px]", maxWidthClasses[maxWidth])}>
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-2">{title}</h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </header>
        {children}
      </div>
    </div>
  )
}
