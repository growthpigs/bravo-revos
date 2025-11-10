import { createClient } from '@/lib/supabase/server';
import { embedDocument } from '@/lib/embeddings/generate';
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

    // Get document (RLS will enforce client_id check)
    const { data: document, error } = await supabase
      .from('knowledge_base_documents')
      .select('*')
      .eq('id', params.id)
      .eq('client_id', userData.client_id)
      .single();

    if (error || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ document });
  } catch (error) {
    console.error('[KB] Error fetching document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { title, description, content, metadata } = await request.json();

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
    const { data: existingDoc, error: checkError } = await supabase
      .from('knowledge_base_documents')
      .select('*')
      .eq('id', params.id)
      .eq('client_id', userData.client_id)
      .single();

    if (checkError || !existingDoc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Update document
    const { data: updatedDoc, error: updateError } = await supabase
      .from('knowledge_base_documents')
      .update({
        ...(title && { title }),
        ...(description && { description }),
        ...(content && { content }),
        ...(metadata && { metadata }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      console.error('[KB] Error updating document:', updateError);
      return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
    }

    // If content was updated, regenerate embeddings
    if (content) {
      regenerateEmbeddingsAsync(params.id, content);
    }

    return NextResponse.json({
      document: updatedDoc,
      message: 'Document updated successfully',
    });
  } catch (error) {
    console.error('[KB] Error in PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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
    const { data: existingDoc, error: checkError } = await supabase
      .from('knowledge_base_documents')
      .select('*')
      .eq('id', params.id)
      .eq('client_id', userData.client_id)
      .single();

    if (checkError || !existingDoc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete document (cascade will delete embeddings and campaign links)
    const { error: deleteError } = await supabase
      .from('knowledge_base_documents')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      console.error('[KB] Error deleting document:', deleteError);
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('[KB] Error in DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Regenerate embeddings for updated document
 */
async function regenerateEmbeddingsAsync(documentId: string, content: string) {
  try {
    // Delete old embeddings
    const supabase = await createClient({ isServiceRole: true });
    await supabase
      .from('document_embeddings')
      .delete()
      .eq('document_id', documentId);

    // Generate new embeddings
    const embeddings = await embedDocument(content);

    // Insert new embeddings
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
      console.error('[KB] Error regenerating embeddings:', error);
    } else {
      console.log('[KB] Embeddings regenerated for document:', documentId);
    }
  } catch (error) {
    console.error('[KB] Error regenerating embeddings:', error);
  }
}
