import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { queryDocuments, GeminiDocument } from '@/lib/gemini/client'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get user's client_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('client_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.client_id) {
      return NextResponse.json({ error: 'User has no client' }, { status: 400 })
    }

    // Parse request
    const body = await req.json()
    const { query, document_types, system_context } = body

    if (!query || typeof query !== 'string' || query.length > 10000) {
      return NextResponse.json({ error: 'Query is required and must be under 10000 characters' }, { status: 400 })
    }

    // Fetch client's documents
    let docQuery = supabase
      .from('gemini_documents')
      .select('*')
      .eq('client_id', userData.client_id)

    // Filter by document types if specified
    if (document_types && Array.isArray(document_types) && document_types.length > 0) {
      docQuery = docQuery.in('document_type', document_types)
    }

    const { data: documents, error: docError } = await docQuery

    if (docError) {
      console.error('[GEMINI_QUERY] Failed to fetch documents:', docError)
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json({
        content: 'No documents found to search. Please upload some documents first.',
        citations: [],
        model: 'none',
        document_count: 0
      })
    }

    // Query Gemini with documents
    const result = await queryDocuments(
      query,
      documents as GeminiDocument[],
      system_context
    )

    return NextResponse.json({
      ...result,
      document_count: documents.length
    })
  } catch (error) {
    console.error('[GEMINI_QUERY] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
