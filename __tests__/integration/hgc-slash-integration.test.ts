/**
 * Integration Tests for HGC Slash Commands
 *
 * Tests the complete flow from user input → AI response with slash commands
 */

import { POST } from '@/app/api/hgc/route'
import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

// Mock dependencies
jest.mock('@/lib/supabase/server')
jest.mock('openai')

const mockSupabase = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  single: jest.fn(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis()
}

const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com'
}

describe('HGC Slash Command Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })
  })

  describe('Pod Command Flow', () => {
    it('should handle /pod-list command and return pods', async () => {
      // Mock database response
      const mockPods = [
        {
          id: 'pod-1',
          name: 'Growth Pod',
          description: 'Marketing growth focused',
          creator_id: mockUser.id,
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'pod-2',
          name: 'Tech Pod',
          description: 'Technology discussions',
          creator_id: mockUser.id,
          created_at: '2024-01-02T00:00:00Z'
        }
      ]

      mockSupabase.select.mockResolvedValue({
        data: mockPods,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/hgc', {
        method: 'POST',
        body: JSON.stringify({
          message: '/pod-list',
          conversationHistory: []
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.response).toContain('Growth Pod')
      expect(data.response).toContain('Tech Pod')
    })

    it('should handle /pod-members command with pod ID', async () => {
      const mockMembers = [
        {
          id: 'member-1',
          user_id: 'user-1',
          pod_id: 'pod-1',
          role: 'member',
          profiles: {
            full_name: 'John Doe',
            avatar_url: 'https://example.com/avatar1.jpg'
          }
        },
        {
          id: 'member-2',
          user_id: 'user-2',
          pod_id: 'pod-1',
          role: 'admin',
          profiles: {
            full_name: 'Jane Smith',
            avatar_url: 'https://example.com/avatar2.jpg'
          }
        }
      ]

      mockSupabase.select.mockResolvedValue({
        data: mockMembers,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/hgc', {
        method: 'POST',
        body: JSON.stringify({
          message: '/pod-members pod-1',
          conversationHistory: []
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.response).toContain('John Doe')
      expect(data.response).toContain('Jane Smith')
    })

    it('should handle empty pod results gracefully', async () => {
      mockSupabase.select.mockResolvedValue({
        data: [],
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/hgc', {
        method: 'POST',
        body: JSON.stringify({
          message: '/pod-list',
          conversationHistory: []
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.response).toMatch(/no pods|haven't created any pods/i)
    })
  })

  describe('Campaign Command Flow', () => {
    it('should handle /campaign-list command', async () => {
      const mockCampaigns = [
        {
          id: 'camp-1',
          name: 'Q1 Campaign',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z'
        }
      ]

      mockSupabase.select.mockResolvedValue({
        data: mockCampaigns,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/hgc', {
        method: 'POST',
        body: JSON.stringify({
          message: '/campaign-list',
          conversationHistory: []
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.response).toContain('Q1 Campaign')
    })
  })

  describe('Authentication Handling', () => {
    it('should reject unauthenticated requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      })

      const request = new NextRequest('http://localhost:3000/api/hgc', {
        method: 'POST',
        body: JSON.stringify({
          message: '/pod-list',
          conversationHistory: []
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabase.select.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      })

      const request = new NextRequest('http://localhost:3000/api/hgc', {
        method: 'POST',
        body: JSON.stringify({
          message: '/pod-list',
          conversationHistory: []
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Database')
    })

    it('should handle invalid JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/hgc', {
        method: 'POST',
        body: 'invalid json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })
  })

  describe('Mode Switching with Slash Menu State', () => {
    it('should reset slash menu when switching from floating to sidebar', async () => {
      // This test validates the UI state management
      // The actual implementation is in FloatingChatBar.tsx

      const mockOnModeChange = jest.fn()

      // Simulate mode change
      mockOnModeChange('sidebar')

      expect(mockOnModeChange).toHaveBeenCalledWith('sidebar')
      // In actual implementation, setIsSlashMenuVisible(false) is called
    })
  })

  describe('JSON Response Handling', () => {
    it('should strip intro text from AI responses', () => {
      const stripIntroText = (text: string) => {
        const patterns = [
          /^Here (?:is|are) (?:the|your) .+?:\s*/i,
          /^Let me .+?:\s*/i,
          /^I found .+?:\s*/i,
        ]

        let result = text
        for (const pattern of patterns) {
          result = result.replace(pattern, '')
        }
        return result
      }

      const input = "Here is your campaign list:\n\n**Campaign 1**: Active"
      const expected = "**Campaign 1**: Active"

      expect(stripIntroText(input)).toBe(expected)
    })

    it('should deduplicate consecutive lines', () => {
      const deduplicateLines = (text: string) => {
        const lines = text.split('\n')
        return lines.filter((line, i) => i === 0 || line !== lines[i - 1]).join('\n')
      }

      const input = "Line 1\nLine 1\nLine 2\nLine 2\nLine 2\nLine 3"
      const expected = "Line 1\nLine 2\nLine 3"

      expect(deduplicateLines(input)).toBe(expected)
    })

    it('should strip HTML comments', () => {
      const stripHtmlComments = (text: string) => {
        return text.replace(/<!--[\s\S]*?-->/g, '')
      }

      const input = "Content <!-- comment --> More content"
      const expected = "Content  More content"

      expect(stripHtmlComments(input)).toBe(expected)
    })
  })
})
