/**
 * App Self-Awareness Context
 *
 * Provides the chat with knowledge about AudienceOS structure,
 * pages, features, and navigation capabilities.
 *
 * This enables the chat to:
 * - Understand what page the user is on
 * - Know what actions are available
 * - Navigate users to relevant pages
 * - Provide contextually relevant help
 */

/**
 * Page definition for app structure
 */
export interface AppPage {
  id: string;
  name: string;
  path: string;
  description: string;
  availableActions: string[];
  contextFields?: string[]; // What context this page can provide (e.g., clientId)
}

/**
 * App structure definition - static knowledge about AudienceOS
 */
export const APP_STRUCTURE: Record<string, AppPage> = {
  dashboard: {
    id: 'dashboard',
    name: 'Dashboard',
    path: '/',
    description: 'Main dashboard showing agency overview, key metrics, alerts, and quick actions',
    availableActions: [
      'view_alerts',
      'view_metrics',
      'navigate_to_clients',
      'navigate_to_pipeline',
      'create_task',
    ],
    contextFields: [],
  },
  clients: {
    id: 'clients',
    name: 'Clients',
    path: '/clients',
    description: 'List of all clients managed by the agency with filtering and search',
    availableActions: [
      'list_clients',
      'search_clients',
      'filter_by_status',
      'add_new_client',
      'view_client_details',
    ],
    contextFields: [],
  },
  clientDetail: {
    id: 'clientDetail',
    name: 'Client Detail',
    path: '/client/:id',
    description: 'Detailed view of a specific client with performance data, communications, and actions',
    availableActions: [
      'view_performance',
      'view_communications',
      'send_message',
      'create_task',
      'view_campaigns',
      'view_alerts',
      'edit_client',
    ],
    contextFields: ['clientId', 'clientName'],
  },
  pipeline: {
    id: 'pipeline',
    name: 'Pipeline',
    path: '/pipeline',
    description: 'Sales pipeline showing leads and opportunities across stages',
    availableActions: [
      'view_pipeline',
      'move_deal',
      'add_deal',
      'filter_by_stage',
      'view_deal_details',
    ],
    contextFields: [],
  },
  integrations: {
    id: 'integrations',
    name: 'Integrations',
    path: '/settings/integrations',
    description: 'Manage connected platforms like Google Ads, Meta Ads, Gmail, Slack, etc.',
    availableActions: [
      'view_integrations',
      'connect_integration',
      'disconnect_integration',
      'view_sync_status',
      'refresh_data',
    ],
    contextFields: [],
  },
  settings: {
    id: 'settings',
    name: 'Settings',
    path: '/settings',
    description: 'Agency settings, team management, billing, and configuration',
    availableActions: [
      'view_settings',
      'manage_team',
      'manage_billing',
      'configure_notifications',
      'manage_api_keys',
    ],
    contextFields: [],
  },
  knowledgeBase: {
    id: 'knowledgeBase',
    name: 'Knowledge Base',
    path: '/knowledge-base',
    description: 'Upload and manage documents for AI-powered search and retrieval',
    availableActions: [
      'view_documents',
      'upload_document',
      'search_documents',
      'delete_document',
      'view_document_details',
    ],
    contextFields: [],
  },
  tickets: {
    id: 'tickets',
    name: 'Tickets',
    path: '/tickets',
    description: 'Support tickets and tasks for clients',
    availableActions: [
      'view_tickets',
      'create_ticket',
      'assign_ticket',
      'change_status',
      'add_comment',
    ],
    contextFields: [],
  },
  communications: {
    id: 'communications',
    name: 'Communications',
    path: '/communications',
    description: 'Unified inbox for all client communications across channels',
    availableActions: [
      'view_messages',
      'send_message',
      'filter_by_channel',
      'filter_by_client',
      'mark_as_read',
    ],
    contextFields: [],
  },
  automations: {
    id: 'automations',
    name: 'Automations',
    path: '/automations',
    description: 'Create and manage automated workflows and triggers',
    availableActions: [
      'view_automations',
      'create_automation',
      'edit_automation',
      'enable_disable',
      'view_logs',
    ],
    contextFields: [],
  },
};

/**
 * App context for chat system prompt injection
 */
export interface AppContext {
  currentPage: string;
  pageDescription: string;
  availableActions: string[];
  clientId?: string;
  clientName?: string;
  ticketId?: string;
  dealId?: string;
  userRole: string;
  recentAlerts?: Array<{ id: string; message: string; severity: string }>;
}

/**
 * Build app context from current page and optional parameters
 */
export function buildAppContext(
  currentPage: string,
  params?: {
    clientId?: string;
    clientName?: string;
    ticketId?: string;
    dealId?: string;
    userRole?: string;
    recentAlerts?: Array<{ id: string; message: string; severity: string }>;
  }
): AppContext {
  const page = APP_STRUCTURE[currentPage] || APP_STRUCTURE.dashboard;

  return {
    currentPage: page.name,
    pageDescription: page.description,
    availableActions: page.availableActions,
    clientId: params?.clientId,
    clientName: params?.clientName,
    ticketId: params?.ticketId,
    dealId: params?.dealId,
    userRole: params?.userRole || 'member',
    recentAlerts: params?.recentAlerts,
  };
}

/**
 * Generate system prompt injection for app context
 */
export function generateAppContextPrompt(context: AppContext): string {
  let prompt = `## Current Application Context

The user is currently on the **${context.currentPage}** page.
Page description: ${context.pageDescription}

Available actions on this page:
${context.availableActions.map(a => `- ${a}`).join('\n')}

User role: ${context.userRole}
`;

  if (context.clientId && context.clientName) {
    prompt += `
Currently viewing client: **${context.clientName}** (ID: ${context.clientId})
You can reference this client by name in your responses.
`;
  }

  if (context.ticketId) {
    prompt += `
Currently viewing ticket: ${context.ticketId}
`;
  }

  if (context.dealId) {
    prompt += `
Currently viewing deal: ${context.dealId}
`;
  }

  if (context.recentAlerts && context.recentAlerts.length > 0) {
    prompt += `
Recent alerts (${context.recentAlerts.length}):
${context.recentAlerts.slice(0, 3).map(a => `- [${a.severity.toUpperCase()}] ${a.message}`).join('\n')}
`;
  }

  return prompt;
}

/**
 * Get page by path (for route matching)
 */
export function getPageByPath(path: string): AppPage | null {
  // Exact match first
  for (const page of Object.values(APP_STRUCTURE)) {
    if (page.path === path) return page;
  }

  // Pattern match for dynamic routes
  if (path.startsWith('/client/') && path.split('/').length === 3) {
    return APP_STRUCTURE.clientDetail;
  }

  return null;
}

/**
 * Get all navigable pages for navigation suggestions
 */
export function getNavigablePages(): Array<{ name: string; path: string; description: string }> {
  return Object.values(APP_STRUCTURE).map(page => ({
    name: page.name,
    path: page.path,
    description: page.description,
  }));
}
