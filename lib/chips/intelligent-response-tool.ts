/**
 * Intelligent Response Tool
 * Combines OfferingsChip and ConversationIntelligenceChip for AgentKit
 * Provides tone-aware responses using offering context
 */

import { offeringsChip } from './offerings';
import { conversationIntelligenceChip } from './conversation-intelligence';
import type { ConversationMessage } from './conversation-intelligence';

export interface IntelligentResponseConfig {
  userId: string;
  userMessage: string;
  offeringName?: string;
  conversationHistory?: ConversationMessage[];
}

export interface IntelligentResponseResult {
  success: boolean;
  response?: string;
  toneAnalysis?: {
    formality: string;
    sentiment: string;
    emotionalState: string;
  };
  offeringUsed?: string;
  error?: string;
}

export class IntelligentResponseTool {
  readonly id = 'intelligent-response';
  readonly name = 'Intelligent Response Generator';
  readonly description = 'Generate tone-aware responses using offering context from user profile';

  /**
   * Get AgentKit tool definition
   */
  getTool() {
    return {
      type: 'function' as const,
      function: {
        name: this.id,
        description: this.description,
        parameters: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'User ID',
            },
            userMessage: {
              type: 'string',
              description: 'The message from the user to respond to',
            },
            offeringName: {
              type: 'string',
              description: 'Optional offering name to use for context (if not provided, will search user\'s offerings)',
            },
            conversationHistory: {
              type: 'array',
              description: 'Optional conversation history for context',
              items: {
                type: 'object',
                properties: {
                  role: {
                    type: 'string',
                    enum: ['user', 'assistant'],
                  },
                  content: {
                    type: 'string',
                  },
                },
              },
            },
          },
          required: ['userId', 'userMessage'],
        },
      },
    };
  }

  /**
   * Execute intelligent response generation
   */
  async execute(config: IntelligentResponseConfig): Promise<IntelligentResponseResult> {
    try {
      // 1. Get user's offerings
      const offeringsResult = await offeringsChip.execute({
        action: 'list',
        userId: config.userId,
      });

      if (!offeringsResult.success || !offeringsResult.offerings || offeringsResult.offerings.length === 0) {
        // No offerings available - respond without offering context
        const toneProfile = await conversationIntelligenceChip.analyzeTone(config.userMessage);

        const response = await conversationIntelligenceChip.generateDynamicResponse({
          userMessage: config.userMessage,
          toneProfile,
          conversationHistory: config.conversationHistory || [],
        });

        return {
          success: true,
          response,
          toneAnalysis: {
            formality: toneProfile.formality,
            sentiment: toneProfile.sentiment,
            emotionalState: toneProfile.emotionalState,
          },
        };
      }

      // 2. Find relevant offering
      let offering = offeringsResult.offerings[0]; // Default to first

      if (config.offeringName) {
        const found = await offeringsChip.getOfferingByName(config.userId, config.offeringName);
        if (found) {
          offering = found;
        }
      }

      // 3. Analyze tone
      const toneProfile = await conversationIntelligenceChip.analyzeTone(config.userMessage);

      // 4. Generate response with offering context
      const response = await conversationIntelligenceChip.generateDynamicResponse({
        userMessage: config.userMessage,
        toneProfile,
        conversationHistory: config.conversationHistory || [],
        offering,
      });

      return {
        success: true,
        response,
        toneAnalysis: {
          formality: toneProfile.formality,
          sentiment: toneProfile.sentiment,
          emotionalState: toneProfile.emotionalState,
        },
        offeringUsed: offering.name,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Singleton instance
export const intelligentResponseTool = new IntelligentResponseTool();

/**
 * Example usage with AgentKit:
 *
 * import { intelligentResponseTool } from '@/lib/chips/intelligent-response-tool';
 *
 * const tools = [
 *   intelligentResponseTool.getTool(),
 *   // ... other tools
 * ];
 *
 * const result = await intelligentResponseTool.execute({
 *   userId: 'user-123',
 *   userMessage: 'ugh another sales tool... what makes you different?',
 *   conversationHistory: [...],
 * });
 *
 * console.log(result.response); // Tone-adapted response with offering context
 */
