import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's client_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('client_id')
      .eq('id', user.id)
      .maybeSingle();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify document exists and belongs to user's client
    const { data: document, error: docError } = await supabase
      .from('knowledge_base_documents')
      .select('id')
      .eq('id', params.id)
      .eq('client_id', userData.client_id)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Get campaigns linked to this document
    const { data: linkedCampaigns, error: linkError } = await supabase
      .from('campaign_documents')
      .select('campaign_id')
      .eq('document_id', params.id);

    if (linkError) {
      console.error('[KB] Error fetching linked campaigns:', linkError);
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
    }

    const campaignIds = linkedCampaigns?.map((link) => link.campaign_id) || [];

    return NextResponse.json({
      document_id: params.id,
      campaign_ids: campaignIds,
      count: campaignIds.length,
    });
  } catch (error) {
    console.error('[KB] Error in GET campaigns:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
