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

    // Base query
    let query = supabase
      .from('knowledge_base_documents')
      .select('*', { count: 'exact' })
      .eq('client_id', userData.client_id)
      .order('created_at', { ascending: false });

    // Apply filters
    if (fileType) {
      query = query.eq('file_type', fileType);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,content.ilike.%${search}%`);
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

    // Get user's client_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('client_id')
      .eq('id', user.id)
      .maybeSingle();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create document
    const { data: document, error: createError } = await supabase
      .from('knowledge_base_documents')
      .insert({
        client_id: userData.client_id,
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
