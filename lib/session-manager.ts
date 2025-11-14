/**
 * Session Manager - Handles chat session persistence
 *
 * Provides functions to:
 * - Create or retrieve chat sessions
 * - Load conversation history
 * - Save messages to sessions
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { Message } from '@/lib/cartridges/types';

export interface ChatSession {
  id: string;
  user_id: string;
  started_at: string;
  last_active_at: string;
  ended_at: string | null;
  voice_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: any;
  tool_call_id?: string;
  name?: string;
  metadata: Record<string, any>;
  created_at: string;
}

/**
 * Get existing session or create new one
 *
 * @param supabase - Supabase client
 * @param userId - Authenticated user ID
 * @param sessionId - Optional session ID (creates new if not provided)
 * @param voiceId - Optional voice cartridge ID
 * @returns Session object
 */
export async function getOrCreateSession(
  supabase: SupabaseClient,
  userId: string,
  sessionId?: string,
  voiceId?: string
): Promise<ChatSession> {
  // If sessionId provided, retrieve it and update last_active_at
  if (sessionId) {
    // Update last_active_at atomically while retrieving
    // This prevents stale session cleanup and tracks activity
    const { data: existing, error } = await supabase
      .from('chat_sessions')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (!error && existing) {
      return existing as ChatSession;
    }

    // Session not found or doesn't belong to user
    // Don't silently create new session - this is unexpected behavior
    if (error?.code === 'PGRST116') {
      // PGRST116 = no rows returned
      throw new Error(
        `Session ${sessionId} not found or does not belong to user ${userId}`
      );
    }

    // Other error occurred
    throw new Error(`Failed to retrieve session ${sessionId}: ${error?.message || 'Unknown error'}`);
  }

  // Create new session (only when no sessionId provided)
  const { data: newSession, error: createError } = await supabase
    .from('chat_sessions')
    .insert({
      user_id: userId,
      voice_id: voiceId || null,
      metadata: {},
    })
    .select()
    .single();

  if (createError) {
    throw new Error(`Failed to create chat session: ${createError.message}`);
  }

  return newSession as ChatSession;
}

/**
 * Get conversation history for a session
 *
 * @param supabase - Supabase client
 * @param sessionId - Session ID
 * @param limit - Maximum number of messages to retrieve (default: 50)
 * @returns Array of messages in chronological order
 */
export async function getConversationHistory(
  supabase: SupabaseClient,
  sessionId: string,
  limit: number = 50
): Promise<Message[]> {
  const { data: messages, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to retrieve conversation history: ${error.message}`);
  }

  // Convert database messages to Message format
  return (messages || []).map((msg: ChatMessage) => ({
    role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
    content: msg.content,
    tool_calls: msg.tool_calls,
    tool_call_id: msg.tool_call_id,
    name: msg.name,
  }));
}

/**
 * Save a message to the session
 *
 * @param supabase - Supabase client
 * @param sessionId - Session ID
 * @param message - Message to save
 * @returns Saved message object
 */
export async function saveMessage(
  supabase: SupabaseClient,
  sessionId: string,
  message: Message
): Promise<ChatMessage> {
  const { data: savedMessage, error } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      role: message.role,
      content: message.content,
      tool_calls: message.tool_calls || null,
      tool_call_id: message.tool_call_id || null,
      name: message.name || null,
      metadata: {},
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save message: ${error.message}`);
  }

  return savedMessage as ChatMessage;
}

/**
 * Save multiple messages to the session in bulk
 *
 * @param supabase - Supabase client
 * @param sessionId - Session ID
 * @param messages - Array of messages to save
 * @returns Array of saved message objects
 */
export async function saveMessages(
  supabase: SupabaseClient,
  sessionId: string,
  messages: Message[]
): Promise<ChatMessage[]> {
  const messagesToInsert = messages.map((msg) => ({
    session_id: sessionId,
    role: msg.role,
    content: msg.content,
    tool_calls: msg.tool_calls || null,
    tool_call_id: msg.tool_call_id || null,
    name: msg.name || null,
    metadata: {},
  }));

  const { data: savedMessages, error } = await supabase
    .from('chat_messages')
    .insert(messagesToInsert)
    .select();

  if (error) {
    throw new Error(`Failed to save messages: ${error.message}`);
  }

  return savedMessages as ChatMessage[];
}

/**
 * End a chat session
 *
 * @param supabase - Supabase client
 * @param sessionId - Session ID
 */
export async function endSession(
  supabase: SupabaseClient,
  sessionId: string
): Promise<void> {
  const { error } = await supabase
    .from('chat_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (error) {
    throw new Error(`Failed to end session: ${error.message}`);
  }
}

/**
 * Get all active sessions for a user
 *
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param limit - Maximum number of sessions to retrieve (default: 20)
 * @returns Array of active sessions
 */
export async function getActiveSessions(
  supabase: SupabaseClient,
  userId: string,
  limit: number = 20
): Promise<ChatSession[]> {
  const { data: sessions, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', userId)
    .is('ended_at', null)
    .order('last_active_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to retrieve active sessions: ${error.message}`);
  }

  return (sessions || []) as ChatSession[];
}
