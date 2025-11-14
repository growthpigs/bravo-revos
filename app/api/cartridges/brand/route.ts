import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('[TRACE_API] 9. API: Brand GET started');
    console.log('[TRACE_API] 10. API: Headers:', Object.fromEntries(request.headers.entries()));
    console.log('[TRACE_API] 11. API: Cookies:', request.cookies.getAll());

    const supabase = await createClient();
    console.log('[TRACE_API] 12. API: Supabase client created:', !!supabase);

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('[TRACE_API] 13. API: Auth result:', { user: !!user, error: authError?.message });

    if (authError || !user) {
      console.error('[TRACE_API] 14. API: Auth failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[TRACE_API] 15. API: User authenticated:', user.id);

    // Fetch user's brand cartridge (should only have one)
    console.log('[TRACE_API] 16. API: Querying brand_cartridges for user:', user.id);

    const { data, error } = await supabase
      .from('brand_cartridges')
      .select('*')
      .eq('user_id', user.id)
      .single();

    console.log('[TRACE_API] 17. API: Query result:', {
      data: !!data,
      error: error?.code,
      errorMessage: error?.message
    });

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('[TRACE_API] 18. API: Database error:', error);
      console.error('Error fetching brand:', error);
      return NextResponse.json({ error: 'Failed to fetch brand' }, { status: 500 });
    }

    // If no brand exists, create default one
    if (!data) {
      const { data: newBrand, error: createError } = await supabase
        .from('brand_cartridges')
        .insert({
          user_id: user.id,
          name: 'My Brand',
          core_values: [],
          brand_personality: [],
          brand_colors: {
            primary: '#000000',
            secondary: '#FFFFFF',
            accent: '#0066CC'
          },
          social_links: {}
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating default brand:', createError);
        return NextResponse.json({ error: 'Failed to create brand' }, { status: 500 });
      }

      return NextResponse.json({ brand: newBrand });
    }

    return NextResponse.json({ brand: data });
  } catch (error) {
    console.error('Error in GET /api/cartridges/brand:', error);
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

    // Check if user already has a brand
    const { data: existing, error: checkError } = await supabase
      .from('brand_cartridges')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking brand:', checkError);
      return NextResponse.json({ error: 'Failed to check brand' }, { status: 500 });
    }

    let result;

    if (existing) {
      // Update existing brand
      const { data, error } = await supabase
        .from('brand_cartridges')
        .update({
          ...body,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating brand:', error);
        return NextResponse.json({ error: 'Failed to update brand' }, { status: 500 });
      }

      result = data;
    } else {
      // Create new brand
      const { data, error } = await supabase
        .from('brand_cartridges')
        .insert({
          user_id: user.id,
          name: body.name || 'My Brand',
          company_name: body.company_name,
          company_description: body.company_description,
          company_tagline: body.company_tagline,
          industry: body.industry,
          target_audience: body.target_audience,
          core_values: body.core_values || [],
          brand_voice: body.brand_voice,
          brand_personality: body.brand_personality || [],
          logo_url: body.logo_url,
          brand_colors: body.brand_colors || {
            primary: '#000000',
            secondary: '#FFFFFF',
            accent: '#0066CC'
          },
          social_links: body.social_links || {}
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating brand:', error);
        return NextResponse.json({ error: 'Failed to create brand' }, { status: 500 });
      }

      result = data;
    }

    return NextResponse.json({ brand: result });
  } catch (error) {
    console.error('Error in POST /api/cartridges/brand:', error);
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

    // Update brand (user can only have one)
    const { data, error } = await supabase
      .from('brand_cartridges')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
      }
      console.error('Error updating brand:', error);
      return NextResponse.json({ error: 'Failed to update brand' }, { status: 500 });
    }

    return NextResponse.json({ brand: data });
  } catch (error) {
    console.error('Error in PATCH /api/cartridges/brand:', error);
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

    // Get brand to find logo
    const { data: brand, error: fetchError } = await supabase
      .from('brand_cartridges')
      .select('logo_url')
      .eq('user_id', user.id)
      .single();

    if (fetchError || !brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Delete logo from storage if exists
    if (brand.logo_url) {
      await supabase.storage.from('brand-assets').remove([brand.logo_url]);
    }

    // Delete brand record
    const { error } = await supabase
      .from('brand_cartridges')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting brand:', error);
      return NextResponse.json({ error: 'Failed to delete brand' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Brand deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/cartridges/brand:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}