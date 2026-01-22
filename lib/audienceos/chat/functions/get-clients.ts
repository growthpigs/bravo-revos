/**
 * Get Clients Function Executor
 *
 * Handles get_clients and get_client_details function calls.
 * All queries are scoped to agency via ExecutorContext.
 * Uses Supabase when available, falls back to mock data for standalone mode.
 *
 * Ported from Holy Grail Chat (HGC) 2026-01-04.
 * Part of: 3-System Consolidation
 */

import type { ExecutorContext, GetClientsArgs, GetClientDetailsArgs, ClientSummary, ClientDetails } from './types';

/**
 * Mock data for standalone testing (fallback when Supabase unavailable)
 */
const MOCK_CLIENTS: ClientDetails[] = [
  {
    id: 'client-001',
    name: 'RTA Outdoor Living',
    stage: 'Live',
    healthStatus: 'red',
    contactName: 'James Mitchell',
    contactEmail: 'james@rtaoutdoor.com',
    lastActivity: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    industry: 'E-commerce',
  },
  {
    id: 'client-002',
    name: 'Beardbrand',
    stage: 'Live',
    healthStatus: 'yellow',
    contactName: 'Eric Bandholz',
    contactEmail: 'eric@beardbrand.com',
    lastActivity: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    industry: 'DTC Beauty',
  },
  {
    id: 'client-003',
    name: 'Alo Yoga',
    stage: 'Onboarding',
    healthStatus: 'green',
    contactName: 'Danny Harris',
    contactEmail: 'danny@aloyoga.com',
    lastActivity: new Date().toISOString(),
    industry: 'Apparel',
  },
  {
    id: 'client-004',
    name: 'Glow Recipe',
    stage: 'Live',
    healthStatus: 'red',
    contactName: 'Christine Chang',
    contactEmail: 'christine@glowrecipe.com',
    lastActivity: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    industry: 'Beauty',
  },
];

/**
 * Get list of clients with optional filters
 * Uses Supabase when available, falls back to mock data
 */
export async function getClients(
  context: ExecutorContext,
  rawArgs: Record<string, unknown>
): Promise<ClientSummary[]> {
  const args = rawArgs as GetClientsArgs;
  const { agencyId, supabase } = context;
  const limit = args.limit ?? 10;

  // If Supabase is available, use real queries
  if (supabase) {
    try {
      let query = supabase
        .from('client')
        .select('id, name, stage, health_status, contact_name, contact_email, updated_at')
        .eq('agency_id', agencyId)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(limit);

      // Apply filters
      if (args.stage) {
        query = query.eq('stage', args.stage);
      }

      if (args.health_status) {
        query = query.eq('health_status', args.health_status);
      }

      if (args.search) {
        query = query.ilike('name', `%${args.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.warn(`[Supabase] get_clients error: ${error.message}`);
        throw error;
      }

      // Map database fields to ClientSummary
      return (data || []).map((row) => ({
        id: row.id,
        name: row.name,
        stage: row.stage,
        healthStatus: row.health_status as 'green' | 'yellow' | 'red',
        contactName: row.contact_name || undefined,
        contactEmail: row.contact_email || undefined,
        lastActivity: row.updated_at,
      }));
    } catch (error) {
      console.error(`[ERROR] get_clients failed:`, error);
      // Re-throw error - do NOT return fake data that users might trust
      throw new Error(`Failed to fetch clients: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Only use mock data when Supabase client is NOT provided (true standalone/dev mode)
  // This path is only reached when context.supabase is null/undefined
  console.warn('[DEV MODE] get_clients: No Supabase client, using mock data - NOT FOR PRODUCTION');
  // Fallback: Use mock data for standalone mode
  let clients = [...MOCK_CLIENTS];

  if (args.stage) {
    clients = clients.filter((c) => c.stage === args.stage);
  }

  if (args.health_status) {
    clients = clients.filter((c) => c.healthStatus === args.health_status);
  }

  if (args.search) {
    const searchLower = args.search.toLowerCase();
    clients = clients.filter((c) => c.name.toLowerCase().includes(searchLower));
  }

  return clients.slice(0, limit).map((client) => ({
    id: client.id,
    name: client.name,
    stage: client.stage,
    healthStatus: client.healthStatus,
    contactName: client.contactName,
    contactEmail: client.contactEmail,
    lastActivity: client.lastActivity,
  }));
}

/**
 * Get detailed information about a specific client
 * Uses Supabase when available, falls back to mock data
 */
export async function getClientDetails(
  context: ExecutorContext,
  rawArgs: Record<string, unknown>
): Promise<ClientDetails | null> {
  const args = rawArgs as GetClientDetailsArgs;
  const { agencyId, supabase } = context;

  // If Supabase is available, use real queries
  if (supabase) {
    try {
      let query = supabase
        .from('client')
        .select(`
          id, name, stage, health_status, contact_name, contact_email,
          notes, tags, updated_at
        `)
        .eq('agency_id', agencyId)
        .eq('is_active', true);

      // Find by ID or name
      if (args.client_id) {
        query = query.eq('id', args.client_id);
      } else if (args.client_name) {
        query = query.ilike('name', `%${args.client_name}%`);
      } else {
        return null;
      }

      const { data, error } = await query.single();

      if (error || !data) {
        if (error?.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        console.warn(`[Supabase] get_client_details error: ${error?.message}`);
        throw error;
      }

      // Map to ClientDetails
      const clientDetails: ClientDetails = {
        id: data.id,
        name: data.name,
        stage: data.stage,
        healthStatus: data.health_status as 'green' | 'yellow' | 'red',
        contactName: data.contact_name || undefined,
        contactEmail: data.contact_email || undefined,
        lastActivity: data.updated_at,
      };

      return clientDetails;
    } catch (error) {
      console.error(`[ERROR] get_client_details failed:`, error);
      throw new Error(`Failed to fetch client details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Only use mock data when Supabase client is NOT provided (true standalone/dev mode)
  console.warn('[DEV MODE] get_client_details: No Supabase client, using mock data - NOT FOR PRODUCTION');

  // Fallback: Use mock data for standalone mode
  let client: ClientDetails | undefined;

  if (args.client_id) {
    client = MOCK_CLIENTS.find((c) => c.id === args.client_id);
  } else if (args.client_name) {
    const nameLower = (args.client_name as string).toLowerCase();
    client = MOCK_CLIENTS.find((c) => c.name.toLowerCase().includes(nameLower));
  }

  return client || null;
}
