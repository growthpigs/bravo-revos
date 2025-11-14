import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const styleId = params.id;

    // Fetch the style cartridge with status information
    const { data: style, error: fetchError } = await supabase
      .from('style_cartridges')
      .select('id, analysis_status, last_analyzed_at')
      .eq('id', styleId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !style) {
      return NextResponse.json({ error: 'Style guide not found' }, { status: 404 });
    }

    // Map analysis_status to standard status format
    // Database: pending, analyzing, completed, failed
    // API response: pending, processing, completed, failed
    const status = style.analysis_status === 'analyzing' ? 'processing' : style.analysis_status;

    return NextResponse.json({
      status,
      lastProcessedAt: style.last_analyzed_at,
      // Progress field could be added later if needed
      progress: null,
      // Error field would be populated if status is 'failed'
      error: status === 'failed' ? 'Style analysis failed' : null
    });
  } catch (error) {
    console.error('Error in GET /api/cartridges/style/[id]/status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
