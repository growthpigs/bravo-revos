/**
 * Analytics Function Executors
 *
 * Handles get_agency_stats function calls.
 * Uses Supabase when available, falls back to mock data for standalone mode.
 *
 * Ported from Holy Grail Chat (HGC).
 * Part of: 3-System Consolidation
 */

import type {
  ExecutorContext,
  GetAgencyStatsArgs,
  AgencyStats,
} from './types';

/**
 * Get agency stats using Supabase aggregation
 * Falls back to mock data when Supabase unavailable
 */
export async function getAgencyStats(
  context: ExecutorContext,
  rawArgs: Record<string, unknown>
): Promise<AgencyStats> {
  const args = rawArgs as unknown as GetAgencyStatsArgs;
  const { agencyId, supabase } = context;
  const period = args.period ?? 'week';

  // If Supabase is available, use real aggregation queries
  if (supabase) {
    try {
      // Get total and active clients
      const { count: totalClients } = await supabase
        .from('client')
        .select('id', { count: 'exact', head: true })
        .eq('agency_id', agencyId);

      // Get clients by health status
      const { data: healthCounts } = await supabase
        .from('client')
        .select('health_status')
        .eq('agency_id', agencyId);

      const atRiskClients = (healthCounts || []).filter(
        (c) => c.health_status === 'red' || c.health_status === 'yellow'
      ).length;

      const greenClients = (healthCounts || []).filter(
        (c) => c.health_status === 'green'
      ).length;

      // Calculate avg health score (green=100, yellow=50, red=0)
      const totalClientCount = healthCounts?.length || 1;
      const healthScore = Math.round(
        ((greenClients * 100) +
         ((healthCounts || []).filter((c) => c.health_status === 'yellow').length * 50)) /
        totalClientCount
      );

      // Get open alerts count
      const { count: openAlerts } = await supabase
        .from('alert')
        .select('id', { count: 'exact', head: true })
        .eq('agency_id', agencyId)
        .eq('status', 'active');

      // Get resolved alerts for period
      const periodDays = period === 'today' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 90;
      const cutoffDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

      const { count: resolvedAlertsThisPeriod } = await supabase
        .from('alert')
        .select('id', { count: 'exact', head: true })
        .eq('agency_id', agencyId)
        .eq('status', 'resolved')
        .gte('created_at', cutoffDate);

      return {
        period,
        totalClients: totalClients || 0,
        activeClients: totalClientCount,
        atRiskClients,
        openAlerts: openAlerts || 0,
        resolvedAlertsThisPeriod: resolvedAlertsThisPeriod || 0,
        avgHealthScore: healthScore,
      };
    } catch (error) {
      console.error(`[ERROR] get_agency_stats failed:`, error);
      throw new Error(`Failed to fetch agency stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Only use mock data when Supabase client is NOT provided (true standalone/dev mode)
  console.warn('[DEV MODE] get_agency_stats: No Supabase client, using mock data - NOT FOR PRODUCTION');
  // Fallback: Mock stats for standalone mode
  const stats: AgencyStats = {
    period,
    totalClients: 12,
    activeClients: 10,
    atRiskClients: 3,
    openAlerts: 5,
    resolvedAlertsThisPeriod: period === 'today' ? 2 : period === 'week' ? 8 : 24,
    avgHealthScore: 72,
  };

  return stats;
}
