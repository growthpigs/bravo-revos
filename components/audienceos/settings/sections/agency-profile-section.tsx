"use client"

import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useSettingsStore } from "@/stores/settings-store"
import { useAuthStore } from "@/lib/store"
import { fetchWithCsrf } from "@/lib/csrf"
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react"
import type { AgencySettings } from "@/types/settings"

// Common timezones (matching API validation)
const TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
]

// Setting row component - matches Linear pattern
function SettingRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between py-4 border-b border-gray-100 last:border-0">
      <div className="flex-1 pr-8">
        <h4 className="text-sm font-medium text-gray-900">{label}</h4>
        {description && (
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

export function AgencyProfileSection() {
  const { toast } = useToast()
  const { user } = useAuthStore()
  const {
    agencySettings,
    setAgencySettings,
    updateAgencySettings,
    setHasUnsavedChanges,
  } = useSettingsStore()

  const isAdmin = user?.role === "admin" || user?.role === "owner"

  // Local form state
  const [formData, setFormData] = useState<Partial<AgencySettings>>({})
  const [autoSave, setAutoSave] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch agency settings from API
  const fetchAgencySettings = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/v1/settings/agency', {
        credentials: 'include',
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to load agency settings')
      }

      const { data } = await response.json()
      setAgencySettings(data)
      setFormData(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load agency settings'
      console.error('[AgencyProfileSection] Error loading settings:', message)
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [setAgencySettings])

  // Load settings on mount
  useEffect(() => {
    fetchAgencySettings()
  }, [fetchAgencySettings])

  // Sync form data with store when agencySettings changes externally
  useEffect(() => {
    if (agencySettings && !isLoading) {
      setFormData(agencySettings)
    }
  }, [agencySettings, isLoading])

  const handleInputChange = (field: keyof AgencySettings, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setHasUnsavedChanges(true)
  }

  const handleBusinessHoursChange = (field: "start" | "end", value: string) => {
    setFormData((prev) => ({
      ...prev,
      business_hours: {
        ...(prev.business_hours || { start: "09:00", end: "17:00", days: [] }),
        [field]: value,
      },
    }))
    setHasUnsavedChanges(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      const response = await fetchWithCsrf('/api/v1/settings/agency', {
        method: 'PATCH',
        body: JSON.stringify({
          name: formData.name,
          timezone: formData.timezone,
          business_hours: formData.business_hours,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to save agency settings')
      }

      const { data } = await response.json()
      updateAgencySettings(data)
      setFormData(data)
      setHasUnsavedChanges(false)

      toast({
        title: "Settings saved",
        description: "Agency profile has been updated successfully.",
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save agency settings'
      console.error('[AgencyProfileSection] Error saving settings:', message)
      setError(message)
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error && !formData.name) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-foreground mb-1">
              Failed to Load Agency Settings
            </h2>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchAgencySettings}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Page Header - Linear Style */}
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">General</h1>
        <p className="text-gray-600">Manage your agency settings and preferences.</p>
      </header>

      {/* Settings Sections */}
      <div className="space-y-8">
        {/* Agency Information */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Agency Information</h3>

          <SettingRow
            label="Agency name"
            description="The name of your agency as it appears across the platform."
          >
            <Input
              value={formData.name || ""}
              onChange={(e) => handleInputChange("name", e.target.value)}
              disabled={!isAdmin}
              className="w-64 bg-white border-gray-300"
            />
          </SettingRow>

          <SettingRow
            label="URL slug"
            description="Your agency's unique identifier in URLs."
          >
            <Input
              value={formData.slug || ""}
              onChange={(e) => handleInputChange("slug", e.target.value)}
              disabled={!isAdmin}
              className="w-64 bg-white border-gray-300"
            />
          </SettingRow>

          <SettingRow
            label="Custom domain"
            description="Your agency's custom domain for the platform."
          >
            <Input
              value={formData.domain || ""}
              onChange={(e) => handleInputChange("domain", e.target.value)}
              disabled={!isAdmin}
              placeholder="youragency.com"
              className="w-64 bg-white border-gray-300"
            />
          </SettingRow>
        </section>

        {/* Timezone & Hours */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Timezone & Business Hours</h3>

          <SettingRow
            label="Timezone"
            description="Set your agency's primary timezone for scheduling and reports."
          >
            <Select
              value={formData.timezone}
              onValueChange={(value) => handleInputChange("timezone", value)}
              disabled={!isAdmin}
            >
              <SelectTrigger className="w-64 bg-white border-gray-300">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>

          <SettingRow
            label="Business hours start"
            description="When your agency's business day begins."
          >
            <Input
              type="time"
              value={formData.business_hours?.start || "09:00"}
              onChange={(e) => handleBusinessHoursChange("start", e.target.value)}
              disabled={!isAdmin}
              className="w-32 bg-white border-gray-300"
            />
          </SettingRow>

          <SettingRow
            label="Business hours end"
            description="When your agency's business day ends."
          >
            <Input
              type="time"
              value={formData.business_hours?.end || "17:00"}
              onChange={(e) => handleBusinessHoursChange("end", e.target.value)}
              disabled={!isAdmin}
              className="w-32 bg-white border-gray-300"
            />
          </SettingRow>
        </section>

        {/* Preferences */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Preferences</h3>

          <SettingRow
            label="Auto-save changes"
            description="Automatically save changes as you make them."
          >
            <Switch
              checked={autoSave}
              onCheckedChange={setAutoSave}
            />
          </SettingRow>
        </section>
      </div>

      {/* Error banner (if error occurred while data is loaded) */}
      {error && formData.name && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {isAdmin && !autoSave && (
        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={() => {
              if (agencySettings) {
                setFormData(agencySettings)
                setHasUnsavedChanges(false)
                setError(null)
              }
            }}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
