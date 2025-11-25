/**
 * Cartridges API
 *
 * GET /api/cartridges - List cartridges with optional filters
 * POST /api/cartridges - Create new cartridge
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build query
    let query = supabase
      .from('cartridges')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false});

    // Apply SAFE filters (tier, agency, client filtering still allowed)
    const tier = searchParams.get('tier');
    const agencyId = searchParams.get('agency_id');
    const clientId = searchParams.get('client_id');
    // ⚠️ SECURITY FIX: Removed user_id filter - RLS handles this automatically
    // Users should NEVER be able to specify user_id via query params (auth bypass vulnerability)

    if (tier) query = query.eq('tier', tier);
    if (agencyId) query = query.eq('agency_id', agencyId);
    if (clientId) query = query.eq('client_id', clientId);
    // ⚠️ REMOVED: if (userId) query = query.eq('user_id', userId);
    //    RLS policy automatically filters by authenticated user's ID

    const { data: cartridges, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      cartridges,
      count: cartridges?.length || 0,
    });
  } catch (error) {
    console.error('Cartridges GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const {
      name,
      description,
      tier,
      parent_id,
      agency_id,
      client_id,
      user_id,
      voice_params,
    } = body;

    // Validate required fields
    if (!name || !tier) {
      return NextResponse.json(
        { error: 'name and tier are required' },
        { status: 400 }
      );
    }

    // Validate tier
    if (!['system', 'agency', 'client', 'user'].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid tier. Must be: system, agency, client, or user' },
        { status: 400 }
      );
    }

    // Validate voice_params structure if provided
    if (voice_params) {
      const requiredKeys = ['tone', 'style', 'personality', 'vocabulary'];
      const hasAllKeys = requiredKeys.every(key => voice_params[key]);

      if (!hasAllKeys) {
        return NextResponse.json(
          { error: `voice_params must contain: ${requiredKeys.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Create cartridge - force user_id from auth context, not request body
    const insertData: any = {
      name,
      description,
      tier,
      voice_params: voice_params || {},
      created_by: user.id,
    };

    // Set ownership fields based on tier - ALWAYS use authenticated user for user tier
    if (tier === 'agency' && agency_id) {
      insertData.agency_id = agency_id;
    } else if (tier === 'client' && client_id) {
      insertData.client_id = client_id;
    } else if (tier === 'user') {
      insertData.user_id = user.id; // ✅ Force from auth, not request
    }

    // Optional parent reference
    if (parent_id) {
      insertData.parent_id = parent_id;
    }

    // Insert cartridge - RLS policy will validate during INSERT
    // We intentionally DON'T use .select() because it causes RLS filtering on SELECT
    // which can fail even though INSERT succeeded
    const { error: createError } = await supabase
      .from('cartridges')
      .insert([insertData]);

    if (createError) {
      console.error('Cartridge INSERT error:', createError);
      return NextResponse.json(
        { error: createError.message },
        { status: 400 }
      );
    }

    // Return success immediately - the data was inserted successfully
    // Client can fetch it via GET endpoint if needed
    return NextResponse.json({
      success: true,
      message: 'Cartridge created successfully',
      cartridge: { ...insertData, id: 'generated-id-available-on-fetch' },
    }, { status: 201 });
  } catch (error) {
    console.error('Cartridges POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
