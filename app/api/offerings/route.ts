import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/offerings
 * Fetch user's offerings
 * Query params: limit (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authentication check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit');

    // Build query
    let query = supabase
      .from('offerings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum) && limitNum > 0) {
        query = query.limit(limitNum);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching offerings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch offerings' },
        { status: 500 }
      );
    }

    return NextResponse.json({ offerings: data || [] });
  } catch (error) {
    console.error('Offerings API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/offerings
 * Create new offering
 * Body: { name, elevator_pitch, key_benefits, objection_handlers, qualification_questions, proof_points }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authentication check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const {
      name,
      elevator_pitch,
      key_benefits,
      objection_handlers,
      qualification_questions,
      proof_points,
    } = body;

    // Validation
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required and must be a string' },
        { status: 400 }
      );
    }

    if (!elevator_pitch || typeof elevator_pitch !== 'string') {
      return NextResponse.json(
        { error: 'Elevator pitch is required and must be a string' },
        { status: 400 }
      );
    }

    // Insert offering
    const { data, error } = await supabase
      .from('offerings')
      .insert({
        user_id: user.id,
        name,
        elevator_pitch,
        key_benefits: key_benefits || [],
        objection_handlers: objection_handlers || {},
        qualification_questions: qualification_questions || [],
        proof_points: proof_points || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating offering:', error);
      return NextResponse.json(
        { error: 'Failed to create offering' },
        { status: 500 }
      );
    }

    return NextResponse.json({ offering: data }, { status: 201 });
  } catch (error) {
    console.error('Offerings POST API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
