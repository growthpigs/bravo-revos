"use client"

import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Kanban,
  Users,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
  Ticket,
  BookOpen,
  Plug,
  Workflow,
  Inbox,
  Plus,
  UserPlus,
  LifeBuoy,
  FolderKanban,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface SidebarProps {
  activeView: string
  onViewChange: (view: string) => void
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
  onQuickCreate?: (type: "client" | "ticket" | "project") => void
}

// Grouped navigation following Linear's pattern
const navSections = [
  {
    label: null, // No header for primary section
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "pipeline", label: "Pipeline", icon: Kanban },
      { id: "clients", label: "Client List", icon: Users },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "onboarding", label: "Onboarding", icon: Inbox },
      { id: "tickets", label: "Support", icon: Ticket },
      { id: "intelligence", label: "Intelligence", icon: Sparkles },
    ],
  },
  {
    label: "Resources",
    items: [
      { id: "knowledge", label: "Knowledge Base", icon: BookOpen },
      { id: "automations", label: "Automations", icon: Workflow },
    ],
  },
  {
    label: "Configure",
    items: [
      { id: "integrations", label: "Integrations", icon: Plug },
      { id: "settings", label: "Settings", icon: Settings },
    ],
  },
]

export function Sidebar({ activeView, onViewChange, collapsed, onCollapsedChange, onQuickCreate }: SidebarProps) {
  return (
    <div
      className={cn(
        "flex flex-col h-screen bg-sidebar border-r border-border transition-all duration-200",
        collapsed ? "w-14" : "w-56",
      )}
    >
      {/* Logo - AudienceOS branding */}
      <div className="flex items-center justify-center h-12 px-[15px] border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-0 flex-1" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
            <span className="text-[17px] font-semibold tracking-tight text-white">audience</span>
            <span
              className="text-[17px] font-light tracking-tight"
              style={{
                background: "linear-gradient(90deg, #a855f7 0%, #ec4899 50%, #06b6d4 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              OS
            </span>
          </div>
        )}
        <button
          className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          onClick={() => onCollapsedChange(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Quick Create - subtle, Linear-style */}
      <div className="px-3 pt-3 pb-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer",
                collapsed && "justify-center w-full",
              )}
            >
              <Plus className="h-4 w-4" />
              {!collapsed && <span>New</span>}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem
              onClick={() => onQuickCreate?.("client")}
              className="flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>New Client</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onQuickCreate?.("ticket")}
              className="flex items-center gap-2 cursor-pointer"
            >
              <LifeBuoy className="h-3.5 w-3.5" />
              <span>New Ticket</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onQuickCreate?.("project")}
              className="flex items-center gap-2 cursor-pointer"
            >
              <FolderKanban className="h-3.5 w-3.5" />
              <span>New Project</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation - sectioned like Linear */}
      <nav className="flex-1 py-2 px-2 overflow-y-auto">
        {navSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className={cn(section.label && "mt-4")}>
            {/* Section header */}
            {section.label && !collapsed && (
              <div className="px-3 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {section.label}
              </div>
            )}
            {/* Section items */}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = activeView === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => onViewChange(item.id)}
                    className={cn(
                      "flex items-center gap-2.5 w-full px-3 py-1.5 rounded-md transition-colors text-[13px] cursor-pointer",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile - clickable to open settings */}
      <div className="p-3 border-t border-border">
        <button
          data-testid="user-profile"
          onClick={() => onViewChange("settings")}
          className={cn(
            "flex items-center gap-2.5 w-full hover:bg-accent/50 rounded-md p-1.5 -m-1.5 transition-colors cursor-pointer",
            collapsed && "justify-center"
          )}
        >
          <Avatar className="h-7 w-7 bg-emerald-500">
            <AvatarFallback className="bg-emerald-500 text-white text-xs font-medium">B</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[13px] font-medium text-foreground truncate">Brent</p>
              <p className="text-[11px] text-muted-foreground truncate">CEO</p>
            </div>
          )}
        </button>
      </div>
    </div>
  )
}
