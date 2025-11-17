import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
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

    console.log('[CHECK] Fetching write-linkedin-post workflow...');

    // Fetch the workflow
    const { data, error } = await supabase
      .from('console_workflows')
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
