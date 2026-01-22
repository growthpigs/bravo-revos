/**
 * Lead Magnet Download URL API
 *
 * GET /api/lead-magnets/[id]/download
 * Generates a signed URL for downloading a lead magnet file (24-hour expiry)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateDownloadUrl } from '@/lib/storage-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const leadMagnetId = params.id;

    // Get lead magnet details (RLS filters to user's resources)
    const { data: leadMagnet, error: leadMagnetError } = await supabase
      .from('lead_magnet')
      .select('id, file_path, name')
      .eq('id', leadMagnetId)
      .single();

    if (leadMagnetError || !leadMagnet) {
      return NextResponse.json(
        { error: 'Lead magnet not found or access denied' },
        { status: 404 }
      );
    }

    // Check if file_path exists
    if (!leadMagnet.file_path) {
      return NextResponse.json(
        { error: 'No file associated with this lead magnet' },
        { status: 404 }
      );
    }

    // Generate signed URL (24-hour expiry)
    const urlResult = await generateDownloadUrl(supabase, leadMagnet.file_path, 86400);

    if (!urlResult.success) {
      return NextResponse.json(
        { error: urlResult.error || 'Failed to generate download URL' },
        { status: 500 }
      );
    }

    // Update download_count by calling a database function
    // Note: We use rpc() to increment atomically without race conditions
    const { error: updateError } = await supabase.rpc(
      'increment_download_count',
      { lead_magnet_id: leadMagnetId }
    );

    if (updateError) {
      console.error('Failed to update download_count:', updateError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json(
      {
        success: true,
        url: urlResult.url,
        expires_in: 86400, // 24 hours in seconds
        name: leadMagnet.name,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Download URL generation error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
