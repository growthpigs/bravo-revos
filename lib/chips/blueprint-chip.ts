/**
 * Blueprint Chip - Jon Benson 112-Point Marketing Blueprint Generator
 *
 * This chip generates a comprehensive marketing blueprint from basic brand data.
 * Based on Jon Benson's copywriting methodology and Russell Brunson's frameworks.
 */

import { tool } from '@openai/agents';
import { z } from 'zod';
import { BaseChip } from './base-chip';
import { AgentContext } from '@/lib/cartridges/types';

const BlueprintInputSchema = z.object({
  action: z.enum(['generate', 'get_status']),
  force_regenerate: z.boolean().optional(),
});

type BlueprintInput = z.infer<typeof BlueprintInputSchema>;

export class BlueprintChip extends BaseChip {
  id = 'blueprint-chip';
  name = 'generate_112_point_blueprint';
  description = 'Generate comprehensive Jon Benson 112-point marketing blueprint from brand data';

  getTool() {
    return tool({
      name: this.name,
      description: this.description,
      parameters: BlueprintInputSchema,
      execute: async (input: BlueprintInput) => {
        return this.formatSuccess({
          message: 'Blueprint generation initiated',
          input
        });
      },
    });
  }

  async execute(input: BlueprintInput, context: AgentContext): Promise<any> {
    const { supabase, userId } = context;

    try {
      switch (input.action) {
        case 'get_status': {
          // Check if blueprint exists
          const { data: brandData } = await supabase
            .from('brand_cartridges')
            .select('blueprint_112, updated_at')
            .eq('user_id', userId)
            .single();

          const hasBlueprint = brandData?.blueprint_112 !== null;

          return this.formatSuccess({
            has_blueprint: hasBlueprint,
            last_updated: brandData?.updated_at,
            message: hasBlueprint
              ? 'Blueprint exists. Click to regenerate or view.'
              : 'No blueprint generated yet. Click to generate your 112-point marketing blueprint.'
          });
        }

        case 'generate': {
          console.log('[BlueprintChip] Starting 112-point blueprint generation for user:', userId);

          // Load existing brand data
          const { data: brandData, error: brandError } = await supabase
            .from('brand_cartridges')
            .select('*')
            .eq('user_id', userId)
            .single();

          if (brandError || !brandData) {
            return this.formatError('Brand cartridge not found. Please create your brand profile first.');
          }

          // Check if blueprint exists and user didn't force regenerate
          if (brandData.blueprint_112 && !input.force_regenerate) {
            return this.formatSuccess({
              already_exists: true,
              message: 'Blueprint already exists. Set force_regenerate=true to overwrite.',
              blueprint: brandData.blueprint_112
            });
          }

          // Build context from available brand data
          const brandContext = {
            industry: brandData.industry || 'Unknown',
            target_audience: brandData.target_audience || 'Unknown',
            brand_voice: brandData.brand_voice || 'Professional',
            core_messaging: brandData.core_messaging || '',
            core_values: brandData.core_values || '',
          };

          console.log('[BlueprintChip] Brand context:', {
            industry: brandContext.industry,
            hasTargetAudience: !!brandContext.target_audience,
            hasCoreMessaging: !!brandContext.core_messaging,
          });

          // Generate the 112-point blueprint using OpenAI
          const blueprint = await this.generateBlueprint(brandContext);

          // Save to database
          const { error: updateError } = await supabase
            .from('brand_cartridges')
            .update({
              blueprint_112: blueprint,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);

          if (updateError) {
            console.error('[BlueprintChip] Failed to save blueprint:', updateError);
            return this.formatError('Failed to save blueprint to database');
          }

          console.log('[BlueprintChip] Blueprint saved successfully');

          return this.formatSuccess({
            message: '112-point marketing blueprint generated successfully!',
            blueprint,
            sections_generated: Object.keys(blueprint).length,
          });
        }

        default:
          return this.formatError(`Unknown action: ${input.action}`);
      }
    } catch (error: any) {
      console.error('[BlueprintChip] Error:', error);
      return this.formatError(error.message);
    }
  }

  private async generateBlueprint(brandContext: {
    industry: string;
    target_audience: string;
    brand_voice: string;
    core_messaging: string;
    core_values: string;
  }): Promise<Record<string, any>> {
    // Dynamic import to prevent build-time tiktoken execution
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `You are an expert marketing strategist trained in Jon Benson's copywriting methodology and Russell Brunson's frameworks.

Generate a comprehensive 112-point marketing blueprint based on this brand information:

BRAND CONTEXT:
- Industry: ${brandContext.industry}
- Target Audience: ${brandContext.target_audience}
- Brand Voice: ${brandContext.brand_voice}
${brandContext.core_messaging ? `\nExisting Core Messaging:\n${brandContext.core_messaging}` : ''}
${brandContext.core_values ? `\nCore Values: ${brandContext.core_values}` : ''}

Generate the following 112 points. Be specific, detailed, and actionable. Extrapolate intelligently from the given information.

Return as a JSON object with these sections:

{
  "bio": {
    "1_first_name": "Inferred or 'Info needed'",
    "2_last_name": "Inferred or 'Info needed'",
    "3_position": "...",
    "4_credentials": "...",
    "5_backstory": "...",
    "6_time_active": "...",
    "7_when_this": "...",
    "8_then_that": "...",
    "9_signature_signoff": "...",
    "10_authority_nickname": "...",
    "11_mentor_name": "...",
    "12_mentor_credentials": "...",
    "13_mentor_story": "..."
  },
  "positioning": {
    "14_niche": "...",
    "15_topic": "...",
    "16_avatars": ["Avatar 1", "Avatar 2"],
    "17_primary": "...",
    "18_primary_goal": "...",
    "19_secondary_goals": ["Goal 1", "Goal 2", "Goal 3"],
    "20_dreams": "...",
    "21_promises": "..."
  },
  "pain_and_objections": {
    "22_primary_complaint": "...",
    "23_secondary_complaints": ["Complaint 1", "Complaint 2", "Complaint 3"],
    "24_negative_statistics": "...",
    "25_objections": ["Objection 1", "Objection 2", "Objection 3", "Objection 4", "Objection 5"],
    "26_bad_habits": "...",
    "27_consequences": "...",
    "28_enemy": "...",
    "29_ultimate_fear": "..."
  },
  "lies_and_truths": {
    "30_false_solution_lie": "...",
    "31_false_solution_tip": "...",
    "32_mistaken_belief_lie": "...",
    "33_mistaken_belief_truth": "...",
    "34_mistaken_belief_name": "...",
    "35_success_myth_lie": "...",
    "36_success_myth_truth": "...",
    "37_topic_challenge": "...",
    "38_topic_challenge_tip": "..."
  },
  "offer": {
    "39_type": "...",
    "40_number_of_customers": "...",
    "41_big_idea": "...",
    "42_lead_hook": "...",
    "43_offer_name": "...",
    "44_offer_details": "...",
    "45_offer_category": "...",
    "46_usp": "...",
    "47_offer_type": "...",
    "48_offer_value": "...",
    "49_offer_price": "...",
    "50_offer_discount": "...",
    "51_features": ["Feature 1", "Feature 2", "Feature 3"],
    "52_works_because": "...",
    "53_works_even_if": "...",
    "54_features_details": ["Detail 1", "Detail 2", "Detail 3"],
    "55_benefits": ["Benefit 1", "Benefit 2", "Benefit 3"]
  },
  "hooks": {
    "56_positive_hook": "...",
    "57_positive_hook_defined": "...",
    "58_positive_hook_study": "...",
    "59_positive_hook_study_conclusion": "...",
    "60_negative_hook": "...",
    "61_negative_hook_defined": "...",
    "62_negative_hook_study": "...",
    "63_negative_hook_study_conclusion": "..."
  },
  "sales": {
    "64_sales_bullets": ["Bullet 1", "Bullet 2", "Bullet 3"],
    "65_delivery": "...",
    "66_triggers": ["Trigger 1", "Trigger 2", "Trigger 3"],
    "67_expensive_alternatives": ["Alt 1", "Alt 2", "Alt 3"],
    "68_short_term_results": "...",
    "69_long_term_results": "..."
  },
  "social_proof": {
    "70_testimonial_first_name": "...",
    "71_testimonial_text": "...",
    "72_guarantee": "...",
    "73_bonus_name": "...",
    "74_bonus_description": "...",
    "75_bonus_value": "...",
    "76_bonus_price": "...",
    "77_deadline": "..."
  },
  "consumption": {
    "78_consumption_steps": ["Step 1", "Step 2", "Step 3"],
    "79_consumption_steps_details": ["Detail 1", "Detail 2", "Detail 3"],
    "80_case_study_number": "...",
    "81_case_study_first_name": "...",
    "82_case_study_details": "..."
  },
  "page": {
    "83_page_action": "...",
    "84_url": "..."
  },
  "service": {
    "85_service": "...",
    "86_service_overview": "...",
    "87_service_problem": "...",
    "88_service_benefits": ["Benefit 1", "Benefit 2", "Benefit 3"],
    "89_service_details": "..."
  },
  "tips": {
    "90_tip_name": "...",
    "91_tip_details": "...",
    "92_tip_benefits": "...",
    "93_tip_instructions": ["Instruction 1", "Instruction 2", "Instruction 3"],
    "94_tip_short_term_results": "...",
    "95_tip_long_term_results": "...",
    "96_tip_objections": "..."
  },
  "lessons": {
    "97_lesson_1": "...",
    "98_lesson_1_details": "...",
    "99_lesson_2": "...",
    "100_lesson_2_details": "...",
    "101_lesson_3": "...",
    "102_lesson_3_details": "...",
    "103_total_lessons_duration": "..."
  },
  "email": {
    "104_email_number": "...",
    "105_pattern_interrupt_image": "..."
  },
  "lead_magnet": {
    "106_lead_magnet_name": "...",
    "107_lead_magnet_details": "...",
    "108_lead_magnet_hook": "...",
    "109_lead_magnet_url": "...",
    "110_lead_magnet_value": "..."
  },
  "visuals": {
    "111_surprising_image": "...",
    "112_surprising_image_story": "..."
  }
}

Be smart and extrapolate intelligently. If specific information is missing (like first name), use "Info needed" but still generate everything else with high quality, specific content.

Return ONLY the JSON object, no markdown formatting.`;

    console.log('[BlueprintChip] Generating blueprint with OpenAI...');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',  // Use full GPT-4 for better quality
      messages: [
        {
          role: 'system',
          content: 'You are an expert marketing strategist. Return only valid JSON with no markdown formatting.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 8000,  // Large response for 112 points
    });

    const responseText = response.choices[0].message.content || '{}';

    // Clean up any markdown formatting
    const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();

    try {
      const blueprint = JSON.parse(cleanJson);
      console.log('[BlueprintChip] Blueprint generated with sections:', Object.keys(blueprint).length);
      return blueprint;
    } catch (parseError) {
      console.error('[BlueprintChip] Failed to parse blueprint JSON:', parseError);
      throw new Error('Failed to parse generated blueprint. Please try again.');
    }
  }
}
