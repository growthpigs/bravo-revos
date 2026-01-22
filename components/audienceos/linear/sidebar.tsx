"use client"

import React, { useState } from "react"
import { motion, AnimatePresence, useReducedMotion } from "motion/react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  BarChart3,
  Users,
  ClipboardList,
  Sparkles,
  Ticket,
  BookOpen,
  Zap,
  Plug,
  Settings,
  Plus,
  ChevronLeft,
  // RevOS-specific icons
  PenTool,
  Send,
  Target,
  FileText,
  MessageSquare,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { AppSwitcher } from "@/components/app-switcher"
import { useAppStore } from "@/stores/app-store"

interface NavItemProps {
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick?: () => void
  collapsed?: boolean
  indent?: boolean
}

function NavItem({ icon, label, active, onClick, collapsed, indent, reducedMotion }: NavItemProps & { reducedMotion?: boolean }) {
  const fadeTransition = reducedMotion ? { duration: 0 } : { duration: 0.15 }

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full px-3 py-2 text-sm rounded-md transition-colors cursor-pointer",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
        collapsed && "justify-center px-2",
        indent && !collapsed && "pl-6"
      )}
    >
      <span className={cn("w-5 h-5 shrink-0", active && "text-primary")}>{icon}</span>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            key="label"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={fadeTransition}
            className="flex-1 text-left truncate overflow-hidden"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}

function NavGroup({ label, collapsed, reducedMotion }: { label: string; collapsed: boolean; reducedMotion?: boolean }) {
  const fadeTransition = reducedMotion ? { duration: 0 } : { duration: 0.15 }

  return (
    <AnimatePresence initial={false}>
      {!collapsed && (
        <motion.div
          key={label}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={fadeTransition}
          className="px-3 pt-4 pb-1 overflow-hidden"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {label}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// AudienceOS views
export type AudienceOSView =
  | "dashboard"
  | "pipeline"
  | "clients"
  | "client"
  | "onboarding"
  | "intelligence"
  | "tickets"
  | "knowledge"
  | "automations"
  | "integrations"
  | "settings"

// RevOS views
export type RevOSView =
  | "dashboard"
  | "campaigns"
  | "content"
  | "outreach"
  | "cartridges"
  | "analytics"
  | "integrations"
  | "settings"

// Combined view type
export type LinearView = AudienceOSView | RevOSView

interface LinearSidebarProps {
  activeView: LinearView
  onViewChange: (view: LinearView) => void
  onQuickCreate?: () => void
  user?: {
    name: string
    role: string
    initials: string
    color?: string
  }
}

export function LinearSidebar({
  activeView,
  onViewChange,
  onQuickCreate,
  user,
}: LinearSidebarProps) {
  // Fallback user when profile hasn't loaded
  const displayUser = user ?? {
    name: "Loading...",
    role: "Member",
    initials: "...",
    color: "bg-gray-400",
  }
  const [collapsed, setCollapsed] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const activeApp = useAppStore((state) => state.activeApp)

  // Animation settings - instant when reduced motion is preferred
  const transition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }
  const fadeTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.15 }

  // ============ AUDIENCEOS NAV ITEMS ============
  const audienceOSMainItems = [
    { id: "dashboard" as const, icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard" },
    { id: "pipeline" as const, icon: <BarChart3 className="w-5 h-5" />, label: "Pipeline" },
    { id: "clients" as const, icon: <Users className="w-5 h-5" />, label: "Clients" },
  ]

  const audienceOSOperationsItems = [
    { id: "onboarding" as const, icon: <ClipboardList className="w-5 h-5" />, label: "Onboarding" },
    { id: "tickets" as const, icon: <Ticket className="w-5 h-5" />, label: "Support" },
    { id: "intelligence" as const, icon: <Sparkles className="w-5 h-5" />, label: "Intelligence" },
  ]

  const audienceOSResourcesItems = [
    { id: "knowledge" as const, icon: <BookOpen className="w-5 h-5" />, label: "Knowledge Base" },
    { id: "automations" as const, icon: <Zap className="w-5 h-5" />, label: "Automations" },
  ]

  // ============ REVOS NAV ITEMS ============
  const revOSMainItems = [
    { id: "dashboard" as const, icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard" },
    { id: "campaigns" as const, icon: <Target className="w-5 h-5" />, label: "Campaigns" },
    { id: "content" as const, icon: <PenTool className="w-5 h-5" />, label: "Content" },
  ]

  const revOSMarketingItems = [
    { id: "outreach" as const, icon: <Send className="w-5 h-5" />, label: "Outreach" },
    { id: "cartridges" as const, icon: <FileText className="w-5 h-5" />, label: "Cartridges" },
    { id: "analytics" as const, icon: <BarChart3 className="w-5 h-5" />, label: "Analytics" },
  ]

  // ============ SHARED NAV ITEMS ============
  const configureItems = [
    { id: "integrations" as const, icon: <Plug className="w-5 h-5" />, label: "Integrations" },
    { id: "settings" as const, icon: <Settings className="w-5 h-5" />, label: "Settings" },
  ]

  // Select items based on active app
  const mainItems = activeApp === 'audienceos' ? audienceOSMainItems : revOSMainItems
  const secondaryItems = activeApp === 'audienceos' ? audienceOSOperationsItems : revOSMarketingItems
  const secondaryLabel = activeApp === 'audienceos' ? 'Operations' : 'Marketing'
  const resourcesItems = activeApp === 'audienceos' ? audienceOSResourcesItems : []

  return (
    <motion.div
      initial={false}
      animate={{ width: collapsed ? 64 : 224 }}
      transition={transition}
      className="bg-sidebar border-r border-sidebar-border flex flex-col h-screen"
    >
      {/* Header - App Switcher (unified platform 2026-01-21) */}
      <div className="h-[52px] px-[15px] flex items-center justify-center">
        <div className="flex items-center justify-between w-full">
          <div className={cn("flex items-center", collapsed && "justify-center w-full")}>
            <AppSwitcher collapsed={collapsed} />
          </div>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="p-1 hover:bg-secondary rounded transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Create */}
      <div className="p-3">
        <Button
          onClick={onQuickCreate}
          className={cn(
            "w-full bg-primary hover:bg-primary/90 text-primary-foreground",
            collapsed ? "px-2" : "justify-between"
          )}
          size={collapsed ? "icon" : "default"}
        >
          <span className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {!collapsed && "Quick"}
          </span>
          {!collapsed && (
            <span className="text-xs opacity-70">⌘K</span>
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        {/* Main items (ungrouped) */}
        <div className="space-y-1">
          {mainItems.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeView === item.id}
              onClick={() => onViewChange(item.id)}
              collapsed={collapsed}
              reducedMotion={prefersReducedMotion ?? false}
            />
          ))}
        </div>

        {/* Secondary group - Operations (AudienceOS) or Marketing (RevOS) */}
        <NavGroup label={secondaryLabel} collapsed={collapsed} reducedMotion={prefersReducedMotion ?? false} />
        <div className="space-y-1">
          {secondaryItems.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeView === item.id}
              onClick={() => onViewChange(item.id)}
              collapsed={collapsed}
              reducedMotion={prefersReducedMotion ?? false}
            />
          ))}
        </div>

        {/* Resources group - AudienceOS only */}
        {resourcesItems.length > 0 && (
          <>
            <NavGroup label="Resources" collapsed={collapsed} reducedMotion={prefersReducedMotion ?? false} />
            <div className="space-y-1">
              {resourcesItems.map((item) => (
                <NavItem
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  active={activeView === item.id}
                  onClick={() => onViewChange(item.id)}
                  collapsed={collapsed}
                  reducedMotion={prefersReducedMotion ?? false}
                />
              ))}
            </div>
          </>
        )}

        {/* Configure group */}
        <NavGroup label="Configure" collapsed={collapsed} reducedMotion={prefersReducedMotion ?? false} />
        <div className="space-y-1">
          {configureItems.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeView === item.id}
              onClick={() => onViewChange(item.id)}
              collapsed={collapsed}
              reducedMotion={prefersReducedMotion ?? false}
            />
          ))}
        </div>
      </nav>

      {/* User Profile Footer - clickable to open settings */}
      <div className="p-3 border-t border-sidebar-border" data-testid="user-profile">
        {collapsed ? (
          <button
            onClick={() => onViewChange("settings")}
            className="w-full flex justify-center p-2 hover:bg-secondary rounded transition-colors cursor-pointer"
          >
            <Avatar className={cn("h-8 w-8", displayUser.color)}>
              <AvatarFallback className={cn(displayUser.color, "text-sm font-medium text-white")}>
                {displayUser.initials}
              </AvatarFallback>
            </Avatar>
          </button>
        ) : (
          <button
            onClick={() => onViewChange("settings")}
            className="flex items-center gap-3 w-full hover:bg-secondary rounded-md p-2 -m-2 transition-colors cursor-pointer"
          >
            <Avatar className={cn("h-8 w-8", displayUser.color)}>
              <AvatarFallback className={cn(displayUser.color, "text-sm font-medium text-white")}>
                {displayUser.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-foreground truncate">{displayUser.name}</p>
              <p className="text-xs text-muted-foreground truncate">{displayUser.role}</p>
            </div>
          </button>
        )}
      </div>
    </motion.div>
  )
}
