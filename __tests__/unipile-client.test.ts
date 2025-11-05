/**
 * Unipile Client Tests
 * Tests for comment fetching API with mock mode support
 */

import { getAllPostComments, UnipileComment } from '../lib/unipile-client';

// Mock fetch globally
global.fetch = jest.fn();

describe('Unipile Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllPostComments', () => {
    describe('Mock Mode', () => {
      beforeEach(() => {
        process.env.UNIPILE_MOCK_MODE = 'true';
      });

      it('should return mock comments in mock mode', async () => {
        const accountId = 'mock_account';
        const postId = 'mock_post';

        const comments = await getAllPostComments(accountId, postId);

        expect(comments).toBeDefined();
        expect(Array.isArray(comments)).toBe(true);
        expect(comments.length).toBeGreaterThan(0);
      });

      it('should return comments with correct structure', async () => {
        const comments = await getAllPostComments('acc123', 'post456');

        const comment = comments[0];
        expect(comment).toHaveProperty('id');
        expect(comment).toHaveProperty('text');
        expect(comment).toHaveProperty('created_at');
        expect(comment).toHaveProperty('author');
        expect(comment.author).toHaveProperty('id');
        expect(comment.author).toHaveProperty('name');
      });

      it('should include trigger word in mock data', async () => {
        const comments = await getAllPostComments('acc123', 'post456');

        // At least one comment should have trigger word
        const hasScaleComment = comments.some((c) => c.text.includes('SCALE'));
        expect(hasScaleComment).toBe(true);
      });

      it('should include bot-like comment in mock data', async () => {
        const comments = await getAllPostComments('acc123', 'post456');

        // At least one comment should be bot-like
        const hasBotComment = comments.some(
          (c) =>
            c.author.headline?.toLowerCase().includes('bot') ||
            c.author.connections_count !== undefined && c.author.connections_count < 10
        );
        expect(hasBotComment).toBe(true);
      });

      it('should include generic comment in mock data', async () => {
        const comments = await getAllPostComments('acc123', 'post456');

        // At least one comment should be generic
        const hasGenericComment = comments.some(
          (c) => c.text === 'Great post!' || /^(nice|great|awesome)/i.test(c.text)
        );
        expect(hasGenericComment).toBe(true);
      });

      it('should simulate delay (>0ms)', async () => {
        const startTime = Date.now();
        await getAllPostComments('acc123', 'post456');
        const duration = Date.now() - startTime;

        expect(duration).toBeGreaterThan(0);
      });
    });

    describe('Production Mode', () => {
      beforeEach(() => {
        process.env.UNIPILE_MOCK_MODE = 'false';
        process.env.UNIPILE_API_KEY = 'test_api_key';
        process.env.UNIPILE_DSN = 'https://api.unipile.test';
      });

      afterEach(() => {
        process.env.UNIPILE_MOCK_MODE = 'true';
      });

      it('should call Unipile API with correct parameters', async () => {
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({ items: [] }),
        };
        (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

        await getAllPostComments('acc123', 'post456');

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/posts/post456/comments'),
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              'X-API-KEY': 'test_api_key',
              'Accept': 'application/json',
            }),
          })
        );
      });

      it('should include account_id in query params', async () => {
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({ items: [] }),
        };
        (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

        await getAllPostComments('acc123', 'post456');

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('account_id=acc123'),
          expect.any(Object)
        );
      });

      it('should return comments from API response', async () => {
        const mockComments: UnipileComment[] = [
          {
            id: 'comment1',
            text: 'Test comment',
            created_at: new Date().toISOString(),
            author: {
              id: 'author1',
              name: 'Test User',
              connections_count: 500,
            },
          },
        ];

        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({ items: mockComments }),
        };
        (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

        const comments = await getAllPostComments('acc123', 'post456');

        expect(comments).toEqual(mockComments);
        expect(comments[0].text).toBe('Test comment');
      });

      it('should handle empty comments array', async () => {
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({ items: [] }),
        };
        (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

        const comments = await getAllPostComments('acc123', 'post456');

        expect(comments).toEqual([]);
      });

      it('should handle missing items field', async () => {
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({}),
        };
        (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

        const comments = await getAllPostComments('acc123', 'post456');

        expect(comments).toEqual([]);
      });

      it('should throw error on API failure', async () => {
        const mockResponse = {
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
        };
        (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

        await expect(getAllPostComments('acc123', 'post456')).rejects.toThrow(
          'Failed to get post comments: 401'
        );
      });

      it('should throw error on network failure', async () => {
        (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

        await expect(getAllPostComments('acc123', 'post456')).rejects.toThrow('Network error');
      });

      it('should use default DSN if not configured', async () => {
        delete process.env.UNIPILE_DSN;

        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({ items: [] }),
        };
        (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

        await getAllPostComments('acc123', 'post456');

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('https://api1.unipile.com:13211'),
          expect.any(Object)
        );
      });
    });

    describe('Edge Cases', () => {
      it('should handle very long comment text', async () => {
        const longText = 'a'.repeat(10000);
        const mockComments: UnipileComment[] = [
          {
            id: 'c1',
            text: longText,
            created_at: new Date().toISOString(),
            author: {
              id: 'a1',
              name: 'User',
              connections_count: 100,
            },
          },
        ];

        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({ items: mockComments }),
        };
        (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
        process.env.UNIPILE_MOCK_MODE = 'false';

        const comments = await getAllPostComments('acc123', 'post456');

        expect(comments[0].text.length).toBe(10000);
      });

      it('should handle comments with emojis', async () => {
        const mockComments: UnipileComment[] = [
          {
            id: 'c1',
            text: '🚀 SCALE your business 🎯',
            created_at: new Date().toISOString(),
            author: {
              id: 'a1',
              name: 'User',
              connections_count: 100,
            },
          },
        ];

        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({ items: mockComments }),
        };
        (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
        process.env.UNIPILE_MOCK_MODE = 'false';

        const comments = await getAllPostComments('acc123', 'post456');

        expect(comments[0].text).toContain('🚀');
        expect(comments[0].text).toContain('SCALE');
      });

      it('should handle comments with special characters', async () => {
        const mockComments: UnipileComment[] = [
          {
            id: 'c1',
            text: 'Test & < > " \' comment',
            created_at: new Date().toISOString(),
            author: {
              id: 'a1',
              name: 'User',
              connections_count: 100,
            },
          },
        ];

        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({ items: mockComments }),
        };
        (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
        process.env.UNIPILE_MOCK_MODE = 'false';

        const comments = await getAllPostComments('acc123', 'post456');

        expect(comments[0].text).toContain('&');
        expect(comments[0].text).toContain('<');
      });
    });
  });
});
