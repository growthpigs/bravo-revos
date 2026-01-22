/**
 * F-02: Memory API Endpoints
 * POST - Add memory
 * GET - Get memories or search
 * PUT - Update memory
 * DELETE - Delete memory
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  addMemory,
  getMemories,
  searchMemories,
  updateMemory,
  deleteMemory,
} from '@/lib/mem0/memory';
import { buildTenantKey, verifyTenantKey } from '@/lib/mem0/client';
import { safeParseQueryParam } from '@/lib/utils/safe-parse';
import { QUERY_PARAM_DEFAULTS } from '@/lib/config';

/**
 * POST /api/mem0
 * Add memory for authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tenant information from request
    const body = await request.json();
    const { messages, metadata } = body;

    if (!messages) {
      return NextResponse.json(
        { error: 'Messages required' },
        { status: 400 }
      );
    }

    // Build tenant key for isolation (user_id is sufficient for multi-tenant context)
    // Note: For Mem0, we store user-specific memories, not client-wide
    const tenantKey = buildTenantKey(undefined, undefined, user.id);

    // Add memory
    const memories = await addMemory(
      tenantKey,
      { messages },
      metadata
    );

    return NextResponse.json({
      status: 'success',
      memories,
      tenantKey, // Echo back for verification (masked)
    });
  } catch (error) {
    console.error('[MEM0_API] Error adding memory:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/mem0
 * Query params:
 * - action: 'list' (default) or 'search'
 * - query: search term (required if action=search)
 * - limit: number of results (default 10)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';
    const query = searchParams.get('query');
    const limit = safeParseQueryParam(searchParams, 'limit', QUERY_PARAM_DEFAULTS.SEARCH_LIMIT, { min: 1, max: QUERY_PARAM_DEFAULTS.MAX_LIMIT });

    // Get user's agency and client
    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('agency_id, client_id')
      .eq('id', user.id)
      .maybeSingle();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User context not found' },
        { status: 404 }
      );
    }

    // Build tenant key
    const tenantKey = buildTenantKey(userData.agency_id, userData.client_id, user.id);

    if (action === 'search') {
      if (!query) {
        return NextResponse.json(
          { error: 'Search query required' },
          { status: 400 }
        );
      }

      const results = await searchMemories(tenantKey, query, limit);

      return NextResponse.json({
        status: 'success',
        action: 'search',
        query,
        results,
        count: results.length,
      });
    }

    // Default: list all memories
    const memories = await getMemories(tenantKey, limit);

    return NextResponse.json({
      status: 'success',
      action: 'list',
      memories,
      count: memories.length,
    });
  } catch (error) {
    console.error('[MEM0_API] Error fetching memories:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/mem0
 * Update existing memory
 * Body: { memoryId, newMemory, metadata }
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { memoryId, newMemory, metadata } = body;

    if (!memoryId || !newMemory) {
      return NextResponse.json(
        { error: 'Memory ID and new memory content required' },
        { status: 400 }
      );
    }

    // Get user's agency and client
    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('agency_id, client_id')
      .eq('id', user.id)
      .maybeSingle();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User context not found' },
        { status: 404 }
      );
    }

    // Build tenant key
    const tenantKey = buildTenantKey(userData.agency_id, userData.client_id, user.id);

    // Update memory
    const updated = await updateMemory(tenantKey, memoryId, newMemory, metadata);

    return NextResponse.json({
      status: 'success',
      memory: updated,
    });
  } catch (error) {
    console.error('[MEM0_API] Error updating memory:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/mem0
 * Query param: memoryId
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memoryId = searchParams.get('memoryId');

    if (!memoryId) {
      return NextResponse.json(
        { error: 'Memory ID required' },
        { status: 400 }
      );
    }

    // Get user's agency and client
    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('agency_id, client_id')
      .eq('id', user.id)
      .maybeSingle();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User context not found' },
        { status: 404 }
      );
    }

    // Build tenant key
    const tenantKey = buildTenantKey(userData.agency_id, userData.client_id, user.id);

    // Delete memory
    await deleteMemory(tenantKey, memoryId);

    return NextResponse.json({
      status: 'success',
      message: `Memory ${memoryId} deleted`,
    });
  } catch (error) {
    console.error('[MEM0_API] Error deleting memory:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
