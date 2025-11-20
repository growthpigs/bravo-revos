/**
 * Gemini Client Tests
 *
 * Tests for lib/gemini/client.ts
 * Covers: lazy initialization, queryDocuments, uploadToGemini, deleteFromGemini
 */

import { getGeminiClient, getFileManager, queryDocuments, deleteFromGemini } from '@/lib/gemini/client'

// Mock Google Generative AI
const mockGenerateContent = jest.fn()
const mockUploadFile = jest.fn()
const mockDeleteFile = jest.fn()

jest.mock('@google/generative-ai/server', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent
    })
  })),
  GoogleAIFileManager: jest.fn().mockImplementation(() => ({
    uploadFile: mockUploadFile,
    deleteFile: mockDeleteFile
  }))
}))

describe('Gemini Client', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset module to clear cached clients
    jest.resetModules()
    process.env = { ...originalEnv, GOOGLE_GENERATIVE_AI_API_KEY: 'test-key' }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('getGeminiClient', () => {
    it('throws error when API key is not configured', () => {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = ''

      // Re-import to get fresh module
      jest.isolateModules(() => {
        const { getGeminiClient: freshGetClient } = require('@/lib/gemini/client')
        expect(() => freshGetClient()).toThrow('GOOGLE_GENERATIVE_AI_API_KEY not configured')
      })
    })

    it('returns cached client on subsequent calls', () => {
      const client1 = getGeminiClient()
      const client2 = getGeminiClient()
      expect(client1).toBe(client2)
    })
  })

  describe('getFileManager', () => {
    it('throws error when API key is not configured', () => {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = ''

      jest.isolateModules(() => {
        const { getFileManager: freshGetManager } = require('@/lib/gemini/client')
        expect(() => freshGetManager()).toThrow('GOOGLE_GENERATIVE_AI_API_KEY not configured')
      })
    })

    it('returns cached manager on subsequent calls', () => {
      const manager1 = getFileManager()
      const manager2 = getFileManager()
      expect(manager1).toBe(manager2)
    })
  })

  describe('queryDocuments', () => {
    it('builds correct prompt with system context', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => 'Test response',
          candidates: []
        }
      })

      const documents = [
        {
          id: 'doc-1',
          client_id: 'client-123',
          filename: 'test.pdf',
          document_type: 'general',
          supabase_path: 'path/test.pdf',
          gemini_file_uri: 'files/gemini-123',
          file_size: 1000,
          mime_type: 'application/pdf',
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]

      await queryDocuments('What is X?', documents, 'You are helpful.')

      expect(mockGenerateContent).toHaveBeenCalledWith([
        {
          text: expect.stringContaining('You are helpful.')
        },
        {
          fileData: {
            fileUri: 'files/gemini-123',
            mimeType: 'application/pdf'
          }
        }
      ])
    })

    it('builds correct prompt without system context', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => 'Test response',
          candidates: []
        }
      })

      const documents = [
        {
          id: 'doc-1',
          client_id: 'client-123',
          filename: 'test.pdf',
          document_type: 'general',
          supabase_path: 'path/test.pdf',
          gemini_file_uri: 'files/gemini-123',
          file_size: 1000,
          mime_type: 'application/pdf',
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]

      await queryDocuments('What is X?', documents)

      const call = mockGenerateContent.mock.calls[0][0]
      expect(call[0].text).toContain('User question: What is X?')
      expect(call[0].text).not.toContain('You are helpful')
    })

    it('extracts citations from grounding metadata', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => 'The answer is 42',
          candidates: [
            {
              groundingMetadata: {
                groundingChunks: [
                  {
                    retrievedContext: {
                      title: 'test.pdf',
                      text: 'The answer to everything is 42',
                      confidence: 0.95
                    }
                  }
                ]
              }
            }
          ]
        }
      })

      const result = await queryDocuments('What is the answer?', [
        {
          id: 'doc-1',
          client_id: 'client-123',
          filename: 'test.pdf',
          document_type: 'general',
          supabase_path: 'path/test.pdf',
          gemini_file_uri: 'files/gemini-123',
          file_size: 1000,
          mime_type: 'application/pdf',
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])

      expect(result.citations).toHaveLength(1)
      expect(result.citations[0].source).toBe('test.pdf')
      expect(result.citations[0].excerpt).toBe('The answer to everything is 42')
      expect(result.citations[0].confidence).toBe(0.95)
    })

    it('returns empty citations when no grounding metadata', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => 'Response without citations',
          candidates: []
        }
      })

      const result = await queryDocuments('Question', [
        {
          id: 'doc-1',
          client_id: 'client-123',
          filename: 'test.pdf',
          document_type: 'general',
          supabase_path: 'path/test.pdf',
          gemini_file_uri: 'files/gemini-123',
          file_size: 1000,
          mime_type: 'application/pdf',
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])

      expect(result.citations).toHaveLength(0)
    })

    it('handles multiple documents', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => 'Combined response',
          candidates: []
        }
      })

      const documents = [
        {
          id: 'doc-1',
          client_id: 'client-123',
          filename: 'doc1.pdf',
          document_type: 'general',
          supabase_path: 'path/doc1.pdf',
          gemini_file_uri: 'files/123',
          file_size: 1000,
          mime_type: 'application/pdf',
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'doc-2',
          client_id: 'client-123',
          filename: 'doc2.docx',
          document_type: 'brand',
          supabase_path: 'path/doc2.docx',
          gemini_file_uri: 'files/456',
          file_size: 2000,
          mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]

      await queryDocuments('Question about both', documents)

      const call = mockGenerateContent.mock.calls[0][0]
      expect(call).toHaveLength(3) // 1 text + 2 file references
      expect(call[1].fileData.fileUri).toBe('files/123')
      expect(call[2].fileData.fileUri).toBe('files/456')
    })
  })

  describe('deleteFromGemini', () => {
    it('extracts filename from URI and calls deleteFile', async () => {
      mockDeleteFile.mockResolvedValueOnce(undefined)

      await deleteFromGemini('files/gemini-abc123')

      expect(mockDeleteFile).toHaveBeenCalledWith('gemini-abc123')
    })

    it('handles empty filename gracefully', async () => {
      await deleteFromGemini('')

      expect(mockDeleteFile).not.toHaveBeenCalled()
    })

    it('handles URI without slashes', async () => {
      mockDeleteFile.mockResolvedValueOnce(undefined)

      await deleteFromGemini('just-filename')

      expect(mockDeleteFile).toHaveBeenCalledWith('just-filename')
    })
  })
})
