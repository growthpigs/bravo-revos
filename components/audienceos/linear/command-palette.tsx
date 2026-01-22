"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { CommandItem } from "./command-item"
import {
  User,
  Circle,
  BarChart3,
  Tag,
  Calendar,
  Link,
  Copy,
  Trash2,
  Archive,
  Search,
} from "lucide-react"

export interface CommandAction {
  id: string
  icon: React.ReactNode
  label: string
  shortcut?: string
  group?: string
  onSelect?: () => void
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  actions?: CommandAction[]
  placeholder?: string
  context?: string // e.g., "SLM-1 - Set up Linear"
}

const defaultActions: CommandAction[] = [
  { id: "assign", icon: <User className="w-4 h-4" />, label: "Assign to...", shortcut: "A", group: "Actions" },
  { id: "assign-me", icon: <User className="w-4 h-4" />, label: "Assign to me", shortcut: "I", group: "Actions" },
  { id: "status", icon: <Circle className="w-4 h-4" />, label: "Change status...", shortcut: "S", group: "Actions" },
  { id: "priority", icon: <BarChart3 className="w-4 h-4" />, label: "Change priority...", shortcut: "P", group: "Actions" },
  { id: "labels", icon: <Tag className="w-4 h-4" />, label: "Add labels...", shortcut: "L", group: "Actions" },
  { id: "due-date", icon: <Calendar className="w-4 h-4" />, label: "Set due date...", shortcut: "D", group: "Actions" },
  { id: "copy-link", icon: <Link className="w-4 h-4" />, label: "Copy link", shortcut: "⌘L", group: "Quick" },
  { id: "copy-id", icon: <Copy className="w-4 h-4" />, label: "Copy ID", shortcut: "⌘⇧C", group: "Quick" },
  { id: "archive", icon: <Archive className="w-4 h-4" />, label: "Archive", shortcut: "E", group: "Danger" },
  { id: "delete", icon: <Trash2 className="w-4 h-4" />, label: "Delete", shortcut: "⌘⌫", group: "Danger" },
]

export function CommandPalette({
  open,
  onOpenChange,
  actions = defaultActions,
  placeholder = "Type a command or search...",
  context,
}: CommandPaletteProps) {
  const [search, setSearch] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter actions based on search
  const filteredActions = actions.filter((action) =>
    action.label.toLowerCase().includes(search.toLowerCase())
  )

  // Group actions
  const groupedActions = filteredActions.reduce((acc, action) => {
    const group = action.group || "Actions"
    if (!acc[group]) acc[group] = []
    acc[group].push(action)
    return acc
  }, {} as Record<string, CommandAction[]>)

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setSearch("")
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  // Keyboard navigation - deps intentionally include dynamic values
  /* eslint-disable react-hooks/preserve-manual-memoization */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setSelectedIndex((i) => Math.min(i + 1, filteredActions.length - 1))
          break
        case "ArrowUp":
          e.preventDefault()
          setSelectedIndex((i) => Math.max(i - 1, 0))
          break
        case "Enter": {
          e.preventDefault()
          const action = filteredActions[selectedIndex]
          if (action?.onSelect) {
            action.onSelect()
            onOpenChange(false)
          }
          break
        }
        case "Escape":
          e.preventDefault()
          onOpenChange(false)
          break
      }
    },
    [filteredActions, selectedIndex, onOpenChange]
  )
  /* eslint-enable react-hooks/preserve-manual-memoization */

  // Global keyboard shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown)
    return () => window.removeEventListener("keydown", handleGlobalKeyDown)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Palette */}
      <div
        className="relative w-full max-w-lg bg-card border border-border rounded-lg shadow-2xl overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Context line */}
        {context && (
          <div className="px-4 pt-3 pb-1">
            <p className="text-xs text-muted-foreground font-mono">{context}</p>
          </div>
        )}

        {/* Search input */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setSelectedIndex(0)
              }}
              placeholder={placeholder}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <kbd className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded font-mono">
              ESC
            </kbd>
          </div>
        </div>

        {/* Actions list */}
        <div className="max-h-80 overflow-y-auto py-2">
          {Object.entries(groupedActions).map(([group, groupActions]) => (
            <div key={group}>
              <div className="px-4 py-1.5">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {group}
                </span>
              </div>
              {groupActions.map((action) => {
                const index = filteredActions.indexOf(action)
                return (
                  <CommandItem
                    key={action.id}
                    icon={action.icon}
                    label={action.label}
                    shortcut={action.shortcut}
                    selected={index === selectedIndex}
                    onClick={() => {
                      action.onSelect?.()
                      onOpenChange(false)
                    }}
                  />
                )
              })}
            </div>
          ))}

          {filteredActions.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No commands found
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="bg-secondary px-1 py-0.5 rounded">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-secondary px-1 py-0.5 rounded">↵</kbd> select
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="bg-secondary px-1 py-0.5 rounded">⌘K</kbd> toggle
          </span>
        </div>
      </div>
    </div>
  )
}

// Hook for easy command palette usage
export function useCommandPalette() {
  const [open, setOpen] = useState(false)
  return { open, setOpen, toggle: () => setOpen((o) => !o) }
}
