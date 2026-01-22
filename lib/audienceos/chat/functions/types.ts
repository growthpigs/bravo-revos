/**
 * Function Executor Types
 *
 * Ported from Holy Grail Chat (HGC).
 * Part of: 3-System Consolidation
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Context passed to all function executors
 */
export interface ExecutorContext {
  agencyId: string;
  userId: string;
  supabase?: SupabaseClient;
}

/**
 * Generic function executor type
 */
export type FunctionExecutor = (
  context: ExecutorContext,
  args: Record<string, unknown>
) => Promise<unknown>;

/**
 * Client summary
 */
export interface ClientSummary {
  id: string;
  name: string;
  stage: string;
  healthStatus: 'green' | 'yellow' | 'red';
  contactName?: string;
  contactEmail?: string;
  lastActivity?: string;
}

/**
 * Client details (extended)
 */
export interface ClientDetails extends ClientSummary {
  phone?: string;
  website?: string;
  industry?: string;
  integrations?: Array<{
    type: string;
    status: 'connected' | 'disconnected';
    lastSync?: string;
  }>;
}

/**
 * Alert summary
 */
export interface AlertSummary {
  id: string;
  clientId?: string;
  clientName?: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description?: string;
  suggestedAction?: string;
  status: string;
  createdAt: string;
}

/**
 * Communication summary
 */
export interface CommunicationSummary {
  id: string;
  type: 'email' | 'call' | 'meeting' | 'note';
  subject?: string;
  summary?: string;
  from?: string;
  to?: string;
  date: string;
}

/**
 * Agency stats
 */
export interface AgencyStats {
  period: string;
  totalClients: number;
  activeClients: number;
  atRiskClients: number;
  openAlerts: number;
  resolvedAlertsThisPeriod?: number;
  avgHealthScore: number;
}

/**
 * Navigation action
 */
export interface NavigationAction {
  url: string;
  destination: string;
  filters?: Record<string, unknown>;
}

/**
 * Function argument types
 */
export interface GetClientsArgs {
  stage?: string;
  health_status?: string;
  limit?: number;
  search?: string;
}

export interface GetClientDetailsArgs {
  client_id?: string;
  client_name?: string;
}

export interface GetAlertsArgs {
  severity?: string;
  status?: string;
  client_id?: string;
  type?: string;
  limit?: number;
}

export interface GetRecentCommunicationsArgs {
  client_id: string;
  type?: 'email' | 'call' | 'meeting' | 'note';
  days?: number;
  limit?: number;
}

export interface GetAgencyStatsArgs {
  period?: 'today' | 'week' | 'month' | 'quarter';
}

export interface NavigateToArgs {
  destination: string;
  client_id?: string;
  filters?: Record<string, unknown>;
}
