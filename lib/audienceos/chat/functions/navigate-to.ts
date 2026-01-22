/**
 * Navigate To Function Executor
 *
 * Ported from Holy Grail Chat (HGC).
 * Part of: 3-System Consolidation
 */

import type { ExecutorContext, NavigateToArgs, NavigationAction } from './types';

/**
 * Generate navigation URL
 */
export async function navigateTo(
  context: ExecutorContext,
  rawArgs: Record<string, unknown>
): Promise<NavigationAction> {
  const args = rawArgs as unknown as NavigateToArgs;

  const baseUrls: Record<string, string> = {
    clients: '/clients',
    client_detail: '/clients',
    alerts: '/alerts',
    intelligence: '/intelligence',
    documents: '/documents',
    settings: '/settings',
    integrations: '/integrations',
  };

  let url = baseUrls[args.destination] || '/';

  if (args.destination === 'client_detail' && args.client_id) {
    url = `${url}/${args.client_id}`;
  }

  // Add filters as query params
  if (args.filters) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(args.filters)) {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    }
    const queryString = params.toString();
    if (queryString) {
      url = `${url}?${queryString}`;
    }
  }

  return {
    url,
    destination: args.destination,
    filters: args.filters,
  };
}
