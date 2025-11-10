/**
 * HGC TypeScript Integration Tests
 * Tests the complete OpenAI Function Calling implementation
 *
 * What Was Built: Native TypeScript HGC with OpenAI gpt-4o
 * - 8 AgentKit tools directly integrated with OpenAI
 * - Direct Supabase queries (no Python backend)
 * - Streaming word-by-word responses
 * - Database operations for scrape_jobs and notifications
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Mock dependencies BEFORE importing route
jest.mock('@/lib/supabase/server')
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    })),
  }
})


// Now import route after mocks are set up
import { POST, GET } from '@/app/api/hgc/route'
import OpenAI from 'openai'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>

describe('HGC TypeScript - Integration Tests', () => {
  let mockSupabase: any
  let mockOpenAIInstance: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    }
    mockCreateClient.mockResolvedValue(mockSupabase)

    // Mock OpenAI instance
    mockOpenAIInstance = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    }
    MockedOpenAI.mockImplementation(() => mockOpenAIInstance)

    // Environment variables
    process.env.OPENAI_API_KEY = 'test-openai-key'
  })

  describe('Health Check (GET /api/hgc)', () => {
    it('should return correct service info for TypeScript version', async () => {
      const response = await GET()
      const data = await response.json()

      expect(data.status).toBe('ok')
      expect(data.service).toBe('Holy Grail Chat')
      expect(data.version).toBe('5.0.0-typescript-agentkit')
      expect(data.mode).toBe('native-typescript')
      expect(data.backend).toBe('OpenAI Function Calling')
    })

    it('should list all 8 AgentKit tools', async () => {
      const response = await GET()
      const data = await response.json()

      expect(data.tools).toHaveLength(8)
      expect(data.tools).toContain('get_all_campaigns')
      expect(data.tools).toContain('get_campaign_by_id')
      expect(data.tools).toContain('create_campaign')
      expect(data.tools).toContain('schedule_post')
      expect(data.tools).toContain('trigger_dm_scraper')
      expect(data.tools).toContain('get_pod_members')
      expect(data.tools).toContain('send_pod_repost_links')
      expect(data.tools).toContain('update_campaign_status')
    })

    it('should list correct features', async () => {
      const response = await GET()
      const data = await response.json()

      expect(data.features).toContain('OpenAI gpt-4o')
      expect(data.features).toContain('Direct Supabase')
      expect(data.features).toContain('8 AgentKit Tools')
      expect(data.features).toContain('Fast Response')
    })
  })

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      const request = new NextRequest('http://localhost:3000/api/hgc', {
        method: 'POST',
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Hello' }] }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should allow authenticated requests with no tool calls', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      })

      // Mock OpenAI response (no tool calls)
      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Hello! How can I help you today?',
            },
          },
        ],
      })

      const request = new NextRequest('http://localhost:3000/api/hgc', {
        method: 'POST',
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Hi' }] }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('OpenAI Function Calling', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      })
    })

    it('should call OpenAI with all 8 tools registered', async () => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Response without tools',
            },
          },
        ],
      })

      const request = new NextRequest('http://localhost:3000/api/hgc', {
        method: 'POST',
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Hello' }] }),
      })

      await POST(request)

      // Verify OpenAI called with tools
      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o',
          tools: expect.arrayContaining([
            expect.objectContaining({
              type: 'function',
              function: expect.objectContaining({ name: 'get_all_campaigns' }),
            }),
            expect.objectContaining({
              type: 'function',
              function: expect.objectContaining({ name: 'trigger_dm_scraper' }),
            }),
            expect.objectContaining({
              type: 'function',
              function: expect.objectContaining({ name: 'send_pod_repost_links' }),
            }),
          ]),
          tool_choice: 'auto',
        })
      )
    })

    it('should include system prompt with tool selection rules', async () => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Response' } }],
      })

      const request = new NextRequest('http://localhost:3000/api/hgc', {
        method: 'POST',
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Show campaigns' }] }),
      })

      await POST(request)

      const callArgs = mockOpenAIInstance.chat.completions.create.mock.calls[0][0]
      const systemMessage = callArgs.messages.find((m: any) => m.role === 'system')

      expect(systemMessage).toBeDefined()
      expect(systemMessage.content).toContain('RevOS Intelligence')
      expect(systemMessage.content).toContain('TOOL SELECTION RULES')
      expect(systemMessage.content).toContain('get_all_campaigns()')
    })

    it('should convert user messages to OpenAI format', async () => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Response' } }],
      })

      const request = new NextRequest('http://localhost:3000/api/hgc', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'First message' },
            { role: 'assistant', content: 'AI response' },
            { role: 'user', content: 'Second message' },
          ],
        }),
      })

      await POST(request)

      const callArgs = mockOpenAIInstance.chat.completions.create.mock.calls[0][0]
      const userMessages = callArgs.messages.filter((m: any) => m.role !== 'system')

      expect(userMessages).toHaveLength(3)
      expect(userMessages[0]).toEqual({ role: 'user', content: 'First message' })
      expect(userMessages[1]).toEqual({ role: 'assistant', content: 'AI response' })
    })
  })

  describe('Tool Execution - get_all_campaigns', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      })
    })

    it('should execute get_all_campaigns tool and return streaming response', async () => {
      // Mock Supabase query
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'campaign-1',
              name: 'AI Leadership',
              status: 'active',
              created_at: '2024-01-01',
              lead_magnet_source: 'linkedin',
            },
          ],
          error: null,
        }),
      })

      // Mock OpenAI tool call
      mockOpenAIInstance.chat.completions.create
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                tool_calls: [
                  {
                    id: 'call_123',
                    type: 'function',
                    function: {
                      name: 'get_all_campaigns',
                      arguments: '{}',
                    },
                  },
                ],
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: "You're running 1 campaign right now.",
              },
            },
          ],
        })

      const request = new NextRequest('http://localhost:3000/api/hgc', {
        method: 'POST',
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Show my campaigns' }] }),
      })

      const response = await POST(request)

      // Should return streaming response
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toContain('text/plain')
      expect(response.headers.get('Cache-Control')).toBe('no-cache')

      // Verify Supabase query was made
      expect(mockSupabase.from).toHaveBeenCalledWith('campaigns')

      // Verify OpenAI was called twice (initial + with tool results)
      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledTimes(2)
    })

    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' },
        }),
      })

      mockOpenAIInstance.chat.completions.create
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                tool_calls: [
                  {
                    id: 'call_123',
                    type: 'function',
                    function: { name: 'get_all_campaigns', arguments: '{}' },
                  },
                ],
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: "Sorry, I couldn't fetch your campaigns right now.",
              },
            },
          ],
        })

      const request = new NextRequest('http://localhost:3000/api/hgc', {
        method: 'POST',
        body: JSON.stringify({ messages: [{ role: 'user', content: 'List campaigns' }] }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200) // Still returns 200, error handled in tool result
    })
  })

  describe('Streaming Response', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      })
    })

    it('should stream response with correct headers', async () => {
      mockOpenAIInstance.chat.completions.create
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                tool_calls: [
                  {
                    id: 'call_123',
                    type: 'function',
                    function: { name: 'get_all_campaigns', arguments: '{}' },
                  },
                ],
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: 'You have 5 campaigns running',
              },
            },
          ],
        })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      })

      const request = new NextRequest('http://localhost:3000/api/hgc', {
        method: 'POST',
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Show campaigns' }] }),
      })

      const response = await POST(request)

      expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
      expect(response.headers.get('Cache-Control')).toBe('no-cache')
      expect(response.headers.get('Connection')).toBe('keep-alive')
      expect(response.body).toBeDefined() // Streaming body
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      })
    })

    it('should handle OpenAI API errors', async () => {
      mockOpenAIInstance.chat.completions.create.mockRejectedValue(new Error('OpenAI API error'))

      const request = new NextRequest('http://localhost:3000/api/hgc', {
        method: 'POST',
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Hello' }] }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('OpenAI API error')
    })

    it('should handle malformed request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/hgc', {
        method: 'POST',
        body: 'invalid-json',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })
  })
})
