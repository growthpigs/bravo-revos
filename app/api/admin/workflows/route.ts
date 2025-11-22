import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isUserAdmin } from '@/lib/admin';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin status
    const isAdmin = await isUserAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all workflows (including inactive for admin)
    const { data: workflows, error } = await supabase
      .from('console_workflows')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('[ADMIN_WORKFLOWS] Error fetching:', error);
      return NextResponse.json({ error: 'Failed to fetch workflows' }, { status: 500 });
    }

    return NextResponse.json({ workflows });
  } catch (error: any) {
    console.error('[ADMIN_WORKFLOWS] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin status
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

    if (!name || !workflow_type || !category) {
      return NextResponse.json(
        { error: 'Name, workflow_type, and category are required' },
        { status: 400 }
      );
    }

    const { data: workflow, error } = await supabase
      .from('console_workflows')
      .insert({
        name,
        workflow_type,
        category,
        description: description || null,
        triggers: triggers || {},
        prompts: prompts || {},
        steps: steps || [],
        output_config: output_config || {},
        icon: icon || '✏️',
        user_visible: user_visible ?? true,
        is_active: is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error('[ADMIN_WORKFLOWS] Error creating:', error);
      return NextResponse.json({ error: 'Failed to create workflow' }, { status: 500 });
    }

    return NextResponse.json({ workflow }, { status: 201 });
  } catch (error: any) {
    console.error('[ADMIN_WORKFLOWS] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
