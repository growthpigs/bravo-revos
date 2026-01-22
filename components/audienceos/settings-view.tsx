"use client"

import { SettingsLayout, SettingsContent } from "@/components/settings"

interface SettingsViewProps {
  onBack?: () => void
  onBrandClick?: () => void
}

export function SettingsView({ onBack, onBrandClick }: SettingsViewProps) {
  return (
    <SettingsLayout onBack={onBack} onBrandClick={onBrandClick}>
      <SettingsContent />
    </SettingsLayout>
  )
}
