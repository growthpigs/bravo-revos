/**
 * Comment Polling API Tests
 * Integration tests for API endpoints
 */

import { NextRequest } from 'next/server';

// Mock the queue module
jest.mock('../lib/queue/comment-polling-queue', () => ({
  startCommentPolling: jest.fn().mockResolvedValue(undefined),
  stopCommentPolling: jest.fn().mockResolvedValue(undefined),
  getQueueStatus: jest.fn().mockResolvedValue({
    waiting: 5,
    active: 2,
    delayed: 10,
    completed: 100,
    failed: 3,
    total: 17,
  }),
}));

import { POST, GET } from '../app/api/comment-polling/route';
import {
  startCommentPolling,
  stopCommentPolling,
  getQueueStatus,
} from '../lib/queue/comment-polling-queue';

describe('Comment Polling API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/comment-polling', () => {
    describe('Start Action', () => {
      it('should start comment polling with valid data', async () => {
        const requestBody = {
          action: 'start',
          accountId: 'acc123',
          postId: 'post456',
          triggerWords: ['SCALE', 'automation'],
          campaignId: 'campaign789',
          userId: 'user123',
        };

        const request = new NextRequest('http://localhost:3000/api/comment-polling', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.status).toBe('success');
        expect(data.message).toBe('Comment polling started');
        expect(data.campaignId).toBe('campaign789');
        expect(startCommentPolling).toHaveBeenCalledWith(
          expect.objectContaining({
            accountId: 'acc123',
            postId: 'post456',
            triggerWords: ['SCALE', 'automation'],
            campaignId: 'campaign789',
            userId: 'user123',
          })
        );
      });

      it('should start comment polling with timezone', async () => {
        const requestBody = {
          action: 'start',
          accountId: 'acc123',
          postId: 'post456',
          triggerWords: ['SCALE'],
          campaignId: 'campaign789',
          userId: 'user123',
          timezone: 'America/New_York',
        };

        const request = new NextRequest('http://localhost:3000/api/comment-polling', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        });

        const response = await POST(request);

        expect(response.status).toBe(200);
        expect(startCommentPolling).toHaveBeenCalledWith(
          expect.objectContaining({
            timezone: 'America/New_York',
          })
        );
      });

      it('should return 400 for missing accountId', async () => {
        const requestBody = {
          action: 'start',
          postId: 'post456',
          triggerWords: ['SCALE'],
          campaignId: 'campaign789',
          userId: 'user123',
        };

        const request = new NextRequest('http://localhost:3000/api/comment-polling', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Missing required fields');
      });

      it('should return 400 for missing postId', async () => {
        const requestBody = {
          action: 'start',
          accountId: 'acc123',
          triggerWords: ['SCALE'],
          campaignId: 'campaign789',
          userId: 'user123',
        };

        const request = new NextRequest('http://localhost:3000/api/comment-polling', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Missing required fields');
      });

      it('should return 400 for missing triggerWords', async () => {
        const requestBody = {
          action: 'start',
          accountId: 'acc123',
          postId: 'post456',
          campaignId: 'campaign789',
          userId: 'user123',
        };

        const request = new NextRequest('http://localhost:3000/api/comment-polling', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Missing required fields');
      });

      it('should return 400 for missing campaignId', async () => {
        const requestBody = {
          action: 'start',
          accountId: 'acc123',
          postId: 'post456',
          triggerWords: ['SCALE'],
          userId: 'user123',
        };

        const request = new NextRequest('http://localhost:3000/api/comment-polling', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Missing required fields');
      });

      it('should return 400 for missing userId', async () => {
        const requestBody = {
          action: 'start',
          accountId: 'acc123',
          postId: 'post456',
          triggerWords: ['SCALE'],
          campaignId: 'campaign789',
        };

        const request = new NextRequest('http://localhost:3000/api/comment-polling', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Missing required fields');
      });

      it('should handle empty trigger words array', async () => {
        const requestBody = {
          action: 'start',
          accountId: 'acc123',
          postId: 'post456',
          triggerWords: [],
          campaignId: 'campaign789',
          userId: 'user123',
        };

        const request = new NextRequest('http://localhost:3000/api/comment-polling', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        });

        const response = await POST(request);

        // Should succeed even with empty array
        expect(response.status).toBe(200);
        expect(startCommentPolling).toHaveBeenCalledWith(
          expect.objectContaining({
            triggerWords: [],
          })
        );
      });

      it('should return 500 if startCommentPolling throws error', async () => {
        (startCommentPolling as jest.Mock).mockRejectedValue(new Error('Queue error'));

        const requestBody = {
          action: 'start',
          accountId: 'acc123',
          postId: 'post456',
          triggerWords: ['SCALE'],
          campaignId: 'campaign789',
          userId: 'user123',
        };

        const request = new NextRequest('http://localhost:3000/api/comment-polling', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Queue error');
      });
    });

    describe('Stop Action', () => {
      it('should stop comment polling with valid campaignId', async () => {
        const requestBody = {
          action: 'stop',
          campaignId: 'campaign789',
        };

        const request = new NextRequest('http://localhost:3000/api/comment-polling', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.status).toBe('success');
        expect(data.message).toBe('Comment polling stopped');
        expect(data.campaignId).toBe('campaign789');
        expect(stopCommentPolling).toHaveBeenCalledWith('campaign789');
      });

      it('should return 400 for missing campaignId', async () => {
        const requestBody = {
          action: 'stop',
        };

        const request = new NextRequest('http://localhost:3000/api/comment-polling', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Missing campaignId');
      });

      it('should return 500 if stopCommentPolling throws error', async () => {
        (stopCommentPolling as jest.Mock).mockRejectedValue(new Error('Queue error'));

        const requestBody = {
          action: 'stop',
          campaignId: 'campaign789',
        };

        const request = new NextRequest('http://localhost:3000/api/comment-polling', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Queue error');
      });
    });

    describe('Invalid Action', () => {
      it('should return 400 for invalid action', async () => {
        const requestBody = {
          action: 'invalid',
          campaignId: 'campaign789',
        };

        const request = new NextRequest('http://localhost:3000/api/comment-polling', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid action. Use "start" or "stop"');
      });

      it('should return 400 for missing action', async () => {
        const requestBody = {
          campaignId: 'campaign789',
        };

        const request = new NextRequest('http://localhost:3000/api/comment-polling', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid action. Use "start" or "stop"');
      });
    });
  });

  describe('GET /api/comment-polling', () => {
    it('should return queue status', async () => {
      const request = new NextRequest('http://localhost:3000/api/comment-polling', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
      expect(data.queue).toEqual({
        waiting: 5,
        active: 2,
        delayed: 10,
        completed: 100,
        failed: 3,
        total: 17,
      });
      expect(getQueueStatus).toHaveBeenCalled();
    });

    it('should return 500 if getQueueStatus throws error', async () => {
      (getQueueStatus as jest.Mock).mockRejectedValue(new Error('Redis connection failed'));

      const request = new NextRequest('http://localhost:3000/api/comment-polling', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Redis connection failed');
    });
  });
});
