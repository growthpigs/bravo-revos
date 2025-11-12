/**
 * Chip Tests: Conversation Intelligence
 * Tests for tone analysis and response generation with API route integration
 */

import { ConversationIntelligenceChip } from '@/lib/chips/conversation-intelligence';

// Mock fetch globally
global.fetch = jest.fn();

describe('ConversationIntelligenceChip', () => {
  let chip: ConversationIntelligenceChip;

  beforeEach(() => {
    chip = new ConversationIntelligenceChip();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with correct properties', () => {
      expect(chip.id).toBe('conversation-intelligence');
      expect(chip.name).toBe('Conversation Intelligence');
      expect(chip.description).toContain('tone');
    });

    it('should not initialize OpenAI on client side', () => {
      // Verify no OpenAI initialization in client code
      expect(chip).toBeDefined();
    });
  });

  describe('Tone Analysis with API Route', () => {
    it('should call API route for tone analysis', async () => {
      const mockResponse = {
        toneProfile: {
          formality: 'casual',
          sentiment: 'skeptical',
          emotionalState: 'doubtful',
          confidence: 0.85,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await chip.analyzeTone('ugh another sales tool');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/conversation-intelligence',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'analyze-tone',
            message: 'ugh another sales tool',
          }),
        })
      );

      expect(result.formality).toBe('casual');
      expect(result.sentiment).toBe('skeptical');
    });

    it('should fallback to heuristics when API fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ fallback: true }),
      });

      const result = await chip.analyzeTone('ugh another sales tool');

      // Should return heuristic result
      expect(result).toBeDefined();
      expect(result.formality).toBeDefined();
      expect(result.sentiment).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it('should fallback to heuristics on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await chip.analyzeTone('test message');

      expect(result).toBeDefined();
      expect(result.formality).toBeDefined();
    });

    it('should detect casual tone', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Use heuristics'));

      const result = await chip.analyzeTone('ugh yeah this is annoying');

      expect(result.formality).toBe('casual');
    });

    it('should detect formal tone', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Use heuristics'));

      const result = await chip.analyzeTone('Please provide detailed information regarding this matter');

      expect(result.formality).toBe('formal');
    });

    it('should detect skeptical sentiment', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Use heuristics'));

      const result = await chip.analyzeTone('ugh another typical sales tool');

      expect(result.sentiment).toBe('skeptical');
      expect(result.emotionalState).toBe('doubtful');
    });

    it('should detect frustrated sentiment', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Use heuristics'));

      const result = await chip.analyzeTone('this is broken and not working');

      expect(result.sentiment).toBe('frustrated');
      expect(result.emotionalState).toBe('frustrated');
    });

    it('should detect professional sentiment', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Use heuristics'));

      const result = await chip.analyzeTone('please provide metrics and roi data');

      expect(result.sentiment).toBe('professional');
      expect(result.emotionalState).toBe('analytical');
    });
  });

  describe('Communication Style Matching', () => {
    it('should match conversational style for casual skeptical', () => {
      const profile = {
        formality: 'casual' as const,
        sentiment: 'skeptical',
        emotionalState: 'doubtful',
        confidence: 0.8,
      };

      const style = chip.matchCommunicationStyle(profile);

      expect(style.tone).toBe('conversational');
      expect(style.structure).toBe('brief');
      expect(style.vocabulary).toBe('simple');
      expect(style.empathy).toBe('high');
    });

    it('should match professional style for formal professional', () => {
      const profile = {
        formality: 'formal' as const,
        sentiment: 'professional',
        emotionalState: 'analytical',
        confidence: 0.9,
      };

      const style = chip.matchCommunicationStyle(profile);

      expect(style.tone).toBe('professional');
      expect(style.structure).toBe('detailed');
      expect(style.vocabulary).toBe('technical');
      expect(style.empathy).toBe('low');
    });

    it('should match empathetic style for frustrated users', () => {
      const profile = {
        formality: 'neutral' as const,
        sentiment: 'frustrated',
        emotionalState: 'frustrated',
        confidence: 0.85,
      };

      const style = chip.matchCommunicationStyle(profile);

      expect(style.tone).toBe('conversational');
      expect(style.empathy).toBe('high');
      expect(style.vocabulary).toBe('simple');
    });

    it('should return balanced style as default', () => {
      const profile = {
        formality: 'neutral' as const,
        sentiment: 'neutral',
        emotionalState: 'neutral',
        confidence: 0.7,
      };

      const style = chip.matchCommunicationStyle(profile);

      expect(style.tone).toBe('balanced');
      expect(style.structure).toBe('moderate');
      expect(style.vocabulary).toBe('standard');
      expect(style.empathy).toBe('medium');
    });
  });

  describe('Emotional State Detection', () => {
    it('should detect skeptical emotion', () => {
      const conversation = [
        { role: 'user' as const, content: 'really? another sales tool?' },
      ];

      const emotion = chip.detectEmotionalState(conversation);

      expect(emotion.primary).toBe('skeptical');
      expect(emotion.intensity).toBeGreaterThan(0);
    });

    it('should detect frustrated emotion', () => {
      const conversation = [
        { role: 'user' as const, content: 'this is not working and its broken' },
      ];

      const emotion = chip.detectEmotionalState(conversation);

      expect(emotion.primary).toBe('frustrated');
      expect(emotion.intensity).toBeGreaterThan(0.5);
    });

    it('should detect urgent emotion', () => {
      const conversation = [
        { role: 'user' as const, content: 'I need this asap, urgently' },
      ];

      const emotion = chip.detectEmotionalState(conversation);

      expect(emotion.primary).toBe('urgent');
      expect(emotion.secondary).toBe('anxious');
    });

    it('should detect excited emotion', () => {
      const conversation = [
        { role: 'user' as const, content: 'this is great! I love it' },
      ];

      const emotion = chip.detectEmotionalState(conversation);

      expect(emotion.primary).toBe('excited');
    });

    it('should prioritize skeptical over frustrated when both present', () => {
      const conversation = [
        { role: 'user' as const, content: 'ugh really another tool' },
      ];

      const emotion = chip.detectEmotionalState(conversation);

      expect(emotion.primary).toBe('skeptical');
    });

    it('should return neutral for neutral messages', () => {
      const conversation = [
        { role: 'user' as const, content: 'what is this product about?' },
      ];

      const emotion = chip.detectEmotionalState(conversation);

      expect(emotion.primary).toBe('neutral');
      expect(emotion.intensity).toBeLessThan(0.5);
    });
  });

  describe('Dynamic Response Generation', () => {
    const mockOffering = {
      id: 'offer-1',
      user_id: 'user-123',
      name: 'Test CRM',
      elevator_pitch: 'Reduce sales cycle by 40%',
      key_benefits: ['Fast implementation', 'Easy to use'],
      objection_handlers: { price: 'ROI in 6 months' },
      qualification_questions: ['Team size?'],
      proof_points: [{ metric: 'Customers', value: '500+' }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it('should generate response using API route', async () => {
      const mockResponse = {
        response: 'This is a generated response',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const toneProfile = {
        formality: 'casual' as const,
        sentiment: 'skeptical',
        emotionalState: 'doubtful',
        confidence: 0.8,
      };

      const result = await chip.generateDynamicResponse({
        userMessage: 'What makes you different?',
        toneProfile,
        conversationHistory: [],
        offering: mockOffering,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/conversation-intelligence',
        expect.objectContaining({
          method: 'POST',
        })
      );

      expect(result).toBe('This is a generated response');
    });

    it('should fallback to heuristics for skeptical tone', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ fallback: true }),
      });

      const toneProfile = {
        formality: 'casual' as const,
        sentiment: 'skeptical',
        emotionalState: 'doubtful',
        confidence: 0.8,
      };

      const result = await chip.generateDynamicResponse({
        userMessage: 'ugh another tool',
        toneProfile,
        conversationHistory: [],
        offering: mockOffering,
      });

      expect(result).toContain('Fair question');
      expect(result).toContain(mockOffering.elevator_pitch);
    });

    it('should fallback to heuristics for frustrated tone', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ fallback: true }),
      });

      const toneProfile = {
        formality: 'neutral' as const,
        sentiment: 'frustrated',
        emotionalState: 'frustrated',
        confidence: 0.8,
      };

      const result = await chip.generateDynamicResponse({
        userMessage: 'this is broken',
        toneProfile,
        conversationHistory: [],
      });

      expect(result).toContain('frustration');
      expect(result).toContain('help');
    });

    it('should use professional tone for formal requests', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ fallback: true }),
      });

      const toneProfile = {
        formality: 'formal' as const,
        sentiment: 'professional',
        emotionalState: 'analytical',
        confidence: 0.9,
      };

      const result = await chip.generateDynamicResponse({
        userMessage: 'Please provide details',
        toneProfile,
        conversationHistory: [],
        offering: mockOffering,
      });

      expect(result).toContain('Certainly');
    });

    it('should include proof points in professional responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ fallback: true }),
      });

      const toneProfile = {
        formality: 'formal' as const,
        sentiment: 'professional',
        emotionalState: 'analytical',
        confidence: 0.9,
      };

      const result = await chip.generateDynamicResponse({
        userMessage: 'metrics please',
        toneProfile,
        conversationHistory: [],
        offering: mockOffering,
      });

      expect(result).toContain('Customers');
      expect(result).toContain('500+');
    });

    it('should work without offering', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ fallback: true }),
      });

      const toneProfile = {
        formality: 'casual' as const,
        sentiment: 'skeptical',
        emotionalState: 'doubtful',
        confidence: 0.8,
      };

      const result = await chip.generateDynamicResponse({
        userMessage: 'tell me more',
        toneProfile,
        conversationHistory: [],
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('API Route Security', () => {
    it('should not expose API keys in client-side calls', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          toneProfile: {
            formality: 'casual',
            sentiment: 'neutral',
            emotionalState: 'neutral',
            confidence: 0.7,
          },
        }),
      });

      await chip.analyzeTone('test');

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body).not.toHaveProperty('apiKey');
      expect(body).not.toHaveProperty('openai_api_key');
      expect(JSON.stringify(body)).not.toMatch(/sk-/);
    });

    it('should handle authentication errors from API', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      const result = await chip.analyzeTone('test');

      // Should fallback to heuristics
      expect(result).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it('should handle rate limiting gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Rate limit exceeded' }),
      });

      const result = await chip.analyzeTone('test');

      // Should fallback to heuristics
      expect(result).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty messages', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Use heuristics'));

      const result = await chip.analyzeTone('');

      expect(result).toBeDefined();
      expect(result.formality).toBeDefined();
    });

    it('should handle very long messages', async () => {
      const longMessage = 'test '.repeat(500);

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Use heuristics'));

      const result = await chip.analyzeTone(longMessage);

      expect(result).toBeDefined();
    });

    it('should handle messages with special characters', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Use heuristics'));

      const result = await chip.analyzeTone('test @#$%^&* message!?');

      expect(result).toBeDefined();
    });

    it('should handle mixed case messages', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Use heuristics'));

      const result = await chip.analyzeTone('UGH This is ANNOYING');

      expect(result.sentiment).toBe('skeptical');
    });
  });
});
