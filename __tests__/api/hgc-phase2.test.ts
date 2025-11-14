/**
 * Integration tests for HGC Phase 2 API Route
 * Tests Next.js API + Python orchestrator integration
 */

import { POST, GET } from '@/app/api/hgc/route'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { spawn } from 'child_process'

// Mock dependencies
jest.mock('@/lib/supabase/server')
jest.mock('child_process')

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockSpawn = spawn as jest.MockedFunction<typeof spawn>

describe('POST /api/hgc - Phase 2 Python Orchestrator', () => {
  let mockSupabase: any

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    // Mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
        getSession: jest.fn(),
      },
      from: jest.fn(),
    }
    mockCreateClient.mockResolvedValue(mockSupabase)

    // Set environment variables
    process.env.MEM0_API_KEY = 'test-mem0-key'
    process.env.OPENAI_API_KEY = 'test-openai-key'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:3000'
  })

  describe('Authentication', () => {
    it('should return 401 if user not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      const request = new NextRequest('http://localhost:3000/api/hgc', {
        method: 'POST',
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Hello' }] })
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
      expect(await response.text()).toBe('Unauthorized')
    })

    it('should return 401 if no session', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      })
      mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } })

      const request = new NextRequest('http://localhost:3000/api/hgc', {
        method: 'POST',
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Hello' }] })
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
      expect(await response.text()).toBe('No session')
    })
  })

  describe('Request Validation', () => {
    beforeEach(() => {
      // Setup authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      })
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } }
      })
    })

    it('should return 400 if no messages provided', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: { client_id: 'client-1' } })
      })

      const request = new NextRequest('http://localhost:3000/api/hgc', {
        method: 'POST',
        body: JSON.stringify({ messages: [] })
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      expect(await response.text()).toBe('No messages provided')
    })

    it('should return 400 if user data not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null })
      })

      const request = new NextRequest('http://localhost:3000/api/hgc', {
        method: 'POST',
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Hello' }] })
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('Python Orchestrator Integration', () => {
    beforeEach(() => {
      // Setup authenticated user with data
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      })
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } }
      })

      // Mock user and pod queries
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { client_id: 'client-1' }
            })
          }
        }
        if (table === 'pod_members') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { pod_id: 'pod-456' }
            })
          }
        }
        return {}
      })
    })

    it('should spawn Python process with correct context', async () => {
      const mockChildProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            // Simulate successful completion
            const stdoutCallback = mockChildProcess.stdout.on.mock.calls[0][1]
            stdoutCallback(Buffer.from(JSON.stringify({
              content: 'Test response',
              memory_stored: true
            })))
            callback(0)
          }
        })
      }

      mockSpawn.mockReturnValue(mockChildProcess as any)

      const messages = [{ role: 'user', content: 'Hello' }]
      const request = new NextRequest('http://localhost:3000/api/hgc', {
        method: 'POST',
        body: JSON.stringify({ messages })
      })

      const response = await POST(request)

      // Verify spawn called with correct arguments
      expect(mockSpawn).toHaveBeenCalledWith(
        expect.stringContaining('runner.py'),
        [],
        expect.objectContaining({
          env: expect.objectContaining({
            HGC_CONTEXT: expect.any(String)
          })
        })
      )

      // Verify context passed to Python
      const spawnCall = mockSpawn.mock.calls[0]
      expect(spawnCall).toBeDefined()
      expect(spawnCall[2]).toBeDefined()
      const context = JSON.parse(spawnCall[2]!.env!.HGC_CONTEXT!)
      expect(context.user_id).toBe('user-123')
      expect(context.pod_id).toBe('pod-456')
      expect(context.messages).toEqual(messages)
      expect(context.mem0_key).toBe('test-mem0-key')
      expect(context.openai_key).toBe('test-openai-key')
      expect(context.auth_token).toBe('test-token')
    })

    it('should stream response word-by-word', async () => {
      const mockChildProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            const stdoutCallback = mockChildProcess.stdout.on.mock.calls[0][1]
            stdoutCallback(Buffer.from(JSON.stringify({
              content: 'Hello world from agent',
              memory_stored: true
            })))
            callback(0)
          }
        })
      }

      mockSpawn.mockReturnValue(mockChildProcess as any)

      const request = new NextRequest('http://localhost:3000/api/hgc', {
        method: 'POST',
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Hi' }] })
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toContain('text/plain')
      expect(response.headers.get('Cache-Control')).toBe('no-cache')
    })

    it('should handle Python process errors', async () => {
      const mockChildProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            const stderrCallback = mockChildProcess.stderr.on.mock.calls[0][1]
            stderrCallback(Buffer.from('Python error occurred'))
            callback(1) // Exit code 1 = error
          }
        })
      }

      mockSpawn.mockReturnValue(mockChildProcess as any)

      const request = new NextRequest('http://localhost:3000/api/hgc', {
        method: 'POST',
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Hi' }] })
      })

      const response = await POST(request)

      // Should still return 200 (streaming started), but error in stream
      expect(response.status).toBe(200)
    })

    it('should log Python stderr for debugging', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      const mockChildProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            const stderrCallback = mockChildProcess.stderr.on.mock.calls[0][1]
            stderrCallback(Buffer.from('[ORCHESTRATOR] Debug message'))

            const stdoutCallback = mockChildProcess.stdout.on.mock.calls[0][1]
            stdoutCallback(Buffer.from(JSON.stringify({
              content: 'Response',
              memory_stored: true
            })))

            callback(0)
          }
        })
      }

      mockSpawn.mockReturnValue(mockChildProcess as any)

      const request = new NextRequest('http://localhost:3000/api/hgc', {
        method: 'POST',
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Hi' }] })
      })

      await POST(request)

      // Verify stderr logged
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[HGC_API] Python stderr:'),
        expect.stringContaining('[ORCHESTRATOR] Debug message')
      )

      consoleSpy.mockRestore()
    })

    it('should use default pod_id if user not in pod', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { client_id: 'client-1' }
            })
          }
        }
        if (table === 'pod_members') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: null }) // No pod
          }
        }
        return {}
      })

      const mockChildProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            const stdoutCallback = mockChildProcess.stdout.on.mock.calls[0][1]
            stdoutCallback(Buffer.from(JSON.stringify({
              content: 'Response',
              memory_stored: true
            })))
            callback(0)
          }
        })
      }

      mockSpawn.mockReturnValue(mockChildProcess as any)

      const request = new NextRequest('http://localhost:3000/api/hgc', {
        method: 'POST',
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Hi' }] })
      })

      await POST(request)

      // Verify default pod_id used
      const spawnCall = mockSpawn.mock.calls[0]
      expect(spawnCall).toBeDefined()
      expect(spawnCall[2]).toBeDefined()
      const context = JSON.parse(spawnCall[2]!.env!.HGC_CONTEXT!)
      expect(context.pod_id).toBe('default')
    })
  })
})

describe('GET /api/hgc - Health Check', () => {
  it('should return health check with Phase 2 info', async () => {
    const response = await GET()
    const data = await response.json()

    expect(data.status).toBe('ok')
    expect(data.service).toBe('Holy Grail Chat')
    expect(data.version).toBe('2.0.0-phase2')
    expect(data.mode).toBe('python-orchestrator')
    expect(data.features).toContain('AgentKit')
    expect(data.features).toContain('Mem0')
    expect(data.features).toContain('RevOS Tools')
  })
})
