import { createClient } from '@/lib/supabase/server';
import { embedDocument } from '@/lib/embeddings/generate';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const fileType = searchParams.get('file_type');
    const search = searchParams.get('search');
    const campaignId = searchParams.get('campaign_id');

    const supabase = await createClient();

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // If filtering by campaign, get document IDs linked to that campaign
    let documentIds: string[] | null = null;
    if (campaignId) {
      const { data: linkedDocs, error: linkError } = await supabase
        .from('campaign_documents')
        .select('document_id')
        .eq('campaign_id', campaignId);

      if (linkError) {
        console.error('[KB] Error fetching campaign documents:', linkError);
        return NextResponse.json({ error: 'Failed to filter by campaign' }, { status: 500 });
      }

      documentIds = linkedDocs?.map((link) => link.document_id) || [];
    }

    // Base query - RLS filters to user's documents
    let query = supabase
      .from('knowledge_base_documents')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (fileType) {
      query = query.eq('file_type', fileType);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,content.ilike.%${search}%`);
    }

    // Filter by campaign if specified
    if (campaignId && documentIds && documentIds.length > 0) {
      query = query.in('id', documentIds);
    } else if (campaignId && (!documentIds || documentIds.length === 0)) {
      // Campaign has no linked documents
      return NextResponse.json({
        documents: [],
        count: 0,
        limit,
        offset,
      });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: documents, error, count } = await query;

    if (error) {
      console.error('[KB] Error fetching documents:', error);
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    return NextResponse.json({
      documents,
      count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[KB] Unexpected error in GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { title, description, content, metadata } = await request.json();

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create document - user_id set from authenticated user
    const { data: document, error: createError } = await supabase
      .from('knowledge_base_documents')
      .insert({
        user_id: user.id,
        title,
        description,
        content,
        file_type: 'markdown',
        metadata: metadata || {},
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      console.error('[KB] Error creating document:', createError);
      return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
    }

    // Generate embeddings asynchronously
    generateEmbeddingsAsync(document.id, content);

    return NextResponse.json({
      document,
      message: 'Document created successfully. Embeddings will be generated shortly.',
    });
  } catch (error) {
    console.error('[KB] Unexpected error in POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Generate embeddings asynchronously (fire and forget)
 * This runs in the background and doesn't block the API response
 */
async function generateEmbeddingsAsync(documentId: string, content: string) {
  try {
    const embeddings = await embedDocument(content);
    const supabase = await createClient({ isServiceRole: true });

    // Insert embeddings
    const { error } = await supabase
      .from('document_embeddings')
      .insert(
        embeddings.map((e) => ({
          document_id: documentId,
          embedding: e.embedding,
          chunk_index: e.index,
          chunk_text: e.text,
        }))
      );

    if (error) {
      console.error('[KB] Error inserting embeddings:', error);
    } else {
      console.log('[KB] Embeddings generated for document:', documentId);
    }
  } catch (error) {
    console.error('[KB] Error generating embeddings:', error);
    // Silently fail - embeddings are nice-to-have but not critical
  }
}
