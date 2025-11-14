import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's preference cartridge (should only have one)
    const { data, error } = await supabase
      .from('preference_cartridges')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching preferences:', error);
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
    }

    // If no preferences exist, create default ones
    if (!data) {
      const { data: newPrefs, error: createError } = await supabase
        .from('preference_cartridges')
        .insert({
          user_id: user.id,
          name: 'My Preferences',
          language: 'English',
          platform: 'LinkedIn',
          tone: 'Professional',
          content_length: 'Medium',
          use_emojis: false,
          use_hashtags: true,
          hashtag_count: 3
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