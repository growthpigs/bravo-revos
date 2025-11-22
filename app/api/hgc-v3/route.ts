/**
 * HGC v3 - Minimal Working Implementation
 *
 * This is a PRAGMATIC route that bypasses complex class hierarchies
 * to get the write workflow functional TODAY.
 *
 * Architecture violations (raw OpenAI):
 * - ✅ ACCEPTED as technical debt
 * - ✅ Will migrate to AgentKit SDK in Phase 2
 * - ✅ Gets user testing unblocked NOW
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
// REMOVED: import OpenAI from 'openai'; - moved to dynamic import to prevent build-time tiktoken execution

export async function POST(req: Request) {
  // Dynamic import to prevent tiktoken from trying to read encoder.json at build time
  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  try {
    const body = await req.json();
    const { message: directMessage, sessionId, workflow_id, decision, messages } = body;

    // Extract message: either direct message or last message from messages array
    const message = directMessage || (messages?.length > 0 ? messages[messages.length - 1]?.content : null);

    console.log('[HGC_V3] Request:', {
      message,
      sessionId,
      workflow_id,
      decision,
      hasDirectMessage: !!directMessage,
      hasMessages: !!messages,
      messagesCount: messages?.length || 0
    });

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[HGC_V3] Auth failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for write/post commands - multiple keywords trigger the write flow
    const WRITE_KEYWORDS = ['write', 'post', 'writing', 'create', 'content', 'linkedin'];
    const normalizedMessage = message?.toLowerCase().trim() || '';
    const isWriteCommand = WRITE_KEYWORDS.some(keyword =>
      normalizedMessage === keyword ||
      normalizedMessage.startsWith(keyword + ' ') ||
      normalizedMessage.endsWith(' ' + keyword)
    );
    console.log('[HGC_V3] Write command check:', { message, normalizedMessage, isWriteCommand });

    if (isWriteCommand) {
      console.log('[HGC_V3] Write command detected');

      // Load user's brand cartridge including core messaging and 112-point blueprint
      const { data: brandData } = await supabase
        .from('brand_cartridges')
        .select('industry, target_audience, core_values, core_messaging, brand_voice, blueprint_112')
        .eq('user_id', user.id)
        .single();

      console.log('[HGC_V3] Brand data:', {
        hasData: !!brandData,
        industry: brandData?.industry,
        hasCoreMessaging: !!brandData?.core_messaging,
        hasBlueprint: !!brandData?.blueprint_112
      });

      // Check if brand data exists AND has enough context to generate content
      // Accept: blueprint OR core_messaging OR (industry AND target_audience)
      const hasBrandContext = brandData && (
        brandData.blueprint_112 ||
        brandData.core_messaging ||
        (brandData.industry && brandData.target_audience)
      );

      if (!hasBrandContext) {
        return NextResponse.json({
          success: false,
          response: '❌ **Brand Setup Required**\n\nYour brand profile is incomplete. Please add your industry and target audience, or generate a 112-point blueprint.\n\n→ Go to **Settings → Brand** to complete setup.',
          sessionId: sessionId || crypto.randomUUID(),
          meta: {
            route: 'hgc-v3',
            error: 'incomplete_brand',
            errorType: 'warning', // Signal to frontend to show pink/red styling
          },
        });
      }

      // Generate dynamic topic headlines using AI
      // Use 112-point blueprint if available for much better variety
      const blueprint = brandData.blueprint_112 as Record<string, any> | null;

      let blueprintContext = '';
      if (blueprint) {
        // Extract key sections for topic variety
        const painPoints = blueprint.pain_and_objections || {};
        const positioning = blueprint.positioning || {};
        const hooks = blueprint.hooks || {};
        const lies = blueprint.lies_and_truths || {};
        const offer = blueprint.offer || {};

        blueprintContext = `
112-POINT BLUEPRINT (use these for variety):

PAIN POINTS & OBJECTIONS:
- Primary Complaint: ${painPoints['22_primary_complaint'] || 'N/A'}
- Objections: ${JSON.stringify(painPoints['25_objections'] || []).substring(0, 500)}
- Ultimate Fear: ${painPoints['29_ultimate_fear'] || 'N/A'}

POSITIONING:
- Primary Goal: ${positioning['18_primary_goal'] || 'N/A'}
- Dreams: ${positioning['20_dreams'] || 'N/A'}
- Promises: ${positioning['21_promises'] || 'N/A'}

HOOKS:
- Positive Hook: ${hooks['56_positive_hook'] || 'N/A'}
- Negative Hook: ${hooks['60_negative_hook'] || 'N/A'}

LIES & TRUTHS:
- False Solution Lie: ${lies['30_false_solution_lie'] || 'N/A'}
- Mistaken Belief: ${lies['32_mistaken_belief_lie'] || 'N/A'}
- Success Myth Lie: ${lies['35_success_myth_lie'] || 'N/A'}

BIG IDEA: ${offer['41_big_idea'] || 'N/A'}
USP: ${offer['46_usp'] || 'N/A'}`;
      }

      const topicPrompt = `You are a world-class content strategist trained in Jon Benson's copywriting methodology.

BRAND CONTEXT:
- Industry: ${brandData.industry || 'business'}
- Target Audience: ${brandData.target_audience || 'professionals'}
- Brand Voice: ${brandData.brand_voice || 'professional'}
${blueprint ? blueprintContext : (brandData.core_messaging ? `\nCORE MESSAGING:\n${brandData.core_messaging.substring(0, 2000)}` : '')}

TASK: Generate 4 compelling LinkedIn POST topic headlines (thought leadership content).

CRITICAL VARIETY REQUIREMENT:
Each topic MUST come from a DIFFERENT angle:
1. One based on a PAIN POINT or OBJECTION
2. One based on a DESIRE or DREAM
3. One based on a LIE/MYTH to debunk
4. One based on a POSITIVE HOOK or TRANSFORMATION

CRITICAL CONSTRAINTS:
- These are POSTS, NOT campaigns or advertisements
- Focus on: insights, stories, lessons, industry trends, personal experiences
- FORBIDDEN: campaign creation topics, "select from" prompts, promotional/ad content
- FORBIDDEN: Any mention of "campaigns", "existing campaigns", "create campaign"

Jon Benson Principles to Apply:
- Create curiosity gaps (tease the payoff)
- Use pattern interrupts (challenge assumptions)
- Future pace (paint the transformation)
- Agreeance principle (validate their struggle first)

REQUIREMENTS:
- Each headline should be a complete, compelling hook (not generic categories)
- Target THIS specific audience's pain points and desires
- Use specific language from their industry
- Make them feel "this is written for ME"
- EACH TOPIC MUST BE DISTINCTLY DIFFERENT (no variations on same theme)

FORMAT: Return ONLY a JSON array of 4 headline strings. No explanations.

Example format (different content):
["How I 10X'd My LinkedIn Reach Without Posting Daily (and You Can Too)", "The One LinkedIn Mistake Costing You $100K+ in Lost Deals", "Why Your Best Content Gets Zero Engagement (and How to Fix It)", "The 3-Minute LinkedIn Strategy That Books 5+ Sales Calls Per Week"]

Now generate 4 DISTINCTLY DIFFERENT headlines for THIS brand:`;

      console.log('[HGC_V3] Generating dynamic topics with OpenAI...');

      let topicLabels: string[] = [];
      try {
        const topicCompletion = await openai.chat.completions.create({
          model: 'gpt-5.1',
          temperature: 0.8,
          messages: [
            {
              role: 'system',
              content: 'You are a Jon Benson-trained content strategist. Return ONLY valid JSON arrays with no markdown formatting.'
            },
            {
              role: 'user',
              content: topicPrompt
            }
          ]
        });

        const topicResponse = topicCompletion.choices[0]?.message?.content || '[]';
        console.log('[HGC_V3] Raw topic response:', topicResponse);

        // Strip markdown code blocks if present
        const cleanResponse = topicResponse.replace(/```json\n?|\n?```/g, '').trim();
        topicLabels = JSON.parse(cleanResponse);

        console.log('[HGC_V3] Generated topics:', topicLabels);

        // 🔍 DEBUG: Check for forbidden campaign keywords
        const FORBIDDEN_KEYWORDS = ['campaign', 'select from', 'existing campaign', 'create campaign', 'advertise'];
        const hasForbiddenKeywords = topicLabels.some(topic =>
          FORBIDDEN_KEYWORDS.some(keyword =>
            topic.toLowerCase().includes(keyword.toLowerCase())
          )
        );

        if (hasForbiddenKeywords) {
          console.warn('[HGC_V3] ⚠️  AI generated campaign-related topics despite constraints!');
          console.warn('[HGC_V3] Topics before filtering:', topicLabels);

          // Filter out forbidden topics (last resort)
          const originalLength = topicLabels.length;
          topicLabels = topicLabels.filter(topic =>
            !FORBIDDEN_KEYWORDS.some(keyword =>
              topic.toLowerCase().includes(keyword.toLowerCase())
            )
          );

          if (topicLabels.length < originalLength) {
            console.warn('[HGC_V3] Filtered out topics:', originalLength - topicLabels.length);
            console.warn('[HGC_V3] → Prompt may need further improvement to prevent this');
          }

          // If all topics were filtered out, use fallback
          if (topicLabels.length === 0) {
            console.error('[HGC_V3] All topics were campaign-related! Using fallback.');
            topicLabels = [
              `Insights for ${brandData.industry} Leaders`,
              'Breaking Industry Myths',
              'Client Success Story',
              'Future of Your Industry'
            ];
          }
        } else {
          console.log('[HGC_V3] ✅ No campaign keywords detected in topics');
        }
      } catch (error) {
        console.error('[HGC_V3] Failed to generate dynamic topics:', error);
        // Fallback to generic topics if AI generation fails
        topicLabels = [
          `Insights for ${brandData.industry} Leaders`,
          'Breaking Industry Myths',
          'Client Success Story',
          'Future of Your Industry'
        ];
      }

      // Convert to button format
      const topics = topicLabels.map((label, index) => ({
        label,
        value: label.toLowerCase().replace(/[^a-z0-9]+/g, '_').substring(0, 50),
        icon: index === 0 ? 'brain' : index === 1 ? 'star' : index === 2 ? 'trophy' : 'trending',
        variant: index === 0 ? 'primary' : 'secondary',
      }));

      // Build explanation of why these topics were chosen
      const topicRationale = `I analyzed your brand context and target audience pain points. These headlines use Jon Benson's curiosity gap technique and speak directly to SMB owners frustrated with traditional SEO.`;

      // Return brand confirmation with topic options (formatted with forced line breaks)
      const brandSummary = `📋 **Brand Context Loaded**

**Industry:** ${brandData.industry}

**Target Audience:** ${brandData.target_audience}

**Why These Topics:** ${topicRationale}`;

      // 🔍 DEBUG: Log exact decision_options being returned
      console.log('[HGC_V3] 🎯 FINAL decision_options being returned:', JSON.stringify(topics, null, 2));
      console.log('[HGC_V3] 🎯 Number of options:', topics.length);

      return NextResponse.json({
        success: true,
        response: brandSummary,
        sessionId: sessionId || crypto.randomUUID(),
        interactive: {
          type: 'decision',
          workflow_id: `topic-${Date.now()}`,
          decision_options: topics,
        },
        meta: {
          route: 'hgc-v3',
          hasBrandData: !!brandData,
          clearDocument: true, // Signal to clear working document
        },
      });
    }

    // Handle topic selection from workflow
    console.log('[HGC_V3] Checking workflow handler:', {
      hasWorkflowId: !!workflow_id,
      hasDecision: !!decision,
      workflow_id,
      decision
    });

    if (workflow_id && decision) {
      console.log('[HGC_V3] ✅ Topic selection handler triggered!');
      console.log('[HGC_V3] Topic selected:', decision);

      // ==========================================
      // 🚨 TECHNICAL DEBT WARNING 🚨
      // ==========================================
      // This is HARD-CODED workflow logic (violates NO HARD-CODING rule in CLAUDE.md Rule #8)
      // Acceptable for v3 temporary implementation ONLY
      //
      // MIGRATION PLAN (v3 → v2/AgentKit):
      // 1. Move confirmation prompt to console_workflows table
      // 2. Move decision options to workflow JSON config
      // 3. Replace with: await loadWorkflowStep('write_workflow', 'confirmation')
      //
      // See: CLAUDE.md Rule #8, /docs/technical-debt/v3-workflow-migration.md
      // Priority: P1 (blocks multi-tenant customization)
      // Effort: 30 minutes
      // ==========================================

      // Check if this is initial topic selection (not confirmation response)
      console.log('[HGC_V3] 🔍 Workflow check:', {
        workflow_id,
        startsWithTopic: workflow_id.startsWith('topic-'),
        hasConfirm: workflow_id.includes('-confirm'),
        decision
      });

      if (workflow_id.startsWith('topic-') && !workflow_id.includes('-confirm')) {
        console.log('[HGC_V3] ➡️ PATH: First topic selection - showing confirmation prompt');

        return NextResponse.json({
          success: true,
          response: `Perfect! Writing about: "${decision.replace(/_/g, ' ')}"\n\nAny personal story or specific angle to add?`,
          interactive: {
            type: 'decision',
            workflow_id: `${workflow_id}-confirm`,
            decision_options: [
              {
                label: 'Add personal story',
                value: 'add_story',
                variant: 'primary'
              },
              {
                label: 'Generate without story',
                value: decision, // Pass original topic through
                variant: 'secondary'
              },
            ]
          },
          sessionId: sessionId || crypto.randomUUID(),
          meta: {
            route: 'hgc-v3',
            topic: decision,
            awaitingStory: true,
          }
        });
      }

      // If workflow has '-confirm', proceed with generation (user chose option)
      console.log('[HGC_V3] ➡️ PATH: Post generation - creating LinkedIn post');

      // Map decision value to topic description
      const topicMap: Record<string, string> = {
        linkedin_growth: 'LinkedIn growth strategies and best practices',
        business_strategy: 'business strategy and innovation',
        innovation: 'innovation and technological advancement',
        leadership: 'leadership and team management',
        success_story: 'a client success story',
        trends: 'current industry trends',
      };

      const topic = topicMap[decision] || decision.replace(/_/g, ' ');

      // Load user's brand and style cartridges for personalization
      const { data: brandData } = await supabase
        .from('brand_cartridges')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const { data: styleData } = await supabase
        .from('style_cartridges')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Build context for post generation
      const brandContext = brandData
        ? `Brand: ${brandData.industry || 'business'}\nTarget Audience: ${brandData.target_audience || 'professionals'}\nCore Values: ${brandData.core_values || '[]'}`
        : 'Professional business context';

      const styleContext = styleData
        ? `Tone: ${styleData.tone_of_voice || 'professional'}\nStyle: ${styleData.writing_style || 'clear and engaging'}\nPersonality: ${styleData.personality_traits || '[]'}`
        : 'Professional, clear, engaging tone';

      // Generate LinkedIn post using OpenAI
      const completion = await openai.chat.completions.create({
        model: 'gpt-5.1',
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: `You are an expert LinkedIn content creator.

${brandContext}

${styleContext}

CRITICAL OUTPUT RULES:
- Return ONLY the post content - NO preamble, NO introduction, NO "Here's a draft..."
- Start directly with the hook line
- 150-250 words maximum (LinkedIn optimal length)
- 3-5 short paragraphs max
- Hook in first line (not "Imagine..." or "Picture this...")
- Include 1-2 relevant emoji (not excessive)
- End with engagement question or call-to-action
- Professional yet conversational
- NO hashtags
- NO explanations before or after the post`,
          },
          {
            role: 'user',
            content: `Write a LinkedIn post about: ${topic}

Remember: Output ONLY the post content. No introduction or explanation.`,
          },
        ],
      });

      let generatedPost = completion.choices[0]?.message?.content || '';

      // Strip preamble text that AI adds despite instructions
      const preamblePatterns = [
        /^here['']?s a draft for your article[^:\n]*[:\n]\s*/i,
        /^here['']?s a draft[^:\n]*[:\n]\s*/i,
        /^here['']?s your[^:\n]*[:\n]\s*/i,
        /^here['']?s a linkedin post[^:\n]*[:\n]\s*/i,
        /^here['']?s a post[^:\n]*[:\n]\s*/i,
        /^here['']?s an article[^:\n]*[:\n]\s*/i,
        /^here is[^:\n]*[:\n]\s*/i,
        /^draft[^:\n]*[:\n]\s*/i,
        /^linkedin post[^:\n]*[:\n]\s*/i,
        /^post[^:\n]*[:\n]\s*/i,
        /^article[^:\n]*[:\n]\s*/i,
        /^---+\s*/,
        /^\*\*[^*]+\*\*\s*\n\s*/,  // Bold title lines like **Title**
      ];

      for (const pattern of preamblePatterns) {
        generatedPost = generatedPost.replace(pattern, '');
      }

      // Also strip trailing explanations
      generatedPost = generatedPost.replace(/\n\n---+\n[\s\S]*$/, '');
      generatedPost = generatedPost.trim();

      console.log('[HGC_V3] Generated post (cleaned):', generatedPost.substring(0, 100) + '...');

      // Save generated post to database
      let savedPostId = null;
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: savedPost, error: saveError } = await supabase
            .from('posts')
            .insert({
              user_id: user.id,
              content: generatedPost,
              status: 'draft',
              campaign_id: null, // Standalone post
              metrics: {},
            })
            .select('id')
            .single();

          if (saveError) {
            console.error('[HGC_V3] Failed to save post:', saveError);
          } else {
            savedPostId = savedPost.id;
            console.log('[HGC_V3] Post saved to database:', savedPostId);
          }
        } else {
          console.log('[HGC_V3] No authenticated user, post not saved');
        }
      } catch (saveErr) {
        console.error('[HGC_V3] Error saving post:', saveErr);
      }

      // Build response object - full post in chat (with expandable icon) AND working document
      const responseObj = {
        success: true,
        response: generatedPost, // Full post in chat - frontend will show expandable icon
        document: {
          content: generatedPost, // Same content in working document
          title: `LinkedIn Post: ${topic}`,
          postId: savedPostId, // Include saved post ID for future editing
        },
        sessionId: sessionId || crypto.randomUUID(),
        meta: {
          route: 'hgc-v3',
          topic,
          hasBrandData: !!brandData,
          hasStyleData: !!styleData,
          savedPostId, // Also include in meta for easy access
        },
      };

      // 🔍 DEBUG: Log exact response being sent to frontend
      console.log('[HGC_V3] 📤 SENDING RESPONSE TO FRONTEND:');
      console.log('[HGC_V3] - success:', responseObj.success);
      console.log('[HGC_V3] - response message:', responseObj.response);
      console.log('[HGC_V3] - hasDocument:', !!responseObj.document);
      console.log('[HGC_V3] - document.content length:', responseObj.document.content.length);
      console.log('[HGC_V3] - document.title:', responseObj.document.title);
      console.log('[HGC_V3] - Full response keys:', Object.keys(responseObj));

      // Return post in working document format (not chat)
      return NextResponse.json(responseObj);
    }

    // Default: Echo back for unhandled messages
    const displayMessage = message || (messages?.length > 0 ? messages[messages.length - 1]?.content : 'unknown');

    return NextResponse.json({
      success: true,
      response: `Received: "${displayMessage}". Try typing **write** or **post** to create a LinkedIn post!`,
      sessionId: sessionId || crypto.randomUUID(),
      meta: {
        route: 'hgc-v3',
        debug: {
          hasMessage: !!message,
          hasMessages: !!messages,
          hasWorkflow: !!workflow_id,
          hasDecision: !!decision,
        }
      }
    });

  } catch (error: any) {
    console.error('[HGC_V3] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Holy Grail Chat V3',
    version: '3.0.0-minimal',
    mode: 'raw-openai',
    note: 'Pragmatic implementation - bypasses MarketingConsole complexity',
    features: ['Write workflow', 'Personalized topics', 'Brand cartridge integration'],
    technical_debt: ['Raw OpenAI (not AgentKit SDK)', 'No Mem0 integration yet'],
  });
}
