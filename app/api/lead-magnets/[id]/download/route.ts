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

    // Get the current user's client_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('client_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found or not associated with a client' },
        { status: 403 }
      );
    }

    const clientId = userData.client_id;
    const leadMagnetId = params.id;

    // Get lead magnet details
    const { data: leadMagnet, error: leadMagnetError } = await supabase
      .from('lead_magnets')
      .select('id, client_id, file_path, name')
      .eq('id', leadMagnetId)
      .single();

    if (leadMagnetError || !leadMagnet) {
      return NextResponse.json(
        { error: 'Lead magnet not found' },
        { status: 404 }
      );
    }

    // Verify lead magnet belongs to this client
    if (leadMagnet.client_id !== clientId) {
      return NextResponse.json(
        { error: 'Access denied: Lead magnet belongs to different client' },
        { status: 403 }
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
