/**
 * HGC Function Calling Module
 *
 * Provides Gemini function calling capabilities for the dashboard route.
 *
 * Ported from Holy Grail Chat (HGC) with 9.5/10 confidence.
 * Part of: 3-System Consolidation
 */

import type { ExecutorContext, FunctionExecutor } from './types';
import { getClients, getClientDetails } from './get-clients';
import { getAlerts } from './get-alerts';
import { getAgencyStats } from './get-agency-stats';
import { getRecentCommunications } from './get-communications';
import { navigateTo } from './navigate-to';
import { validateFunctionArgs } from './schemas';
import {
  getEmails,
  getCalendarEvents,
  getDriveFiles,
  checkGoogleConnection,
} from './google-workspace';

// Re-export types
export type { ExecutorContext } from './types';
export type {
  ClientSummary,
  ClientDetails,
  AlertSummary,
  CommunicationSummary,
  AgencyStats,
  NavigationAction,
} from './types';

/**
 * Function declarations for Gemini
 */
export const hgcFunctions = [
  {
    name: 'get_clients',
    description: 'Get list of clients for the agency. Use when user asks about clients, client health, or wants to see client data.',
    parameters: {
      type: 'object',
      properties: {
        stage: {
          type: 'string',
          description: 'Filter by client lifecycle stage',
          enum: ['Lead', 'Onboarding', 'Installation', 'Audit', 'Live', 'Needs Support', 'Off-Boarding'],
        },
        health_status: {
          type: 'string',
          description: 'Filter by health status (risk level)',
          enum: ['green', 'yellow', 'red'],
        },
        limit: {
          type: 'number',
          description: 'Maximum clients to return (default: 10)',
        },
        search: {
          type: 'string',
          description: 'Search by client name',
        },
      },
    },
  },
  {
    name: 'get_client_details',
    description: 'Get detailed information about a specific client including contacts, integrations, and recent activity.',
    parameters: {
      type: 'object',
      properties: {
        client_id: {
          type: 'string',
          description: 'The UUID of the client',
        },
        client_name: {
          type: 'string',
          description: 'The name of the client (will search if ID not provided)',
        },
      },
    },
  },
  {
    name: 'get_alerts',
    description: 'Get active alerts for the agency. Use when user asks about risks, warnings, or issues.',
    parameters: {
      type: 'object',
      properties: {
        severity: {
          type: 'string',
          description: 'Filter by severity level',
          enum: ['critical', 'high', 'medium', 'low'],
        },
        status: {
          type: 'string',
          description: 'Filter by alert status',
          enum: ['active', 'snoozed', 'resolved', 'dismissed'],
        },
        client_id: {
          type: 'string',
          description: 'Filter alerts for a specific client',
        },
        limit: {
          type: 'number',
          description: 'Maximum alerts to return (default: 10)',
        },
      },
    },
  },
  {
    name: 'get_recent_communications',
    description: 'Get recent communications (emails, messages) with a client.',
    parameters: {
      type: 'object',
      properties: {
        client_id: {
          type: 'string',
          description: 'The client UUID',
        },
        type: {
          type: 'string',
          description: 'Filter by communication type',
          enum: ['email', 'call', 'meeting', 'note'],
        },
        limit: {
          type: 'number',
          description: 'Maximum communications to return (default: 10)',
        },
      },
      required: ['client_id'],
    },
  },
  {
    name: 'get_agency_stats',
    description: 'Get high-level agency statistics and KPIs.',
    parameters: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          description: 'Time period for stats',
          enum: ['today', 'week', 'month', 'quarter'],
        },
      },
    },
  },
  {
    name: 'navigate_to',
    description: 'Generate a navigation action to a specific page or view. Returns a URL for the frontend to navigate to.',
    parameters: {
      type: 'object',
      properties: {
        destination: {
          type: 'string',
          description: 'Where to navigate',
          enum: ['clients', 'client_detail', 'alerts', 'intelligence', 'documents', 'settings', 'integrations'],
        },
        client_id: {
          type: 'string',
          description: 'Client ID (required for client_detail)',
        },
        filters: {
          type: 'object',
          description: 'Optional filters to apply to the destination',
        },
      },
      required: ['destination'],
    },
  },
  // Google Workspace functions
  {
    name: 'get_emails',
    description: 'Get emails from Gmail inbox. Use when user asks about emails, messages, or inbox.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Gmail search query (e.g., "from:john", "subject:meeting", "is:unread")',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum emails to return (default: 10)',
        },
        unreadOnly: {
          type: 'boolean',
          description: 'Only return unread emails',
        },
      },
    },
  },
  {
    name: 'get_calendar_events',
    description: 'Get calendar events. Use when user asks about meetings, schedule, or calendar.',
    parameters: {
      type: 'object',
      properties: {
        timeMin: {
          type: 'string',
          description: 'Start time in ISO format (default: now)',
        },
        timeMax: {
          type: 'string',
          description: 'End time in ISO format (default: 7 days from now)',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum events to return (default: 10)',
        },
      },
    },
  },
  {
    name: 'get_drive_files',
    description: 'Search Google Drive files. Use when user asks about documents, files, or wants to find a file.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search term to find in file names',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum files to return (default: 10)',
        },
        mimeType: {
          type: 'string',
          description: 'Filter by file type (e.g., "application/pdf", "application/vnd.google-apps.document")',
        },
      },
    },
  },
  {
    name: 'check_google_connection',
    description: 'Check which Google services are connected (Gmail, Calendar, Drive).',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
];

/**
 * Registry of all function executors
 */
export const executors: Record<string, FunctionExecutor> = {
  get_clients: getClients,
  get_client_details: getClientDetails,
  get_alerts: getAlerts,
  get_recent_communications: getRecentCommunications,
  get_agency_stats: getAgencyStats,
  navigate_to: navigateTo,
  // Google Workspace functions
  get_emails: getEmails,
  get_calendar_events: getCalendarEvents,
  get_drive_files: getDriveFiles,
  check_google_connection: checkGoogleConnection,
};

/**
 * Execute a function by name with context and args
 * Arguments are validated against Zod schemas
 */
export async function executeFunction(
  name: string,
  context: ExecutorContext,
  args: Record<string, unknown>
): Promise<unknown> {
  const executor = executors[name];

  if (!executor) {
    throw new Error(`Unknown function: ${name}`);
  }

  // Validate arguments against schema
  const validatedArgs = validateFunctionArgs(name, args);

  return executor(context, validatedArgs);
}

/**
 * Check if a function name is valid
 */
export function isValidFunction(name: string): boolean {
  return name in executors;
}
