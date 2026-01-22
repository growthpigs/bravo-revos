import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { fetchWithCsrf } from '@/lib/csrf'
import type {
  AgencySettings,
  UserPreferences,
  TeamMember,
  UserInvitation,
  SettingsSection,
  TokenUsageStats,
  AuditLogEntry,
} from '@/types/settings'
import type { UserRole } from '@/types/audienceos/database'

// =============================================================================
// SETTINGS STORE
// =============================================================================

interface SettingsState {
  // Current section
  activeSection: SettingsSection

  // Agency settings
  agencySettings: AgencySettings | null
  isLoadingAgency: boolean
  isSavingAgency: boolean

  // User preferences
  userPreferences: UserPreferences | null
  isLoadingPreferences: boolean
  isSavingPreferences: boolean

  // Team members
  teamMembers: TeamMember[]
  selectedMemberId: string | null
  isLoadingMembers: boolean

  // Invitations
  invitations: UserInvitation[]
  isLoadingInvitations: boolean
  isSendingInvitation: boolean

  // AI token usage
  tokenUsage: TokenUsageStats | null
  isLoadingTokenUsage: boolean

  // Audit log
  auditLog: AuditLogEntry[]
  isLoadingAuditLog: boolean
  auditLogCursor: string | null

  // Unsaved changes tracking
  hasUnsavedChanges: boolean

  // Actions
  setActiveSection: (section: SettingsSection) => void

  // Agency settings actions
  setAgencySettings: (settings: AgencySettings) => void
  updateAgencySettings: (updates: Partial<AgencySettings>) => void
  setLoadingAgency: (loading: boolean) => void
  setSavingAgency: (saving: boolean) => void

  // User preferences actions
  setUserPreferences: (preferences: UserPreferences) => void
  updateUserPreferences: (updates: Partial<UserPreferences>) => void
  setLoadingPreferences: (loading: boolean) => void
  setSavingPreferences: (saving: boolean) => void

  // Team member actions
  setTeamMembers: (members: TeamMember[]) => void
  addTeamMember: (member: TeamMember) => void
  updateTeamMember: (id: string, updates: Partial<TeamMember>) => void
  removeTeamMember: (id: string) => void
  setSelectedMember: (id: string | null) => void
  setLoadingMembers: (loading: boolean) => void

  // Invitation actions
  setInvitations: (invitations: UserInvitation[]) => void
  addInvitation: (invitation: UserInvitation) => void
  removeInvitation: (id: string) => void
  setLoadingInvitations: (loading: boolean) => void
  setSendingInvitation: (sending: boolean) => void

  // Token usage actions
  setTokenUsage: (usage: TokenUsageStats) => void
  setLoadingTokenUsage: (loading: boolean) => void

  // Audit log actions
  setAuditLog: (entries: AuditLogEntry[]) => void
  appendAuditLog: (entries: AuditLogEntry[]) => void
  setLoadingAuditLog: (loading: boolean) => void
  setAuditLogCursor: (cursor: string | null) => void

  // Unsaved changes
  setHasUnsavedChanges: (hasChanges: boolean) => void

  // Reset
  reset: () => void

  // API Actions
  fetchAgencySettings: () => Promise<void>
  saveAgencySettings: (updates: Partial<AgencySettings>) => Promise<boolean>
  fetchTeamMembers: () => Promise<void>
  fetchInvitations: () => Promise<void>
  sendInvitation: (email: string, role: UserRole) => Promise<boolean>
  revokeInvitation: (id: string) => Promise<boolean>
}

const defaultUserPreferences: UserPreferences = {
  notifications: {
    email_alerts: true,
    email_tickets: true,
    email_mentions: true,
    slack_channel_id: undefined,
    digest_mode: false,
    quiet_hours_start: undefined,
    quiet_hours_end: undefined,
    muted_clients: [],
  },
  ai: {
    assistant_name: 'Chi',
    response_tone: 'professional',
    response_length: 'detailed',
  },
  display: {
    theme: 'dark',
    sidebar_collapsed: false,
    default_view: 'dashboard',
  },
}

export const useSettingsStore = create<SettingsState>()(
  devtools(
    (set) => ({
      // Initial state
      activeSection: 'agency_profile',

      agencySettings: null,
      isLoadingAgency: false,
      isSavingAgency: false,

      userPreferences: null,
      isLoadingPreferences: false,
      isSavingPreferences: false,

      teamMembers: [],
      selectedMemberId: null,
      isLoadingMembers: false,

      invitations: [],
      isLoadingInvitations: false,
      isSendingInvitation: false,

      tokenUsage: null,
      isLoadingTokenUsage: false,

      auditLog: [],
      isLoadingAuditLog: false,
      auditLogCursor: null,

      hasUnsavedChanges: false,

      // Actions
      setActiveSection: (activeSection) => set({ activeSection }),

      // Agency settings
      setAgencySettings: (agencySettings) => set({ agencySettings }),
      updateAgencySettings: (updates) =>
        set((state) => ({
          agencySettings: state.agencySettings
            ? { ...state.agencySettings, ...updates }
            : null,
          hasUnsavedChanges: true,
        })),
      setLoadingAgency: (isLoadingAgency) => set({ isLoadingAgency }),
      setSavingAgency: (isSavingAgency) => set({ isSavingAgency }),

      // User preferences
      setUserPreferences: (userPreferences) => set({ userPreferences }),
      updateUserPreferences: (updates) =>
        set((state) => ({
          userPreferences: state.userPreferences
            ? { ...state.userPreferences, ...updates }
            : defaultUserPreferences,
          hasUnsavedChanges: true,
        })),
      setLoadingPreferences: (isLoadingPreferences) => set({ isLoadingPreferences }),
      setSavingPreferences: (isSavingPreferences) => set({ isSavingPreferences }),

      // Team members
      setTeamMembers: (teamMembers) => set({ teamMembers }),
      addTeamMember: (member) =>
        set((state) => ({ teamMembers: [...state.teamMembers, member] })),
      updateTeamMember: (id, updates) =>
        set((state) => ({
          teamMembers: state.teamMembers.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        })),
      removeTeamMember: (id) =>
        set((state) => ({
          teamMembers: state.teamMembers.filter((m) => m.id !== id),
          selectedMemberId: state.selectedMemberId === id ? null : state.selectedMemberId,
        })),
      setSelectedMember: (selectedMemberId) => set({ selectedMemberId }),
      setLoadingMembers: (isLoadingMembers) => set({ isLoadingMembers }),

      // Invitations
      setInvitations: (invitations) => set({ invitations }),
      addInvitation: (invitation) =>
        set((state) => ({ invitations: [...state.invitations, invitation] })),
      removeInvitation: (id) =>
        set((state) => ({
          invitations: state.invitations.filter((i) => i.id !== id),
        })),
      setLoadingInvitations: (isLoadingInvitations) => set({ isLoadingInvitations }),
      setSendingInvitation: (isSendingInvitation) => set({ isSendingInvitation }),

      // Token usage
      setTokenUsage: (tokenUsage) => set({ tokenUsage }),
      setLoadingTokenUsage: (isLoadingTokenUsage) => set({ isLoadingTokenUsage }),

      // Audit log
      setAuditLog: (auditLog) => set({ auditLog }),
      appendAuditLog: (entries) =>
        set((state) => ({ auditLog: [...state.auditLog, ...entries] })),
      setLoadingAuditLog: (isLoadingAuditLog) => set({ isLoadingAuditLog }),
      setAuditLogCursor: (auditLogCursor) => set({ auditLogCursor }),

      // Unsaved changes
      setHasUnsavedChanges: (hasUnsavedChanges) => set({ hasUnsavedChanges }),

      // Reset
      reset: () =>
        set({
          activeSection: 'agency_profile',
          agencySettings: null,
          isLoadingAgency: false,
          isSavingAgency: false,
          userPreferences: null,
          isLoadingPreferences: false,
          isSavingPreferences: false,
          teamMembers: [],
          selectedMemberId: null,
          isLoadingMembers: false,
          invitations: [],
          isLoadingInvitations: false,
          isSendingInvitation: false,
          tokenUsage: null,
          isLoadingTokenUsage: false,
          auditLog: [],
          isLoadingAuditLog: false,
          auditLogCursor: null,
          hasUnsavedChanges: false,
        }),

      // API Actions
      fetchAgencySettings: async () => {
        set({ isLoadingAgency: true })
        try {
          const response = await fetch('/api/v1/settings/agency', { credentials: 'include' })
          if (!response.ok) {
            throw new Error('Failed to fetch agency settings')
          }
          const { data } = await response.json()
          set({ agencySettings: data, isLoadingAgency: false })
        } catch (error) {
          console.error('Failed to fetch agency settings:', error)
          set({ isLoadingAgency: false })
        }
      },

      saveAgencySettings: async (updates) => {
        set({ isSavingAgency: true })
        try {
          const response = await fetchWithCsrf('/api/v1/settings/agency', {
            method: 'PATCH',
            body: JSON.stringify(updates),
          })
          if (!response.ok) {
            throw new Error('Failed to save agency settings')
          }
          const { data } = await response.json()
          set({ agencySettings: data, isSavingAgency: false, hasUnsavedChanges: false })
          return true
        } catch (error) {
          console.error('Failed to save agency settings:', error)
          set({ isSavingAgency: false })
          return false
        }
      },

      fetchTeamMembers: async () => {
        set({ isLoadingMembers: true })
        try {
          const response = await fetch('/api/v1/settings/users', { credentials: 'include' })
          if (!response.ok) {
            throw new Error('Failed to fetch team members')
          }
          const { data } = await response.json()
          // Transform API response to TeamMember format
          const members: TeamMember[] = (data || []).map((u: Record<string, unknown>) => ({
            id: u.id as string,
            email: u.email as string,
            first_name: (u.first_name as string) || '',
            last_name: (u.last_name as string) || '',
            role: u.role as UserRole,
            avatar_url: (u.avatar_url as string) || null,
            is_active: u.is_active as boolean,
            last_active_at: (u.last_active_at as string) || null,
            created_at: u.created_at as string,
          }))
          set({ teamMembers: members, isLoadingMembers: false })
        } catch (error) {
          console.error('Failed to fetch team members:', error)
          set({ isLoadingMembers: false })
        }
      },

      fetchInvitations: async () => {
        set({ isLoadingInvitations: true })
        try {
          const response = await fetch('/api/v1/settings/invitations', { credentials: 'include' })
          if (!response.ok) {
            throw new Error('Failed to fetch invitations')
          }
          const { invitations: data } = await response.json()
          // Transform API response to UserInvitation format
          const invitations: UserInvitation[] = (data || []).map((inv: Record<string, unknown>) => ({
            id: inv.id as string,
            agency_id: inv.agency_id as string,
            email: inv.email as string,
            role: inv.role as UserRole,
            token: inv.token as string,
            expires_at: inv.expires_at as string,
            accepted_at: (inv.accepted_at as string) || null,
            created_by: inv.created_by as string,
            created_at: inv.created_at as string,
            is_expired: inv.is_expired as boolean | undefined,
          }))
          set({ invitations, isLoadingInvitations: false })
        } catch (error) {
          console.error('Failed to fetch invitations:', error)
          set({ isLoadingInvitations: false })
        }
      },

      sendInvitation: async (email, role) => {
        set({ isSendingInvitation: true })
        try {
          const response = await fetchWithCsrf('/api/v1/settings/invitations', {
            method: 'POST',
            body: JSON.stringify({ email, role }),
          })
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to send invitation')
          }
          const { invitation } = await response.json()
          // Add to local state
          const newInvitation: UserInvitation = {
            id: invitation.id,
            agency_id: invitation.agency_id,
            email: invitation.email,
            role: invitation.role,
            token: invitation.token,
            expires_at: invitation.expires_at,
            accepted_at: null,
            created_by: invitation.created_by,
            created_at: invitation.created_at,
          }
          set((state) => ({
            invitations: [newInvitation, ...state.invitations],
            isSendingInvitation: false,
          }))
          return true
        } catch (error) {
          console.error('Failed to send invitation:', error)
          set({ isSendingInvitation: false })
          return false
        }
      },

      revokeInvitation: async (id) => {
        try {
          const response = await fetchWithCsrf(`/api/v1/settings/invitations/${id}`, {
            method: 'DELETE',
          })
          if (!response.ok) {
            throw new Error('Failed to revoke invitation')
          }
          set((state) => ({
            invitations: state.invitations.filter((i) => i.id !== id),
          }))
          return true
        } catch (error) {
          console.error('Failed to revoke invitation:', error)
          return false
        }
      },
    }),
    { name: 'settings-store' }
  )
)
