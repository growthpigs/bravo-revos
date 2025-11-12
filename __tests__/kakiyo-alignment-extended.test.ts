/**
 * Kakiyo Alignment Extended Tests
 * Additional comprehensive tests for edge cases, error handling, and IntelligentResponseTool
 */

import { OfferingsChip } from '@/lib/chips/offerings';
import { ConversationIntelligenceChip } from '@/lib/chips/conversation-intelligence';
import { IntelligentResponseTool } from '@/lib/chips/intelligent-response-tool';

describe('OfferingsChip - Edge Cases & Error Handling', () => {
  let chip: OfferingsChip;

  beforeEach(() => {
    chip = new OfferingsChip();
  });

  describe('Invalid Actions', () => {
    it('should handle unknown action gracefully', async () => {
      const result = await chip.execute({
        action: 'invalid' as any,
        userId: 'user-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });
  });

  describe('Missing Required Parameters', () => {
    it('should handle missing offeringId for get action', async () => {
      const result = await chip.execute({
        action: 'get',
        userId: 'user-1',
        offeringId: 'non-existent-id',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Offering not found');
    });

    it('should handle missing offeringId for update action', async () => {
      const result = await chip.execute({
        action: 'update',
        userId: 'user-1',
        offeringId: 'non-existent-id',
        data: { name: 'Updated' },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Offering not found');
    });

    it('should handle missing offeringId for delete action', async () => {
      const result = await chip.execute({
        action: 'delete',
        userId: 'user-1',
        offeringId: 'non-existent-id',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Offering not found');
    });
  });

  describe('Authorization Edge Cases', () => {
    it('should prevent user from updating another user\'s offering', async () => {
      // Create with user-1
      const createResult = await chip.execute({
        action: 'create',
        userId: 'user-1',
        data: {
          name: 'Protected Offering',
          elevator_pitch: 'Private data',
        },
      });

      const offeringId = createResult.offering!.id;

      // Try to update with user-2
      const updateResult = await chip.execute({
        action: 'update',
        userId: 'user-2',
        offeringId,
        data: { name: 'Hacked Name' },
      });

      expect(updateResult.success).toBe(false);
      expect(updateResult.error).toBe('Unauthorized');
    });

    it('should prevent user from deleting another user\'s offering', async () => {
      // Create with user-1
      const createResult = await chip.execute({
        action: 'create',
        userId: 'user-1',
        data: {
          name: 'Protected Offering',
          elevator_pitch: 'Private data',
        },
      });

      const offeringId = createResult.offering!.id;

      // Try to delete with user-2
      const deleteResult = await chip.execute({
        action: 'delete',
        userId: 'user-2',
        offeringId,
      });

      expect(deleteResult.success).toBe(false);
      expect(deleteResult.error).toBe('Unauthorized');
    });
  });

  describe('getOfferingByName', () => {
    it('should find offering by exact name match', async () => {
      await chip.execute({
        action: 'create',
        userId: 'user-1',
        data: {
          name: 'Unique Product Name',
          elevator_pitch: 'Find me!',
        },
      });

      const offering = await chip.getOfferingByName('user-1', 'Unique Product Name');

      expect(offering).toBeDefined();
      expect(offering!.name).toBe('Unique Product Name');
    });

    it('should find offering by partial name match (case insensitive)', async () => {
      await chip.execute({
        action: 'create',
        userId: 'user-1',
        data: {
          name: 'Amazing CRM Software',
          elevator_pitch: 'Best CRM',
        },
      });

      const offering = await chip.getOfferingByName('user-1', 'crm');

      expect(offering).toBeDefined();
      expect(offering!.name).toContain('CRM');
    });

    it('should return null for non-existent offering name', async () => {
      const offering = await chip.getOfferingByName('user-1', 'Non-Existent Product');

      expect(offering).toBeNull();
    });

    it('should only return offerings for the specified user', async () => {
      // Create offering for user-1
      await chip.execute({
        action: 'create',
        userId: 'user-1',
        data: {
          name: 'User 1 Product',
          elevator_pitch: 'Only for user 1',
        },
      });

      // Try to find with user-2
      const offering = await chip.getOfferingByName('user-2', 'User 1 Product');

      expect(offering).toBeNull();
    });
  });

  describe('Data Validation', () => {
    it('should create offering with minimal required fields', async () => {
      const result = await chip.execute({
        action: 'create',
        userId: 'user-1',
        data: {
          name: 'Minimal Offering',
          elevator_pitch: 'Simple pitch',
        },
      });

      expect(result.success).toBe(true);
      expect(result.offering!.key_benefits).toEqual([]);
      expect(result.offering!.objection_handlers).toEqual({});
      expect(result.offering!.qualification_questions).toEqual([]);
      expect(result.offering!.proof_points).toEqual([]);
    });

    it('should create offering with all optional fields populated', async () => {
      const result = await chip.execute({
        action: 'create',
        userId: 'user-1',
        data: {
          name: 'Complete Offering',
          elevator_pitch: 'Full pitch',
          key_benefits: ['Benefit 1', 'Benefit 2', 'Benefit 3'],
          objection_handlers: {
            'price': 'ROI justification',
            'complexity': 'Simple onboarding',
          },
          qualification_questions: ['Budget?', 'Timeline?'],
          proof_points: [
            { metric: 'Revenue', value: '+150%' },
            { metric: 'Satisfaction', value: '98%' },
          ],
        },
      });

      expect(result.success).toBe(true);
      expect(result.offering!.key_benefits.length).toBe(3);
      expect(Object.keys(result.offering!.objection_handlers).length).toBe(2);
      expect(result.offering!.qualification_questions.length).toBe(2);
      expect(result.offering!.proof_points.length).toBe(2);
    });

    it('should preserve timestamps on update', async () => {
      const createResult = await chip.execute({
        action: 'create',
        userId: 'user-1',
        data: {
          name: 'Original',
          elevator_pitch: 'Original pitch',
        },
      });

      const originalCreatedAt = createResult.offering!.created_at;
      const offeringId = createResult.offering!.id;

      // Wait a tiny bit to ensure timestamps would differ
      await new Promise(resolve => setTimeout(resolve, 10));

      const updateResult = await chip.execute({
        action: 'update',
        userId: 'user-1',
        offeringId,
        data: { name: 'Updated' },
      });

      expect(updateResult.offering!.created_at).toBe(originalCreatedAt);
      expect(updateResult.offering!.updated_at).not.toBe(originalCreatedAt);
    });
  });

  describe('Mock Data Validation', () => {
    it('should have valid mock data structure', async () => {
      const result = await chip.execute({
        action: 'list',
        userId: 'user-1',
      });

      const mockOffering = result.offerings![0];

      expect(mockOffering).toHaveProperty('id');
      expect(mockOffering).toHaveProperty('user_id');
      expect(mockOffering).toHaveProperty('name');
      expect(mockOffering).toHaveProperty('elevator_pitch');
      expect(mockOffering).toHaveProperty('key_benefits');
      expect(mockOffering).toHaveProperty('objection_handlers');
      expect(mockOffering).toHaveProperty('qualification_questions');
      expect(mockOffering).toHaveProperty('proof_points');
      expect(mockOffering).toHaveProperty('created_at');
      expect(mockOffering).toHaveProperty('updated_at');
    });
  });
});

describe('ConversationIntelligenceChip - Edge Cases', () => {
  let chip: ConversationIntelligenceChip;

  beforeEach(() => {
    chip = new ConversationIntelligenceChip();
  });

  describe('Heuristic Fallback Behavior', () => {
    it('should use heuristic analysis in test environment', async () => {
      const message = 'ugh another tool';
      const profile = await chip.analyzeTone(message);

      // Should use heuristics (confidence = 0.75)
      expect(profile.confidence).toBe(0.75);
      expect(profile.formality).toBe('casual');
      expect(profile.sentiment).toBe('skeptical');
    });

    it('should detect neutral tone for generic message', async () => {
      const message = 'Hello, I would like some information.';
      const profile = await chip.analyzeTone(message);

      expect(profile.formality).toBe('neutral');
      expect(profile.sentiment).toBe('neutral');
    });

    it('should detect excited sentiment', async () => {
      const message = 'This is great! I love this amazing product!';
      const profile = await chip.analyzeTone(message);

      expect(profile.sentiment).toBe('excited');
      expect(profile.emotionalState).toBe('eager');
    });

    it('should detect urgent emotional state', () => {
      const conversation = [
        { role: 'user' as const, content: 'I need this ASAP!' },
        { role: 'assistant' as const, content: 'I understand' },
        { role: 'user' as const, content: 'This is urgent, quickly please!' },
      ];

      const emotion = chip.detectEmotionalState(conversation);

      expect(emotion.primary).toBe('urgent');
      expect(emotion.secondary).toBe('anxious');
      expect(emotion.intensity).toBeGreaterThan(0.5);
    });

    it('should detect excited emotional state', () => {
      const conversation = [
        { role: 'user' as const, content: 'This is amazing!' },
        { role: 'assistant' as const, content: 'Glad you like it' },
        { role: 'user' as const, content: 'I love it, this is perfect!' },
      ];

      const emotion = chip.detectEmotionalState(conversation);

      expect(emotion.primary).toBe('excited');
      expect(emotion.intensity).toBeGreaterThan(0.5);
    });
  });

  describe('Communication Style Matching', () => {
    it('should match balanced style for neutral tone', () => {
      const profile = {
        formality: 'neutral' as const,
        sentiment: 'neutral',
        emotionalState: 'neutral',
        confidence: 0.8,
      };

      const style = chip.matchCommunicationStyle(profile);

      expect(style.tone).toBe('balanced');
      expect(style.structure).toBe('moderate');
      expect(style.vocabulary).toBe('standard');
      expect(style.empathy).toBe('medium');
    });

    it('should match high empathy style for frustrated user', () => {
      const profile = {
        formality: 'neutral' as const,
        sentiment: 'frustrated',
        emotionalState: 'frustrated',
        confidence: 0.9,
      };

      const style = chip.matchCommunicationStyle(profile);

      expect(style.empathy).toBe('high');
      expect(style.tone).toBe('conversational');
    });
  });

  describe('Response Generation Edge Cases', () => {
    it('should generate response without offering context', async () => {
      const context = {
        userMessage: 'Tell me more',
        toneProfile: {
          formality: 'casual' as const,
          sentiment: 'neutral',
          emotionalState: 'curious',
          confidence: 0.8,
        },
        conversationHistory: [],
      };

      const response = await chip.generateDynamicResponse(context);

      expect(response).toBeTruthy();
      expect(response.length).toBeGreaterThan(10);
    });

    it('should handle empty conversation history with offering', async () => {
      const offering = {
        id: 'test-1',
        user_id: 'user-1',
        name: 'Test Product',
        elevator_pitch: 'Great product',
        key_benefits: ['Benefit 1'],
        objection_handlers: {},
        qualification_questions: [],
        proof_points: [],
      };

      const context = {
        userMessage: 'What is this?',
        toneProfile: {
          formality: 'casual' as const,
          sentiment: 'neutral',
          emotionalState: 'curious',
          confidence: 0.8,
        },
        conversationHistory: [],
        offering,
      };

      const response = await chip.generateDynamicResponse(context);

      expect(response).toBeTruthy();
      // Response should contain offering context
      expect(response.toLowerCase()).toMatch(/product|great|benefit/);
    });

    it('should generate professional response with proof points', async () => {
      const offering = {
        id: 'test-1',
        user_id: 'user-1',
        name: 'Enterprise CRM',
        elevator_pitch: 'Best CRM for enterprises',
        key_benefits: ['Scalable', 'Secure'],
        objection_handlers: {},
        qualification_questions: [],
        proof_points: [
          { metric: 'Efficiency', value: '+200%' },
        ],
      };

      const context = {
        userMessage: 'Please provide detailed metrics',
        toneProfile: {
          formality: 'formal' as const,
          sentiment: 'professional',
          emotionalState: 'analytical',
          confidence: 0.9,
        },
        conversationHistory: [],
        offering,
      };

      const response = await chip.generateDynamicResponse(context);

      expect(response).toBeTruthy();
      expect(response.toLowerCase()).toMatch(/enterprise crm|crm/);
    });
  });
});

describe('IntelligentResponseTool', () => {
  let tool: IntelligentResponseTool;

  beforeEach(() => {
    tool = new IntelligentResponseTool();
  });

  describe('AgentKit Integration', () => {
    it('should have correct tool definition', () => {
      const toolDef = tool.getTool();

      expect(toolDef.type).toBe('function');
      expect(toolDef.function.name).toBe('intelligent-response');
      expect(toolDef.function.description).toBeTruthy();
      expect(toolDef.function.parameters.required).toContain('userId');
      expect(toolDef.function.parameters.required).toContain('userMessage');
    });

    it('should define optional parameters correctly', () => {
      const toolDef = tool.getTool();

      expect(toolDef.function.parameters.properties).toHaveProperty('offeringName');
      expect(toolDef.function.parameters.properties).toHaveProperty('conversationHistory');
    });
  });

  describe('Response Generation with Offerings', () => {
    it('should generate response using user\'s first offering', async () => {
      const result = await tool.execute({
        userId: 'user-1',
        userMessage: 'Tell me about your product',
      });

      expect(result.success).toBe(true);
      expect(result.response).toBeTruthy();
      expect(result.toneAnalysis).toBeDefined();
      expect(result.offeringUsed).toBeTruthy();
    });

    it('should find specific offering by name', async () => {
      const result = await tool.execute({
        userId: 'user-1',
        userMessage: 'Tell me about the CRM',
        offeringName: 'Enterprise CRM',
      });

      expect(result.success).toBe(true);
      expect(result.response).toBeTruthy();
      expect(result.offeringUsed).toContain('CRM');
    });

    it('should include tone analysis in result', async () => {
      const result = await tool.execute({
        userId: 'user-1',
        userMessage: 'ugh what is this?',
      });

      expect(result.success).toBe(true);
      expect(result.toneAnalysis).toBeDefined();
      expect(result.toneAnalysis!.formality).toBe('casual');
      expect(result.toneAnalysis!.sentiment).toBe('skeptical');
      expect(result.toneAnalysis!.emotionalState).toBe('doubtful');
    });

    it('should adapt response to formal professional tone', async () => {
      const result = await tool.execute({
        userId: 'user-1',
        userMessage: 'Please provide detailed information regarding this solution',
      });

      expect(result.success).toBe(true);
      expect(result.toneAnalysis!.formality).toBe('formal');
      expect(result.toneAnalysis!.sentiment).toBe('professional');
    });

    it('should adapt response to frustrated tone', async () => {
      const result = await tool.execute({
        userId: 'user-1',
        userMessage: 'This is not working! I need help now.',
      });

      expect(result.success).toBe(true);
      expect(result.toneAnalysis!.sentiment).toBe('frustrated');
      expect(result.response).toBeTruthy();
    });
  });

  describe('Response Generation without Offerings', () => {
    it('should generate response when user has no offerings', async () => {
      const result = await tool.execute({
        userId: 'user-with-no-offerings',
        userMessage: 'What can you help me with?',
      });

      expect(result.success).toBe(true);
      expect(result.response).toBeTruthy();
      expect(result.toneAnalysis).toBeDefined();
      expect(result.offeringUsed).toBeUndefined();
    });

    it('should still analyze tone without offerings', async () => {
      const result = await tool.execute({
        userId: 'user-with-no-offerings',
        userMessage: 'ugh another bot',
      });

      expect(result.success).toBe(true);
      expect(result.toneAnalysis!.formality).toBe('casual');
      expect(result.toneAnalysis!.sentiment).toBe('skeptical');
    });
  });

  describe('Conversation History', () => {
    it('should use conversation history for context', async () => {
      const result = await tool.execute({
        userId: 'user-1',
        userMessage: 'Tell me more',
        conversationHistory: [
          { role: 'user', content: 'What is your product?' },
          { role: 'assistant', content: 'It\'s a CRM solution' },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.response).toBeTruthy();
    });

    it('should work with empty conversation history', async () => {
      const result = await tool.execute({
        userId: 'user-1',
        userMessage: 'Hello',
        conversationHistory: [],
      });

      expect(result.success).toBe(true);
      expect(result.response).toBeTruthy();
    });

    it('should work without conversation history parameter', async () => {
      const result = await tool.execute({
        userId: 'user-1',
        userMessage: 'Hello',
      });

      expect(result.success).toBe(true);
      expect(result.response).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle empty message gracefully', async () => {
      const result = await tool.execute({
        userId: 'user-1',
        userMessage: '',
      });

      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
      expect(result.response).toBeTruthy();
    });
  });

  describe('Integration: Full Workflow', () => {
    it('should complete full workflow: skeptical user with specific offering', async () => {
      const result = await tool.execute({
        userId: 'user-1',
        userMessage: 'ugh another sales tool... what makes you different?',
        offeringName: 'Enterprise CRM',
        conversationHistory: [],
      });

      expect(result.success).toBe(true);
      expect(result.response).toBeTruthy();
      expect(result.toneAnalysis!.formality).toBe('casual');
      expect(result.toneAnalysis!.sentiment).toBe('skeptical');
      expect(result.offeringUsed).toContain('CRM');
      expect(result.response!.toLowerCase()).toContain('fair');
    });

    it('should complete full workflow: professional user requesting details', async () => {
      const result = await tool.execute({
        userId: 'user-1',
        userMessage: 'Please provide detailed ROI metrics and case studies',
        conversationHistory: [
          { role: 'user', content: 'I am evaluating CRM solutions' },
          { role: 'assistant', content: 'I can help with that' },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.response).toBeTruthy();
      expect(result.toneAnalysis!.formality).toBe('formal');
      expect(result.toneAnalysis!.sentiment).toBe('professional');
      expect(result.offeringUsed).toBeTruthy();
    });

    it('should complete full workflow: frustrated user needing support', async () => {
      const result = await tool.execute({
        userId: 'user-1',
        userMessage: 'This is not working! I need help immediately!',
        conversationHistory: [
          { role: 'user', content: 'I tried the setup' },
          { role: 'assistant', content: 'Let me help' },
          { role: 'user', content: 'But it failed!' },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.response).toBeTruthy();
      expect(result.toneAnalysis!.sentiment).toBe('frustrated');
      expect(result.response!.toLowerCase()).toMatch(/understand|frustration|help/);
    });
  });
});

describe('Mock Data Quality', () => {
  let offeringsChip: OfferingsChip;

  beforeEach(() => {
    offeringsChip = new OfferingsChip();
  });

  it('should have multiple mock offerings for user-1', async () => {
    const result = await offeringsChip.execute({
      action: 'list',
      userId: 'user-1',
    });

    expect(result.success).toBe(true);
    expect(result.offerings!.length).toBeGreaterThanOrEqual(2);
  });

  it('should have realistic mock data with benefits and proof points', async () => {
    const result = await offeringsChip.execute({
      action: 'list',
      userId: 'user-1',
    });

    const offering = result.offerings!.find(o => o.name.includes('CRM'));

    if (offering) {
      expect(offering.key_benefits.length).toBeGreaterThan(0);
      expect(offering.elevator_pitch).toBeTruthy();
      expect(offering.proof_points.length).toBeGreaterThan(0);
    }
  });

  it('should have valid LinkedIn offering in mock data', async () => {
    const result = await offeringsChip.execute({
      action: 'list',
      userId: 'user-1',
    });

    const linkedInOffering = result.offerings!.find(o => o.name.includes('LinkedIn'));

    expect(linkedInOffering).toBeDefined();
    expect(linkedInOffering!.name).toContain('LinkedIn');
    expect(linkedInOffering!.key_benefits.length).toBeGreaterThan(0);
  });
});
