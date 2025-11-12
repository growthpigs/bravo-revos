/**
 * Voice Cartridge - Applies voice parameters to agent output
 *
 * Modifies agent tone, style, personality, and vocabulary based on
 * 4-tier voice cartridge hierarchy (system → agency → client → user).
 *
 * This is a "modifier cartridge" - it has no chips, just instructions.
 */

import { Cartridge } from '@/lib/cartridges/types';
import type { VoiceParams } from '@/lib/cartridges/types';

export interface VoiceCartridgeConfig {
  voice_id: string;
  voice_params: VoiceParams;
  resolved_from_tier?: 'system' | 'agency' | 'client' | 'user';
}

export class VoiceCartridge implements Cartridge {
  id: string;
  name: string;
  type = 'voice' as const;
  chips = []; // Voice cartridge has no chips
  private voiceParams: VoiceParams;
  private resolvedFromTier?: string;

  constructor(config: VoiceCartridgeConfig) {
    this.id = `voice-${config.voice_id}`;
    this.name = `Voice: ${config.voice_id}`;
    this.voiceParams = config.voice_params;
    this.resolvedFromTier = config.resolved_from_tier;
  }

  inject() {
    const { tone, style, personality, vocabulary, content_preferences } = this.voiceParams;

    // Build voice instructions from parameters
    const instructions = `
# Voice & Style Guidelines

${this.resolvedFromTier ? `(Resolved from ${this.resolvedFromTier} tier voice cartridge)` : ''}

## Tone
- Formality: ${tone.formality}
- Enthusiasm Level: ${tone.enthusiasm}/10
- Empathy Level: ${tone.empathy}/10

## Writing Style
- Sentence Length: ${style.sentence_length}
- Paragraph Structure: ${style.paragraph_structure}
- Use Emojis: ${style.use_emojis ? 'Yes' : 'No'}
- Use Hashtags: ${style.use_hashtags ? 'Yes' : 'No'}

## Personality Traits
${personality.traits.map((trait) => `- ${trait}`).join('\n')}
${personality.voice_description ? `\nVoice Description: ${personality.voice_description}` : ''}

## Vocabulary
- Complexity: ${vocabulary.complexity}
${vocabulary.industry_terms && vocabulary.industry_terms.length > 0 ? `- Industry Terms to Use: ${vocabulary.industry_terms.join(', ')}` : ''}
${vocabulary.preferred_phrases && vocabulary.preferred_phrases.length > 0 ? `- Preferred Phrases: ${vocabulary.preferred_phrases.join(', ')}` : ''}
${vocabulary.banned_words && vocabulary.banned_words.length > 0 ? `- ⚠️ NEVER USE These Words: ${vocabulary.banned_words.join(', ')}` : ''}

${content_preferences ? this.buildContentPreferencesSection(content_preferences) : ''}

**IMPORTANT**: Apply these voice guidelines to ALL content you generate, including:
- LinkedIn post copy
- Campaign names and descriptions
- Conversational responses
- Suggestions and recommendations
`;

    return {
      tools: [], // No tools for voice cartridge
      instructions,
    };
  }

  private buildContentPreferencesSection(prefs: any): string {
    let section = '\n## Content Preferences\n';

    if (prefs.topics && prefs.topics.length > 0) {
      section += `- Focus Topics: ${prefs.topics.join(', ')}\n`;
    }

    if (prefs.content_types && prefs.content_types.length > 0) {
      section += `- Content Types: ${prefs.content_types.join(', ')}\n`;
    }

    if (prefs.call_to_action_style) {
      section += `- Call-to-Action Style: ${prefs.call_to_action_style}\n`;
    }

    return section;
  }

  /**
   * Static factory method to create voice cartridge from database record
   */
  static async fromDatabase(voiceCartridgeId: string, supabase: any): Promise<VoiceCartridge | null> {
    try {
      // Fetch voice cartridge with resolved hierarchy
      const { data, error } = await supabase
        .from('cartridges')
        .select('*')
        .eq('id', voiceCartridgeId)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        console.error('[VoiceCartridge] Failed to fetch voice cartridge:', error);
        return null;
      }

      // Resolve voice params from hierarchy (if needed)
      // For now, use the cartridge's voice_params directly
      // TODO: Implement full hierarchy resolution

      return new VoiceCartridge({
        voice_id: data.id,
        voice_params: data.voice_params,
        resolved_from_tier: data.tier,
      });
    } catch (error) {
      console.error('[VoiceCartridge] Error creating from database:', error);
      return null;
    }
  }
}
