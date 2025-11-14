/**
 * Kakiyo Alignment Tests
 * Tests for Offerings and Conversation Intelligence chips
 */

import { OfferingsChip } from '@/lib/chips/offerings';
import { ConversationIntelligenceChip } from '@/lib/chips/conversation-intelligence';

describe('OfferingsChip', () => {
  let chip: OfferingsChip;

  beforeEach(() => {
    chip = new OfferingsChip();
  });

  it('should have correct AgentKit tool definition', () => {
    const tool = chip.getTool();

    expect(tool.type).toBe('function');
    expect(tool.function.name).toBe('offerings-manager');
    expect(tool.function.parameters.required).toContain('action');
    expect(tool.function.parameters.required).toContain('userId');
  });

  it('should list mock offerings', async () => {
    const result = await chip.execute({
      action: 'list',
      userId: 'user-1',
    });

    expect(result.success).toBe(true);
    expect(Array.isArray(result.offerings)).toBe(true);
    expect(result.offerings!.length).toBeGreaterThan(0);
    expect(result.offerings![0].name).toBeTruthy();
  });

  it('should get offering by id', async () => {
    // First list to get an ID
    const listResult = await chip.execute({
      action: 'list',
      userId: 'user-1',
    });

    const offeringId = listResult.offerings![0].id;

    // Now get by ID
    const getResult = await chip.execute({
      action: 'get',
      userId: 'user-1',
      offeringId,
    });

    expect(getResult.success).toBe(true);
    expect(getResult.offering).toBeDefined();
    expect(getResult.offering!.id).toBe(offeringId);
  });

  it('should create new offering', async () => {
    const result = await chip.execute({
      action: 'create',
      userId: 'test-user',
      data: {
        name: 'Test Product',
        elevator_pitch: 'Revolutionary test product',
        key_benefits: ['Benefit 1', 'Benefit 2'],
      },
    });

    expect(result.success).toBe(true);
    expect(result.offering).toBeDefined();
    expect(result.offering!.name).toBe('Test Product');
    expect(result.offering!.id).toBeTruthy();
  });

  it('should update offering', async () => {
    // Create first
    const createResult = await chip.execute({
      action: 'create',
      userId: 'test-user',
      data: {
        name: 'Original Name',
        elevator_pitch: 'Original pitch',
      },
    });

    const offeringId = createResult.offering!.id;

    // Update
    const updateResult = await chip.execute({
      action: 'update',
      userId: 'test-user',
      offeringId,
      data: {
        name: 'Updated Name',
      },
    });

    expect(updateResult.success).toBe(true);
    expect(updateResult.offering!.name).toBe('Updated Name');
    expect(updateResult.offering!.elevator_pitch).toBe('Original pitch');
  });

  it('should delete offering', async () => {
    // Create first
    const createResult = await chip.execute({
      action: 'create',
      userId: 'test-user',
      data: {
        name: 'To Delete',
        elevator_pitch: 'Will be deleted',
      },
    });

    const offeringId = createResult.offering!.id;

    // Delete
    const deleteResult = await chip.execute({
      action: 'delete',
      userId: 'test-user',
      offeringId,
    });

    expect(deleteResult.success).toBe(true);

    // Verify deleted
    const getResult = await chip.execute({
      action: 'get',
      userId: 'test-user',
      offeringId,
    });

    expect(getResult.success).toBe(false);
    expect(getResult.error).toBe('Offering not found');
  });

  it('should enforce user authorization', async () => {
    // Create with user-1
    const createResult = await chip.execute({
      action: 'create',
      userId: 'user-1',
      data: {
        name: 'User 1 Offering',
        elevator_pitch: 'Private offering',
      },
    });

    const offeringId = createResult.offering!.id;

    // Try to access with user-2
    const getResult = await chip.execute({
      action: 'get',
      userId: 'user-2',
      offeringId,
    });

    expect(getResult.success).toBe(false);
    expect(getResult.error).toBe('Unauthorized');
  });
});

describe('ConversationIntelligenceChip', () => {
  let chip: ConversationIntelligenceChip;

  beforeEach(() => {
    chip = new ConversationIntelligenceChip();
  });

  it('should analyze casual skeptical tone', async () => {
    const message = 'ugh another sales tool... what makes you different?';
    const profile = await chip.analyzeTone(message);

    expect(profile.formality).toBe('casual');
    expect(profile.sentiment).toBe('skeptical');
    expect(profile.confidence).toBeGreaterThan(0);
  });

  it('should analyze formal professional tone', async () => {
    const message = 'Please provide detailed ROI metrics for enterprise deployment';
    const profile = await chip.analyzeTone(message);

    expect(profile.formality).toBe('formal');
    expect(profile.sentiment).toBe('professional');
    expect(profile.confidence).toBeGreaterThan(0);
  });

  it('should analyze frustrated tone', async () => {
    const message = "This isn't working! It's broken and I need help now.";
    const profile = await chip.analyzeTone(message);

    expect(profile.sentiment).toBe('frustrated');
    expect(profile.emotionalState).toBe('frustrated');
  });

  it('should match conversational style for casual skeptical', () => {
    const profile = {
      formality: 'casual' as const,
      sentiment: 'skeptical',
      emotionalState: 'doubtful',
      confidence: 0.9,
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

  it('should detect frustrated emotional state', () => {
    const conversation = [
      { role: 'user' as const, content: 'I need this to work perfectly' },
      { role: 'assistant' as const, content: 'I understand' },
      { role: 'user' as const, content: "But it's not working!" },
    ];

    const emotion = chip.detectEmotionalState(conversation);

    expect(emotion.primary).toBe('frustrated');
    expect(emotion.intensity).toBeGreaterThan(0.5);
    expect(emotion.triggers.length).toBeGreaterThan(0);
  });

  it('should detect skeptical emotional state', () => {
    const conversation = [
      { role: 'user' as const, content: 'ugh another tool' },
      { role: 'assistant' as const, content: 'Let me explain' },
      { role: 'user' as const, content: 'really? sounds typical' },
    ];

    const emotion = chip.detectEmotionalState(conversation);

    expect(emotion.primary).toBe('skeptical');
  });

  it('should generate dynamic response for skeptical user', async () => {
    const context = {
      userMessage: 'ugh another sales tool...',
      toneProfile: {
        formality: 'casual' as const,
        sentiment: 'skeptical',
        emotionalState: 'doubtful',
        confidence: 0.9,
      },
      conversationHistory: [],
    };

    const response = await chip.generateDynamicResponse(context);

    expect(response).toBeTruthy();
    expect(response.length).toBeGreaterThan(20);
    expect(response.toLowerCase()).toContain('fair');
  });

  it('should generate dynamic response with offering context', async () => {
    const offering = {
      id: 'test-1',
      user_id: 'user-1',
      name: 'Test CRM',
      elevator_pitch: 'Reduce sales cycle by 40%',
      key_benefits: ['40% faster', 'AI-powered'],
      objection_handlers: {},
      qualification_questions: [],
      proof_points: [],
    };

    const context = {
      userMessage: 'what makes you different?',
      toneProfile: {
        formality: 'casual' as const,
        sentiment: 'skeptical',
        emotionalState: 'doubtful',
        confidence: 0.9,
      },
      conversationHistory: [],
      offering,
    };

    const response = await chip.generateDynamicResponse(context);

    expect(response).toBeTruthy();
    expect(response.toLowerCase()).toContain('40%');
  });
});

describe('Integration: Offerings + Conversation Intelligence', () => {
  let offeringsChip: OfferingsChip;
  let conversationChip: ConversationIntelligenceChip;

  beforeEach(() => {
    offeringsChip = new OfferingsChip();
    conversationChip = new ConversationIntelligenceChip();
  });

  it('should use offering data in dynamic responses', async () => {
    // Get an offering
    const listResult = await offeringsChip.execute({
      action: 'list',
      userId: 'user-1',
    });

    const offering = listResult.offerings![0];

    // Analyze tone
    const toneProfile = await conversationChip.analyzeTone(
      'ugh another sales tool... what makes you different?'
    );

    // Generate response with offering context
    const response = await conversationChip.generateDynamicResponse({
      userMessage: 'what makes you different?',
      toneProfile,
      conversationHistory: [],
      offering,
    });

    expect(response).toBeTruthy();
    expect(response.toLowerCase()).toContain(offering.name.toLowerCase().split(' ')[0]);
  });

  it('should adapt tone based on user message', async () => {
    const offering = {
      id: 'test-1',
      user_id: 'user-1',
      name: 'Test Product',
      elevator_pitch: 'Revolutionary product',
      key_benefits: ['Benefit 1'],
      objection_handlers: {},
      qualification_questions: [],
      proof_points: [],
    };

    // Casual message
    const casualTone = await conversationChip.analyzeTone('hey what is this?');
    const casualResponse = await conversationChip.generateDynamicResponse({
      userMessage: 'hey what is this?',
      toneProfile: casualTone,
      conversationHistory: [],
      offering,
    });

    // Formal message
    const formalTone = await conversationChip.analyzeTone(
      'Please provide detailed information regarding this solution.'
    );
    const formalResponse = await conversationChip.generateDynamicResponse({
      userMessage: 'Please provide detailed information',
      toneProfile: formalTone,
      conversationHistory: [],
      offering,
    });

    expect(casualResponse).toBeTruthy();
    expect(formalResponse).toBeTruthy();
    expect(casualResponse).not.toBe(formalResponse);
  });
});
