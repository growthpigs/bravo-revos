"use client"

import React from "react"
import { motion, AnimatePresence, useReducedMotion } from "motion/react"
import { LinearSidebar, type LinearView } from "./sidebar"

interface LinearShellProps {
  activeView: LinearView
  onViewChange: (view: LinearView) => void
  onQuickCreate?: () => void
  children: React.ReactNode
  detailPanel?: React.ReactNode
  user?: {
    name: string
    role: string
    initials: string
    color?: string
  }
}

export function LinearShell({
  activeView,
  onViewChange,
  onQuickCreate,
  children,
  detailPanel,
  user,
}: LinearShellProps) {
  const prefersReducedMotion = useReducedMotion()

  // Animation settings - instant when reduced motion is preferred
  const slideTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }

  // Only show detail panel when:
  // - "clients" view: always show the aside (persistent panel)
  // - "pipeline" view: only show when detailPanel has content (click to open)
  const showDetailPanel = activeView === "clients" || (activeView === "pipeline" && detailPanel)

  return (
    <div className="flex h-screen bg-background text-foreground">
      <LinearSidebar activeView={activeView} onViewChange={onViewChange} onQuickCreate={onQuickCreate} user={user} />
      <main className="flex-1 flex flex-col overflow-y-auto pb-[150px]">{children}</main>
      <AnimatePresence mode="wait">
        {showDetailPanel && (
          <motion.aside
            key="detail-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 480, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={slideTransition}
            className="bg-card border-l border-border flex flex-col overflow-hidden pb-[150px]"
          >
            {detailPanel}
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  )
}
