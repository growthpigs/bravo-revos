import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

/**
 * POST /api/hgc
 * Holy Grail Chat - Native TypeScript Implementation
 *
 * NO Python backend. Uses OpenAI function calling directly with Supabase queries.
 * Architecture: Next.js → OpenAI → Tools → Supabase → Response
 */

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

// Tool: Get all campaigns
const get_all_campaigns = {
  type: 'function' as const,
  function: {
    name: 'get_all_campaigns',
    description: 'Get ALL campaigns for current user with basic metrics. NO parameters needed. Use when user asks to show, list, or see their campaigns.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
}

// Tool: Get specific campaign
const get_campaign_by_id = {
  type: 'function' as const,
  function: {
    name: 'get_campaign_by_id',
    description: 'Get detailed metrics for ONE specific campaign by ID. Use when user mentions a specific campaign name or asks for campaign details.',
    parameters: {
      type: 'object',
      properties: {
        campaign_id: {
          type: 'string',
          description: 'The campaign UUID'
        }
      },
      required: ['campaign_id']
    }
  }
}

// Tool: Create campaign
const create_campaign = {
  type: 'function' as const,
  function: {
    name: 'create_campaign',
    description: 'Create a new campaign in DRAFT status. User must review and activate in dashboard.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Campaign name'
        },
        voice_id: {
          type: 'string',
          description: 'Voice cartridge ID to use'
        },
        description: {
          type: 'string',
          description: 'Campaign description (optional)'
        }
      },
      required: ['name', 'voice_id']
    }
  }
}

// Tool: Schedule post
const schedule_post = {
  type: 'function' as const,
  function: {
    name: 'schedule_post',
    description: 'Queue a post for review. User must approve in dashboard before publishing.',
    parameters: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Post content'
        },
        schedule_time: {
          type: 'string',
          description: 'ISO timestamp for when to publish'
        },
        campaign_id: {
          type: 'string',
          description: 'Campaign ID (optional)'
        }
      },
      required: ['content', 'schedule_time']
    }
  }
}

// Tool handlers
async function handleGetAllCampaigns() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('campaigns')
    .select('id, name, status, created_at, lead_magnet_source')
    .order('created_at', { ascending: false })

  if (error) {
    return { success: false, error: error.message }
  }

  return {
    success: true,
    campaigns: data || [],
    count: data?.length || 0
  }
}

async function handleGetCampaignById(campaign_id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaign_id)
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  // Get lead count
  const { count: leadsCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaign_id)

  // Get posts count
  const { count: postsCount } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaign_id)

  return {
    success: true,
    campaign: {
      ...data,
      metrics: {
        leads_generated: leadsCount || 0,
        posts_created: postsCount || 0
      }
    }
  }
}

async function handleCreateCampaign(name: string, voice_id: string, description?: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Get user's client_id
  const { data: userData } = await supabase
    .from('users')
    .select('client_id')
    .eq('id', user.id)
    .single()

  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      name,
      voice_id,
      description,
      status: 'draft',
      client_id: userData?.client_id,
      created_by: user.id
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return {
    success: true,
    campaign: data,
    message: 'Campaign created in DRAFT status. Review in dashboard to activate.'
  }
}

async function handleSchedulePost(content: string, schedule_time: string, campaign_id?: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({
      content,
      scheduled_at: schedule_time,
      campaign_id,
      status: 'scheduled',
      user_id: user.id
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return {
    success: true,
    post: data,
    message: 'Post scheduled for review. Approve in dashboard to publish.'
  }
}

// Main POST handler
export async function POST(request: NextRequest) {
  const requestStartTime = Date.now()

  try {
    console.log('[HGC_TS] Native TypeScript request received')
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('[HGC_TS] No authenticated user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[HGC_TS] User authenticated:', user.id)

    // Parse request
    const { messages } = await request.json()
    console.log('[HGC_TS] Messages received:', messages.length)

    // Convert messages to OpenAI format
    const formattedMessages = messages.map((msg: any) => ({
      role: msg.role || 'user',
      content: msg.content || msg.message || msg
    }))

    console.log('[HGC_TS] Calling OpenAI with function calling...')
    const aiStartTime = Date.now()

    // Call OpenAI with function calling
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are RevOS Intelligence, an AI co-founder helping with LinkedIn growth and campaign management.

PERSONALITY & COMMUNICATION:
- Be conversational, insightful, and strategic (NOT a data dump bot)
- Synthesize information into actionable insights
- Use markdown for clarity: **bold** for emphasis, bullet lists for multiple items
- Think like a growth strategist, not a database query

TOOL SELECTION RULES (FOLLOW EXACTLY):

When user asks about CAMPAIGNS/BUSINESS DATA:
→ ALWAYS use business tools, NOT memory
- "show me campaigns" / "list campaigns" / "what campaigns do I have?" → get_all_campaigns()
- "how is campaign X doing?" → get_campaign_by_id(campaign_id="...")
- "tell me about campaign [name]" → get_all_campaigns() then identify campaign

When user wants to CREATE or SCHEDULE:
- "create a campaign" → create_campaign(name, voice_id, description)
- "schedule a post" → schedule_post(content, time, campaign_id)

IMPORTANT:
1. ALWAYS call the appropriate tool - NEVER respond without using tools for campaign queries
2. Campaigns = database tools (get_all_campaigns, get_campaign_by_id)
3. Be helpful and ALWAYS use your tools to fetch real data!
4. If user asks about campaigns, use get_all_campaigns() to see what exists first`
        },
        ...formattedMessages
      ],
      tools: [
        get_all_campaigns,
        get_campaign_by_id,
        create_campaign,
        schedule_post
      ],
      tool_choice: 'auto'
    })

    const aiDuration = Date.now() - aiStartTime
    console.log(`[HGC_TS] OpenAI response: ${aiDuration}ms`)

    const assistantMessage = response.choices[0]?.message

    // Handle tool calls
    if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
      console.log(`[HGC_TS] Processing ${assistantMessage.tool_calls.length} tool calls`)
      const toolResults = []

      for (const toolCall of assistantMessage.tool_calls) {
        if (toolCall.type !== 'function') continue

        const functionName = toolCall.function.name
        const functionArgs = JSON.parse(toolCall.function.arguments)
        console.log(`[HGC_TS] Tool call: ${functionName}`, functionArgs)

        let result
        switch (functionName) {
          case 'get_all_campaigns':
            result = await handleGetAllCampaigns()
            break
          case 'get_campaign_by_id':
            result = await handleGetCampaignById(functionArgs.campaign_id)
            break
          case 'create_campaign':
            result = await handleCreateCampaign(
              functionArgs.name,
              functionArgs.voice_id,
              functionArgs.description
            )
            break
          case 'schedule_post':
            result = await handleSchedulePost(
              functionArgs.content,
              functionArgs.schedule_time,
              functionArgs.campaign_id
            )
            break
          default:
            result = { error: 'Unknown function' }
        }

        console.log(`[HGC_TS] Tool result: ${JSON.stringify(result).substring(0, 100)}`)

        toolResults.push({
          tool_call_id: toolCall.id,
          role: 'tool' as const,
          name: functionName,
          content: JSON.stringify(result)
        })
      }

      // Get final response with tool results
      console.log('[HGC_TS] Getting final response with tool results...')
      const finalResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are RevOS Intelligence, an AI co-founder for LinkedIn growth.

RESPONSE QUALITY RULES:
1. **Synthesize, don't dump**: Transform raw data into strategic insights
2. **Be conversational**: Sound like a helpful co-founder, not a report generator
3. **Use markdown**: Bold key info, use bullets for lists, format for readability
4. **Provide context**: Don't just list data - explain what it means and what to do next
5. **Be actionable**: Always end with next steps or suggestions

EXAMPLES:
❌ BAD: "You have 7 campaigns: Campaign 1 (draft), Campaign 2 (draft)..."
✅ GOOD: "You're running **7 campaigns** right now. Most are still in draft - want help getting them live? Your **AI Leadership** campaign looks promising!"

❌ BAD: "Campaign ID abc-123 has 15 leads, 3 posts, created on 2024-01-01"
✅ GOOD: "Your **AI Leadership campaign** is performing well with **15 qualified leads** from just 3 posts. That's a 5:1 lead-to-post ratio - nice work!"

Present tool results with intelligence, context, and strategic value.`
          },
          ...formattedMessages,
          assistantMessage,
          ...toolResults
        ]
      })

      const totalDuration = Date.now() - requestStartTime
      console.log(`[HGC_TIMING] Total request: ${totalDuration}ms`)

      const finalText = finalResponse.choices[0]?.message?.content || 'No response'

      // Stream response word-by-word for better UX
      const encoder = new TextEncoder()
      const words = finalText.split(' ')

      const stream = new ReadableStream({
        async start(controller) {
          for (let i = 0; i < words.length; i++) {
            controller.enqueue(encoder.encode(words[i] + ' '))
            await new Promise(resolve => setTimeout(resolve, 10))
          }
          controller.close()
        }
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      })
    }

    // No tool calls - return direct response
    console.log('[HGC_TS] No tool calls made')
    const totalDuration = Date.now() - requestStartTime
    console.log(`[HGC_TIMING] Total request: ${totalDuration}ms`)

    return NextResponse.json({
      response: assistantMessage?.content || 'I can help you with your LinkedIn campaigns. Try asking "show me my campaigns".',
      success: true
    })

  } catch (error: any) {
    console.error('[HGC_TS] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/hgc
 * Health check endpoint
 */
export async function GET() {
  return Response.json({
    status: 'ok',
    service: 'Holy Grail Chat',
    version: '4.0.0-typescript',
    mode: 'native-typescript',
    backend: 'OpenAI Function Calling',
    features: ['OpenAI gpt-4o', 'Direct Supabase', 'No Python', 'Fast Response'],
  })
}
