"use client"

import { useSettingsStore } from "@/stores/settings-store"
import { AgencyProfileSection } from "./sections/agency-profile-section"
import { TeamMembersSection } from "./sections/team-members-section"
import { AIConfigurationSection } from "./sections/ai-configuration-section"
import { NotificationsSection } from "./sections/notifications-section"
import { PipelineSection } from "./sections/pipeline-section"
import { AuditLogSection } from "./sections/audit-log-section"
import { DisplayPreferencesSection } from "./sections/display-preferences-section"
// Note: Security section removed - Sign Out is now a direct button in the sidebar

export function SettingsContent() {
  const { activeSection } = useSettingsStore()

  switch (activeSection) {
    case "agency_profile":
      return <AgencyProfileSection />
    case "team_members":
      return <TeamMembersSection />
    case "ai_configuration":
      return <AIConfigurationSection />
    case "notifications":
      return <NotificationsSection />
    case "display_preferences":
      return <DisplayPreferencesSection />
    case "pipeline":
      return <PipelineSection />
    case "audit_log":
      return <AuditLogSection />
    default:
      return <AgencyProfileSection />
  }
}
