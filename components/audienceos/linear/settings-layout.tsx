"use client"

import React from "react"
import { SettingsSidebar, type SettingsGroup } from "./settings-sidebar"

interface SettingsLayoutProps {
  title: string
  description?: string
  groups: SettingsGroup[]
  activeSection: string
  onSectionChange: (sectionId: string) => void
  onBack?: () => void
  children: React.ReactNode
}

export function SettingsLayout({
  title,
  description,
  groups,
  activeSection,
  onSectionChange,
  onBack,
  children,
}: SettingsLayoutProps) {
  return (
    <div className="flex h-full">
      <SettingsSidebar
        groups={groups}
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        onBack={onBack}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">
          <header className="mb-8">
            <h1 className="text-2xl font-semibold text-foreground mb-2">{title}</h1>
            {description && (
              <p className="text-muted-foreground">{description}</p>
            )}
          </header>
          {children}
        </div>
      </div>
    </div>
  )
}

// Content section component for consistent styling
interface SettingsSectionProps {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}

export function SettingsSection({ title, action, children }: SettingsSectionProps) {
  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
