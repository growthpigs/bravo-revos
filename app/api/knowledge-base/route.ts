import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { embedDocument } from '@/lib/embeddings/generate'
import { safeParseQueryParam } from '@/lib/utils/safe-parse'
import { QUERY_PARAM_DEFAULTS } from '@/lib/config'
import {
  ok,
  badRequest,
  serverError,
  requireAuth,
  parseJsonBody,
} from '@/lib/api'

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { supabase } = auth

  const { searchParams } = new URL(request.url)
  const limit = safeParseQueryParam(
    searchParams,
    'limit',
    QUERY_PARAM_DEFAULTS.KNOWLEDGE_BASE_LIMIT,
    { min: 1, max: QUERY_PARAM_DEFAULTS.MAX_LIMIT }
  )
  const offset = safeParseQueryParam(
    searchParams,
    'offset',
    QUERY_PARAM_DEFAULTS.DEFAULT_OFFSET,
    { min: 0 }
  )
  const fileType = searchParams.get('file_type')
  const search = searchParams.get('search')
  const campaignId = searchParams.get('campaign_id')

  // If filtering by campaign, get document IDs linked to that campaign
  let documentIds: string[] | null = null
  if (campaignId) {
    const { data: linkedDocs, error: linkError } = await supabase
      .from('campaign_documents')
      .select('document_id')
      .eq('campaign_id', campaignId)

    if (linkError) {
      console.error('[KB] Error fetching campaign documents:', linkError)
      return serverError('Failed to filter by campaign')
    }

    documentIds = linkedDocs?.map((link) => link.document_id) || []
  }

  // Base query - RLS filters to user's documents
  let query = supabase
    .from('knowledge_base_documents')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  // Apply filters
  if (fileType) {
    query = query.eq('file_type', fileType)
  }

  if (search) {
    query = query.or(
      `title.ilike.%${search}%,description.ilike.%${search}%,content.ilike.%${search}%`
    )
  }

  // Filter by campaign if specified
  if (campaignId && documentIds && documentIds.length > 0) {
    query = query.in('id', documentIds)
  } else if (campaignId && (!documentIds || documentIds.length === 0)) {
    // Campaign has no linked documents
    return ok({
      documents: [],
      count: 0,
      limit,
      offset,
    })
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1)

  const { data: documents, error, count } = await query

  if (error) {
    console.error('[KB] Error fetching documents:', error)
    return serverError('Failed to fetch documents')
  }

  return ok({
    documents,
    count,
    limit,
    offset,
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { user, supabase } = auth

  const body = await parseJsonBody(request)
  if (body instanceof NextResponse) return body

  const { title, description, content, metadata } = body as Record<
    string,
    unknown
  >

  if (!title || !content) {
    return badRequest('Title and content are required')
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
    .single()

  if (createError) {
    console.error('[KB] Error creating document:', createError)
    return serverError('Failed to create document')
  }

  // Generate embeddings asynchronously
  generateEmbeddingsAsync(document.id, content as string)

  return ok({
    document,
    message: 'Document created successfully. Embeddings will be generated shortly.',
  })
}

/**
 * Generate embeddings asynchronously (fire and forget)
 * This runs in the background and doesn't block the API response
 */
async function generateEmbeddingsAsync(documentId: string, content: string) {
  try {
    const embeddings = await embedDocument(content)
    const supabase = await createClient({ isServiceRole: true })

    // Insert embeddings
    const { error } = await supabase.from('document_embeddings').insert(
      embeddings.map((e) => ({
        document_id: documentId,
        embedding: e.embedding,
        chunk_index: e.index,
        chunk_text: e.text,
      }))
    )

    if (error) {
      console.error('[KB] Error inserting embeddings:', error)
    } else {
      console.log('[KB] Embeddings generated for document:', documentId)
    }
  } catch (error) {
    console.error('[KB] Error generating embeddings:', error)
    // Silently fail - embeddings are nice-to-have but not critical
  }
}
