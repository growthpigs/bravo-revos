import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isUserAdmin } from '@/lib/auth/admin';

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      workflow_type,
      category,
      description,
      triggers,
      prompts,
      steps,
      output_config,
      icon,
      user_visible,
      is_active,
    } = body;

    const { data: workflow, error } = await supabase
      .from('console_workflow')
      .update({
        name,
        workflow_type,
        category,
        description,
        triggers,
        prompts,
        steps,
        output_config,
        icon,
        user_visible,
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('[ADMIN_WORKFLOWS] Error updating:', error);
      return NextResponse.json({ error: 'Failed to update workflow' }, { status: 500 });
    }

    return NextResponse.json({ workflow });
  } catch (error: any) {
    console.error('[ADMIN_WORKFLOWS] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Check if soft delete or hard delete
    const url = new URL(req.url);
    const hard = url.searchParams.get('hard') === 'true';

    if (hard) {
      // Hard delete
      const { error } = await supabase
        .from('console_workflow')
        .delete()
        .eq('id', params.id);

      if (error) {
        console.error('[ADMIN_WORKFLOWS] Error deleting:', error);
        return NextResponse.json({ error: 'Failed to delete workflow' }, { status: 500 });
      }
    } else {
      // Soft delete (set is_active = false)
      const { error } = await supabase
        .from('console_workflow')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', params.id);

      if (error) {
        console.error('[ADMIN_WORKFLOWS] Error deactivating:', error);
        return NextResponse.json({ error: 'Failed to deactivate workflow' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[ADMIN_WORKFLOWS] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Toggle active status
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { is_active } = await req.json();

    const { data: workflow, error } = await supabase
      .from('console_workflow')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('[ADMIN_WORKFLOWS] Error toggling:', error);
      return NextResponse.json({ error: 'Failed to toggle workflow' }, { status: 500 });
    }

    return NextResponse.json({ workflow });
  } catch (error: any) {
    console.error('[ADMIN_WORKFLOWS] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
