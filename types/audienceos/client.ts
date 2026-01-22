/**
 * Unified Client Types
 * Bridge between database schema and UI components
 */

import type { Database, HealthStatus as DBHealthStatus } from './database'

// Database row type
export type ClientRow = Database['public']['Tables']['client']['Row']
export type ClientInsert = Database['public']['Tables']['client']['Insert']
export type ClientUpdate = Database['public']['Tables']['client']['Update']

// UI-compatible health status (maps from DB enum)
export type UIHealthStatus = 'Green' | 'Yellow' | 'Red' | 'Blocked'

// Pipeline stages (matches mock-data.ts)
export type Stage = 'Onboarding' | 'Installation' | 'Audit' | 'Live' | 'Needs Support' | 'Off-boarding'

// Owner type (will be replaced by user assignments)
export type Owner = 'Brent' | 'Roderic' | 'Trevor' | 'Chase'

// Tier for client categorization
export type Tier = 'Enterprise' | 'Core' | 'Starter'

// Blocker types for onboarding
export type BlockerType = 'WAITING ON ACCESS' | 'WAITING ON DNS' | 'DATA LAYER ERROR' | 'CODE NOT INSTALLED' | null

// Onboarding data structure (stored as JSONB or separate fields)
export interface OnboardingData {
  shopifyUrl?: string
  gtmContainerId?: string
  metaPixelId?: string
  klaviyoApiKey?: string
  submittedAt?: string
  contactEmail?: string
  metaAccessVerified?: boolean
  gtmAccessVerified?: boolean
  shopifyAccessVerified?: boolean
  accessGrants?: {
    meta: boolean
    gtm: boolean
    shopify: boolean
  }
}

// User assignment from DB join
export interface ClientAssignment {
  id: string
  role: 'account_manager' | 'strategist' | 'support' | 'analyst'
  user: {
    id: string
    first_name: string
    last_name: string
    avatar_url: string | null
  }
}

// Unified Client type for UI components
export interface Client {
  // Core DB fields
  id: string
  name: string
  stage: Stage
  healthStatus: UIHealthStatus
  daysInStage: number
  contactEmail: string | null
  contactName: string | null
  notes: string | null
  tags: string[] | null
  isActive: boolean
  installDate: string | null
  totalSpend: number | null
  lifetimeValue: number | null
  createdAt: string
  updatedAt: string

  // UI display fields (some derived, some from extensions)
  logo?: string // Default avatar or uploaded
  tier?: Tier
  blocker?: BlockerType
  onboardingData?: OnboardingData

  // Joined/computed data
  assignments?: ClientAssignment[]
  primaryOwner?: string // Derived from assignments
  supportTicketCount?: number
  lastCommunication?: string
}

// Adapter: Transform DB row to UI Client
export function adaptClientFromDB(
  row: ClientRow,
  options?: {
    assignments?: ClientAssignment[]
    ticketCount?: number
    lastComm?: string
  }
): Client {
  return {
    // Map DB fields directly
    id: row.id,
    name: row.name,
    stage: row.stage as Stage,
    healthStatus: mapHealthStatus(row.health_status),
    daysInStage: row.days_in_stage,
    contactEmail: row.contact_email,
    contactName: row.contact_name,
    notes: row.notes,
    tags: row.tags,
    isActive: row.is_active,
    installDate: row.install_date,
    totalSpend: row.total_spend,
    lifetimeValue: row.lifetime_value,
    createdAt: row.created_at,
    updatedAt: row.updated_at,

    // UI defaults (can be extended later)
    logo: undefined, // Will use initials avatar
    tier: 'Core', // Default tier
    blocker: null,
    onboardingData: undefined,

    // Optional joined data
    assignments: options?.assignments,
    primaryOwner: options?.assignments?.[0]?.user
      ? `${options.assignments[0].user.first_name} ${options.assignments[0].user.last_name}`
      : undefined,
    supportTicketCount: options?.ticketCount,
    lastCommunication: options?.lastComm,
  }
}

// Map DB health status to UI health status
function mapHealthStatus(dbStatus: DBHealthStatus): UIHealthStatus {
  switch (dbStatus) {
    case 'green':
      return 'Green'
    case 'yellow':
      return 'Yellow'
    case 'red':
      return 'Red'
    default:
      return 'Green'
  }
}

// Map UI health status to DB health status (for mutations)
export function mapHealthStatusToDB(uiStatus: UIHealthStatus): DBHealthStatus {
  switch (uiStatus) {
    case 'Green':
      return 'green'
    case 'Yellow':
      return 'yellow'
    case 'Red':
    case 'Blocked':
      return 'red'
    default:
      return 'green'
  }
}

// Default stages for pipeline
export const PIPELINE_STAGES: Stage[] = [
  'Onboarding',
  'Installation',
  'Audit',
  'Live',
  'Needs Support',
  'Off-boarding',
]

// Owner list (temporary until we use real user assignments)
export const OWNERS: Owner[] = ['Brent', 'Roderic', 'Trevor', 'Chase']

// Owner data with avatars for UI display
export interface OwnerData {
  name: Owner
  avatar: string
  color: string
}

export const OWNER_DATA: OwnerData[] = [
  { name: 'Brent', avatar: 'B', color: 'bg-emerald-500' },
  { name: 'Roderic', avatar: 'R', color: 'bg-blue-500' },
  { name: 'Trevor', avatar: 'T', color: 'bg-amber-500' },
  { name: 'Chase', avatar: 'C', color: 'bg-purple-500' },
]

// Helper to get owner data by name
export function getOwnerData(name: string): OwnerData {
  return OWNER_DATA.find((o) => o.name === name) || {
    name: name as Owner,
    avatar: name[0],
    color: 'bg-primary',
  }
}

/**
 * Minimal client interface for components that don't need all fields
 * Used by kanban, sorting, and other display components
 */
export interface MinimalClient {
  id: string
  name: string
  logo: string
  stage: Stage
  health: UIHealthStatus
  owner: string
  daysInStage: number
  tier?: Tier | string
  blocker?: BlockerType | string | null
  statusNote?: string
  supportTickets?: number
}
