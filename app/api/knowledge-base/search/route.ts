import { createClient } from '@/lib/supabase/server';
import { generateEmbedding } from '@/lib/embeddings/generate';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { query, limit = 10 } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
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

    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);

    // Search using pgvector (cosine similarity)
    // Cast array to vector for type compatibility
    const { data: results, error } = await supabase
      .rpc('search_knowledge_base', {
        query_embedding: queryEmbedding,
        client_id: userData.client_id,
        match_count: limit,
      });

    if (error) {
      console.error('[KB] Error searching:', error);

      // If RPC doesn't exist yet, return helpful error
      if (error.code === 'PGRST204' || error.message.includes('function')) {
        return NextResponse.json({
          results: [],
          message: 'Vector search RPC not yet set up. Please run database migrations.',
        });
      }

      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    return NextResponse.json({
      results: results || [],
      query,
      count: (results || []).length,
    });
  } catch (error) {
    console.error('[KB] Error in semantic search:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Alternative: Direct SQL search (if RPC is not set up)
 * This is a simpler implementation without RPC
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter q is required' },
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

    // Simple text search (full-text search)
    const { data: documents, error } = await supabase
      .from('knowledge_base_documents')
      .select('*')
      .eq('client_id', userData.client_id)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%,content.ilike.%${query}%`)
      .limit(limit);

    if (error) {
      console.error('[KB] Error searching:', error);
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    return NextResponse.json({
      results: documents || [],
      query,
      count: (documents || []).length,
      note: 'Using text search. For semantic search, use POST /api/knowledge-base/search',
    });
  } catch (error) {
    console.error('[KB] Error in text search:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
