"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useSettingsStore } from "@/stores/settings-store"
import { useAuthStore } from "@/lib/store"
import type { SettingsSection } from "@/types/settings"
import { SETTINGS_PERMISSIONS } from "@/types/settings"
import { ChevronLeft, Building2, User, Users, LogOut, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase"

// Workspace settings items (admin/agency-level)
const workspaceItems: Array<{
  id: SettingsSection
  label: string
  adminOnly?: boolean
}> = [
  { id: "agency_profile", label: "General" },
  { id: "team_members", label: "Members", adminOnly: true },
  { id: "pipeline", label: "Pipeline Stages", adminOnly: true },
  { id: "ai_configuration", label: "AI Configuration", adminOnly: true },
  { id: "audit_log", label: "Audit Log", adminOnly: true },
]

// My Account settings items (user-level) - Security removed, Sign Out is now a direct button
const accountItems: Array<{
  id: SettingsSection
  label: string
}> = [
  { id: "notifications", label: "Notifications" },
  { id: "display_preferences", label: "Display" },
]

interface SettingsLayoutProps {
  children: React.ReactNode
  onBack?: () => void
  onBrandClick?: () => void
}

export function SettingsLayout({ children, onBack, onBrandClick }: SettingsLayoutProps) {
  const { activeSection, setActiveSection, hasUnsavedChanges } = useSettingsStore()
  const { user, clear: clearAuth } = useAuthStore()
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const isAdmin = user?.role === "admin" || user?.role === "owner"

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      clearAuth()
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
      setIsSigningOut(false)
    }
  }

  // Check if user can access a section
  const canAccessSection = (section: SettingsSection): boolean => {
    const permission = SETTINGS_PERMISSIONS.find(
      (p) => p.section === section && p.action === "read"
    )
    if (!permission) return false
    return permission.roles.includes(user?.role || "member")
  }

  // Filter workspace items based on permissions
  const visibleWorkspaceItems = workspaceItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false
    return canAccessSection(item.id)
  })

  // Filter account items based on permissions
  const visibleAccountItems = accountItems.filter((item) => canAccessSection(item.id))

  const handleSectionChange = (section: SettingsSection) => {
    if (hasUnsavedChanges) {
      // TODO: Show confirmation dialog
    }
    setActiveSection(section)
  }

  return (
    <div className="flex h-full">
      {/* Settings Sidebar - Linear Style */}
      <aside className="w-64 bg-white dark:bg-slate-950 border-r border-gray-200 dark:border-slate-800 flex flex-col">
        {/* Header with back button */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-800">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 dark:text-slate-400 text-sm hover:text-gray-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Settings
          </button>
        </div>

        {/* Scrollable navigation */}
        <div className="flex-1 overflow-y-auto">
          {/* Workspace Section */}
          <div className="p-4">
            <div className="flex items-center mb-4">
              <Building2 className="w-4 h-4 mr-2 text-gray-500 dark:text-slate-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Workspace</span>
            </div>

            <nav className="space-y-1">
              {visibleWorkspaceItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSectionChange(item.id)}
                  className={cn(
                    "block w-full text-left px-3 py-2 text-sm rounded-md transition-colors cursor-pointer",
                      activeSection === item.id
                        ? "bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-slate-100 font-medium"
                        : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-200"
                  )}
                >
                  {item.label}
                </button>
              ))}
              {onBrandClick && (
                <button
                  onClick={onBrandClick}
                  className="block w-full text-left px-3 py-2 text-sm rounded-md transition-colors cursor-pointer text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-200"
                >
                  Brand
                </button>
              )}
            </nav>
          </div>

          {/* My Account Section */}
          {visibleAccountItems.length > 0 && (
            <div className="p-4 border-t border-gray-200 dark:border-slate-800">
              <div className="flex items-center mb-4">
                <User className="w-4 h-4 mr-2 text-gray-500 dark:text-slate-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300">My Account</span>
              </div>

              <nav className="space-y-1">
                {visibleAccountItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSectionChange(item.id)}
                    className={cn(
                      "block w-full text-left px-3 py-2 text-sm rounded-md transition-colors cursor-pointer",
                      activeSection === item.id
                        ? "bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-slate-100 font-medium"
                        : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-200"
                    )}
                  >
                    {item.label}
                  </button>
                ))}

                {/* Direct Sign Out button */}
                <button
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="flex items-center w-full text-left px-3 py-2 text-sm rounded-md transition-colors cursor-pointer text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  {isSigningOut ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <LogOut className="w-4 h-4 mr-2" />
                  )}
                  {isSigningOut ? "Signing out..." : "Sign Out"}
                </button>
              </nav>
            </div>
          )}

          {/* Teams Section (placeholder for future) */}
          <div className="p-4 border-t border-gray-200 dark:border-slate-800">
            <div className="flex items-center mb-4">
              <Users className="w-4 h-4 mr-2 text-gray-500 dark:text-slate-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Teams</span>
            </div>

            <button
              onClick={() => setActiveSection("team_members")}
              className={cn(
                "w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors cursor-pointer",
                activeSection === "team_members"
                  ? "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
              )}
            >
              <div className="w-6 h-6 bg-blue-500 rounded mr-3 flex items-center justify-center">
                <span className="text-white text-xs font-medium">A</span>
              </div>
              {user?.agency_id ? "Agency Team" : "Default Team"}
            </button>
          </div>
        </div>

        {/* Unsaved changes indicator */}
        {hasUnsavedChanges && (
          <div className="p-4 border-t border-gray-200 dark:border-slate-800">
            <div className="flex items-center text-xs text-amber-600 dark:text-amber-500">
              <div className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-600 animate-pulse mr-2" />
              Unsaved changes
            </div>
          </div>
        )}
      </aside>

      {/* Settings Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8 pb-[150px]">
          {children}
        </div>
      </main>
    </div>
  )
}
