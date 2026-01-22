'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/audienceos/use-auth'
import { SettingsSidebar } from '@/components/audienceos/linear/settings-sidebar'
import { ChevronRight, Settings, Users, Lock, Bell, Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'

interface SettingsGroup {
  id: string
  label: string
  icon: React.ReactNode
  sections: Array<{
    id: string
    label: string
  }>
}

const settingsGroups: SettingsGroup[] = [
  {
    id: 'agency',
    label: 'Agency',
    icon: <Settings className="w-4 h-4" />,
    sections: [
      { id: 'profile', label: 'Profile' },
      { id: 'business-hours', label: 'Business Hours' },
      { id: 'pipeline-stages', label: 'Pipeline Stages' },
      { id: 'health-thresholds', label: 'Health Thresholds' },
    ],
  },
  {
    id: 'team',
    label: 'Team',
    icon: <Users className="w-4 h-4" />,
    sections: [
      { id: 'members', label: 'Team Members' },
      { id: 'invitations', label: 'Invitations' },
      { id: 'roles', label: 'Roles & Permissions' },
    ],
  },
  {
    id: 'preferences',
    label: 'Preferences',
    icon: <Bell className="w-4 h-4" />,
    sections: [
      { id: 'notifications', label: 'Notifications' },
      { id: 'display', label: 'Display' },
      { id: 'ai', label: 'AI Assistant' },
    ],
  },
  {
    id: 'security',
    label: 'Security',
    icon: <Lock className="w-4 h-4" />,
    sections: [
      { id: 'api-keys', label: 'API Keys' },
      { id: 'sessions', label: 'Sessions' },
      { id: 'audit-log', label: 'Audit Log' },
    ],
  },
]

export default function SettingsPage() {
  const { isLoading, isAuthenticated, agencyId } = useAuth()
  const [activeSection, setActiveSection] = useState('profile')
  const [loading, setLoading] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = '/login'
    }
  }, [isLoading, isAuthenticated])

  // Read URL query parameter for section
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const section = params.get('section')
    if (section) {
      setActiveSection(section)
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="text-muted-foreground">Loading settings...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex h-full gap-0 bg-background">
      {/* Sidebar */}
      <SettingsSidebar
        groups={settingsGroups}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Settings</h1>
            <p className="text-muted-foreground">
              Manage your agency configuration, team members, and preferences
            </p>
          </div>

          {/* Section content */}
          <div className="max-w-4xl">
            {activeSection === 'profile' && <AgencyProfileSection loading={loading} />}
            {activeSection === 'members' && <TeamMembersSection loading={loading} />}
            {activeSection === 'display' && <DisplaySection />}
            {activeSection === 'notifications' && (
              <div className="py-8 text-center text-muted-foreground">
                Notification preferences coming soon
              </div>
            )}
            {!['profile', 'members', 'notifications', 'display'].includes(activeSection) && (
              <div className="py-8 text-center text-muted-foreground">
                This section is under development
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Agency Profile Section Component
function AgencyProfileSection({ loading }: { loading: boolean }) {
  const { agencyId } = useAuth()
  const [formData, setFormData] = React.useState({
    name: '',
    timezone: 'UTC',
  })

  React.useEffect(() => {
    const fetchAgencySettings = async () => {
      try {
        const response = await fetch('/api/v1/settings/agency', { credentials: 'include' })
        if (response.ok) {
          const { data } = await response.json()
          setFormData({
            name: data.name || '',
            timezone: data.timezone || 'UTC',
          })
        }
      } catch (error) {
        console.error('Failed to fetch agency settings:', error)
      }
    }

    if (agencyId) {
      fetchAgencySettings()
    }
  }, [agencyId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/v1/settings/agency', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        // Show success message
        console.log('Agency settings updated')
      }
    } catch (error) {
      console.error('Failed to update agency settings:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Agency Profile</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Configure your agency name, timezone, and other basic settings.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Agency Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-border rounded-lg bg-background"
            placeholder="Your agency name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Timezone</label>
          <select
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
            className="w-full px-4 py-2 border border-border rounded-lg bg-background"
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="Europe/London">London</option>
            <option value="Europe/Paris">Paris</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}

// Display Section Component - Theme Toggle
function DisplaySection() {
  const { theme, setTheme } = useTheme()
  const { profile } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [saving, setSaving] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Save theme preference to database
  const handleThemeChange = async (newTheme: 'light' | 'dark') => {
    setTheme(newTheme)
    setSaving(true)

    try {
      await fetch('/api/v1/settings/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          category: 'display',
          preferences: { theme: newTheme },
        }),
      })
    } catch (error) {
      console.error('Failed to save theme preference:', error)
    } finally {
      setSaving(false)
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Display Settings</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Customize the appearance of your workspace
        </p>
      </div>

      <div className="space-y-4">
        {/* Theme Toggle */}
        <div>
          <label className="block text-sm font-medium mb-3">Theme</label>
          <div className="flex gap-3">
            <button
              onClick={() => handleThemeChange('light')}
              disabled={saving}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                theme === 'light'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-border/80'
              } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <Sun className="w-5 h-5" />
              <div className="text-left">
                <div className="font-medium">Light</div>
                <div className="text-xs text-muted-foreground">Clean, bright interface</div>
              </div>
            </button>

            <button
              onClick={() => handleThemeChange('dark')}
              disabled={saving}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                theme === 'dark'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-border/80'
              } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <Moon className="w-5 h-5" />
              <div className="text-left">
                <div className="font-medium">Dark</div>
                <div className="text-xs text-muted-foreground">Easy on the eyes</div>
              </div>
            </button>
          </div>
        </div>

        {saving && (
          <p className="text-sm text-muted-foreground">Saving preference...</p>
        )}
      </div>
    </div>
  )
}

// Team Members Section Component
function TeamMembersSection({ loading }: { loading: boolean }) {
  const { agencyId } = useAuth()
  const [users, setUsers] = React.useState<Array<any>>([])
  const [pageLoading, setPageLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/v1/settings/users?limit=50', { credentials: 'include' })
        if (response.ok) {
          const { data } = await response.json()
          setUsers(data)
        }
      } catch (error) {
        console.error('Failed to fetch users:', error)
      } finally {
        setPageLoading(false)
      }
    }

    if (agencyId) {
      fetchUsers()
    }
  }, [agencyId])

  if (pageLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading team members...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold mb-2">Team Members</h2>
          <p className="text-sm text-muted-foreground">
            Manage your agency team members and their roles.
          </p>
        </div>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
          Invite Member
        </button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-secondary">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Role</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
              <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  No team members yet
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-t border-border hover:bg-secondary/50">
                  <td className="px-4 py-3 text-sm">
                    {user.first_name} {user.last_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 rounded bg-secondary text-xs font-medium">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={user.is_active ? 'text-green-600' : 'text-red-600'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="p-1 hover:bg-secondary rounded text-muted-foreground">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
