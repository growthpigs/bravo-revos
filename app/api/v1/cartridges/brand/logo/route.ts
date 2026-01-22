// app/api/v1/cartridges/brand/logo/route.ts
// Upload brand logo
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import { withRateLimit, createErrorResponse } from '@/lib/audienceos/security'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']

// POST /api/v1/cartridges/brand/logo - Upload brand logo
export const POST = withPermission({ resource: 'cartridges', action: 'write' })(
  async (request: AuthenticatedRequest) => {
    try {
      const rateLimitResponse = withRateLimit(request, { maxRequests: 10, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      // Parse multipart form data
      const formData = await request.formData()
      const file = formData.get('logo') as File | null

      if (!file) {
        return NextResponse.json(
          { error: 'Logo file is required' },
          { status: 400 }
        )
      }

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}` },
          { status: 400 }
        )
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: 'File size exceeds 5MB limit' },
          { status: 400 }
        )
      }

      // Get existing brand to check for old logo (uses brand_cartridge table)
      const { data: existingBrand } = await supabase
        .from('brand_cartridge')
        .select('id, logo_url')
        .eq('agency_id', agencyId)
        .single()

      // Delete old logo if exists
      if (existingBrand?.logo_url) {
        await supabase.storage.from('brand-assets').remove([existingBrand.logo_url])
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop() || 'png'
      const fileName = `${agencyId}/logo-${Date.now()}.${fileExt}`

      // Upload to Supabase Storage
      const fileBuffer = await file.arrayBuffer()
      const { error: uploadError } = await supabase
        .storage
        .from('brand-assets')
        .upload(fileName, fileBuffer, {
          contentType: file.type,
          upsert: true
        })

      if (uploadError) {
        console.error('[Logo Upload] Storage error:', uploadError)
        return createErrorResponse(500, 'Failed to upload logo')
      }

      // Get public URL
      const { data: urlData } = supabase
        .storage
        .from('brand-assets')
        .getPublicUrl(fileName)

      const logoUrl = urlData.publicUrl

      // Update brand cartridge with new logo URL
      if (existingBrand) {
        await supabase
          .from('brand_cartridge')
          .update({
            logo_url: fileName,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingBrand.id)
          .eq('agency_id', agencyId)
      }

      return NextResponse.json({
        logoUrl,
        fileName,
        message: 'Logo uploaded successfully'
      })
    } catch (error) {
      console.error('[Logo POST] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
