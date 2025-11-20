/**
 * Gemini Upload API Tests
 *
 * Tests for /api/gemini/upload endpoint
 * Covers: auth, validation, upload success/failure, delete with cleanup
 */

import { NextRequest } from 'next/server'
import { POST, GET, DELETE } from '@/app/api/gemini/upload/route'

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        order: jest.fn(() => ({
          // For query chaining
        }))
      }))
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn()
      }))
    })),
    delete: jest.fn(() => ({
      eq: jest.fn()
    }))
  })),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(),
      remove: jest.fn()
    }))
  }
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}))

// Mock Gemini client
const mockUploadToGemini = jest.fn()
const mockDeleteFromGemini = jest.fn()

jest.mock('@/lib/gemini/client', () => ({
  uploadToGemini: (...args: unknown[]) => mockUploadToGemini(...args),
  deleteFromGemini: (...args: unknown[]) => mockDeleteFromGemini(...args)
}))

describe('Gemini Upload API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/gemini/upload', () => {
    it('returns 401 without auth header', async () => {
      const req = new NextRequest('http://localhost/api/gemini/upload', {
        method: 'POST'
      })

      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 401 with invalid token', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid token' }
      })

      const req = new NextRequest('http://localhost/api/gemini/upload', {
        method: 'POST',
        headers: { Authorization: 'Bearer invalid-token' }
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

      const req = new NextRequest('http://localhost/api/gemini/upload', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' }
      })

      const formData = new FormData()
      // @ts-expect-error - mock request
      req.formData = () => Promise.resolve(formData)

      const res = await POST(req)
      expect(res.status).toBe(400)
    })

    it('returns 400 when no file provided', async () => {
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

      const formData = new FormData()
      const req = new NextRequest('http://localhost/api/gemini/upload', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' }
      })
      // @ts-expect-error - mock request
      req.formData = () => Promise.resolve(formData)

      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toBe('No file provided')
    })

    it('returns 400 for file exceeding 10MB', async () => {
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

      const largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'large.pdf', {
        type: 'application/pdf'
      })
      const formData = new FormData()
      formData.append('file', largeFile)

      const req = new NextRequest('http://localhost/api/gemini/upload', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' }
      })
      // @ts-expect-error - mock request
      req.formData = () => Promise.resolve(formData)

      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toContain('too large')
    })

    it('returns 400 for invalid file type', async () => {
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

      const invalidFile = new File(['test'], 'test.exe', {
        type: 'application/x-msdownload'
      })
      const formData = new FormData()
      formData.append('file', invalidFile)

      const req = new NextRequest('http://localhost/api/gemini/upload', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' }
      })
      // @ts-expect-error - mock request
      req.formData = () => Promise.resolve(formData)

      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toContain('Invalid file type')
    })

    it('cleans up storage when Gemini upload fails', async () => {
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

      const mockStorageRemove = jest.fn().mockResolvedValueOnce({})
      mockSupabase.storage.from.mockReturnValueOnce({
        upload: jest.fn().mockResolvedValueOnce({ error: null }),
        remove: mockStorageRemove
      })

      mockUploadToGemini.mockRejectedValueOnce(new Error('Gemini error'))

      const validFile = new File(['test content'], 'test.pdf', {
        type: 'application/pdf'
      })
      const formData = new FormData()
      formData.append('file', validFile)

      const req = new NextRequest('http://localhost/api/gemini/upload', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' }
      })
      // @ts-expect-error - mock request
      req.formData = () => Promise.resolve(formData)

      const res = await POST(req)

      expect(res.status).toBe(500)
      expect(mockStorageRemove).toHaveBeenCalled()
    })

    it('successfully uploads file', async () => {
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
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({
                data: {
                  id: 'doc-123',
                  filename: 'test.pdf',
                  document_type: 'general',
                  file_size: 12,
                  created_at: new Date().toISOString()
                },
                error: null
              })
            })
          })
        })

      mockSupabase.storage.from.mockReturnValueOnce({
        upload: jest.fn().mockResolvedValueOnce({ error: null })
      })

      mockUploadToGemini.mockResolvedValueOnce('files/gemini-123')

      const validFile = new File(['test content'], 'test.pdf', {
        type: 'application/pdf'
      })
      const formData = new FormData()
      formData.append('file', validFile)

      const req = new NextRequest('http://localhost/api/gemini/upload', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' }
      })
      // @ts-expect-error - mock request
      req.formData = () => Promise.resolve(formData)

      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.document.id).toBe('doc-123')
    })
  })

  describe('GET /api/gemini/upload', () => {
    it('returns 401 without auth', async () => {
      const req = new NextRequest('http://localhost/api/gemini/upload')

      const res = await GET(req)
      expect(res.status).toBe(401)
    })

    it('returns documents list for authenticated user', async () => {
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
            eq: () => ({
              order: () => Promise.resolve({
                data: [
                  { id: 'doc-1', filename: 'test.pdf' }
                ],
                error: null
              })
            })
          })
        })

      const req = new NextRequest('http://localhost/api/gemini/upload', {
        headers: { Authorization: 'Bearer valid-token' }
      })

      const res = await GET(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.documents).toHaveLength(1)
    })
  })

  describe('DELETE /api/gemini/upload', () => {
    it('returns 400 without document ID', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null
      })

      const req = new NextRequest('http://localhost/api/gemini/upload', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer valid-token' }
      })

      const res = await DELETE(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toBe('Document ID required')
    })

    it('returns 404 when document not found or not owned', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null
      })
      mockSupabase.from.mockReturnValueOnce({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null, error: null })
            })
          })
        })
      })

      const req = new NextRequest('http://localhost/api/gemini/upload?id=doc-999', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer valid-token' }
      })

      const res = await DELETE(req)
      expect(res.status).toBe(404)
    })

    it('successfully deletes document with cleanup', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null
      })

      const mockDoc = {
        id: 'doc-123',
        supabase_path: 'gemini-docs/client-123/test.pdf',
        gemini_file_uri: 'files/gemini-123'
      }

      mockSupabase.from
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: mockDoc, error: null })
              })
            })
          })
        })
        .mockReturnValueOnce({
          delete: () => ({
            eq: () => Promise.resolve({ error: null })
          })
        })

      const mockStorageRemove = jest.fn().mockResolvedValueOnce({})
      mockSupabase.storage.from.mockReturnValueOnce({
        remove: mockStorageRemove
      })

      mockDeleteFromGemini.mockResolvedValueOnce(undefined)

      const req = new NextRequest('http://localhost/api/gemini/upload?id=doc-123', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer valid-token' }
      })

      const res = await DELETE(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockDeleteFromGemini).toHaveBeenCalledWith('files/gemini-123')
      expect(mockStorageRemove).toHaveBeenCalledWith(['gemini-docs/client-123/test.pdf'])
    })

    it('continues delete even if Gemini delete fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null
      })

      const mockDoc = {
        id: 'doc-123',
        supabase_path: 'gemini-docs/client-123/test.pdf',
        gemini_file_uri: 'files/gemini-123'
      }

      mockSupabase.from
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: mockDoc, error: null })
              })
            })
          })
        })
        .mockReturnValueOnce({
          delete: () => ({
            eq: () => Promise.resolve({ error: null })
          })
        })

      mockSupabase.storage.from.mockReturnValueOnce({
        remove: jest.fn().mockResolvedValueOnce({})
      })

      // Gemini delete fails
      mockDeleteFromGemini.mockRejectedValueOnce(new Error('Gemini error'))

      const req = new NextRequest('http://localhost/api/gemini/upload?id=doc-123', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer valid-token' }
      })

      const res = await DELETE(req)

      // Should still succeed
      expect(res.status).toBe(200)
    })
  })
})
