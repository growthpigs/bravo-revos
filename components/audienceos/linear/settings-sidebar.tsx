"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { ChevronLeft, Users, Plus, Sparkles, Settings } from "lucide-react"

export interface SettingsSection {
  id: string
  label: string
}

export interface SettingsGroup {
  id: string
  label: string
  icon: React.ReactNode
  sections: SettingsSection[]
}

interface SettingsSidebarProps {
  groups: SettingsGroup[]
  activeSection: string
  onSectionChange: (sectionId: string) => void
  onBack?: () => void
  teams?: Array<{
    id: string
    name: string
    initials: string
    color: string
  }>
  onAddTeam?: () => void
}

export function SettingsSidebar({
  groups,
  activeSection,
  onSectionChange,
  onBack,
  teams = [],
  onAddTeam,
}: SettingsSidebarProps) {
  return (
    <div className="w-56 bg-card border-r border-border flex flex-col h-full">
      {/* Back button */}
      {onBack && (
        <div className="p-3 border-b border-border">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            Settings
          </button>
        </div>
      )}

      {/* Groups */}
      <div className="flex-1 overflow-y-auto p-3">
        {groups.map((group) => (
          <div key={group.id} className="mb-6">
            <div className="flex items-center gap-2 mb-2 px-2">
              <span className="w-4 h-4 text-muted-foreground">{group.icon}</span>
              <span className="text-xs font-medium text-foreground">{group.label}</span>
            </div>
            <nav className="space-y-0.5">
              {group.sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => onSectionChange(section.id)}
                  className={cn(
                    "block w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors cursor-pointer",
                    activeSection === section.id
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  )}
                >
                  {section.label}
                </button>
              ))}
            </nav>
          </div>
        ))}

        {/* Teams section */}
        {teams.length > 0 && (
          <div className="mb-6 pt-3 border-t border-border">
            <div className="flex items-center gap-2 mb-2 px-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">Teams</span>
            </div>
            <div className="space-y-0.5">
              {teams.map((team) => (
                <button
                  key={team.id}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary/50 hover:text-foreground rounded-md transition-colors cursor-pointer"
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded flex items-center justify-center text-[10px] font-medium text-white",
                      team.color
                    )}
                  >
                    {team.initials}
                  </div>
                  <span className="flex-1 text-left truncate">{team.name}</span>
                </button>
              ))}
              {onAddTeam && (
                <button
                  onClick={onAddTeam}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary/50 hover:text-foreground rounded-md transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add team</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Default groups for AudienceOS Intelligence Center
// Note: Account section removed - use main Settings nav instead
// Note: "training-data" was renamed from "knowledge" to avoid collision with main nav's Knowledge Base
export const intelligenceSettingsGroups: SettingsGroup[] = [
  {
    id: "assistant",
    label: "Assistant",
    icon: <Sparkles className="w-4 h-4" />,
    sections: [
      { id: "overview", label: "Overview" },
      { id: "history", label: "Chat History" },
      { id: "activity", label: "Activity" },
    ],
  },
  {
    id: "configuration",
    label: "Configuration",
    icon: <Settings className="w-4 h-4" />,
    sections: [
      { id: "cartridges", label: "Training Cartridges" },
      { id: "prompts", label: "Custom Prompts" },
      { id: "training-data", label: "AI Training Data" },
    ],
  },
]
