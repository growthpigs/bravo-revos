import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

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

    // Verify campaign belongs to user's client
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', params.id)
      .eq('client_id', userData.client_id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Get linked documents
    const { data: documents, error, count } = await supabase
      .from('campaign_documents')
      .select('document_id, added_at, added_by, knowledge_base_documents(*)', { count: 'exact' })
      .eq('campaign_id', params.id)
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[KB] Error fetching campaign documents:', error);
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    return NextResponse.json({
      documents: documents || [],
      count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[KB] Error in GET campaign documents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { document_id } = await request.json();

    if (!document_id) {
      return NextResponse.json(
        { error: 'document_id is required' },
        { status: 400 }
      );
    }

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

    // Verify campaign belongs to user's client
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', params.id)
      .eq('client_id', userData.client_id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Verify document belongs to user's client
    const { data: document, error: docError } = await supabase
      .from('knowledge_base_documents')
      .select('id')
      .eq('id', document_id)
      .eq('client_id', userData.client_id)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Link document to campaign
    const { data: link, error: linkError } = await supabase
      .from('campaign_documents')
      .insert({
        campaign_id: params.id,
        document_id,
        added_by: user.id,
      })
      .select()
      .single();

    if (linkError) {
      // Handle duplicate constraint
      if (linkError.code === '23505') {
        return NextResponse.json(
          { error: 'Document is already linked to this campaign' },
          { status: 409 }
        );
      }

      console.error('[KB] Error linking document:', linkError);
      return NextResponse.json({ error: 'Failed to link document' }, { status: 500 });
    }

    return NextResponse.json({
      link,
      message: 'Document linked to campaign successfully',
    });
  } catch (error) {
    console.error('[KB] Error in POST campaign documents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const document_id = searchParams.get('document_id');

    if (!document_id) {
      return NextResponse.json(
        { error: 'document_id query parameter is required' },
        { status: 400 }
      );
    }

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

    // Verify campaign belongs to user's client
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', params.id)
      .eq('client_id', userData.client_id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Unlink document
    const { error: unlinkError } = await supabase
      .from('campaign_documents')
      .delete()
      .eq('campaign_id', params.id)
      .eq('document_id', document_id);

    if (unlinkError) {
      console.error('[KB] Error unlinking document:', unlinkError);
      return NextResponse.json({ error: 'Failed to unlink document' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Document unlinked from campaign successfully',
    });
  } catch (error) {
    console.error('[KB] Error in DELETE campaign documents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
