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
      .order('created_at', { ascending: false });

    // Apply filters
    const tier = searchParams.get('tier');
    const agencyId = searchParams.get('agency_id');
    const clientId = searchParams.get('client_id');
    const userId = searchParams.get('user_id');

    if (tier) query = query.eq('tier', tier);
    if (agencyId) query = query.eq('agency_id', agencyId);
    if (clientId) query = query.eq('client_id', clientId);
    if (userId) query = query.eq('user_id', userId);

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

    // Create cartridge
    const { data: cartridge, error: createError } = await supabase
      .from('cartridges')
      .insert({
        name,
        description,
        tier,
        parent_id,
        agency_id,
        client_id,
        user_id,
        voice_params: voice_params || {},
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      return NextResponse.json(
        { error: createError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      cartridge,
    }, { status: 201 });
  } catch (error) {
    console.error('Cartridges POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
