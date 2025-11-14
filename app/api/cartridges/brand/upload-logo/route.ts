import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Logo file is required' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: `Invalid file type: ${file.type}. Allowed types: PNG, JPG, SVG, WebP`
      }, { status: 400 });
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Logo file exceeds 5MB limit' }, { status: 400 });
    }

    // Get or create brand record
    let { data: brand, error: brandError } = await supabase
      .from('brand_cartridges')
      .select('id, logo_url')
      .eq('user_id', user.id)
      .single();

    if (brandError && brandError.code === 'PGRST116') {
      // Create brand if it doesn't exist
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
        console.error('Error creating brand:', createError);
        return NextResponse.json({ error: 'Failed to create brand' }, { status: 500 });
      }

      brand = newBrand;
    } else if (brandError) {
      console.error('Error fetching brand:', brandError);
      return NextResponse.json({ error: 'Failed to fetch brand' }, { status: 500 });
    }

    // Delete old logo if exists
    if (brand?.logo_url) {
      await supabase.storage.from('brand-assets').remove([brand.logo_url]);
    }

    // Generate file path
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/logo-${timestamp}.${fileExt}`;

    // Convert File to Blob for upload
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: file.type });

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('brand-assets')
      .upload(filePath, blob, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({
        error: `Failed to upload logo: ${uploadError.message}`
      }, { status: 500 });
    }

    // Get public URL for the logo
    const { data: { publicUrl } } = supabase.storage
      .from('brand-assets')
      .getPublicUrl(filePath);

    // Update brand with new logo URL
    const { error: updateError } = await supabase
      .from('brand_cartridges')
      .update({
        logo_url: filePath,
        logo_uploaded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating brand:', updateError);
      // Try to clean up uploaded file
      await supabase.storage.from('brand-assets').remove([filePath]);
      return NextResponse.json({ error: 'Failed to update brand' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Logo uploaded successfully',
      logo_url: publicUrl,
      file_path: filePath
    });
  } catch (error) {
    console.error('Error in POST /api/cartridges/brand/upload-logo:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete logo
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get brand with logo
    const { data: brand, error: brandError } = await supabase
      .from('brand_cartridges')
      .select('id, logo_url')
      .eq('user_id', user.id)
      .single();

    if (brandError || !brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    if (!brand.logo_url) {
      return NextResponse.json({ error: 'No logo to delete' }, { status: 400 });
    }

    // Remove from storage
    const { error: deleteError } = await supabase.storage
      .from('brand-assets')
      .remove([brand.logo_url]);

    if (deleteError) {
      console.error('Error deleting logo:', deleteError);
      return NextResponse.json({ error: 'Failed to delete logo' }, { status: 500 });
    }

    // Update brand to remove logo reference
    const { error: updateError } = await supabase
      .from('brand_cartridges')
      .update({
        logo_url: null,
        logo_uploaded_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating brand:', updateError);
      return NextResponse.json({ error: 'Failed to update brand' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Logo deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/cartridges/brand/upload-logo:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}