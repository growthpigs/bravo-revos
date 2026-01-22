import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRole } from '@/lib/clients';
import { createClient } from '@/lib/supabase/server';
import { isUserAdmin } from '@/lib/auth/admin-check';

// Prevent build-time execution
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Verify user is authenticated AND is an admin
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(user.id, authClient);
    if (!isAdmin) {
      console.warn('[CHECK] Non-admin user attempted access:', user.id);
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Create service role client (bypasses RLS) - ONLY after admin verification
    const supabase = getSupabaseServiceRole();

    console.log('[CHECK] Admin', user.email, 'fetching write-linkedin-post workflow...');

    // Fetch the workflow
    const { data, error } = await supabase
      .from('console_workflow')
      .select('*')
      .eq('name', 'write-linkedin-post')
      .single();

    if (error) {
      console.error('[CHECK] Error:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error
      }, { status: 500 });
    }

    console.log('[CHECK] Workflow found:', {
      name: data.name,
      type: data.workflow_type,
      is_active: data.is_active,
      triggers: data.triggers
    });

    return NextResponse.json({
      success: true,
      workflow: data
    });
  } catch (error: any) {
    console.error('[CHECK] Fatal error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
