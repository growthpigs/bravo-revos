/**
 * Google Workspace Function Executors
 *
 * Provides Gmail, Calendar, and Drive functionality for chat functions.
 * Uses OAuth tokens from the user's connected integrations.
 *
 * Part of: HGC Transplant - BLOCKER 7
 */

import type { ExecutorContext } from './types';
import {
  getGoogleCredentials,
  isIntegrationConnected,
  type OAuthCredentials,
} from './oauth-provider';

/**
 * Email summary from Gmail
 */
export interface EmailSummary {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to?: string;
  snippet: string;
  date: string;
  isUnread: boolean;
  labels?: string[];
}

/**
 * Calendar event summary
 */
export interface CalendarEventSummary {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
  attendees?: string[];
  isAllDay: boolean;
}

/**
 * Drive file summary
 */
export interface DriveFileSummary {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink?: string;
  iconLink?: string;
  size?: string;
}

/**
 * Google connection status
 */
export interface GoogleConnectionStatus {
  gmail: boolean;
  calendar: boolean;
  drive: boolean;
  lastSyncAt?: string;
  errorMessage?: string;
}

/**
 * Get emails from Gmail
 */
export async function getEmails(
  context: ExecutorContext,
  args: {
    query?: string;
    maxResults?: number;
    unreadOnly?: boolean;
    labelIds?: string[];
  }
): Promise<{
  emails: EmailSummary[];
  totalResults: number;
  connected: boolean;
  message?: string;
}> {
  const { supabase, userId } = context;

  if (!supabase) {
    return {
      emails: [],
      totalResults: 0,
      connected: false,
      message: 'Database connection not available',
    };
  }

  // Get Google credentials
  const credentials = await getGoogleCredentials(supabase, userId);

  if (!credentials) {
    return {
      emails: [],
      totalResults: 0,
      connected: false,
      message: 'Gmail is not connected. Please connect Gmail in Settings > Integrations to use this feature.',
    };
  }

  try {
    // Build Gmail API query
    const { query = '', maxResults = 10, unreadOnly = false, labelIds = ['INBOX'] } = args;

    let searchQuery = query;
    if (unreadOnly) {
      searchQuery = `is:unread ${searchQuery}`.trim();
    }

    // Call Gmail API
    const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
    url.searchParams.set('maxResults', String(maxResults));
    if (searchQuery) {
      url.searchParams.set('q', searchQuery);
    }
    if (labelIds.length > 0) {
      labelIds.forEach(id => url.searchParams.append('labelIds', id));
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Gmail] API error:', response.status, error);
      return {
        emails: [],
        totalResults: 0,
        connected: true,
        message: `Gmail API error: ${response.status}. Token may have expired.`,
      };
    }

    const data = await response.json();
    const messageIds = data.messages || [];
    const totalResults = data.resultSizeEstimate || messageIds.length;

    // Fetch message details (in parallel, limited to 5 concurrent)
    const emails: EmailSummary[] = [];
    for (const msg of messageIds.slice(0, maxResults)) {
      try {
        const msgResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
          {
            headers: {
              Authorization: `Bearer ${credentials.accessToken}`,
            },
          }
        );

        if (msgResponse.ok) {
          const msgData = await msgResponse.json();
          const headers = msgData.payload?.headers || [];

          emails.push({
            id: msgData.id,
            threadId: msgData.threadId,
            subject: headers.find((h: any) => h.name === 'Subject')?.value || '(no subject)',
            from: headers.find((h: any) => h.name === 'From')?.value || '',
            to: headers.find((h: any) => h.name === 'To')?.value,
            snippet: msgData.snippet || '',
            date: headers.find((h: any) => h.name === 'Date')?.value || '',
            isUnread: msgData.labelIds?.includes('UNREAD') || false,
            labels: msgData.labelIds,
          });
        }
      } catch (err) {
        console.warn('[Gmail] Error fetching message:', msg.id, err);
      }
    }

    return {
      emails,
      totalResults,
      connected: true,
    };
  } catch (error) {
    console.error('[Gmail] Error:', error);
    return {
      emails: [],
      totalResults: 0,
      connected: true,
      message: `Failed to fetch emails: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Get calendar events
 */
export async function getCalendarEvents(
  context: ExecutorContext,
  args: {
    timeMin?: string; // ISO date string
    timeMax?: string; // ISO date string
    maxResults?: number;
    calendarId?: string;
  }
): Promise<{
  events: CalendarEventSummary[];
  connected: boolean;
  message?: string;
}> {
  const { supabase, userId } = context;

  if (!supabase) {
    return {
      events: [],
      connected: false,
      message: 'Database connection not available',
    };
  }

  const credentials = await getGoogleCredentials(supabase, userId);

  if (!credentials) {
    return {
      events: [],
      connected: false,
      message: 'Google Calendar is not connected. Please connect in Settings > Integrations.',
    };
  }

  try {
    const {
      timeMin = new Date().toISOString(),
      timeMax = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      maxResults = 10,
      calendarId = 'primary',
    } = args;

    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
    url.searchParams.set('timeMin', timeMin);
    url.searchParams.set('timeMax', timeMax);
    url.searchParams.set('maxResults', String(maxResults));
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
      },
    });

    if (!response.ok) {
      console.error('[Calendar] API error:', response.status);
      return {
        events: [],
        connected: true,
        message: `Calendar API error: ${response.status}. Token may have expired.`,
      };
    }

    const data = await response.json();
    const events: CalendarEventSummary[] = (data.items || []).map((event: any) => ({
      id: event.id,
      title: event.summary || '(No title)',
      start: event.start?.dateTime || event.start?.date || '',
      end: event.end?.dateTime || event.end?.date || '',
      description: event.description,
      location: event.location,
      attendees: event.attendees?.map((a: any) => a.email) || [],
      isAllDay: !event.start?.dateTime,
    }));

    return {
      events,
      connected: true,
    };
  } catch (error) {
    console.error('[Calendar] Error:', error);
    return {
      events: [],
      connected: true,
      message: `Failed to fetch calendar events: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Get Drive files
 */
export async function getDriveFiles(
  context: ExecutorContext,
  args: {
    query?: string;
    maxResults?: number;
    mimeType?: string;
    folderId?: string;
  }
): Promise<{
  files: DriveFileSummary[];
  connected: boolean;
  message?: string;
}> {
  const { supabase, userId } = context;

  if (!supabase) {
    return {
      files: [],
      connected: false,
      message: 'Database connection not available',
    };
  }

  const credentials = await getGoogleCredentials(supabase, userId);

  if (!credentials) {
    return {
      files: [],
      connected: false,
      message: 'Google Drive is not connected. Please connect in Settings > Integrations.',
    };
  }

  try {
    const { query = '', maxResults = 10, mimeType, folderId } = args;

    // Build Drive API query
    let driveQuery = '';
    if (query) {
      driveQuery = `name contains '${query.replace(/'/g, "\\'")}'`;
    }
    if (mimeType) {
      driveQuery = driveQuery ? `${driveQuery} and mimeType='${mimeType}'` : `mimeType='${mimeType}'`;
    }
    if (folderId) {
      driveQuery = driveQuery ? `${driveQuery} and '${folderId}' in parents` : `'${folderId}' in parents`;
    }
    // Exclude trashed files
    driveQuery = driveQuery ? `${driveQuery} and trashed=false` : 'trashed=false';

    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('pageSize', String(maxResults));
    url.searchParams.set('fields', 'files(id,name,mimeType,modifiedTime,webViewLink,iconLink,size)');
    url.searchParams.set('orderBy', 'modifiedTime desc');
    if (driveQuery) {
      url.searchParams.set('q', driveQuery);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
      },
    });

    if (!response.ok) {
      console.error('[Drive] API error:', response.status);
      return {
        files: [],
        connected: true,
        message: `Drive API error: ${response.status}. Token may have expired.`,
      };
    }

    const data = await response.json();
    const files: DriveFileSummary[] = (data.files || []).map((file: any) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      modifiedTime: file.modifiedTime,
      webViewLink: file.webViewLink,
      iconLink: file.iconLink,
      size: file.size,
    }));

    return {
      files,
      connected: true,
    };
  } catch (error) {
    console.error('[Drive] Error:', error);
    return {
      files: [],
      connected: true,
      message: `Failed to fetch Drive files: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Check Google Workspace connection status
 */
export async function checkGoogleConnection(
  context: ExecutorContext,
  _args: Record<string, unknown>
): Promise<GoogleConnectionStatus> {
  const { supabase, userId } = context;

  if (!supabase) {
    return {
      gmail: false,
      calendar: false,
      drive: false,
      errorMessage: 'Database connection not available',
    };
  }

  const [gmailConnected, calendarConnected, driveConnected] = await Promise.all([
    isIntegrationConnected(supabase, userId, 'gmail'),
    isIntegrationConnected(supabase, userId, 'google-calendar'),
    isIntegrationConnected(supabase, userId, 'google-drive'),
  ]);

  return {
    gmail: gmailConnected,
    calendar: calendarConnected,
    drive: driveConnected,
  };
}
