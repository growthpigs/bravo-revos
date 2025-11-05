/**
 * F-01: AgentKit Campaign Orchestration Tests
 */

// Mock OpenAI BEFORE imports
const mockChatCompletions = {
  create: jest.fn(),
};

jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: mockChatCompletions,
      },
    })),
  };
});

import { CampaignAgent } from '@/lib/agentkit/client';
import { CampaignOrchestrator } from '@/lib/agentkit/orchestrator';

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
    })),
    auth: {
      getUser: jest.fn(),
    },
  })),
}));

describe('F-01: AgentKit Campaign Orchestration', () => {
  let agent: CampaignAgent;
  const mockCreate = mockChatCompletions.create as jest.Mock;

  beforeEach(() => {
    agent = new CampaignAgent();
    jest.clearAllMocks();
  });

  describe('CampaignAgent', () => {
    describe('analyzeAndSchedule', () => {
      it('should return engagement strategy for new post', async () => {
        mockCreate.mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  shouldSchedule: true,
                  timing: 'optimal',
                  engagementStrategy: {
                    likeWindow: [1, 30],
                    commentWindow: [30, 180],
                    memberSelection: 'all',
                  },
                  reasoning: 'Optimal timing for LinkedIn algorithm',
                }),
              },
            },
          ],
        });

        const result = await agent.analyzeAndSchedule({
          campaignId: 'campaign-123',
          postId: 'post-456',
          podId: 'pod-789',
          memberCount: 10,
        });

        expect(result.shouldSchedule).toBe(true);
        expect(result.timing).toBe('optimal');
        expect(result.engagementStrategy.likeWindow).toEqual([1, 30]);
        expect(result.engagementStrategy.memberSelection).toBe('all');
      });

      it('should handle past performance data', async () => {
        mockCreate.mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  shouldSchedule: true,
                  timing: 'delayed',
                  engagementStrategy: {
                    likeWindow: [5, 45],
                    commentWindow: [60, 240],
                    memberSelection: 'all',
                  },
                  reasoning: 'Past performance suggests delayed engagement works better',
                }),
              },
            },
          ],
        });

        const result = await agent.analyzeAndSchedule({
          campaignId: 'campaign-123',
          postId: 'post-456',
          podId: 'pod-789',
          memberCount: 10,
          pastPerformance: {
            avgComments: 15,
            avgLeads: 5,
            conversionRate: 0.33,
          },
        });

        expect(result.shouldSchedule).toBe(true);
        expect(result.timing).toBe('delayed');
        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            model: 'gpt-4o',
            response_format: { type: 'json_object' },
          })
        );
      });

      it('should recommend not scheduling if conditions are poor', async () => {
        mockCreate.mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  shouldSchedule: false,
                  timing: 'immediate',
                  engagementStrategy: {
                    likeWindow: [1, 30],
                    commentWindow: [30, 180],
                    memberSelection: 'all',
                  },
                  reasoning: 'Pod has insufficient members for effective engagement',
                }),
              },
            },
          ],
        });

        const result = await agent.analyzeAndSchedule({
          campaignId: 'campaign-123',
          postId: 'post-456',
          podId: 'pod-789',
          memberCount: 2, // Too few members
        });

        expect(result.shouldSchedule).toBe(false);
      });
    });

    describe('optimizeMessage', () => {
      it('should optimize message for engagement', async () => {
        mockCreate.mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  optimizedMessage:
                    'Saw your comment - excited to share the framework!',
                  confidence: 0.85,
                  variants: [
                    'Saw your comment - here comes the framework!',
                    'Thanks for commenting - framework incoming!',
                  ],
                  reasoning: 'More conversational tone increases reply rate',
                }),
              },
            },
          ],
        });

        const result = await agent.optimizeMessage({
          originalMessage: 'I saw your comment. Here is the framework.',
          goal: 'engagement',
        });

        expect(result.optimizedMessage).toContain('framework');
        expect(result.confidence).toBeGreaterThan(0.8);
        expect(result.variants).toHaveLength(2);
      });

      it('should optimize for different goals', async () => {
        // Test conversion goal
        mockCreate.mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  optimizedMessage:
                    'Ready to transform your leadership? Drop your email below!',
                  confidence: 0.9,
                  variants: [
                    'Transform your leadership - email me now!',
                    'Ready for change? Send your email!',
                  ],
                  reasoning: 'Direct CTA with value proposition maximizes conversion',
                }),
              },
            },
          ],
        });

        const result = await agent.optimizeMessage({
          originalMessage: 'Send me your email.',
          goal: 'conversion',
        });

        expect(result.optimizedMessage).toContain('email');
        expect(result.confidence).toBeGreaterThan(0.85);
      });
    });

    describe('analyzePerformance', () => {
      it('should provide campaign performance analysis', async () => {
        mockCreate.mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  overallScore: 75,
                  insights: [
                    'Trigger rate is above average (5.2% vs 3% benchmark)',
                    'DM reply rate could be improved with better copy',
                  ],
                  recommendations: [
                    'Test different trigger words to increase comment volume',
                    'Optimize DM copy using A/B testing',
                  ],
                  nextActions: [
                    {
                      action: 'A/B test new trigger words',
                      priority: 'high',
                      reason: 'Comments drive the entire funnel',
                    },
                    {
                      action: 'Review DM templates',
                      priority: 'medium',
                      reason: 'Reply rate is below benchmark',
                    },
                  ],
                }),
              },
            },
          ],
        });

        const result = await agent.analyzePerformance({
          campaignId: 'campaign-123',
          metrics: {
            posts: 10,
            impressions: 5000,
            comments: 50,
            triggerRate: 5.2,
            dmsDelivered: 45,
            leadsConverted: 30,
          },
          timeRange: '7d',
        });

        expect(result.overallScore).toBe(75);
        expect(result.insights).toHaveLength(2);
        expect(result.recommendations).toHaveLength(2);
        expect(result.nextActions).toHaveLength(2);
        expect(result.nextActions[0].priority).toBe('high');
      });
    });

    describe('generatePostContent', () => {
      it('should generate post with trigger word', async () => {
        mockCreate.mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  postText:
                    'After coaching 500+ CEOs, I discovered something shocking...\n\nComment SCALE below for my framework!',
                  hashtags: ['#Leadership', '#Scaling', '#CEO'],
                  bestPostingTime: 'Tuesday 10am EST',
                  expectedEngagement: 'high',
                  reasoning: 'Hook creates curiosity, clear CTA with trigger word',
                }),
              },
            },
          ],
        });

        const result = await agent.generatePostContent({
          topic: 'Leadership scaling challenges',
          triggerWord: 'SCALE',
          leadMagnetName: '10x Leadership Framework',
        });

        expect(result.postText).toContain('SCALE');
        expect(result.hashtags).toHaveLength(3);
        expect(result.expectedEngagement).toBe('high');
      });
    });
  });

  describe('CampaignOrchestrator Integration', () => {
    let orchestrator: CampaignOrchestrator;

    beforeEach(() => {
      orchestrator = new CampaignOrchestrator();
    });

    it('should orchestrate post engagement end-to-end', async () => {
      // This would be an integration test that mocks the full flow
      // For now, just test the structure
      expect(orchestrator).toBeDefined();
      expect(typeof orchestrator.orchestratePostEngagement).toBe('function');
      expect(typeof orchestrator.optimizeCampaignMessage).toBe('function');
      expect(typeof orchestrator.analyzeCampaignPerformance).toBe('function');
      expect(typeof orchestrator.generatePostContent).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle OpenAI API errors gracefully', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API rate limit exceeded'));

      await expect(
        agent.analyzeAndSchedule({
          campaignId: 'campaign-123',
          postId: 'post-456',
          podId: 'pod-789',
          memberCount: 10,
        })
      ).rejects.toThrow('API rate limit exceeded');
    });

    it('should handle invalid JSON responses', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'Invalid JSON response',
            },
          },
        ],
      });

      await expect(
        agent.analyzeAndSchedule({
          campaignId: 'campaign-123',
          postId: 'post-456',
          podId: 'pod-789',
          memberCount: 10,
        })
      ).rejects.toThrow();
    });
  });
});
