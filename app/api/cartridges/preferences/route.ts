import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('[TRACE_PREFS_API] 1. Preferences API GET started');
    console.log('[TRACE_PREFS_API] 2. Headers:', Object.fromEntries(request.headers.entries()));
    console.log('[TRACE_PREFS_API] 3. Cookies:', request.cookies.getAll());

    const supabase = await createClient();
    console.log('[TRACE_PREFS_API] 4. Supabase client created');

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('[TRACE_PREFS_API] 5. Auth result:', { hasUser: !!user, userId: user?.id, error: authError?.message });

    if (authError || !user) {
      console.error('[TRACE_PREFS_API] 6. Auth failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[TRACE_PREFS_API] 7. Querying preferences_cartridges for user:', user.id);
    console.log('[TRACE_PREFS_API] 7b. NOTE: Table name should be preferences_cartridges (with S), not preference_cartridges');

    // Fetch user's preference cartridge (should only have one)
    // FIXED: Table name is preferences_cartridges (plural), not preference_cartridges
    const { data, error } = await supabase
      .from('preferences_cartridges')
      .select('*')
      .eq('user_id', user.id)
      .single();

    console.log('[TRACE_PREFS_API] 8. Query result:', {
      hasData: !!data,
      error: error?.code,
      errorMessage: error?.message
    });

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('[TRACE_PREFS_API] 9. Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
    }

    // If no preferences exist, create default ones
    if (!data) {
      console.log('[TRACE_PREFS_API] 10. No preferences found, creating defaults');
      const { data: newPrefs, error: createError } = await supabase
        .from('preferences_cartridges') // FIXED: correct table name
        .insert({
          user_id: user.id,
          language: 'English',
          platform: 'LinkedIn',
          tone: 'Professional',
          content_length: 'Medium',
          hashtag_count: 3,
          emoji_usage: 'Moderate',
          call_to_action: 'Subtle',
          personalization_level: 'Medium'
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating default preferences:', createError);
        return NextResponse.json({ error: 'Failed to create preferences' }, { status: 500 });
      }

      return NextResponse.json({ preferences: newPrefs });
    }

    return NextResponse.json({ preferences: data });
  } catch (error) {
    console.error('Error in GET /api/cartridges/preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Check if user already has preferences
    const { data: existing, error: checkError } = await supabase
      .from('preference_cartridges')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking preferences:', checkError);
      return NextResponse.json({ error: 'Failed to check preferences' }, { status: 500 });
    }

    let result;

    if (existing) {
      // Update existing preferences
      const { data, error } = await supabase
        .from('preference_cartridges')
        .update({
          ...body,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating preferences:', error);
        return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
      }

      result = data;
    } else {
      // Create new preferences
      const { data, error } = await supabase
        .from('preference_cartridges')
        .insert({
          user_id: user.id,
          name: body.name || 'My Preferences',
          language: body.language || 'English',
          platform: body.platform || 'LinkedIn',
          tone: body.tone || 'Professional',
          content_length: body.content_length || 'Medium',
          use_emojis: body.use_emojis || false,
          use_hashtags: body.use_hashtags !== undefined ? body.use_hashtags : true,
          hashtag_count: body.hashtag_count || 3
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating preferences:', error);
        return NextResponse.json({ error: 'Failed to create preferences' }, { status: 500 });
      }

      result = data;
    }

    return NextResponse.json({ preferences: result });
  } catch (error) {
    console.error('Error in POST /api/cartridges/preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Update preferences (user can only have one)
    const { data, error } = await supabase
      .from('preference_cartridges')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Preferences not found' }, { status: 404 });
      }
      console.error('Error updating preferences:', error);
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    }

    return NextResponse.json({ preferences: data });
  } catch (error) {
    console.error('Error in PATCH /api/cartridges/preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete the user's preferences
    const { error } = await supabase
      .from('preferences_cartridges')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting preferences:', error);
      return NextResponse.json({ error: 'Failed to delete preferences' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Preferences deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/cartridges/preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}