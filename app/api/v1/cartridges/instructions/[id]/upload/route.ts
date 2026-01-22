// app/api/v1/cartridges/instructions/[id]/upload/route.ts
// Upload training documents to instruction cartridge - uses instruction_cartridge table
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import { withRateLimit, createErrorResponse } from '@/lib/audienceos/security'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/markdown',
  'text/csv'
]

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/v1/cartridges/instructions/[id]/upload - Upload training documents
export const POST = withPermission({ resource: 'cartridges', action: 'write' })(
  async (request: AuthenticatedRequest, context: RouteParams) => {
    try {
      const rateLimitResponse = withRateLimit(request, { maxRequests: 20, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const { id } = await context.params

      // Validate UUID format
      if (!UUID_REGEX.test(id)) {
        return NextResponse.json({ error: 'Invalid instruction ID format' }, { status: 400 })
      }

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      // Verify cartridge exists and belongs to agency (uses instruction_cartridge table)
      const { data: cartridge, error: fetchError } = await supabase
        .from('instruction_cartridge')
        .select('id, training_docs')
        .eq('id', id)
        .eq('agency_id', agencyId)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return NextResponse.json({ error: 'Instruction cartridge not found' }, { status: 404 })
        }
        console.error('[Instructions Upload] Fetch error:', fetchError)
        return createErrorResponse(500, 'Failed to fetch cartridge')
      }

      // Parse multipart form data
      const formData = await request.formData()
      const files = formData.getAll('files') as File[]

      if (!files || files.length === 0) {
        return NextResponse.json(
          { error: 'At least one file is required' },
          { status: 400 }
        )
      }

      // Validate all files
      for (const file of files) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          return NextResponse.json(
            { error: `Invalid file type: ${file.name}. Allowed: PDF, TXT, DOCX, DOC, MD, CSV` },
            { status: 400 }
          )
        }

        if (file.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            { error: `File ${file.name} exceeds 10MB limit` },
            { status: 400 }
          )
        }
      }

      // Upload files to storage
      const uploadedFiles = []

      for (const file of files) {
        const fileName = `${agencyId}/${id}/${Date.now()}-${file.name}`

        const fileBuffer = await file.arrayBuffer()
        const { error: uploadError } = await supabase
          .storage
          .from('instruction-documents')
          .upload(fileName, fileBuffer, {
            contentType: file.type,
            upsert: false
          })

        if (uploadError) {
          console.error('[Instructions Upload] Storage error:', uploadError)
          continue
        }

        const { data: urlData } = supabase
          .storage
          .from('instruction-documents')
          .getPublicUrl(fileName)

        uploadedFiles.push({
          fileName: file.name,
          file_path: fileName,
          storageUrl: urlData.publicUrl,
          type: file.type,
          size: file.size,
          uploaded_at: new Date().toISOString()
        })
      }

      if (uploadedFiles.length === 0) {
        return createErrorResponse(500, 'Failed to upload any files')
      }

      // Append to existing training_docs
      const existingDocs = cartridge.training_docs || []
      const allDocs = [...(Array.isArray(existingDocs) ? existingDocs : []), ...uploadedFiles]

      const { data: updatedCartridge, error: updateError } = await supabase
        .from('instruction_cartridge')
        .update({
          training_docs: allDocs,
          process_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        console.error('[Instructions Upload] Update error:', updateError)
        return createErrorResponse(500, 'Failed to update cartridge')
      }

      return NextResponse.json(updatedCartridge)
    } catch (error) {
      console.error('[Instructions Upload] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
