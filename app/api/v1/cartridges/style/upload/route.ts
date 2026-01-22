// app/api/v1/cartridges/style/upload/route.ts
// Upload style learning documents - uses style_cartridge table
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import { withRateLimit, createErrorResponse } from '@/lib/audienceos/security'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
  'text/markdown',
  'text/csv'
]

// POST /api/v1/cartridges/style/upload - Upload style learning documents
export const POST = withPermission({ resource: 'cartridges', action: 'write' })(
  async (request: AuthenticatedRequest) => {
    try {
      const rateLimitResponse = withRateLimit(request, { maxRequests: 20, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

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

      // Get or create style cartridge (uses style_cartridge table)
      let { data: cartridge, error: fetchError } = await supabase
        .from('style_cartridge')
        .select('id, source_files')
        .eq('agency_id', agencyId)
        .single()

      if (fetchError && fetchError.code === 'PGRST116') {
        // Create new style cartridge
        const { data: newCartridge, error: createError } = await supabase
          .from('style_cartridge')
          .insert({
            agency_id: agencyId,
            mem0_namespace: `style::${agencyId}::${Date.now()}`,
            analysis_status: 'pending',
            source_files: []
          })
          .select()
          .single()

        if (createError) {
          console.error('[Style Upload] Create error:', createError)
          return createErrorResponse(500, 'Failed to create style cartridge')
        }

        cartridge = newCartridge
      } else if (fetchError) {
        console.error('[Style Upload] Fetch error:', fetchError)
        return createErrorResponse(500, 'Failed to fetch style cartridge')
      }

      // Upload files to storage
      const uploadedFiles = []

      for (const file of files) {
        const fileName = `${agencyId}/${cartridge!.id}/${Date.now()}-${file.name}`

        const fileBuffer = await file.arrayBuffer()
        const { error: uploadError } = await supabase
          .storage
          .from('style-documents')
          .upload(fileName, fileBuffer, {
            contentType: file.type,
            upsert: false
          })

        if (uploadError) {
          console.error('[Style Upload] Storage error:', uploadError)
          continue // Skip this file but continue with others
        }

        // Get public URL
        const { data: urlData } = supabase
          .storage
          .from('style-documents')
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

      // Update cartridge with new files
      const existingFiles = cartridge!.source_files || []
      const allFiles = [...(Array.isArray(existingFiles) ? existingFiles : []), ...uploadedFiles]

      const { data: updatedCartridge, error: updateError } = await supabase
        .from('style_cartridge')
        .update({
          source_files: allFiles,
          analysis_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', cartridge!.id)
        .select()
        .single()

      if (updateError) {
        console.error('[Style Upload] Update error:', updateError)
        return createErrorResponse(500, 'Failed to update cartridge')
      }

      return NextResponse.json({
        source_files: uploadedFiles,
        analysis_status: 'pending',
        style: updatedCartridge
      })
    } catch (error) {
      console.error('[Style Upload] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
