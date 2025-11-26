/**
 * Database Helper Utilities
 *
 * Provides atomic database operations to prevent race conditions.
 * Uses upsert patterns instead of check-then-insert.
 *
 * Usage:
 *   const result = await upsertLead(supabase, leadData);
 *   if (!result.success) {
 *     console.error(result.error);
 *   }
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Result type for upsert operations
 */
export interface UpsertResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  wasInsert: boolean;
}

/**
 * Lead data for upsert operation
 */
export interface LeadUpsertData {
  campaign_id: string;
  linkedin_profile_url: string;
  name: string;
  status?: string;
  source?: string;
  metadata?: Record<string, unknown>;
  linkedin_headline?: string;
  linkedin_profile_id?: string;
}

/**
 * Atomic upsert for leads table
 * Prevents race condition where duplicate leads are created
 *
 * Uses campaign_id + linkedin_profile_url as unique constraint
 * (Requires database migration to add unique constraint)
 *
 * @param supabase - Supabase client
 * @param leadData - Lead data to upsert
 * @returns UpsertResult with success status and data
 *
 * @example
 * const result = await upsertLead(supabase, {
 *   campaign_id: job.campaign_id,
 *   linkedin_profile_url: comment.author.profile_url,
 *   name: comment.author.name,
 *   status: 'dm_pending',
 *   source: 'comment_trigger',
 * });
 *
 * if (!result.success) {
 *   console.error('[DM_SCRAPER] Lead upsert failed:', result.error);
 *   continue;
 * }
 *
 * if (!result.wasInsert) {
 *   console.log('[DM_SCRAPER] Lead already exists, skipping');
 *   continue;
 * }
 */
export async function upsertLead(
  supabase: SupabaseClient,
  leadData: LeadUpsertData
): Promise<UpsertResult<{ id: string }>> {
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('leads')
      .upsert(
        {
          campaign_id: leadData.campaign_id,
          linkedin_profile_url: leadData.linkedin_profile_url,
          name: leadData.name,
          status: leadData.status || 'new',
          source: leadData.source || 'unknown',
          metadata: leadData.metadata || {},
          linkedin_headline: leadData.linkedin_headline,
          linkedin_profile_id: leadData.linkedin_profile_id,
          updated_at: now,
        },
        {
          onConflict: 'campaign_id,linkedin_profile_url',
          ignoreDuplicates: false,
        }
      )
      .select('id, created_at, updated_at')
      .single();

    if (error) {
      return {
        success: false,
        error: error.message,
        wasInsert: false,
      };
    }

    // Determine if this was an insert or update by comparing timestamps
    // If created_at equals updated_at (within a small margin), it was an insert
    const createdAt = new Date(data.created_at).getTime();
    const updatedAt = new Date(data.updated_at).getTime();
    const wasInsert = Math.abs(updatedAt - createdAt) < 1000; // Within 1 second

    return {
      success: true,
      data: { id: data.id },
      wasInsert,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown database error',
      wasInsert: false,
    };
  }
}

/**
 * Generic upsert helper for any table with conflict handling
 *
 * @param supabase - Supabase client
 * @param table - Table name
 * @param data - Data to upsert
 * @param conflictColumns - Columns that define uniqueness
 * @param selectColumns - Columns to return (default: 'id')
 * @returns UpsertResult
 */
export async function genericUpsert<T extends { id?: string }>(
  supabase: SupabaseClient,
  table: string,
  data: Record<string, unknown>,
  conflictColumns: string,
  selectColumns: string = 'id'
): Promise<UpsertResult<T>> {
  try {
    const now = new Date().toISOString();

    const { data: result, error } = await supabase
      .from(table)
      .upsert(
        {
          ...data,
          updated_at: now,
        },
        {
          onConflict: conflictColumns,
          ignoreDuplicates: false,
        }
      )
      .select(selectColumns)
      .single();

    if (error) {
      return {
        success: false,
        error: error.message,
        wasInsert: false,
      };
    }

    return {
      success: true,
      data: result as T,
      wasInsert: true, // Can't easily determine for generic case
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown database error',
      wasInsert: false,
    };
  }
}

/**
 * Safe single record fetch with proper error handling
 *
 * @param supabase - Supabase client
 * @param table - Table name
 * @param column - Column to filter by
 * @param value - Value to match
 * @param selectColumns - Columns to return
 * @returns Record or null
 */
export async function safeFetchSingle<T>(
  supabase: SupabaseClient,
  table: string,
  column: string,
  value: string,
  selectColumns: string = '*'
): Promise<{ data: T | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from(table)
      .select(selectColumns)
      .eq(column, value)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as T | null, error: null };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}

/**
 * Safe array fetch with proper error handling
 *
 * @param supabase - Supabase client
 * @param table - Table name
 * @param column - Column to filter by
 * @param value - Value to match
 * @param selectColumns - Columns to return
 * @param limit - Optional limit
 * @returns Array of records
 */
export async function safeFetchMany<T>(
  supabase: SupabaseClient,
  table: string,
  column: string,
  value: string,
  selectColumns: string = '*',
  limit?: number
): Promise<{ data: T[]; error: string | null }> {
  try {
    let query = supabase
      .from(table)
      .select(selectColumns)
      .eq(column, value);

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: (data || []) as T[], error: null };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}
