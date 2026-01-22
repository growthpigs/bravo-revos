"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface CommandItemProps {
  icon: React.ReactNode
  label: string
  shortcut?: string
  selected?: boolean
  onClick?: () => void
}

export function CommandItem({ icon, label, shortcut, selected, onClick }: CommandItemProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center justify-between px-3 py-2 cursor-pointer transition-colors",
        selected ? "bg-primary/10 text-foreground" : "hover:bg-secondary text-muted-foreground hover:text-foreground"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-4 h-4 flex items-center justify-center">
          {icon}
        </div>
        <span className="text-sm">{label}</span>
      </div>
      {shortcut && (
        <kbd className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded font-mono">
          {shortcut}
        </kbd>
      )}
    </div>
  )
}
