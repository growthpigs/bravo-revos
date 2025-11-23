/**
 * Write Chip - Quick LinkedIn post creation without campaign overhead
 *
 * This chip handles the simplified "write" workflow for creating
 * LinkedIn posts without requiring campaign setup.
 */

import { tool } from '@openai/agents';
import { z } from 'zod';
// REMOVED: import OpenAI from 'openai'; - moved to dynamic import to prevent build-time tiktoken execution
import { BaseChip } from './base-chip';
import { AgentContext } from '@/lib/cartridges/types';
import { OPENAI_MODELS } from '@/lib/config/openai-models';

const WriteInputSchema = z.object({
  action: z.enum(['select_topic', 'generate_post', 'finalize_post']),
  topic: z.string().optional(),
  custom_instructions: z.string().optional(),
  content: z.string().optional(),
});

type WriteInput = z.infer<typeof WriteInputSchema>;

export class WriteChip extends BaseChip {
  id = 'write-chip';
  name = 'write_linkedin_post';
  description = 'Quick LinkedIn post creation workflow without campaign overhead';

  getTool() {
    return tool({
      name: this.name,
      description: this.description,
      parameters: WriteInputSchema,
      execute: async (input: WriteInput) => {
        // For now, return a placeholder since we can't access context here
        // The actual execution would happen through the MarketingConsole
        return this.formatSuccess({
          message: 'Write workflow initiated',
          input
        });
      },
    });
  }

  async execute(input: WriteInput, context: AgentContext): Promise<any> {
    const { supabase, userId } = context;

    try {
      switch (input.action) {
        case 'select_topic': {
          // Get user's brand data for personalized suggestions
          const { data: brandData } = await supabase
            .from('brand_cartridges')
            .select('industry, core_values, core_messaging, target_audience')
            .eq('user_id', userId)
            .single();

          let topicSuggestions = [];

          if (brandData?.industry) {
            // Personalized topics based on brand
            const values = brandData.core_values ? JSON.parse(brandData.core_values) : [];

            topicSuggestions = [
              {
                label: `${brandData.industry} Insights`,
                value: `${brandData.industry.toLowerCase()}_insights`,
                description: `Share expertise about ${brandData.industry}`
              },
              {
                label: values[0] || 'Innovation',
                value: values[0]?.toLowerCase() || 'innovation',
                description: `Discuss ${values[0] || 'innovation'} in your work`
              },
              {
                label: 'Client Success Story',
                value: 'success_story',
                description: 'Share a win with your audience'
              },
              {
                label: 'Industry Trends',
                value: 'trends',
                description: 'Comment on latest developments'
              }
            ];
          } else {
            // Generic topics
            topicSuggestions = [
              {
                label: 'LinkedIn Growth',
                value: 'linkedin_growth',
                description: 'Tips for building your network'
              },
              {
                label: 'Business Strategy',
                value: 'business_strategy',
                description: 'Strategic insights and frameworks'
              },
              {
                label: 'Innovation & Tech',
                value: 'innovation',
                description: 'Technology and future trends'
              },
              {
                label: 'Leadership',
                value: 'leadership',
                description: 'Leadership lessons and experiences'
              }
            ];
          }

          return this.formatSuccess({
            topics: topicSuggestions,
            message: 'Select a topic or type your own',
            interactive: {
              type: 'topic_selection',
              options: topicSuggestions
            }
          });
        }

        case 'generate_post': {
          if (!input.topic) {
            return this.formatError('Topic is required to generate post');
          }

          console.log('[WriteChip] Generating post for topic:', input.topic);

          // Get user's brand data for context
          const { data: brandData } = await supabase
            .from('brand_cartridges')
            .select('industry, target_audience, core_values, core_messaging, brand_voice')
            .eq('user_id', userId)
            .single();

          // Get user's style preferences
          const { data: styleData } = await supabase
            .from('style_cartridges')
            .select('tone_of_voice, writing_style, personality_traits')
            .eq('user_id', userId)
            .single();

          console.log('[WriteChip] Loaded cartridges:', {
            hasBrand: !!brandData,
            hasStyle: !!styleData,
            industry: brandData?.industry,
            tone: styleData?.tone_of_voice
          });

          // Build prompt using cartridge data
          const industry = brandData?.industry || 'business';
          const targetAudience = brandData?.target_audience || 'professionals';
          const coreValues = brandData?.core_values || 'innovation, integrity';
          const tone = styleData?.tone_of_voice || 'professional';
          const writingStyle = styleData?.writing_style || 'informative';
          const personality = styleData?.personality_traits || 'approachable, insightful';

          const prompt = `Create a LinkedIn post about: ${input.topic}

Brand Context:
- Industry: ${industry}
- Target Audience: ${targetAudience}
- Core Values: ${coreValues}
- Brand Voice: ${brandData?.brand_voice || 'authentic and value-driven'}

Writing Style:
- Tone: ${tone}
- Style: ${writingStyle}
- Personality: ${personality}

Requirements:
1. Hook the reader in the first line
2. Provide genuine value or insight
3. End with an engaging question or clear CTA
4. Include 3-5 relevant hashtags
5. Keep it authentic and conversational (not overly promotional)
6. Aim for 150-250 words

Write the post now:`;

          // Generate post using OpenAI (dynamic import to prevent build-time tiktoken execution)
          const { default: OpenAI } = await import('openai');
          const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
          });

          const response = await openai.chat.completions.create({
            model: OPENAI_MODELS.FAST,
            messages: [
              {
                role: 'system',
                content: 'You are an expert LinkedIn content writer who creates engaging, authentic posts that drive engagement and lead generation.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 500,
          });

          const generatedContent = response.choices[0].message.content;

          console.log('[WriteChip] Generated post:', {
            length: generatedContent?.length,
            preview: generatedContent?.substring(0, 100)
          });

          return this.formatSuccess({
            action: 'show_in_working_document',
            content_type: 'linkedin_post',
            generated_content: generatedContent,
            metadata: {
              topic: input.topic,
              style: writingStyle,
              tone: tone,
              industry: industry
            }
          });
        }

        case 'finalize_post': {
          if (!input.content) {
            return this.formatError('Post content is required');
          }

          return this.formatSuccess({
            post_content: input.content,
            next_actions: [
              { action: 'post_now', label: 'POST NOW' },
              { action: 'schedule', label: 'SCHEDULE' },
              { action: 'save_draft', label: 'SAVE DRAFT' },
              { action: 'add_to_campaign', label: 'ADD TO CAMPAIGN' }
            ]
          });
        }

        default:
          return this.formatError(`Unknown action: ${input.action}`);
      }
    } catch (error: any) {
      console.error('[WriteChip] Error:', error);
      return this.formatError(error.message);
    }
  }
}