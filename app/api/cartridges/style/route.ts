import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's style cartridges
    const { data, error } = await supabase
      .from('style_cartridges')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching style cartridges:', error);
      return NextResponse.json({ error: 'Failed to fetch style cartridges' }, { status: 500 });
    }

    return NextResponse.json({ cartridges: data || [] });
  } catch (error) {
    console.error('Error in GET /api/cartridges/style:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Generate Mem0 namespace
    // For now, using simple user ID. In production, would include agencyId and clientId
    const mem0Namespace = `style::marketing::${user.id}`;

    // Create style cartridge
    const { data, error } = await supabase
      .from('style_cartridges')
      .insert({
        user_id: user.id,
        name,
        description,
        mem0_namespace: mem0Namespace,
        analysis_status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating style cartridge:', error);
      return NextResponse.json({ error: 'Failed to create style cartridge' }, { status: 500 });
    }

    return NextResponse.json({ cartridge: data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/cartridges/style:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Cartridge ID is required' }, { status: 400 });
    }

    // Update style cartridge
    const { data, error } = await supabase
      .from('style_cartridges')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user owns the cartridge
      .select()
      .single();

    if (error) {
      console.error('Error updating style cartridge:', error);
      return NextResponse.json({ error: 'Failed to update style cartridge' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Cartridge not found' }, { status: 404 });
    }

    return NextResponse.json({ cartridge: data });
  } catch (error) {
    console.error('Error in PATCH /api/cartridges/style:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Cartridge ID is required' }, { status: 400 });
    }

    // Delete style cartridge
    const { error } = await supabase
      .from('style_cartridges')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // Ensure user owns the cartridge

    if (error) {
      console.error('Error deleting style cartridge:', error);
      return NextResponse.json({ error: 'Failed to delete style cartridge' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Style cartridge deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/cartridges/style:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}