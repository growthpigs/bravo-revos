// app/api/v1/cartridges/style/analyze/route.ts
// Analyze uploaded style documents using AI - uses style_cartridge table
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import { withRateLimit, createErrorResponse } from '@/lib/audienceos/security'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')

// POST /api/v1/cartridges/style/analyze - Analyze style documents
export const POST = withPermission({ resource: 'cartridges', action: 'write' })(
  async (request: AuthenticatedRequest) => {
    try {
      // AI operations - tight rate limiting
      const rateLimitResponse = withRateLimit(request, { maxRequests: 5, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      // Get style cartridge (uses style_cartridge table)
      const { data: cartridge, error: fetchError } = await supabase
        .from('style_cartridge')
        .select('*')
        .eq('agency_id', agencyId)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return NextResponse.json({ error: 'No style cartridge found' }, { status: 404 })
        }
        console.error('[Style Analyze] Fetch error:', fetchError)
        return createErrorResponse(500, 'Failed to fetch cartridge')
      }

      if (!cartridge.source_files || !Array.isArray(cartridge.source_files) || cartridge.source_files.length === 0) {
        return NextResponse.json(
          { error: 'No source documents to analyze. Upload documents first.' },
          { status: 400 }
        )
      }

      // Update status to analyzing
      await supabase
        .from('style_cartridge')
        .update({ analysis_status: 'analyzing', updated_at: new Date().toISOString() })
        .eq('id', cartridge.id)

      // Download and read document contents
      let combinedContent = ''
      for (const doc of cartridge.source_files as Array<{ file_path?: string; fileName?: string }>) {
        if (doc.file_path) {
          const { data: fileData, error: downloadError } = await supabase
            .storage
            .from('style-documents')
            .download(doc.file_path)

          if (!downloadError && fileData) {
            const text = await fileData.text()
            combinedContent += `\n\n--- ${doc.fileName || doc.file_path} ---\n${text}`
          }
        }
      }

      if (!combinedContent.trim()) {
        await supabase
          .from('style_cartridge')
          .update({ analysis_status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', cartridge.id)

        return createErrorResponse(500, 'Could not extract text from documents')
      }

      // Truncate if too long (keep under 30k chars for AI context)
      if (combinedContent.length > 30000) {
        combinedContent = combinedContent.substring(0, 30000) + '\n\n[Content truncated...]'
      }

      // Analyze with Gemini
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

      const prompt = `You are a writing style analyst. Analyze the following documents and extract the writing style patterns.

Documents:
${combinedContent}

Analyze and return a JSON object with:
{
  "writingPatterns": {
    "sentenceStructure": "description of typical sentence patterns",
    "paragraphStyle": "how paragraphs are structured",
    "transitionWords": ["common", "transitions", "used"],
    "vocabularyLevel": "formal/informal/technical/casual",
    "toneDescriptors": ["descriptor1", "descriptor2"]
  },
  "voiceCharacteristics": {
    "pointOfView": "first/second/third person",
    "activeVsPassive": "preference description",
    "formalityLevel": "1-10 scale description"
  },
  "commonPhrases": ["phrase1", "phrase2", "phrase3"],
  "stylisticDevices": ["device1", "device2"],
  "contentPatterns": {
    "typicalOpenings": "how content typically begins",
    "conclusionStyle": "how content typically ends",
    "argumentStructure": "how arguments are presented"
  },
  "recommendations": ["suggestion1", "suggestion2"]
}

Respond ONLY with valid JSON, no markdown or explanations.`

      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      // Parse the analysis
      let learnedStyle
      try {
        const jsonText = text.replace(/```json\n?|\n?```/g, '').trim()
        learnedStyle = JSON.parse(jsonText)
      } catch {
        console.error('[Style Analyze] Failed to parse AI response:', text)
        await supabase
          .from('style_cartridge')
          .update({ analysis_status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', cartridge.id)
        return createErrorResponse(500, 'Failed to analyze style')
      }

      // Update cartridge with learned style
      const { data: updatedCartridge, error: updateError } = await supabase
        .from('style_cartridge')
        .update({
          learned_style: learnedStyle,
          analysis_status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', cartridge.id)
        .select()
        .single()

      if (updateError) {
        console.error('[Style Analyze] Update error:', updateError)
        // Still return the analysis
      }

      return NextResponse.json({
        analysis_status: 'completed',
        learned_style: learnedStyle,
        style: updatedCartridge || cartridge
      })
    } catch (error) {
      console.error('[Style Analyze] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
