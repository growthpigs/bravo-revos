import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isUserAdmin } from '@/lib/auth/admin-check';

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Verify user is authenticated AND is an admin
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(user.id, authClient);
    if (!isAdmin) {
      console.warn('[MIGRATION] Non-admin user attempted access:', user.id);
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Create service role client (bypasses RLS) - ONLY after admin verification
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('[MIGRATION] Admin', user.email, 'inserting write-linkedin-post workflow...');

    // Insert the "write" workflow directly
    const { data, error } = await supabase
      .from('console_workflow')
      .insert({
        name: 'write-linkedin-post',
        display_name: 'Write LinkedIn Post',
        description: 'AI-powered LinkedIn post generation using brand cartridge and Jon Benson copywriting principles',
        workflow_type: 'content_generation',
        steps: [
          {
            step: 'load_brand_cartridge',
            description: 'Load user brand cartridge including core messaging'
          },
          {
            step: 'generate_topics',
            description: 'Generate 4 personalized topic headlines using AI',
            ai_prompt_key: 'topic_generation'
          },
          {
            step: 'await_topic_selection',
            description: 'Show topic buttons and wait for user selection'
          },
          {
            step: 'confirmation',
            description: 'Ask if user wants to add personal story',
            ai_prompt_key: 'confirmation'
          },
          {
            step: 'generate_post',
            description: 'Generate LinkedIn post using brand/style context',
            ai_prompt_key: 'post_generation'
          },
          {
            step: 'display_output',
            description: 'Show generated post in working document area'
          }
        ],
        triggers: {
          commands: ['write'],
          patterns: ['^write\\W*$'],
          case_insensitive: true
        },
        prompts: {
          topic_generation: `You are a world-class content strategist trained in Jon Benson's copywriting methodology.

BRAND CONTEXT:
- Industry: {industry}
- Target Audience: {target_audience}
- Brand Voice: {brand_voice}
{core_messaging}

TASK: Generate 4 compelling LinkedIn POST topic headlines (thought leadership content).

CRITICAL CONSTRAINTS:
- These are POSTS, NOT campaigns or advertisements
- Focus on: insights, stories, lessons, industry trends, personal experiences
- FORBIDDEN: campaign creation topics, 'select from' prompts, promotional/ad content
- FORBIDDEN: Any mention of 'campaigns', 'existing campaigns', 'create campaign'

Jon Benson Principles to Apply:
- Create curiosity gaps (tease the payoff)
- Use pattern interrupts (challenge assumptions)
- Future pace (paint the transformation)
- Agreeance principle (validate their struggle first)

REQUIREMENTS:
- Each headline should be a complete, compelling hook (not generic categories)
- Target THIS specific audience's pain points and desires
- Use specific language from their industry
- Make them feel 'this is written for ME'

FORMAT: Return ONLY a JSON array of 4 headline strings. No explanations.`,
          confirmation: `Perfect! Writing about: "{topic}"

Any personal story or specific angle to add?`,
          post_generation: `You are an expert LinkedIn content creator. Generate engaging LinkedIn posts that drive engagement.

{brand_context}

{style_context}

RULES:
- Hook in first line (not 'Imagine...' or 'Picture this...')
- 3-5 short paragraphs max
- Include relevant emoji strategically (not excessive)
- End with engagement question or call-to-action
- Professional yet conversational
- NO hashtags unless brand uses them`
        },
        output_config: {
          target: 'working_document',
          clear_previous: true,
          fullscreen: true,
          format: 'markdown'
        },
        tenant_scope: 'system',
        is_active: true,
        version: 1
      })
      .select();

    if (error) {
      console.error('[MIGRATION] Insert error:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error
      }, { status: 500 });
    }

    console.log('[MIGRATION] Workflow inserted successfully:', data);

    return NextResponse.json({
      success: true,
      message: 'Workflow created successfully',
      workflow: data?.[0] || null
    });
  } catch (error: any) {
    console.error('[MIGRATION] Fatal error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
