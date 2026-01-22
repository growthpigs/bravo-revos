/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Temporary: Generated Database types have Insert type mismatch after RBAC migration
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withRateLimit, withCsrfProtection, createErrorResponse } from '@/lib/audienceos/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import type { DocumentCategory, IndexStatus } from '@/types/database'

interface DriveImportBody {
  url: string
  display_name?: string
  category?: DocumentCategory
}

/**
 * Extract file ID from Google Drive/Docs URL
 */
function extractDriveFileId(url: string): string | null {
  // Format: https://drive.google.com/file/d/{fileId}/...
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (fileMatch) return fileMatch[1]

  // Format: https://docs.google.com/document/d/{fileId}/...
  const docMatch = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/)
  if (docMatch) return docMatch[1]

  // Format: https://docs.google.com/spreadsheets/d/{fileId}/...
  const sheetMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (sheetMatch) return sheetMatch[1]

  // Format: https://docs.google.com/presentation/d/{fileId}/...
  const slideMatch = url.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/)
  if (slideMatch) return slideMatch[1]

  // Format: ?id={fileId}
  const queryMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (queryMatch) return queryMatch[1]

  return null
}

/**
 * Validate Google Drive/Docs URL
 */
function isValidDriveUrl(url: string): boolean {
  return url.includes('drive.google.com') || url.includes('docs.google.com')
}

/**
 * Detect document type from URL
 */
function detectDocumentType(url: string): { mime_type: string; file_extension: string } {
  if (url.includes('/document/')) {
    return { mime_type: 'application/vnd.google-apps.document', file_extension: 'gdoc' }
  }
  if (url.includes('/spreadsheets/')) {
    return { mime_type: 'application/vnd.google-apps.spreadsheet', file_extension: 'gsheet' }
  }
  if (url.includes('/presentation/')) {
    return { mime_type: 'application/vnd.google-apps.presentation', file_extension: 'gslides' }
  }
  // Default to generic Drive file
  return { mime_type: 'application/vnd.google-apps.file', file_extension: 'gdrive' }
}

/**
 * POST /api/v1/documents/drive
 * Import a document from Google Drive by URL
 */
export const POST = withPermission({ resource: 'knowledge-base', action: 'write' })(
  async (request: AuthenticatedRequest) => {
  const rateLimitResponse = withRateLimit(request, { maxRequests: 20, windowMs: 60000 })
  if (rateLimitResponse) return rateLimitResponse

  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  try {
    const supabase = await createRouteHandlerClient(cookies)
    const { id: userId, agencyId } = request.user

    // Parse request body
    const body: DriveImportBody = await request.json()
    const { url, display_name, category = 'process' } = body

    // Validate URL
    if (!url || !url.trim()) {
      return createErrorResponse(400, 'URL is required')
    }

    const trimmedUrl = url.trim()

    if (!isValidDriveUrl(trimmedUrl)) {
      return createErrorResponse(400, 'Invalid Google Drive or Docs URL')
    }

    const fileId = extractDriveFileId(trimmedUrl)
    if (!fileId) {
      return createErrorResponse(400, 'Could not extract file ID from URL')
    }

    // Detect document type
    const { mime_type, file_extension } = detectDocumentType(trimmedUrl)

    // Generate title and filename
    const title = display_name?.trim() || `Google Drive Document (${fileId.substring(0, 8)})`
    const fileName = `${fileId}.${file_extension}`
    const storagePath = `${agencyId}/drive/${fileName}`

    // Create document record
    const { data: document, error: dbError } = await supabase
      .from('document')
      .insert({
        agency_id: agencyId,
        title,
        file_name: fileName,
        file_size: 0, // Unknown for Drive files until processed
        mime_type,
        storage_path: storagePath,
        category,
        client_id: null,
        page_count: null,
        word_count: null,
        index_status: 'pending' as IndexStatus,
        gemini_file_id: null,
        uploaded_by: userId,
        is_active: true,
        is_starred: false,
        use_for_training: false,
        drive_url: trimmedUrl,
        drive_file_id: fileId,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Drive import DB error:', dbError)
      return createErrorResponse(500, 'Failed to save document record')
    }

    // Return the created document
    return NextResponse.json({
      data: document,
      message: 'Document imported from Google Drive. Processing will begin shortly.',
    }, { status: 201 })

  } catch (error) {
    console.error('Drive import error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return createErrorResponse(500, message)
  }
})
