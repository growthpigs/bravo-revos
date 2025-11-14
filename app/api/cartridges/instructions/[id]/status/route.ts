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

    const instructionId = params.id;

    // Fetch the instruction cartridge with status information
    const { data: instruction, error: fetchError } = await supabase
      .from('instruction_cartridges')
      .select('id, process_status, last_processed_at')
      .eq('id', instructionId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !instruction) {
      return NextResponse.json({ error: 'Instruction not found' }, { status: 404 });
    }

    return NextResponse.json({
      status: instruction.process_status,
      lastProcessedAt: instruction.last_processed_at,
      // Progress field could be added later if needed
      progress: null,
      // Error field would be populated if status is 'failed'
      error: instruction.process_status === 'failed' ? 'Instruction processing failed' : null
    });
  } catch (error) {
    console.error('Error in GET /api/cartridges/instructions/[id]/status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
