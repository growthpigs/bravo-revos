/**
 * Communication Function Executors
 *
 * Handles get_recent_communications function calls.
 * Uses Supabase when available, falls back to mock data for standalone mode.
 *
 * Ported from Holy Grail Chat (HGC).
 * Part of: 3-System Consolidation
 */

import type {
  ExecutorContext,
  GetRecentCommunicationsArgs,
  CommunicationSummary,
} from './types';

/**
 * Mock data for standalone testing (fallback when Supabase unavailable)
 */
const MOCK_COMMUNICATIONS: Record<string, CommunicationSummary[]> = {
  'client-001': [
    {
      id: 'comm-001',
      type: 'email',
      subject: 'Q4 Campaign Performance Review',
      summary: 'Discussed declining ROAS and proposed optimization strategies.',
      from: 'john@acme.com',
      to: 'team@agency.com',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'comm-002',
      type: 'meeting',
      subject: 'Weekly Sync',
      summary: 'Reviewed campaign metrics and upcoming creative deadlines.',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'comm-003',
      type: 'email',
      subject: 'Meta Ads Disconnection Notice',
      summary: 'Notified client about Meta Ads integration issue.',
      from: 'team@agency.com',
      to: 'john@acme.com',
      date: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
  ],
  'client-002': [
    {
      id: 'comm-004',
      type: 'call',
      subject: 'Strategy Discussion',
      summary: 'Discussed Q1 budget allocation and new targeting options.',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'comm-005',
      type: 'note',
      subject: 'Internal Note',
      summary: 'Client requested pause on Meta campaigns during product launch.',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  'client-003': [
    {
      id: 'comm-006',
      type: 'meeting',
      subject: 'Onboarding Kickoff',
      summary: 'Completed initial onboarding meeting. Next: asset collection.',
      date: new Date().toISOString(),
    },
  ],
  'client-004': [
    {
      id: 'comm-007',
      type: 'email',
      subject: 'Follow-up: Integration Issues',
      summary: 'Sent instructions for reconnecting Google Ads.',
      from: 'team@agency.com',
      to: 'emily@delta.com',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

/**
 * Map platform enum to CommunicationSummary type
 */
function mapPlatformToType(platform: string): 'email' | 'call' | 'meeting' | 'note' {
  switch (platform) {
    case 'gmail':
    case 'slack':
      return 'email';
    default:
      return 'email';
  }
}

/**
 * Get recent communications for a client
 * Uses Supabase when available, falls back to mock data
 */
export async function getRecentCommunications(
  context: ExecutorContext,
  rawArgs: Record<string, unknown>
): Promise<CommunicationSummary[]> {
  const args = rawArgs as unknown as GetRecentCommunicationsArgs;
  const { agencyId, supabase } = context;

  // Validate required parameters
  if (!args.client_id) {
    console.warn('[ValidationError] get_recent_communications: missing required parameter client_id');
    return [];
  }

  const days = args.days ?? 30;
  const limit = args.limit ?? 10;

  // If Supabase is available, use real queries
  if (supabase) {
    try {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      let query = supabase
        .from('communication')
        .select(`
          id, platform, subject, content, sender_email, sender_name,
          is_inbound, received_at
        `)
        .eq('agency_id', agencyId)
        .eq('client_id', args.client_id)
        .gte('received_at', cutoffDate)
        .order('received_at', { ascending: false })
        .limit(limit);

      // Platform filter maps to type
      if (args.type) {
        if (args.type === 'email') {
          query = query.eq('platform', 'gmail');
        } else if (args.type === 'meeting' || args.type === 'call') {
          // Meetings/calls might be stored as notes in Slack or separate table
          // For now, we'll include slack platform for these
          query = query.eq('platform', 'slack');
        }
      }

      const { data, error } = await query;

      if (error) {
        console.warn(`[Supabase] get_recent_communications error: ${error.message}`);
        throw error;
      }

      // Map database fields to CommunicationSummary
      return (data || []).map((row) => ({
        id: row.id,
        type: mapPlatformToType(row.platform),
        subject: row.subject || undefined,
        summary: row.content?.substring(0, 200) || undefined,
        from: row.is_inbound ? row.sender_email : undefined,
        to: !row.is_inbound ? row.sender_email : undefined,
        date: row.received_at,
      }));
    } catch (error) {
      console.error(`[ERROR] get_recent_communications failed:`, error);
      throw new Error(`Failed to fetch communications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Only use mock data when Supabase client is NOT provided (true standalone/dev mode)
  console.warn('[DEV MODE] get_recent_communications: No Supabase client, using mock data - NOT FOR PRODUCTION');
  // Fallback: Use mock data for standalone mode
  let communications = MOCK_COMMUNICATIONS[args.client_id] || [];

  // Filter by type if specified
  if (args.type) {
    communications = communications.filter((c) => c.type === args.type);
  }

  // Filter by date range
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  communications = communications.filter(
    (c) => new Date(c.date) >= cutoffDate
  );

  // Sort by date (newest first)
  communications.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return communications.slice(0, limit);
}
