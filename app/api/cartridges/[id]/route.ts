/**
 * Cartridge Detail API
 *
 * GET /api/cartridges/[id] - Get single cartridge with resolved params
 * PATCH /api/cartridges/[id] - Update cartridge
 * DELETE /api/cartridges/[id] - Delete cartridge
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get cartridge
    const { data: cartridge, error } = await supabase
      .from('cartridges')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !cartridge) {
      return NextResponse.json(
        { error: 'Cartridge not found' },
        { status: 404 }
      );
    }

    // Get resolved voice parameters (with inheritance)
    const { data: resolvedParams, error: resolveError } = await supabase
      .rpc('get_resolved_voice_params', { cartridge_uuid: id });

    // Get hierarchy path
    const { data: hierarchy, error: hierarchyError } = await supabase
      .rpc('get_cartridge_hierarchy', { cartridge_uuid: id });

    return NextResponse.json({
      success: true,
      cartridge,
      resolved_voice_params: resolvedParams || cartridge.voice_params,
      hierarchy: hierarchy || [],
    });
  } catch (error) {
    console.error('Cartridge GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;

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
      voice_params,
      is_active,
    } = body;

    // Build update object (only include provided fields)
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (voice_params !== undefined) updates.voice_params = voice_params;
    if (is_active !== undefined) updates.is_active = is_active;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Update cartridge
    const { data: cartridge, error } = await supabase
      .from('cartridges')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      cartridge,
    });
  } catch (error) {
    console.error('Cartridge PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if cartridge exists
    const { data: cartridge, error: fetchError } = await supabase
      .from('cartridges')
      .select('tier')
      .eq('id', id)
      .single();

    if (fetchError || !cartridge) {
      return NextResponse.json(
        { error: 'Cartridge not found' },
        { status: 404 }
      );
    }

    // Prevent deletion of system cartridges
    if (cartridge.tier === 'system') {
      return NextResponse.json(
        { error: 'Cannot delete system cartridges' },
        { status: 403 }
      );
    }

    // Soft delete (set is_active to false)
    const { error: deleteError } = await supabase
      .from('cartridges')
      .update({ is_active: false })
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Cartridge deleted successfully',
    });
  } catch (error) {
    console.error('Cartridge DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
