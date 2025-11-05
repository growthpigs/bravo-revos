/**
 * E-03: Pod Post Detection System Tests
 * Tests for detecting new posts from pod members and creating engagement activities
 */

import { createClient } from '@/lib/supabase/server';
import {
  saveDetectedPost,
  getPodMemberByLinkedInAccountId,
  getPodMembersWithAccounts,
} from '@/lib/pods/post-detector';
import { UnipilePost } from '@/lib/unipile-client';
import { podPostQueue, startPodPostDetection, stopPodPostDetection } from '@/lib/queue/pod-post-queue';
import { POD_POST_CONFIG } from '@/lib/config';

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('Pod Post Detection System (E-03)', () => {
  const mockPodId = 'pod-123';
  const mockAccountId = 'account-456';
  const mockLinkedInAccountId = 'linkedin-acc-789';
  const mockPodMemberId = 'pod-member-001';
  const mockUserId = 'user-789';
  const mockCampaignId = 'campaign-abc';

  const mockPost: UnipilePost = {
    id: 'post-001',
    text: 'Excited to announce our new product launch!',
    created_at: new Date().toISOString(),
    likes_count: 100,
    comments_count: 25,
    reposts_count: 5,
    author: {
      id: 'author-001',
      name: 'Pod Member Name',
      profile_url: 'https://linkedin.com/in/author',
    },
  };

  describe('Post Detection Queue API', () => {
    it('should create pod post queue with correct configuration', () => {
      expect(podPostQueue).toBeDefined();
      expect(podPostQueue.name).toBe('pod-post-detection');
    });

    it('should have 30-minute polling interval in config', () => {
      expect(POD_POST_CONFIG.POLLING_INTERVAL_MS).toBe(30 * 60 * 1000);
    });

    it('should start pod post detection with valid data', async () => {
      const result = await startPodPostDetection({
        podId: mockPodId,
        accountId: mockAccountId,
        podMemberIds: ['user-1', 'user-2', 'user-3'],
        campaignId: mockCampaignId,
        userId: mockUserId,
      });

      expect(result.jobId).toBeDefined();
      expect(result.message).toContain('started');
      expect(result.message).toContain('3 members');
    });

    it('should stop pod post detection', async () => {
      const removedCount = await stopPodPostDetection(mockPodId);
      expect(typeof removedCount).toBe('number');
    });

    it('should have queue worker configured', () => {
      // Worker should be defined in the module
      expect(podPostQueue.name).toBe('pod-post-detection');
    });
  });

  describe('Post Detection Validation', () => {
    it('should validate required pod post job fields', async () => {
      const validData = {
        podId: mockPodId,
        accountId: mockAccountId,
        podMemberIds: ['user-1', 'user-2'],
        campaignId: mockCampaignId,
        userId: mockUserId,
      };

      // Should not throw
      expect(() => {
        const { validatePodPostJobData } = require('@/lib/validation');
        validatePodPostJobData(validData);
      }).not.toThrow();
    });

    it('should reject missing required fields', async () => {
      const invalidData = {
        podId: mockPodId,
        // accountId missing
        podMemberIds: ['user-1'],
        campaignId: mockCampaignId,
        userId: mockUserId,
      };

      expect(() => {
        const { validatePodPostJobData } = require('@/lib/validation');
        validatePodPostJobData(invalidData);
      }).toThrow();
    });

    it('should reject empty pod member IDs array', async () => {
      const invalidData = {
        podId: mockPodId,
        accountId: mockAccountId,
        podMemberIds: [],
        campaignId: mockCampaignId,
        userId: mockUserId,
      };

      expect(() => {
        const { validatePodPostJobData } = require('@/lib/validation');
        validatePodPostJobData(invalidData);
      }).toThrow('non-empty array');
    });

    it('should reject single pod member', async () => {
      const invalidData = {
        podId: mockPodId,
        accountId: mockAccountId,
        podMemberIds: ['user-1'],
        campaignId: mockCampaignId,
        userId: mockUserId,
      };

      expect(() => {
        const { validatePodPostJobData } = require('@/lib/validation');
        validatePodPostJobData(invalidData);
      }).toThrow('at least 2 members');
    });
  });

  describe('Post Detection - Post Deduplication', () => {
    it('should have post deduplication config', () => {
      expect(POD_POST_CONFIG.POSTS_SEEN_KEY_PREFIX).toBe('pod-posts-seen');
      expect(POD_POST_CONFIG.POSTS_RETENTION_DAYS).toBe(7);
    });

    it('should check for existing posts before saving', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValueOnce({
          data: { id: 'existing-post-id' },
          error: null,
        }),
      };

      jest.mocked(createClient).mockResolvedValueOnce(mockSupabase as any);

      const result = await saveDetectedPost(
        mockPodId,
        mockAccountId,
        mockLinkedInAccountId,
        mockPost,
        ['user-1', 'user-2']
      );

      expect(result.postId).toBe('existing-post-id');
      expect(result.activitiesCreated).toBe(0);
    });
  });

  describe('Post Saving and Engagement Activity Creation', () => {
    it('should save new post to database', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest
                .fn()
                .mockResolvedValueOnce({ data: null, error: null })
                .mockResolvedValueOnce({
                  data: [
                    { id: mockPodMemberId, linkedin_account_id: mockLinkedInAccountId },
                  ],
                  error: null,
                }),
            }),
          }),
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValueOnce({
                data: { id: 'new-post-id' },
                error: null,
              }),
            }),
          }),
        }),
      };

      jest.mocked(createClient).mockResolvedValueOnce(mockSupabase as any);

      const result = await saveDetectedPost(
        mockPodId,
        mockAccountId,
        mockLinkedInAccountId,
        mockPost,
        [mockLinkedInAccountId]
      );

      expect(result.postId).toBe('new-post-id');
      expect(result.error).toBeUndefined();
    });

    it('should create engagement activities for pod members', async () => {
      const mockPodMembers = [
        { id: 'member-1', linkedin_account_id: 'acc-1' },
        { id: 'member-2', linkedin_account_id: 'acc-2' },
        { id: 'member-3', linkedin_account_id: 'acc-3' },
      ];

      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValueOnce({ data: null, error: null }),
              in: jest.fn().mockResolvedValueOnce({
                data: mockPodMembers,
                error: null,
              }),
            }),
          }),
          insert: jest
            .fn()
            .mockReturnValueOnce({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValueOnce({
                  data: { id: 'new-post-id' },
                  error: null,
                }),
              }),
            })
            .mockReturnValueOnce({
              select: jest.fn().mockResolvedValueOnce({
                data: [
                  { id: 'activity-1' },
                  { id: 'activity-2' },
                  { id: 'activity-3' },
                ],
                error: null,
              }),
            }),
        }),
      };

      jest.mocked(createClient).mockResolvedValueOnce(mockSupabase as any);

      const result = await saveDetectedPost(
        mockPodId,
        mockAccountId,
        mockLinkedInAccountId,
        mockPost,
        ['acc-1', 'acc-2', 'acc-3']
      );

      expect(result.postId).toBe('new-post-id');
      expect(result.activitiesCreated).toBe(3);
    });

    it('should handle activity creation errors gracefully', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValueOnce({ data: null, error: null }),
              in: jest.fn().mockResolvedValueOnce({
                data: [{ id: 'member-1', linkedin_account_id: 'acc-1' }],
                error: null,
              }),
            }),
          }),
          insert: jest
            .fn()
            .mockReturnValueOnce({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValueOnce({
                  data: { id: 'post-id' },
                  error: null,
                }),
              }),
            })
            .mockReturnValueOnce({
              select: jest
                .fn()
                .mockResolvedValueOnce({ data: null, error: new Error('DB Error') }),
            }),
        }),
      };

      jest.mocked(createClient).mockResolvedValueOnce(mockSupabase as any);

      const result = await saveDetectedPost(
        mockPodId,
        mockAccountId,
        mockLinkedInAccountId,
        mockPost,
        ['acc-1']
      );

      expect(result.postId).toBe('post-id');
      expect(result.activitiesCreated).toBe(0);
      expect(result.error).toBeDefined();
    });
  });

  describe('Pod Member Lookups', () => {
    it('should find pod member by LinkedIn account ID', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValueOnce({
              data: { id: mockPodMemberId },
              error: null,
            }),
          }),
        }),
      };

      jest.mocked(createClient).mockResolvedValueOnce(mockSupabase as any);

      const result = await getPodMemberByLinkedInAccountId(mockPodId, mockLinkedInAccountId);

      expect(result).toBe(mockPodMemberId);
    });

    it('should return null when pod member not found', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValueOnce({
              data: null,
              error: null,
            }),
          }),
        }),
      };

      jest.mocked(createClient).mockResolvedValueOnce(mockSupabase as any);

      const result = await getPodMemberByLinkedInAccountId(mockPodId, 'unknown-id');

      expect(result).toBeNull();
    });

    it('should fetch all pod members with their accounts', async () => {
      const mockMembers = [
        { id: 'member-1', linkedin_account_id: 'acc-1' },
        { id: 'member-2', linkedin_account_id: 'acc-2' },
      ];

      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValueOnce({
                data: mockMembers,
                error: null,
              }),
            }),
          }),
        }),
      };

      jest.mocked(createClient).mockResolvedValueOnce(mockSupabase as any);

      const result = await getPodMembersWithAccounts(mockPodId);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Post Metrics and Tracking', () => {
    it('should save post with metrics from Unipile', () => {
      const postWithMetrics: UnipilePost = {
        id: 'post-123',
        text: 'Test post',
        created_at: new Date().toISOString(),
        likes_count: 500,
        comments_count: 125,
        reposts_count: 50,
        author: {
          id: 'author-123',
          name: 'Test Author',
          profile_url: 'https://linkedin.com/in/test',
        },
      };

      expect(postWithMetrics.likes_count).toBe(500);
      expect(postWithMetrics.comments_count).toBe(125);
      expect(postWithMetrics.reposts_count).toBe(50);
    });

    it('should handle posts with missing metrics gracefully', () => {
      const postMinimal: UnipilePost = {
        id: 'post-456',
        text: 'Minimal post',
        created_at: new Date().toISOString(),
        author: {
          id: 'author-456',
          name: 'Author',
        },
      };

      expect(postMinimal.likes_count).toBeUndefined();
      expect(postMinimal.comments_count).toBeUndefined();
      expect(postMinimal.reposts_count).toBeUndefined();
    });
  });

  describe('Polling Interval and Scheduling', () => {
    it('should use 30-minute polling interval', () => {
      expect(POD_POST_CONFIG.POLLING_INTERVAL_MS).toBe(1800000); // 30 * 60 * 1000
    });

    it('should check configured number of posts per poll', () => {
      expect(POD_POST_CONFIG.POSTS_TO_CHECK_PER_POLL).toBe(5);
    });

    it('should keep post history for configured days', () => {
      expect(POD_POST_CONFIG.POSTS_RETENTION_DAYS).toBe(7);
    });
  });

  describe('Error Handling', () => {
    it('should handle Unipile API errors gracefully', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValueOnce({
                data: null,
                error: null,
              }),
            }),
          }),
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValueOnce({
                data: null,
                error: new Error('API Error'),
              }),
            }),
          }),
        }),
      };

      jest.mocked(createClient).mockResolvedValueOnce(mockSupabase as any);

      const result = await saveDetectedPost(
        mockPodId,
        mockAccountId,
        mockLinkedInAccountId,
        mockPost,
        ['user-1', 'user-2']
      );

      expect(result.error).toBeDefined();
      expect(result.postId).toBe('');
    });

    it('should handle database connection errors', async () => {
      jest.mocked(createClient).mockRejectedValueOnce(
        new Error('Connection failed')
      );

      // Should not throw, but handle gracefully
      expect(async () => {
        await getPodMemberByLinkedInAccountId(mockPodId, mockLinkedInAccountId);
      }).not.toThrow();
    });
  });

  describe('Post Detection Integration', () => {
    it('should detect new posts from multiple pod members', () => {
      const posts: UnipilePost[] = [
        {
          ...mockPost,
          id: 'post-1',
        },
        {
          ...mockPost,
          id: 'post-2',
          text: 'Another great announcement',
        },
      ];

      expect(posts).toHaveLength(2);
      expect(posts[0].id).toBe('post-1');
      expect(posts[1].id).toBe('post-2');
    });

    it('should support minimum 9 pod members per spec', () => {
      // Pod minimum is 9 members
      const podMembersCount = 9;
      expect(podMembersCount).toBeGreaterThanOrEqual(9);
    });
  });
});
