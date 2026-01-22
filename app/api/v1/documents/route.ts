/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Temporary: Generated Database types have Insert type mismatch after RBAC migration
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient, getAuthenticatedUser } from '@/lib/audienceos/supabase'
import { withRateLimit, withCsrfProtection, createErrorResponse } from '@/lib/audienceos/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import { geminiFileService } from '@/lib/audienceos/gemini/file-service'
import type { DocumentCategory, IndexStatus } from '@/types/database'

/**
 * DISPLAY_NAME_PREFIX for Gemini file metadata encoding
 * Format: hgc|{agencyId}|{scope}|{clientId}|{displayName}
 * This allows RAG service to identify and filter files by agency/client
 */
const DISPLAY_NAME_PREFIX = 'hgc'
const DISPLAY_NAME_SEPARATOR = '|'

/**
 * Encode document metadata into Gemini displayName for RAG filtering
 */
function encodeDisplayName(
  agencyId: string,
  scope: 'global' | 'client',
  clientId: string | null,
  displayName: string
): string {
  return [
    DISPLAY_NAME_PREFIX,
    agencyId,
    scope,
    clientId || 'none',
    displayName,
  ].join(DISPLAY_NAME_SEPARATOR)
}

// Valid file types and size limit (50MB)
const VALID_MIME_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
const MAX_FILE_SIZE = 50 * 1024 * 1024
const VALID_CATEGORIES: DocumentCategory[] = ['installation', 'tech', 'support', 'process', 'client_specific']

interface DocumentMetadata {
  file_size: number
  mime_type: string
  page_count?: number
  word_count?: number
}

// Helper: Extract metadata from document (simplified)
function extractDocumentMetadata(buffer: Buffer, mimeType: string): Partial<DocumentMetadata> {
  // Simple word count approximation for text-based formats
  let wordCount = 0
  let pageCount: number | undefined

  try {
    // Convert buffer to string and approximate word count
    const text = buffer.toString('utf-8', 0, Math.min(50000, buffer.length))
    wordCount = text.trim().split(/\s+/).length

    // Very rough page count estimation: assume ~250 words per page
    if (mimeType.includes('document') || mimeType === 'text/plain') {
      pageCount = Math.ceil(wordCount / 250)
    }
  } catch {
    // If extraction fails, return minimal metadata
    return {}
  }

  return {
    word_count: wordCount || undefined,
    page_count: pageCount,
  }
}

// GET /api/v1/documents - List documents for the agency
// RBAC: Requires knowledge-base:read permission
export const GET = withPermission({ resource: 'knowledge-base', action: 'read' })(
  async (request: AuthenticatedRequest) => {
  const rateLimitResponse = withRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = await createRouteHandlerClient(cookies)
    const { user, agencyId, error: authError } = await getAuthenticatedUser(supabase)

    if (!user || !agencyId) {
      return createErrorResponse(401, authError || 'Unauthorized')
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const indexStatus = searchParams.get('index_status')

    let query = supabase
      .from('document')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false })

    if (category && VALID_CATEGORIES.includes(category as DocumentCategory)) {
      query = query.eq('category', category as DocumentCategory)
    }

    if (indexStatus && ['pending', 'indexing', 'indexed', 'failed'].includes(indexStatus)) {
      query = query.eq('index_status', indexStatus as IndexStatus)
    }

    const { data, error } = await query

    if (error) {
      return createErrorResponse(500, 'Failed to fetch documents')
    }

    return NextResponse.json({ data })
  } catch {
    return createErrorResponse(500, 'Internal server error')
  }
  }
);

// POST /api/v1/documents - Upload a new document
// RBAC: Requires knowledge-base:write permission
export const POST = withPermission({ resource: 'knowledge-base', action: 'write' })(
  async (request: AuthenticatedRequest) => {
  const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
  if (rateLimitResponse) return rateLimitResponse

  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  try {
    const supabase = await createRouteHandlerClient(cookies)
    const { user, agencyId, error: authError } = await getAuthenticatedUser(supabase)

    if (!user || !agencyId) {
      return createErrorResponse(401, authError || 'Unauthorized')
    }

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const title = formData.get('title') as string | null
    const category = formData.get('category') as string | null
    const clientId = formData.get('client_id') as string | null

    // Validate inputs
    if (!file) {
      return createErrorResponse(400, 'File is required')
    }

    if (!title || title.trim().length === 0) {
      return createErrorResponse(400, 'Title is required')
    }

    if (!category || !VALID_CATEGORIES.includes(category as DocumentCategory)) {
      return createErrorResponse(400, 'Invalid category')
    }

    if (!VALID_MIME_TYPES.includes(file.type)) {
      return createErrorResponse(400, 'Invalid file type. Only PDF, DOC, DOCX, and TXT are allowed')
    }

    if (file.size > MAX_FILE_SIZE) {
      return createErrorResponse(400, 'File size exceeds 50MB limit')
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Extract metadata
    const extractedMeta = extractDocumentMetadata(buffer, file.type)
    const metadata: DocumentMetadata = {
      file_size: buffer.length,
      mime_type: file.type,
      ...extractedMeta,
    }

    // Upload to Supabase Storage
    const fileName = `${Date.now()}-${file.name}`
    const storagePath = `${agencyId}/${category}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      return createErrorResponse(500, 'Failed to upload file to storage')
    }

    // Create document record in database
    const { data: document, error: dbError } = await supabase
      .from('document')
      .insert({
        agency_id: agencyId,
        title: title.trim(),
        file_name: file.name,
        file_size: metadata.file_size,
        mime_type: metadata.mime_type,
        storage_path: storagePath,
        category: category as DocumentCategory,
        client_id: clientId || null,
        page_count: metadata.page_count || null,
        word_count: metadata.word_count || null,
        index_status: 'pending' as IndexStatus,
        uploaded_by: user.id,
        is_active: true,
      })
      .select()
      .single()

    if (dbError) {
      // Clean up uploaded file if DB insert fails
      await supabase.storage.from('documents').remove([storagePath])
      return createErrorResponse(500, 'Failed to save document record')
    }

    // CRITICAL FIX (2026-01-20): Auto-upload to Gemini File API for RAG indexing
    // This is fire-and-forget to not block the response, but we still update the status
    const documentId = document.id
    const scope: 'global' | 'client' = clientId ? 'client' : 'global'
    const encodedDisplayName = encodeDisplayName(agencyId, scope, clientId, title.trim())

    // Fire-and-forget Gemini upload - don't block the response
    ;(async () => {
      try {
        // Upload to Gemini File API
        const geminiFileId = await geminiFileService.uploadFile(
          buffer,
          file.type,
          encodedDisplayName
        )

        // Update document record with Gemini file ID
        await supabase
          .from('document')
          .update({
            gemini_file_id: geminiFileId,
            index_status: 'indexed' as IndexStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', documentId)

        console.log(`[Documents API] Document ${documentId} indexed in Gemini: ${geminiFileId}`)
      } catch (geminiError) {
        // Log error but don't fail the upload - document is still in Supabase
        console.error(`[Documents API] Gemini indexing failed for ${documentId}:`, geminiError)

        // Mark as failed so it can be retried via /process endpoint
        await supabase
          .from('document')
          .update({
            index_status: 'failed' as IndexStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', documentId)
      }
    })()

    return NextResponse.json({ data: document }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return createErrorResponse(500, message)
  }
  }
);
