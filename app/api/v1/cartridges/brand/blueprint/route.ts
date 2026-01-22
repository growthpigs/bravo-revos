// app/api/v1/cartridges/brand/blueprint/route.ts
// Generate 112-point brand blueprint from core messaging
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import { withRateLimit, createErrorResponse } from '@/lib/audienceos/security'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')

// POST /api/v1/cartridges/brand/blueprint - Generate blueprint from core messaging
export const POST = withPermission({ resource: 'cartridges', action: 'write' })(
  async (request: AuthenticatedRequest) => {
    try {
      // AI operations are expensive - tighter rate limiting
      const rateLimitResponse = withRateLimit(request, { maxRequests: 5, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId
      const body = await request.json()
      const { coreMessaging } = body

      // Validate core messaging
      if (!coreMessaging) {
        return NextResponse.json(
          { error: 'coreMessaging is required' },
          { status: 400 }
        )
      }

      if (typeof coreMessaging !== 'string') {
        return NextResponse.json(
          { error: 'coreMessaging must be a string' },
          { status: 400 }
        )
      }

      if (coreMessaging.trim().length === 0) {
        return NextResponse.json(
          { error: 'coreMessaging cannot be empty' },
          { status: 400 }
        )
      }

      // Generate blueprint using Gemini
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

      const prompt = `You are a brand strategist expert. Based on the following core messaging, generate a comprehensive brand blueprint.

Core Messaging:
"${coreMessaging}"

Generate a JSON object with the following structure:
{
  "bio": "A compelling 2-3 sentence bio",
  "positioning": "Clear market positioning statement",
  "offer": "Main value proposition / offer",
  "targetAudience": "Who this brand serves",
  "uniqueValue": "What makes this brand unique",
  "voiceTone": "Recommended voice and tone",
  "keyMessages": ["message1", "message2", "message3"],
  "contentPillars": ["pillar1", "pillar2", "pillar3"],
  "brandPromise": "The promise made to customers"
}

Respond ONLY with valid JSON, no markdown or explanations.`

      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      // Parse the generated blueprint
      let blueprint
      try {
        // Remove any markdown code blocks if present
        const jsonText = text.replace(/```json\n?|\n?```/g, '').trim()
        blueprint = JSON.parse(jsonText)
      } catch {
        console.error('[Blueprint] Failed to parse AI response:', text)
        return createErrorResponse(500, 'Failed to generate blueprint')
      }

      // Store the blueprint in the brand cartridge
      const { data: brand, error: updateError } = await supabase
        .from('brand_cartridge')
        .update({
          core_messaging: coreMessaging,
          benson_blueprint: blueprint,
          updated_at: new Date().toISOString()
        })
        .eq('agency_id', agencyId)
        .select()
        .single()

      if (updateError && updateError.code !== 'PGRST116') {
        console.error('[Blueprint] Update error:', updateError)
        // Still return the blueprint even if save fails
      }

      return NextResponse.json({
        blueprint,
        brand: brand || null
      })
    } catch (error) {
      console.error('[Blueprint POST] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
