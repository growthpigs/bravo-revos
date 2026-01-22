/**
 * Settings Types for AudienceOS Command Center
 * Based on features/settings.md spec
 */

import type { UserRole } from './database'

// =============================================================================
// AGENCY SETTINGS
// =============================================================================

export interface BusinessHours {
  start: string // HH:mm format
  end: string // HH:mm format
  days?: string[] // e.g. ['monday', 'tuesday', ...]
}

export interface HealthThresholds {
  yellow_days: number
  red_days: number
}

export interface AgencySettings {
  id: string
  name: string
  slug: string
  logo_url: string | null
  domain: string | null
  timezone: string
  business_hours: BusinessHours | null
  pipeline_stages: string[]
  health_thresholds: HealthThresholds
  // AI settings (new fields from spec)
  ai_assistant_name?: string
  ai_response_tone?: 'professional' | 'casual' | 'technical'
  ai_response_length?: 'brief' | 'detailed' | 'comprehensive'
  ai_enabled_features?: string[]
  ai_token_limit?: number
  ai_current_usage?: number
}

// =============================================================================
// USER PREFERENCES
// =============================================================================

export interface NotificationPreferences {
  email_alerts: boolean
  email_tickets: boolean
  email_mentions: boolean
  slack_channel_id?: string
  digest_mode: boolean
  digest_time?: string // HH:mm format
  digest_days?: string[] // e.g. ['monday', 'tuesday', ...]
  quiet_hours_start?: string // HH:mm format
  quiet_hours_end?: string // HH:mm format
  timezone?: string // e.g. 'America/New_York'
  muted_clients: string[] // client IDs
}

export interface AIPreferences {
  assistant_name: string
  response_tone: 'professional' | 'casual' | 'technical'
  response_length: 'brief' | 'detailed' | 'comprehensive'
}

export interface DisplayPreferences {
  theme: 'light' | 'dark' | 'system'
  sidebar_collapsed: boolean
  default_view: string
}

export interface UserPreferences {
  notifications: NotificationPreferences
  ai: AIPreferences
  display: DisplayPreferences
}

// =============================================================================
// USER MANAGEMENT
// =============================================================================

export interface TeamMember {
  id: string
  agency_id: string
  email: string
  first_name: string
  last_name: string
  role: UserRole
  avatar_url: string | null
  is_active: boolean
  last_active_at: string | null
  created_at: string
  // RBAC fields (from role table join)
  role_id?: string
  hierarchy_level?: number
  // Computed fields
  full_name?: string
  client_count?: number
}

export interface UserInvitation {
  id: string
  agency_id: string
  email: string
  role: UserRole
  token: string
  expires_at: string
  accepted_at: string | null
  created_by: string
  created_at: string
  // Computed
  is_expired?: boolean
  inviter_name?: string
}

// =============================================================================
// SETTINGS SECTIONS & PERMISSIONS
// =============================================================================

export type SettingsSection =
  | 'agency_profile'
  | 'team_members'
  | 'ai_configuration'
  | 'personal_preferences'
  | 'notifications'
  | 'display_preferences'
  | 'pipeline'
  | 'integrations'
  | 'security'
  | 'audit_log'

export interface SettingsPermission {
  section: SettingsSection
  action: 'read' | 'write' | 'admin'
  roles: UserRole[]
}

export const SETTINGS_PERMISSIONS: SettingsPermission[] = [
  { section: 'agency_profile', action: 'read', roles: ['owner', 'admin', 'manager', 'member'] },
  { section: 'agency_profile', action: 'write', roles: ['owner', 'admin'] },
  { section: 'team_members', action: 'read', roles: ['owner', 'admin', 'manager', 'member'] },
  { section: 'team_members', action: 'write', roles: ['owner', 'admin'] },
  { section: 'ai_configuration', action: 'read', roles: ['owner', 'admin', 'manager', 'member'] },
  { section: 'ai_configuration', action: 'write', roles: ['owner', 'admin'] },
  { section: 'personal_preferences', action: 'read', roles: ['owner', 'admin', 'manager', 'member'] },
  { section: 'personal_preferences', action: 'write', roles: ['owner', 'admin', 'manager', 'member'] },
  { section: 'notifications', action: 'read', roles: ['owner', 'admin', 'manager', 'member'] },
  { section: 'notifications', action: 'write', roles: ['owner', 'admin', 'manager', 'member'] },
  { section: 'display_preferences', action: 'read', roles: ['owner', 'admin', 'manager', 'member'] },
  { section: 'display_preferences', action: 'write', roles: ['owner', 'admin', 'manager', 'member'] },
  { section: 'pipeline', action: 'read', roles: ['owner', 'admin', 'manager', 'member'] },
  { section: 'pipeline', action: 'write', roles: ['owner', 'admin'] },
  { section: 'integrations', action: 'read', roles: ['owner', 'admin', 'manager', 'member'] },
  { section: 'integrations', action: 'write', roles: ['owner', 'admin'] },
  { section: 'security', action: 'read', roles: ['owner', 'admin', 'manager', 'member'] },  // All users need logout access
  { section: 'security', action: 'write', roles: ['owner', 'admin'] },
  { section: 'audit_log', action: 'read', roles: ['owner', 'admin'] },
]

// =============================================================================
// VALIDATION
// =============================================================================

export interface ValidationResult {
  field: string
  type: 'error' | 'warning' | 'info'
  message: string
}

export interface SettingsValidationResult {
  isValid: boolean
  errors: ValidationResult[]
  warnings: ValidationResult[]
}

// =============================================================================
// AI TOKEN USAGE
// =============================================================================

export interface TokenUsageStats {
  current_usage: number
  limit: number
  usage_by_feature: Record<string, number>
  daily_usage: Array<{ date: string; tokens: number }>
  percent_used: number
}

// =============================================================================
// AUDIT LOG
// =============================================================================

export interface AuditLogEntry {
  id: string
  agency_id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string
  changes: Record<string, { before: unknown; after: unknown }>
  ip_address?: string
  created_at: string
  // Computed
  user_name?: string
}
