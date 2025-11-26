/**
 * POST /api/blueprint/generate
 * Generate or regenerate the 112-point marketing blueprint
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BlueprintChip } from '@/lib/chips/blueprint-chip';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { force_regenerate = false } = body;

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[BLUEPRINT_API] Generating blueprint for user:', user.id);

    // Execute the BlueprintChip
    const chip = new BlueprintChip();
    const result = await chip.execute(
      {
        action: 'generate',
        force_regenerate,
      },
      {
        userId: user.id,
        supabase,
      } as any
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[BLUEPRINT_API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate blueprint' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get blueprint status
    const chip = new BlueprintChip();
    const result = await chip.execute(
      { action: 'get_status' },
      {
        userId: user.id,
        supabase,
      } as any
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('[BLUEPRINT_API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get blueprint status' },
      { status: 500 }
    );
  }
}
