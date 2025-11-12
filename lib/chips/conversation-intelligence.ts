/**
 * ConversationIntelligenceChip
 * Analyzes tone and emotional state to adapt response style
 * Uses GPT-4 for analysis (falls back to heuristics if no API key)
 */

import OpenAI from 'openai';
import type { Offering } from '@/lib/types/offerings';

export interface ToneProfile {
  formality: 'casual' | 'neutral' | 'formal';
  sentiment: string;
  emotionalState: string;
  confidence: number;
}

export interface ResponseStyle {
  tone: 'conversational' | 'balanced' | 'professional';
  structure: 'brief' | 'moderate' | 'detailed';
  vocabulary: 'simple' | 'standard' | 'technical';
  empathy: 'high' | 'medium' | 'low';
}

export interface EmotionalContext {
  primary: string;
  secondary?: string;
  intensity: number;
  triggers: string[];
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface GenerateResponseContext {
  userMessage: string;
  toneProfile: ToneProfile;
  conversationHistory: ConversationMessage[];
  offering?: Offering;
}

export class ConversationIntelligenceChip {
  readonly id = 'conversation-intelligence';
  readonly name = 'Conversation Intelligence';
  readonly description = 'Analyze tone and emotional state to adapt response style';

  private openai: OpenAI | null = null;
  private useGPT4: boolean = false;

  constructor() {
    // Skip OpenAI initialization in test environment
    const isTest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

    // Initialize OpenAI if API key available and not in test
    if (process.env.OPENAI_API_KEY && !isTest) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      this.useGPT4 = true;
    } else {
      if (!isTest) {
        console.warn('[ConversationIntelligence] No OPENAI_API_KEY - using heuristic analysis');
      }
    }
  }

  /**
   * Analyze tone of a message
   */
  async analyzeTone(message: string): Promise<ToneProfile> {
    if (this.useGPT4 && this.openai) {
      return await this.analyzeToneWithGPT4(message);
    } else {
      return this.analyzeToneHeuristic(message);
    }
  }

  /**
   * Analyze tone using GPT-4
   */
  private async analyzeToneWithGPT4(message: string): Promise<ToneProfile> {
    try {
      const completion = await this.openai!.chat.completions.create({
        model: 'gpt-4',
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: `Analyze the tone and emotional state of the user's message.

Return JSON:
{
  "formality": "casual" | "neutral" | "formal",
  "sentiment": "excited" | "neutral" | "skeptical" | "frustrated" | "professional",
  "emotionalState": "eager" | "doubtful" | "frustrated" | "analytical" | "urgent",
  "confidence": 0.0-1.0
}`,
          },
          {
            role: 'user',
            content: message,
          },
        ],
        response_format: { type: 'json_object' },
      });

      const analysis = JSON.parse(completion.choices[0].message.content || '{}');
      return analysis as ToneProfile;
    } catch (error) {
      console.error('[ConversationIntelligence] GPT-4 analysis failed:', error);
      return this.analyzeToneHeuristic(message);
    }
  }

  /**
   * Analyze tone using heuristics (fallback)
   */
  private analyzeToneHeuristic(message: string): ToneProfile {
    const lower = message.toLowerCase();

    // Formality detection
    const hasSlang = /ugh|yeah|nah|gonna|wanna|dunno/.test(lower);
    const hasFormalWords = /please|kindly|regarding|therefore|however/.test(lower);
    const hasQuestionMark = message.includes('?');

    let formality: 'casual' | 'neutral' | 'formal' = 'neutral';
    if (hasSlang) formality = 'casual';
    if (hasFormalWords && !hasSlang) formality = 'formal';

    // Sentiment detection
    let sentiment = 'neutral';
    if (/ugh|annoying|waste|another|typical/.test(lower)) {
      sentiment = 'skeptical';
    } else if (/frustrated|broken|not working|fail/.test(lower)) {
      sentiment = 'frustrated';
    } else if (/please provide|detailed|metrics|roi/.test(lower)) {
      sentiment = 'professional';
    } else if (/great|love|excited|perfect/.test(lower)) {
      sentiment = 'excited';
    }

    // Emotional state
    let emotionalState = 'neutral';
    if (sentiment === 'skeptical') emotionalState = 'doubtful';
    if (sentiment === 'frustrated') emotionalState = 'frustrated';
    if (sentiment === 'professional') emotionalState = 'analytical';
    if (sentiment === 'excited') emotionalState = 'eager';

    return {
      formality,
      sentiment,
      emotionalState,
      confidence: 0.75, // Heuristic confidence
    };
  }

  /**
   * Match communication style to tone profile
   */
  matchCommunicationStyle(profile: ToneProfile): ResponseStyle {
    // Casual + Skeptical → Conversational, brief, simple, high empathy
    if (profile.formality === 'casual' && profile.sentiment === 'skeptical') {
      return {
        tone: 'conversational',
        structure: 'brief',
        vocabulary: 'simple',
        empathy: 'high',
      };
    }

    // Formal + Professional → Professional, detailed, technical, low empathy
    if (profile.formality === 'formal' && profile.sentiment === 'professional') {
      return {
        tone: 'professional',
        structure: 'detailed',
        vocabulary: 'technical',
        empathy: 'low',
      };
    }

    // Frustrated → Conversational, moderate, simple, high empathy
    if (profile.sentiment === 'frustrated') {
      return {
        tone: 'conversational',
        structure: 'moderate',
        vocabulary: 'simple',
        empathy: 'high',
      };
    }

    // Default balanced style
    return {
      tone: 'balanced',
      structure: 'moderate',
      vocabulary: 'standard',
      empathy: 'medium',
    };
  }

  /**
   * Detect emotional state from conversation thread
   */
  detectEmotionalState(conversation: ConversationMessage[]): EmotionalContext {
    const userMessages = conversation
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content)
      .join(' ');

    const lower = userMessages.toLowerCase();

    // Simple heuristics for emotional detection
    // Check skeptical BEFORE frustrated since "ugh" can appear in both
    const skeptical = /really|doubt|sure|another|typical|ugh/.test(lower);
    const frustrated = /not working|broken|fail|annoying/.test(lower);
    const urgent = /asap|urgent|quickly|now|immediately/.test(lower);
    const excited = /great|amazing|perfect|love|excellent/.test(lower);

    // Skeptical takes precedence over general frustration
    if (skeptical && !frustrated) {
      return {
        primary: 'skeptical',
        intensity: 0.6,
        triggers: ['doubt', 'really'],
      };
    }

    if (frustrated) {
      return {
        primary: 'frustrated',
        intensity: 0.8,
        triggers: ['not working', 'broken'],
      };
    }

    if (urgent) {
      return {
        primary: 'urgent',
        secondary: 'anxious',
        intensity: 0.7,
        triggers: ['asap', 'quickly'],
      };
    }

    if (excited) {
      return {
        primary: 'excited',
        intensity: 0.7,
        triggers: ['great', 'love'],
      };
    }

    return {
      primary: 'neutral',
      intensity: 0.3,
      triggers: [],
    };
  }

  /**
   * Generate dynamic response based on context
   */
  async generateDynamicResponse(context: GenerateResponseContext): Promise<string> {
    const style = this.matchCommunicationStyle(context.toneProfile);
    const emotion = this.detectEmotionalState(context.conversationHistory);

    if (this.useGPT4 && this.openai) {
      return await this.generateResponseWithGPT4(context, style, emotion);
    } else {
      return this.generateResponseHeuristic(context, style, emotion);
    }
  }

  /**
   * Generate response using GPT-4
   */
  private async generateResponseWithGPT4(
    context: GenerateResponseContext,
    style: ResponseStyle,
    emotion: EmotionalContext
  ): Promise<string> {
    try {
      // Build system prompt based on style
      let systemPrompt = 'You are a helpful assistant.';

      if (style.tone === 'conversational') {
        systemPrompt = 'You are a friendly, down-to-earth assistant. Use casual language, avoid jargon, and be empathetic.';
      } else if (style.tone === 'professional') {
        systemPrompt = 'You are a professional business consultant. Use formal language, provide detailed analysis, and focus on facts and metrics.';
      }

      if (style.empathy === 'high') {
        systemPrompt += ' Show understanding and validate their concerns before offering solutions.';
      }

      if (emotion.primary === 'frustrated') {
        systemPrompt += ' The user is frustrated. Acknowledge their frustration and provide clear, simple solutions.';
      } else if (emotion.primary === 'skeptical') {
        systemPrompt += ' The user is skeptical. Be honest, acknowledge common concerns, and provide concrete evidence.';
      }

      // Add offering context if available
      if (context.offering) {
        systemPrompt += `\n\nYou are representing this offering: ${context.offering.name}
Elevator pitch: ${context.offering.elevator_pitch}
Key benefits: ${context.offering.key_benefits.join(', ')}`;
      }

      const completion = await this.openai!.chat.completions.create({
        model: 'gpt-4',
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          ...context.conversationHistory,
          {
            role: 'user',
            content: context.userMessage,
          },
        ],
      });

      return completion.choices[0].message.content || '';
    } catch (error) {
      console.error('[ConversationIntelligence] GPT-4 generation failed:', error);
      return this.generateResponseHeuristic(context, style, emotion);
    }
  }

  /**
   * Generate response using heuristics (fallback)
   */
  private generateResponseHeuristic(
    context: GenerateResponseContext,
    style: ResponseStyle,
    emotion: EmotionalContext
  ): string {
    const offering = context.offering;

    // Skeptical response
    if (emotion.primary === 'skeptical' || context.toneProfile.sentiment === 'skeptical') {
      if (offering) {
        return `Fair question! ${offering.elevator_pitch}. Here's what makes ${offering.name} different: ${offering.key_benefits[0]}.`;
      }
      return "Fair question! Let me be straight with you about what makes this different...";
    }

    // Frustrated response
    if (emotion.primary === 'frustrated') {
      return "I understand your frustration. Let me help you get this sorted out quickly.";
    }

    // Professional response
    if (style.tone === 'professional') {
      if (offering) {
        return `Certainly. ${offering.name} delivers ${offering.key_benefits.join(', ')}. ${offering.proof_points.map(p => `${p.metric}: ${p.value}`).join('. ')}.`;
      }
      return "Certainly. Let me provide you with detailed information...";
    }

    // Default conversational
    if (offering) {
      return `Happy to help! ${offering.elevator_pitch}. The main benefits are: ${offering.key_benefits.slice(0, 2).join(' and ')}.`;
    }
    return "Happy to help! Let me explain...";
  }
}

// Singleton instance
export const conversationIntelligenceChip = new ConversationIntelligenceChip();
