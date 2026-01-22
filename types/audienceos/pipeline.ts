/**
 * Pipeline Types
 *
 * Type definitions for the client pipeline feature.
 * These were extracted from mock-data.ts during cleanup.
 *
 * NOTE: These types are used by frontend components for display purposes.
 * The actual database types are in types/database.ts (lowercase enums).
 */

import type { Stage, Owner, HealthStatus, Tier, TicketStatus, TicketPriority } from '@/lib/audienceos/constants/pipeline'

export type { Stage, Owner, HealthStatus, Tier, TicketStatus, TicketPriority }

export interface Task {
  id: string
  name: string
  completed: boolean
  assignee?: Owner
  dueDate?: string
  stage?: string
}

export interface CommMessage {
  id: string
  sender: string
  avatar: string
  message: string
  timestamp: string
  isInternal?: boolean
  source?: "slack" | "email"
  channel?: string
  subject?: string
  aiTags?: string[]
}

export interface PerformanceData {
  date: string
  adSpend: number
  roas: number
}

export interface AdMetrics {
  spend: number
  roas: number
  cpa: number
  impressions: number
  clicks: number
  conversions: number
  trend: "up" | "down" | "neutral"
}

export interface Client {
  id: string
  name: string
  logo: string
  stage: Stage
  health: HealthStatus
  owner: Owner
  daysInStage: number
  supportTickets: number
  installTime: number
  statusNote?: string
  shopifyUrl?: string
  gtmContainerId?: string
  metaPixelId?: string
  tasks: Task[]
  comms: CommMessage[]
  tier: Tier
  performanceData?: PerformanceData[]
  metaAds?: AdMetrics
  googleAds?: AdMetrics
  onboardingData?: {
    shopifyUrl: string
    gtmContainerId: string
    metaPixelId: string
    klaviyoApiKey: string
    submittedAt: string
    contactEmail: string
    metaAccessVerified: boolean
    gtmAccessVerified: boolean
    shopifyAccessVerified: boolean
    accessGrants: {
      meta: boolean
      gtm: boolean
      shopify: boolean
    }
  }
  blocker?: "WAITING ON ACCESS" | "WAITING ON DNS" | "DATA LAYER ERROR" | "CODE NOT INSTALLED" | null
}

export interface SupportTicket {
  id: string
  title: string
  clientId: string
  clientName: string
  status: TicketStatus
  priority: TicketPriority
  source: string
  assignee: Owner
  createdAt: string
  description: string
}

export interface ZoomRecording {
  id: string
  title: string
  date: string
  duration: string
  aiSummary: string[]
  transcriptUrl?: string
}
