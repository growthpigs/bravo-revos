/**
 * Gemini Query API Tests
 *
 * Tests for /api/gemini/query endpoint
 * Covers: auth, validation, query with/without documents
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/gemini/query/route'

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn()
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}))

// Mock Gemini client
const mockQueryDocuments = jest.fn()

jest.mock('@/lib/gemini/client', () => ({
  queryDocuments: (...args: unknown[]) => mockQueryDocuments(...args),
  GeminiDocument: {}
}))

describe('Gemini Query API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/gemini/query', () => {
    it('returns 401 without auth header', async () => {
      const req = new NextRequest('http://localhost/api/gemini/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'test' })
      })

      const res = await POST(req)
      expect(res.status).toBe(401)
    })

    it('returns 401 with invalid token', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid token' }
      })

      const req = new NextRequest('http://localhost/api/gemini/query', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer invalid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: 'test' })
      })

      const res = await POST(req)
      expect(res.status).toBe(401)
    })

    it('returns 400 when user has no client_id', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null
      })
      mockSupabase.from.mockReturnValueOnce({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: null })
          })
        })
      })

      const req = new NextRequest('http://localhost/api/gemini/query', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: 'test' })
      })

      const res = await POST(req)
      expect(res.status).toBe(400)
    })

    it('returns 400 when query is missing', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null
      })
      mockSupabase.from.mockReturnValueOnce({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: { client_id: 'client-123' },
              error: null
            })
          })
        })
      })

      const req = new NextRequest('http://localhost/api/gemini/query', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })

      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toBe('Query is required')
    })

    it('returns 400 when query is not a string', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null
      })
      mockSupabase.from.mockReturnValueOnce({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: { client_id: 'client-123' },
              error: null
            })
          })
        })
      })

      const req = new NextRequest('http://localhost/api/gemini/query', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: 123 })
      })

      const res = await POST(req)
      expect(res.status).toBe(400)
    })

    it('returns empty result when no documents exist', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null
      })
      mockSupabase.from
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: { client_id: 'client-123' },
                error: null
              })
            })
          })
        })
        .mockReturnValueOnce({
          select: () => ({
            eq: () => Promise.resolve({
              data: [],
              error: null
            })
          })
        })

      const req = new NextRequest('http://localhost/api/gemini/query', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: 'test question' })
      })

      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.document_count).toBe(0)
      expect(data.content).toContain('No documents found')
    })

    it('filters by document_types when provided', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null
      })

      const mockIn = jest.fn(() => Promise.resolve({
        data: [{ id: 'doc-1', gemini_file_uri: 'files/123' }],
        error: null
      }))

      mockSupabase.from
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: { client_id: 'client-123' },
                error: null
              })
            })
          })
        })
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              in: mockIn
            })
          })
        })

      mockQueryDocuments.mockResolvedValueOnce({
        content: 'Test response',
        citations: [],
        model: 'gemini-2.0-flash-exp'
      })

      const req = new NextRequest('http://localhost/api/gemini/query', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: 'test question',
          document_types: ['brand', 'style']
        })
      })

      const res = await POST(req)

      expect(res.status).toBe(200)
      expect(mockIn).toHaveBeenCalledWith('document_type', ['brand', 'style'])
    })

    it('successfully queries documents', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null
      })

      const mockDocs = [
        {
          id: 'doc-1',
          client_id: 'client-123',
          filename: 'test.pdf',
          document_type: 'general',
          gemini_file_uri: 'files/123',
          mime_type: 'application/pdf'
        }
      ]

      mockSupabase.from
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: { client_id: 'client-123' },
                error: null
              })
            })
          })
        })
        .mockReturnValueOnce({
          select: () => ({
            eq: () => Promise.resolve({
              data: mockDocs,
              error: null
            })
          })
        })

      mockQueryDocuments.mockResolvedValueOnce({
        content: 'According to test.pdf, the answer is 42.',
        citations: [
          {
            source: 'test.pdf',
            excerpt: 'The answer is 42',
            confidence: 0.95
          }
        ],
        model: 'gemini-2.0-flash-exp'
      })

      const req = new NextRequest('http://localhost/api/gemini/query', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: 'What is the answer?' })
      })

      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.content).toContain('42')
      expect(data.citations).toHaveLength(1)
      expect(data.document_count).toBe(1)
      expect(mockQueryDocuments).toHaveBeenCalledWith(
        'What is the answer?',
        mockDocs,
        undefined // system_context
      )
    })

    it('passes system_context to queryDocuments', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null
      })

      mockSupabase.from
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: { client_id: 'client-123' },
                error: null
              })
            })
          })
        })
        .mockReturnValueOnce({
          select: () => ({
            eq: () => Promise.resolve({
              data: [{ id: 'doc-1', gemini_file_uri: 'files/123' }],
              error: null
            })
          })
        })

      mockQueryDocuments.mockResolvedValueOnce({
        content: 'Response',
        citations: [],
        model: 'gemini-2.0-flash-exp'
      })

      const systemContext = 'You are a helpful assistant for marketing tasks.'

      const req = new NextRequest('http://localhost/api/gemini/query', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: 'Help me',
          system_context: systemContext
        })
      })

      await POST(req)

      expect(mockQueryDocuments).toHaveBeenCalledWith(
        'Help me',
        expect.any(Array),
        systemContext
      )
    })

    it('returns 500 when Gemini query fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null
      })

      mockSupabase.from
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: { client_id: 'client-123' },
                error: null
              })
            })
          })
        })
        .mockReturnValueOnce({
          select: () => ({
            eq: () => Promise.resolve({
              data: [{ id: 'doc-1', gemini_file_uri: 'files/123' }],
              error: null
            })
          })
        })

      mockQueryDocuments.mockRejectedValueOnce(new Error('Gemini API error'))

      const req = new NextRequest('http://localhost/api/gemini/query', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: 'test' })
      })

      const res = await POST(req)
      expect(res.status).toBe(500)
    })
  })
})
