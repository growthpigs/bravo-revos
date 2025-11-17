import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // Create service role client (bypasses RLS)
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

    console.log('[FIX] Updating workflow triggers...');

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
