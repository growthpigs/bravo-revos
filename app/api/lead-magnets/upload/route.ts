/**
 * Lead Magnet Upload API
 *
 * POST /api/lead-magnets/upload
 * Uploads a lead magnet file to Supabase Storage with multi-tenant isolation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadFile, validateFile } from '@/lib/storage-utils';

export async function POST(request: NextRequest) {
  try {
    // Initialize Supabase client
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const leadMagnetId = formData.get('lead_magnet_id') as string;

    // Validate input
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!leadMagnetId) {
      return NextResponse.json(
        { error: 'lead_magnet_id is required' },
        { status: 400 }
      );
    }

    // Validate file before upload
    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Verify lead magnet exists - RLS ensures user owns it
    const { data: leadMagnet, error: leadMagnetError } = await supabase
      .from('lead_magnet')
      .select('id')
      .eq('id', leadMagnetId)
      .single();

    if (leadMagnetError || !leadMagnet) {
      return NextResponse.json(
        { error: 'Lead magnet not found or access denied' },
        { status: 404 }
      );
    }

    // Upload file to Supabase Storage
    // Note: uploadFile will handle multi-tenant isolation via user context
    const uploadResult = await uploadFile(supabase, file, user.id, leadMagnetId);

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: uploadResult.error },
        { status: 500 }
      );
    }

    // Update lead_magnets table with file metadata
    const { error: updateError } = await supabase
      .from('lead_magnet')
      .update({
        file_path: uploadResult.path,
        file_size: file.size,
        file_type: file.type,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadMagnetId);

    if (updateError) {
      // Log error but don't fail the request since file was uploaded
      console.error('Failed to update lead_magnets table:', updateError);
    }

    return NextResponse.json(
      {
        success: true,
        path: uploadResult.path,
        size: file.size,
        type: file.type,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
