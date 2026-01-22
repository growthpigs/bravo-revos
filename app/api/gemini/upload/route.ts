import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { uploadToGemini, deleteFromGemini } from '@/lib/gemini/client'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown'
]

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
      .from('user')
      .select('client_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.client_id) {
      return NextResponse.json({ error: 'User has no client' }, { status: 400 })
    }

    // Parse form data
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const documentType = formData.get('document_type') as string || 'general'
    const metadataStr = formData.get('metadata') as string || '{}'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({
        error: `Invalid file type. Allowed: PDF, DOCX, PPTX, TXT, MD`
      }, { status: 400 })
    }

    let metadata: Record<string, unknown>
    try {
      metadata = JSON.parse(metadataStr)
    } catch {
      metadata = {}
    }

    // Upload to Supabase Storage
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `gemini-docs/${userData.client_id}/${Date.now()}-${sanitizedFilename}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('[GEMINI_UPLOAD] Storage error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Upload to Gemini
    let geminiFileUri: string
    try {
      geminiFileUri = await uploadToGemini(fileBuffer, file.name, file.type)
    } catch (geminiError) {
      // Cleanup storage on Gemini failure
      await supabase.storage.from('documents').remove([storagePath])
      console.error('[GEMINI_UPLOAD] Gemini error:', geminiError)
      return NextResponse.json({ error: 'Failed to index in Gemini' }, { status: 500 })
    }

    // Store in database
    const { data: document, error: dbError } = await supabase
      .from('gemini_documents')
      .insert({
        client_id: userData.client_id,
        user_id: user.id,
        filename: file.name,
        document_type: documentType,
        file_size: file.size,
        mime_type: file.type,
        supabase_path: storagePath,
        gemini_file_uri: geminiFileUri,
        metadata
      })
      .select()
      .single()

    if (dbError) {
      // Cleanup both Supabase and Gemini on DB failure
      await supabase.storage.from('documents').remove([storagePath])
      try { await deleteFromGemini(geminiFileUri) } catch { /* best effort */ }
      console.error('[GEMINI_UPLOAD] DB error:', dbError)
      return NextResponse.json({ error: 'Failed to save document record' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        filename: document.filename,
        document_type: document.document_type,
        file_size: document.file_size,
        created_at: document.created_at
      }
    })
  } catch (error) {
    console.error('[GEMINI_UPLOAD] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// List documents for current user
export async function GET(req: NextRequest) {
  try {
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
    const { data: userData } = await supabase
      .from('user')
      .select('client_id')
      .eq('id', user.id)
      .single()

    if (!userData?.client_id) {
      return NextResponse.json({ error: 'User has no client' }, { status: 400 })
    }

    // Get documents for this client
    const { searchParams } = new URL(req.url)
    const documentType = searchParams.get('type')

    let query = supabase
      .from('gemini_documents')
      .select('id, filename, document_type, file_size, mime_type, metadata, created_at')
      .eq('client_id', userData.client_id)
      .order('created_at', { ascending: false })

    if (documentType) {
      query = query.eq('document_type', documentType)
    }

    const { data: documents, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }

    return NextResponse.json({ documents })
  } catch (error) {
    console.error('[GEMINI_UPLOAD] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Delete a document
export async function DELETE(req: NextRequest) {
  try {
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

    // Get user's client_id for ownership check
    const { data: userData } = await supabase
      .from('user')
      .select('client_id')
      .eq('id', user.id)
      .single()

    if (!userData?.client_id) {
      return NextResponse.json({ error: 'User has no client' }, { status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const documentId = searchParams.get('id')

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
    }

    // Get document (with full ownership check: user_id AND client_id)
    const { data: doc, error: fetchError } = await supabase
      .from('gemini_documents')
      .select('id, supabase_path, gemini_file_uri')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .eq('client_id', userData.client_id)
      .single()

    if (fetchError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Delete from database FIRST (prevents orphaned external resources)
    const { error: deleteError } = await supabase
      .from('gemini_documents')
      .delete()
      .eq('id', documentId)

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
    }

    // Delete from Gemini (best effort - already removed from DB)
    try {
      const { deleteFromGemini } = await import('@/lib/gemini/client')
      await deleteFromGemini(doc.gemini_file_uri)
    } catch (e) {
      console.warn('[GEMINI_UPLOAD] Failed to delete from Gemini:', e)
    }

    // Delete from storage (best effort - already removed from DB)
    await supabase.storage.from('documents').remove([doc.supabase_path])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[GEMINI_UPLOAD] DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
