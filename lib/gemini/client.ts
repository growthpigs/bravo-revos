import { GoogleGenerativeAI } from '@google/generative-ai'
import { GoogleAIFileManager } from '@google/generative-ai/server'
import { writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

// Lazy initialization to avoid build-time execution
let _genAI: GoogleGenerativeAI | null = null
let _fileManager: GoogleAIFileManager | null = null

export function getGeminiClient(): GoogleGenerativeAI {
  if (!_genAI) {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not configured')
    }
    _genAI = new GoogleGenerativeAI(apiKey)
  }
  return _genAI
}

export function getFileManager(): GoogleAIFileManager {
  if (!_fileManager) {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not configured')
    }
    _fileManager = new GoogleAIFileManager(apiKey)
  }
  return _fileManager
}

export interface GeminiDocument {
  id: string
  client_id: string
  filename: string
  document_type: string
  supabase_path: string
  gemini_file_uri: string
  file_size: number
  mime_type: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface GeminiQueryResult {
  content: string
  citations: GeminiCitation[]
  model: string
}

export interface GeminiCitation {
  source: string
  page?: number
  excerpt: string
  confidence?: number
}

// Query documents with Gemini
export async function queryDocuments(
  query: string,
  documents: GeminiDocument[],
  systemContext?: string
): Promise<GeminiQueryResult> {
  const genAI = getGeminiClient()
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

  // Build file references
  const fileReferences = documents.map(doc => ({
    fileData: {
      fileUri: doc.gemini_file_uri,
      mimeType: doc.mime_type
    }
  }))

  const prompt = `${systemContext ? systemContext + '\n\n' : ''}User question: ${query}

IMPORTANT: When citing information from documents, use this format:
"According to [Document Name] (page X), ..."

Provide clear, actionable insights with specific citations.`

  const result = await model.generateContent([
    { text: prompt },
    ...fileReferences
  ])

  const response = result.response
  const text = response.text()

  // Extract citations from grounding metadata if available
  const citations: GeminiCitation[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groundingMetadata = response.candidates?.[0]?.groundingMetadata as any
  if (groundingMetadata?.groundingChunks) {
    for (const chunk of groundingMetadata.groundingChunks) {
      if (chunk.retrievedContext) {
        citations.push({
          source: chunk.retrievedContext.title || 'Unknown',
          excerpt: chunk.retrievedContext.text || '',
          confidence: chunk.retrievedContext.confidence
        })
      }
    }
  }

  return {
    content: text,
    citations,
    model: 'gemini-2.0-flash-exp'
  }
}

// Upload file to Gemini
export async function uploadToGemini(
  fileBuffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  const fileManager = getFileManager()

  // Write to temp file (SDK requires file path, not Buffer)
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  const tempPath = join(tmpdir(), `gemini-${Date.now()}-${sanitizedFilename}`)
  writeFileSync(tempPath, fileBuffer)

  try {
    const uploadResult = await fileManager.uploadFile(tempPath, {
      displayName: filename,
      mimeType
    })
    return uploadResult.file.uri
  } finally {
    // Cleanup temp file
    try { unlinkSync(tempPath) } catch { /* ignore */ }
  }
}

// Delete file from Gemini
export async function deleteFromGemini(fileUri: string): Promise<void> {
  const fileManager = getFileManager()
  const fileName = fileUri.split('/').pop()
  if (fileName) {
    await fileManager.deleteFile(fileName)
  }
}
