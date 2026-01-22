"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { X, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DateOption {
  label: string
  date: Date
  description?: string
}

interface DatePickerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  onSelect?: (date: Date) => void
  selectedDate?: Date | null
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

function getQuickOptions(): DateOption[] {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const endOfWeek = new Date(today)
  const daysUntilFriday = 5 - today.getDay()
  endOfWeek.setDate(today.getDate() + (daysUntilFriday > 0 ? daysUntilFriday : 7 + daysUntilFriday))

  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)

  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

  return [
    { label: "Tomorrow", date: tomorrow },
    { label: "End of this week", date: endOfWeek },
    { label: "In one week", date: nextWeek },
    { label: "End of month", date: endOfMonth },
  ]
}

export function DatePickerModal({
  open,
  onOpenChange,
  title = "Set due date",
  onSelect,
  selectedDate: _selectedDate,
}: DatePickerModalProps) {
  const [hoveredOption, setHoveredOption] = React.useState<string | null>(null)
  const quickOptions = getQuickOptions()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-card border border-border rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 hover:bg-secondary rounded transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Quick options */}
        <div className="p-2">
          <div className="mb-2 px-2">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Quick select
            </span>
          </div>
          <div className="space-y-0.5">
            {quickOptions.map((option) => (
              <button
                key={option.label}
                onClick={() => {
                  onSelect?.(option.date)
                  onOpenChange(false)
                }}
                onMouseEnter={() => setHoveredOption(option.label)}
                onMouseLeave={() => setHoveredOption(null)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded transition-colors",
                  hoveredOption === option.label
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary"
                )}
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">{option.label}</span>
                </div>
                <span
                  className={cn(
                    "text-sm",
                    hoveredOption === option.label
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground"
                  )}
                >
                  {formatDate(option.date)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Custom option */}
        <div className="p-2">
          <button
            onClick={() => {
              // TODO: Open calendar picker
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-secondary transition-colors"
          >
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Custom date...</span>
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onSelect?.(undefined as unknown as Date)
              onOpenChange(false)
            }}
            className="text-muted-foreground"
          >
            Clear
          </Button>
          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}
