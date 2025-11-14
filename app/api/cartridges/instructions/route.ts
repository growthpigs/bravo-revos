import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('[TRACE_INSTR_API] 1. Instructions API GET started');
    console.log('[TRACE_INSTR_API] 2. Headers:', Object.fromEntries(request.headers.entries()));
    console.log('[TRACE_INSTR_API] 3. Cookies:', request.cookies.getAll());

    const supabase = await createClient();
    console.log('[TRACE_INSTR_API] 4. Supabase client created');

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('[TRACE_INSTR_API] 5. Auth result:', { hasUser: !!user, userId: user?.id, error: authError?.message });

    if (authError || !user) {
      console.error('[TRACE_INSTR_API] 6. Auth failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[TRACE_INSTR_API] 7. Querying instruction_cartridges for user:', user.id);

    // Fetch user's instruction cartridges
    const { data, error } = await supabase
      .from('instruction_cartridges')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    console.log('[TRACE_INSTR_API] 8. Query result:', {
      hasData: !!data,
      dataLength: data?.length,
      error: error?.code,
      errorMessage: error?.message
    });

    if (error) {
      console.error('[TRACE_INSTR_API] 9. Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch instruction cartridges' }, { status: 500 });
    }

    console.log('[TRACE_INSTR_API] 10. Success, returning', data?.length || 0, 'cartridges');
    return NextResponse.json({ cartridges: data || [] });
  } catch (error) {
    console.error('[TRACE_INSTR_API] 11. CRITICAL ERROR:', error);
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
    const mem0Namespace = `instructions::marketing::${user.id}`;

    // Create instruction cartridge
    const { data, error } = await supabase
      .from('instruction_cartridges')
      .insert({
        user_id: user.id,
        name,
        description,
        mem0_namespace: mem0Namespace,
        process_status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating instruction cartridge:', error);
      return NextResponse.json({ error: 'Failed to create instruction cartridge' }, { status: 500 });
    }

    return NextResponse.json({ cartridge: data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/cartridges/instructions:', error);
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

    // Update instruction cartridge
    const { data, error } = await supabase
      .from('instruction_cartridges')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating instruction cartridge:', error);
      return NextResponse.json({ error: 'Failed to update instruction cartridge' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Cartridge not found' }, { status: 404 });
    }

    return NextResponse.json({ cartridge: data });
  } catch (error) {
    console.error('Error in PATCH /api/cartridges/instructions:', error);
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

    // First, get the cartridge to find associated files
    const { data: cartridge, error: fetchError } = await supabase
      .from('instruction_cartridges')
      .select('training_docs')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !cartridge) {
      return NextResponse.json({ error: 'Cartridge not found' }, { status: 404 });
    }

    // Delete associated files from storage
    if (cartridge.training_docs && cartridge.training_docs.length > 0) {
      const filePaths = cartridge.training_docs.map((doc: any) => doc.file_path);
      await supabase.storage.from('instruction-documents').remove(filePaths);
    }

    // Delete instruction cartridge
    const { error } = await supabase
      .from('instruction_cartridges')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting instruction cartridge:', error);
      return NextResponse.json({ error: 'Failed to delete instruction cartridge' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Instruction cartridge deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/cartridges/instructions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}