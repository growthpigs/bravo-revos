/**
 * Chat History Service
 *
 * Manages chat sessions and messages in Supabase.
 * Tables: chat_session, chat_message (from 007_hgc_chat_tables.sql)
 *
 * This enables:
 * - Session continuity across refreshes
 * - Message history for context
 * - Conversation recall
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { MessageRole, RouteType, Citation, SessionContext } from '../types';

/**
 * Chat session from database
 */
export interface ChatSession {
  id: string;
  agency_id: string;
  user_id: string;
  title: string | null;
  context: SessionContext | null;
  is_active: boolean;
  last_message_at: string | null;
  created_at: string;
}

/**
 * Chat message from database
 */
export interface ChatMessage {
  id: string;
  session_id: string;
  agency_id: string;
  role: MessageRole;
  content: string;
  route_used: RouteType | null;
  citations: Citation[] | null;
  tokens_used: number | null;
  created_at: string;
}

/**
 * Options for creating a new session
 */
export interface CreateSessionOptions {
  agencyId: string;
  userId: string;
  title?: string;
  context?: SessionContext;
}

/**
 * Options for adding a message
 */
export interface AddMessageOptions {
  sessionId: string;
  agencyId: string;
  role: MessageRole;
  content: string;
  routeUsed?: RouteType;
  citations?: Citation[];
  tokensUsed?: number;
}

/**
 * Get or create an active chat session for a user
 */
export async function getOrCreateSession(
  supabase: SupabaseClient,
  options: CreateSessionOptions
): Promise<ChatSession> {
  const { agencyId, userId, title, context } = options;

  // First, try to find an existing active session
  const { data: existingSession, error: findError } = await supabase
    .from('chat_session')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('last_message_at', { ascending: false })
    .limit(1)
    .single();

  // Return existing session if found
  if (existingSession && !findError) {
    return existingSession as ChatSession;
  }

  // Create new session
  const { data: newSession, error: createError } = await supabase
    .from('chat_session')
    .insert({
      agency_id: agencyId,
      user_id: userId,
      title: title || 'New Chat',
      context: context || null,
      is_active: true,
    })
    .select()
    .single();

  if (createError) {
    console.error('[ChatHistory] Failed to create session:', createError);
    throw new Error('Failed to create chat session');
  }

  return newSession as ChatSession;
}

/**
 * Get a specific session by ID
 */
export async function getSessionById(
  supabase: SupabaseClient,
  sessionId: string
): Promise<ChatSession | null> {
  const { data, error } = await supabase
    .from('chat_session')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as ChatSession;
}

/**
 * Get recent sessions for a user
 */
export async function getRecentSessions(
  supabase: SupabaseClient,
  agencyId: string,
  userId: string,
  limit: number = 10
): Promise<ChatSession[]> {
  const { data, error } = await supabase
    .from('chat_session')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('user_id', userId)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.warn('[ChatHistory] Failed to get recent sessions:', error);
    return [];
  }

  return (data || []) as ChatSession[];
}

/**
 * Add a message to a session
 */
export async function addMessage(
  supabase: SupabaseClient,
  options: AddMessageOptions
): Promise<ChatMessage> {
  const { sessionId, agencyId, role, content, routeUsed, citations, tokensUsed } = options;

  // Insert message
  const { data: message, error: messageError } = await supabase
    .from('chat_message')
    .insert({
      session_id: sessionId,
      agency_id: agencyId,
      role,
      content,
      route_used: routeUsed || null,
      citations: citations || null,
      tokens_used: tokensUsed || null,
    })
    .select()
    .single();

  if (messageError) {
    console.error('[ChatHistory] Failed to add message:', messageError);
    throw new Error('Failed to add chat message');
  }

  // Update session's last_message_at
  await supabase
    .from('chat_session')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', sessionId);

  return message as ChatMessage;
}

/**
 * Get messages for a session
 */
export async function getSessionMessages(
  supabase: SupabaseClient,
  sessionId: string,
  limit: number = 50
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_message')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.warn('[ChatHistory] Failed to get session messages:', error);
    return [];
  }

  return (data || []) as ChatMessage[];
}

/**
 * Get recent messages across all sessions for context
 */
export async function getRecentMessages(
  supabase: SupabaseClient,
  agencyId: string,
  userId: string,
  limit: number = 10
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_message')
    .select(`
      *,
      session:chat_session!inner(user_id)
    `)
    .eq('agency_id', agencyId)
    .eq('chat_session.user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[ChatHistory] Failed to get recent messages:', error);
    return [];
  }

  // Return in chronological order (oldest first)
  return ((data || []) as ChatMessage[]).reverse();
}

/**
 * Update session context
 */
export async function updateSessionContext(
  supabase: SupabaseClient,
  sessionId: string,
  context: SessionContext
): Promise<void> {
  const { error } = await supabase
    .from('chat_session')
    .update({ context })
    .eq('id', sessionId);

  if (error) {
    console.warn('[ChatHistory] Failed to update session context:', error);
  }
}

/**
 * Update session title
 */
export async function updateSessionTitle(
  supabase: SupabaseClient,
  sessionId: string,
  title: string
): Promise<void> {
  const { error } = await supabase
    .from('chat_session')
    .update({ title })
    .eq('id', sessionId);

  if (error) {
    console.warn('[ChatHistory] Failed to update session title:', error);
  }
}

/**
 * Close a session (mark as inactive)
 */
export async function closeSession(
  supabase: SupabaseClient,
  sessionId: string
): Promise<void> {
  const { error } = await supabase
    .from('chat_session')
    .update({ is_active: false })
    .eq('id', sessionId);

  if (error) {
    console.warn('[ChatHistory] Failed to close session:', error);
  }
}

/**
 * Format messages for context injection into system prompt
 */
export function formatMessagesForContext(messages: ChatMessage[]): string {
  if (messages.length === 0) {
    return '';
  }

  const formatted = messages
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.substring(0, 500)}${m.content.length > 500 ? '...' : ''}`)
    .join('\n');

  return `## Recent Conversation History

${formatted}

Use this history to maintain context and provide consistent responses.`;
}
