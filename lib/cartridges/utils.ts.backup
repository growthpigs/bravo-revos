/**
 * Cartridge Utility Functions
 *
 * Common operations and helpers for cartridge management
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AuthenticationError, mapSupabaseError } from './errors';
import { CartridgeInsertData, CartridgeUpdateData, Cartridge } from './types';

/**
 * Extract and validate authenticated user from request
 * Throws AuthenticationError if not authenticated
 */
export async function requireAuth(request?: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthenticationError('Authentication required');
  }

  return { supabase, user };
}

/**
 * Build cartridge insert data, forcing user_id from auth
 * Prevents privilege escalation via client-sent user_id
 */
export function buildInsertData(
  body: any,
  userId: string
): CartridgeInsertData {
  const {
    name,
    description,
    tier,
    voice_params,
    parent_id,
    agency_id,
    client_id,
  } = body;

  const insertData: CartridgeInsertData = {
    name,
    description,
    tier,
    voice_params: voice_params || {},
    created_by: userId,
  };

  // Set ownership based on tier - ALWAYS force user_id from auth
  if (tier === 'agency' && agency_id) {
    insertData.agency_id = agency_id;
  } else if (tier === 'client' && client_id) {
    insertData.client_id = client_id;
  } else if (tier === 'user') {
    insertData.user_id = userId; // Force from auth, not request
  }

  // Optional parent reference
  if (parent_id) {
    insertData.parent_id = parent_id;
  }

  return insertData;
}

/**
 * Build cartridge update data, only including provided fields
 */
export function buildUpdateData(body: any): CartridgeUpdateData {
  const { name, description, voice_params, is_active } = body;
  const updates: CartridgeUpdateData = {};

  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (voice_params !== undefined) updates.voice_params = voice_params;
  if (is_active !== undefined) updates.is_active = is_active;

  return updates;
}

/**
 * Check if cartridge can be modified by user
 * Rules:
 * - User can modify their own 'user' tier cartridges
 * - Agency/client permissions checked by RLS policy
 * - System cartridges cannot be modified (except by admin)
 */
export function canModifyCartridge(
  cartridge: Partial<Cartridge>,
  userId: string
): boolean {
  // System cartridges cannot be modified
  if (cartridge.tier === 'system') {
    return false;
  }

  // User tier cartridges can only be modified by owner
  if (cartridge.tier === 'user' && cartridge.user_id !== userId) {
    return false;
  }

  // Agency/client permissions are checked by RLS policy
  // Return true here, RLS will verify
  return true;
}

/**
 * Check if cartridge can be deleted by user
 * Rules:
 * - System cartridges cannot be deleted
 * - User tier cartridges can be deleted by owner
 * - Agency/client tiers checked by RLS
 */
export function canDeleteCartridge(
  cartridge: Partial<Cartridge>,
  userId: string
): boolean {
  // System cartridges cannot be deleted
  if (cartridge.tier === 'system') {
    return false;
  }

  // User tier cartridges can be deleted by owner
  if (cartridge.tier === 'user' && cartridge.user_id !== userId) {
    return false;
  }

  return true;
}

/**
 * Format Supabase error message for API response
 * Provides user-friendly error messages
 */
export function formatErrorMessage(error: any): string {
  const message = error?.message || String(error);

  if (message.includes('policy')) {
    return 'You do not have permission to perform this action';
  }

  if (message.includes('duplicate') || message.includes('unique')) {
    return 'A cartridge with this name already exists';
  }

  if (message.includes('constraint')) {
    return 'Invalid cartridge configuration';
  }

  return message;
}

/**
 * Extract UUID from params safely
 */
export function extractId(params: { id?: string | string[] }): string {
  const id = params?.id;
  if (Array.isArray(id)) {
    return id[0];
  }
  return id || '';
}

/**
 * Validate tier ownership constraints
 * Ensures proper tier hierarchy is maintained
 */
export function validateTierOwnership(tier: string, ownership: {
  userId?: string;
  clientId?: string;
  agencyId?: string;
}): boolean {
  switch (tier) {
    case 'system':
      return !ownership.userId && !ownership.clientId && !ownership.agencyId;
    case 'agency':
      return !!ownership.agencyId && !ownership.clientId && !ownership.userId;
    case 'client':
      return !!ownership.clientId && !ownership.userId;
    case 'user':
      return !!ownership.userId;
    default:
      return false;
  }
}

/**
 * Get human-readable tier label
 */
export function getTierLabel(tier: string): string {
  const labels: Record<string, string> = {
    system: 'System',
    agency: 'Agency',
    client: 'Client',
    user: 'Personal',
  };
  return labels[tier] || tier;
}

/**
 * Sort cartridges by tier hierarchy
 */
export function sortByTier(cartridges: Cartridge[]): Cartridge[] {
  const tierOrder = { system: 0, agency: 1, client: 2, user: 3 };
  return [...cartridges].sort(
    (a, b) => (tierOrder[a.tier] || 999) - (tierOrder[b.tier] || 999)
  );
}
