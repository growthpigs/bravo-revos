import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isUserAdmin } from '@/lib/auth/admin-check';

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Verify user is authenticated AND is an admin
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(user.id, authClient);
    if (!isAdmin) {
      console.warn('[FIX] Non-admin user attempted access:', user.id);
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Create service role client (bypasses RLS) - ONLY after admin verification
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('[FIX] Admin', user.email, 'updating workflow triggers...');

    // Update the workflow with correct regex pattern
    const { data, error } = await supabase
      .from('console_workflows')
      .update({
        triggers: {
          commands: ['write'],
          patterns: ['^write\\W*$'],  // Single backslash for proper regex
          case_insensitive: true
        }
      })
      .eq('name', 'write-linkedin-post')
      .select();

    if (error) {
      console.error('[FIX] Error:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error
      }, { status: 500 });
    }

    console.log('[FIX] Workflow updated:', data);

    return NextResponse.json({
      success: true,
      message: 'Workflow triggers fixed',
      workflow: data?.[0] || null
    });
  } catch (error: any) {
    console.error('[FIX] Fatal error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
