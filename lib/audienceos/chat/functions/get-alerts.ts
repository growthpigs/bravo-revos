/**
 * Alert Function Executors
 *
 * Handles get_alerts function calls.
 * All queries are scoped to agency via ExecutorContext.
 * Uses Supabase when available, falls back to mock data for standalone mode.
 *
 * Ported from Holy Grail Chat (HGC).
 * Part of: 3-System Consolidation
 */

import type { ExecutorContext, GetAlertsArgs, AlertSummary } from './types';

/**
 * Mock data for standalone testing (fallback when Supabase unavailable)
 */
const MOCK_ALERTS: AlertSummary[] = [
  {
    id: 'alert-001',
    clientId: 'client-001',
    clientName: 'Acme Corporation',
    type: 'kpi_drop',
    severity: 'critical',
    title: 'ROAS dropped 35% week-over-week',
    description: 'Return on ad spend has significantly decreased. Review campaign performance.',
    suggestedAction: 'Review Google Ads campaign settings and budget allocation',
    status: 'active',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'alert-002',
    clientId: 'client-004',
    clientName: 'Delta Corp',
    type: 'inactivity',
    severity: 'high',
    title: 'No activity for 10 days',
    description: 'Client has not logged in or made any changes in over a week.',
    suggestedAction: 'Schedule a check-in call with the client',
    status: 'active',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'alert-003',
    clientId: 'client-001',
    clientName: 'Acme Corporation',
    type: 'disconnect',
    severity: 'critical',
    title: 'Meta Ads integration disconnected',
    description: 'The Meta Ads connection was lost. Data sync has stopped.',
    suggestedAction: 'Help client reconnect their Meta Ads account',
    status: 'active',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'alert-004',
    clientId: 'client-002',
    clientName: 'Beta Industries',
    type: 'risk_detected',
    severity: 'medium',
    title: 'Budget pacing ahead of schedule',
    description: 'Current spend rate will exhaust monthly budget by day 20.',
    suggestedAction: 'Review daily budget caps and pacing settings',
    status: 'active',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'alert-005',
    clientId: 'client-004',
    clientName: 'Delta Corp',
    type: 'disconnect',
    severity: 'high',
    title: 'Google Ads integration disconnected',
    description: 'The Google Ads connection was lost during token refresh.',
    suggestedAction: 'Help client reauthorize Google Ads connection',
    status: 'active',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

/**
 * Get alerts with optional filters
 * Uses Supabase when available, falls back to mock data
 */
export async function getAlerts(
  context: ExecutorContext,
  rawArgs: Record<string, unknown>
): Promise<AlertSummary[]> {
  const args = rawArgs as GetAlertsArgs;
  const { agencyId, supabase } = context;
  const limit = args.limit ?? 10;

  // If Supabase is available, use real queries
  if (supabase) {
    try {
      // Build alert query with client join
      let query = supabase
        .from('alert')
        .select(`
          id, client_id, type, severity, title, description,
          suggested_action, status, created_at,
          client:client_id(name)
        `)
        .eq('agency_id', agencyId)
        .limit(limit);

      // Apply filters
      if (args.severity) {
        query = query.eq('severity', args.severity);
      }

      if (args.status) {
        query = query.eq('status', args.status);
      }

      if (args.client_id) {
        query = query.eq('client_id', args.client_id);
      }

      if (args.type) {
        query = query.eq('type', args.type);
      }

      // Order by created_at descending
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.warn(`[Supabase] get_alerts error: ${error.message}`);
        throw error;
      }

      // Map database fields to AlertSummary and sort by severity
      const alerts: AlertSummary[] = (data || []).map((row) => {
        // Handle joined client data - could be object, array, or null
        const clientData = row.client as unknown;
        let clientName: string | undefined;
        if (clientData && typeof clientData === 'object') {
          if (Array.isArray(clientData) && clientData.length > 0) {
            clientName = (clientData[0] as { name?: string })?.name;
          } else {
            clientName = (clientData as { name?: string })?.name;
          }
        }

        return {
          id: row.id,
          clientId: row.client_id || undefined,
          clientName,
          type: row.type,
          severity: row.severity as 'critical' | 'high' | 'medium' | 'low',
          title: row.title,
          description: row.description || undefined,
          suggestedAction: row.suggested_action || undefined,
          status: row.status,
          createdAt: row.created_at,
        };
      });

      // Sort by severity (critical first) then by date
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      alerts.sort((a, b) => {
        const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
        if (severityDiff !== 0) return severityDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      return alerts;
    } catch (error) {
      console.error(`[ERROR] get_alerts failed:`, error);
      throw new Error(`Failed to fetch alerts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Only use mock data when Supabase client is NOT provided (true standalone/dev mode)
  console.warn('[DEV MODE] get_alerts: No Supabase client, using mock data - NOT FOR PRODUCTION');
  // Fallback: Use mock data for standalone mode
  let alerts = [...MOCK_ALERTS];

  if (args.severity) {
    alerts = alerts.filter((a) => a.severity === args.severity);
  }

  if (args.status) {
    alerts = alerts.filter((a) => a.status === args.status);
  }

  if (args.client_id) {
    alerts = alerts.filter((a) => a.clientId === args.client_id);
  }

  if (args.type) {
    alerts = alerts.filter((a) => a.type === args.type);
  }

  // Sort by severity (critical first) then by date
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  alerts.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return alerts.slice(0, limit);
}
