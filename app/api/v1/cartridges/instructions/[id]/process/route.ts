// app/api/v1/cartridges/instructions/[id]/process/route.ts
// Process instruction documents using AI - uses instruction_cartridge table
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/audienceos/supabase'
import { withPermission, type AuthenticatedRequest } from '@/lib/audienceos/rbac/with-permission'
import { withRateLimit, createErrorResponse } from '@/lib/audienceos/security'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/v1/cartridges/instructions/[id]/process - Process instruction documents
export const POST = withPermission({ resource: 'cartridges', action: 'write' })(
  async (request: AuthenticatedRequest, context: RouteParams) => {
    try {
      // AI operations - tight rate limiting
      const rateLimitResponse = withRateLimit(request, { maxRequests: 5, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const { id } = await context.params

      // Validate UUID format
      if (!UUID_REGEX.test(id)) {
        return NextResponse.json({ error: 'Invalid instruction ID format' }, { status: 400 })
      }

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      // Get instruction cartridge (uses instruction_cartridge table)
      const { data: cartridge, error: fetchError } = await supabase
        .from('instruction_cartridge')
        .select('*')
        .eq('id', id)
        .eq('agency_id', agencyId)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return NextResponse.json({ error: 'Instruction cartridge not found' }, { status: 404 })
        }
        console.error('[Instructions Process] Fetch error:', fetchError)
        return createErrorResponse(500, 'Failed to fetch cartridge')
      }

      if (!cartridge.training_docs || !Array.isArray(cartridge.training_docs) || cartridge.training_docs.length === 0) {
        return NextResponse.json(
          { error: 'No training documents to process. Upload documents first.' },
          { status: 400 }
        )
      }

      // Update status to processing
      await supabase
        .from('instruction_cartridge')
        .update({ process_status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', id)

      // Download and read document contents
      let combinedContent = ''
      for (const doc of cartridge.training_docs as Array<{ file_path?: string; fileName?: string }>) {
        if (doc.file_path) {
          const { data: fileData, error: downloadError } = await supabase
            .storage
            .from('instruction-documents')
            .download(doc.file_path)

          if (!downloadError && fileData) {
            const text = await fileData.text()
            combinedContent += `\n\n--- ${doc.fileName || doc.file_path} ---\n${text}`
          }
        }
      }

      if (!combinedContent.trim()) {
        await supabase
          .from('instruction_cartridge')
          .update({ process_status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', id)

        return createErrorResponse(500, 'Could not extract text from documents')
      }

      // Truncate if too long
      if (combinedContent.length > 30000) {
        combinedContent = combinedContent.substring(0, 30000) + '\n\n[Content truncated...]'
      }

      // Process with Gemini
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

      const prompt = `You are an expert at extracting structured knowledge from documents. Analyze the following instruction documents and extract the key knowledge.

Documents:
${combinedContent}

Extract and return a JSON object with:
{
  "frameworks": [
    {
      "name": "Framework name",
      "description": "Brief description",
      "steps": ["step1", "step2", "step3"]
    }
  ],
  "methodologies": [
    {
      "name": "Methodology name",
      "description": "Brief description",
      "keyPrinciples": ["principle1", "principle2"]
    }
  ],
  "bestPractices": ["practice1", "practice2", "practice3"],
  "keyTerms": [
    {
      "term": "Term",
      "definition": "Definition"
    }
  ],
  "commonPatterns": ["pattern1", "pattern2"],
  "actionItems": ["action1", "action2"],
  "summary": "Brief summary of the main teachings"
}

Respond ONLY with valid JSON, no markdown or explanations.`

      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      // Parse the extracted knowledge
      let extractedKnowledge
      try {
        const jsonText = text.replace(/```json\n?|\n?```/g, '').trim()
        extractedKnowledge = JSON.parse(jsonText)
      } catch {
        console.error('[Instructions Process] Failed to parse AI response:', text)
        await supabase
          .from('instruction_cartridge')
          .update({ process_status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', id)
        return createErrorResponse(500, 'Failed to process instructions')
      }

      // Update cartridge with extracted knowledge
      const { data: updatedCartridge, error: updateError } = await supabase
        .from('instruction_cartridge')
        .update({
          extracted_knowledge: extractedKnowledge,
          process_status: 'completed',
          last_processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        console.error('[Instructions Process] Update error:', updateError)
      }

      return NextResponse.json({
        process_status: 'completed',
        extracted_knowledge: extractedKnowledge,
        ...updatedCartridge
      })
    } catch (error) {
      console.error('[Instructions Process] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
