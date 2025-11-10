import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { hgcRequestSchema } from '@/lib/validations/hgc'

/**
 * POST /api/hgc
 * Holy Grail Chat - Native TypeScript with OpenAI Function Calling
 *
 * Architecture: Next.js → OpenAI → 8 Tools → Supabase → Response
 * NO Python backend. AgentKit = chat orchestration interface.
 */

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

// ============================================================
// TOOL DEFINITIONS (OpenAI Function Calling)
// ============================================================

// Tool 1: Get all campaigns
const get_all_campaigns = {
  type: 'function' as const,
  function: {
    name: 'get_all_campaigns',
    description: 'Get ALL campaigns for current user with basic info. Use when user asks to show, list, or see their campaigns.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
}

// Tool 2: Get specific campaign
const get_campaign_by_id = {
  type: 'function' as const,
  function: {
    name: 'get_campaign_by_id',
    description: 'Get detailed info for ONE specific campaign by ID.',
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

// Tool 3: Create campaign
const create_campaign = {
  type: 'function' as const,
  function: {
    name: 'create_campaign',
    description: 'Create a new campaign in DRAFT status.',
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

// Tool 4: Schedule post
const schedule_post = {
  type: 'function' as const,
  function: {
    name: 'schedule_post',
    description: 'Queue a post for review.',
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

// Tool 5: Trigger DM scraper (NEW)
const trigger_dm_scraper = {
  type: 'function' as const,
  function: {
    name: 'trigger_dm_scraper',
    description: 'Start monitoring LinkedIn post for DMs. Creates scrape job that runs every 5 minutes. Use when user wants to monitor comments or track leads.',
    parameters: {
      type: 'object',
      properties: {
        post_id: {
          type: 'string',
          description: 'Post UUID to monitor'
        },
        trigger_word: {
          type: 'string',
          description: 'Word to detect in comments (e.g., "interested", "guide"). Default: "guide"'
        },
        lead_magnet_url: {
          type: 'string',
          description: 'Backup link to send if webhook fails (optional)'
        }
      },
      required: ['post_id']
    }
  }
}

// Tool 6: Get pod members (NEW)
const get_pod_members = {
  type: 'function' as const,
  function: {
    name: 'get_pod_members',
    description: 'Get all active members in an engagement pod.',
    parameters: {
      type: 'object',
      properties: {
        pod_id: {
          type: 'string',
          description: 'Pod UUID'
        }
      },
      required: ['pod_id']
    }
  }
}

// Tool 7: Send pod repost links (NEW)
const send_pod_repost_links = {
  type: 'function' as const,
  function: {
    name: 'send_pod_repost_links',
    description: 'Queue repost links to be sent to pod members via email/Slack. Use when user wants to share post with pod for engagement.',
    parameters: {
      type: 'object',
      properties: {
        post_id: {
          type: 'string',
          description: 'Post UUID'
        },
        pod_id: {
          type: 'string',
          description: 'Pod UUID'
        },
        linkedin_url: {
          type: 'string',
          description: 'LinkedIn post URL to share'
        }
      },
      required: ['post_id', 'pod_id', 'linkedin_url']
    }
  }
}

// Tool 8: Update campaign status (NEW)
const update_campaign_status = {
  type: 'function' as const,
  function: {
    name: 'update_campaign_status',
    description: 'Change campaign status. Use when user wants to activate, pause, or complete a campaign.',
    parameters: {
      type: 'object',
      properties: {
        campaign_id: {
          type: 'string',
          description: 'Campaign UUID'
        },
        status: {
          type: 'string',
          enum: ['draft', 'active', 'paused', 'completed'],
          description: 'New status'
        }
      },
      required: ['campaign_id', 'status']
    }
  }
}

// ============================================================
// TOOL HANDLERS (Database Operations Only)
// ============================================================

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

async function handleCreateCampaign(name: string, voice_id?: string, description?: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Get user's client_id
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('client_id')
    .eq('id', user.id)
    .single()

  if (userError || !userData?.client_id) {
    console.error('[HGC_TS] User client_id not found:', userError?.message)
    return {
      success: false,
      error: 'User client not found. Please ensure your account is properly configured.'
    }
  }

  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      name,
      voice_id: voice_id || null,
      description,
      status: 'draft',
      client_id: userData.client_id,
      created_by: user.id
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  // Warning if no voice cartridge
  let message = 'Campaign created in DRAFT status. Review in dashboard to activate.'
  if (!voice_id) {
    message += '\n\n⚠️ WARNING: This campaign is not using a voice cartridge. We recommend adding one for better content generation quality.'
  }

  return {
    success: true,
    campaign: data,
    message
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
      scheduled_for: schedule_time,
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
    message: 'Post queued for review. Approve in dashboard to publish.'
  }
}

// NEW TOOL HANDLERS

async function handleTriggerDMScraper(post_id: string, trigger_word?: string, lead_magnet_url?: string) {
  const supabase = await createClient()

  // Get post details to extract unipile info
  const { data: post } = await supabase
    .from('posts')
    .select('unipile_post_id, linkedin_account_id, campaign_id')
    .eq('id', post_id)
    .single()

  if (!post) {
    return { success: false, error: 'Post not found' }
  }

  // Get linkedin account unipile ID
  const { data: linkedinAccount } = await supabase
    .from('linkedin_accounts')
    .select('unipile_account_id')
    .eq('id', post.linkedin_account_id)
    .single()

  if (!linkedinAccount) {
    return { success: false, error: 'LinkedIn account not found' }
  }

  // Create scrape job
  const { data, error } = await supabase
    .from('scrape_jobs')
    .insert({
      post_id,
      campaign_id: post.campaign_id,
      unipile_post_id: post.unipile_post_id,
      unipile_account_id: linkedinAccount.unipile_account_id,
      trigger_word: trigger_word || 'guide',
      lead_magnet_url,
      status: 'scheduled',
      next_check: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min from now
      poll_interval_minutes: 5
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return {
    success: true,
    job: data,
    message: `DM monitoring started. Checking every 5 minutes for trigger word "${trigger_word || 'guide'}".`
  }
}

async function handleGetPodMembers(pod_id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pod_members')
    .select('user_id, linkedin_account_id, status')
    .eq('pod_id', pod_id)
    .eq('status', 'active')

  if (error) {
    return { success: false, error: error.message }
  }

  // Get user details for each member
  const memberIds = data.map(m => m.user_id)
  const { data: users } = await supabase
    .from('users')
    .select('id, email, full_name')
    .in('id', memberIds)

  const members = data.map(m => {
    const user = users?.find(u => u.id === m.user_id)
    return {
      user_id: m.user_id,
      name: user?.full_name || user?.email || 'Unknown',
      status: m.status
    }
  })

  return {
    success: true,
    members,
    count: members.length
  }
}

async function handleSendPodLinks(post_id: string, pod_id: string, linkedin_url: string) {
  const supabase = await createClient()

  // Get pod members
  const { data: members } = await supabase
    .from('pod_members')
    .select('user_id')
    .eq('pod_id', pod_id)
    .eq('status', 'active')

  if (!members || members.length === 0) {
    return { success: false, error: 'No active pod members found' }
  }

  // Create notification records (background worker will send actual emails)
  const notifications = members.map(m => ({
    user_id: m.user_id,
    type: 'pod_repost',
    post_id,
    linkedin_url,
    status: 'pending',
    created_at: new Date().toISOString()
  }))

  const { error } = await supabase
    .from('notifications')
    .insert(notifications)

  if (error) {
    return { success: false, error: error.message }
  }

  return {
    success: true,
    message: `Repost links queued for ${members.length} pod members. They'll receive notifications shortly.`,
    members_count: members.length
  }
}

async function handleUpdateCampaignStatus(campaign_id: string, status: string) {
  const supabase = await createClient()

  // Validate status
  const validStatuses = ['draft', 'active', 'paused', 'completed']
  if (!validStatuses.includes(status)) {
    return { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }
  }

  const { data, error } = await supabase
    .from('campaigns')
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', campaign_id)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return {
    success: true,
    campaign: data,
    message: `Campaign status updated to ${status}.`
  }
}

// ============================================================
// MAIN POST HANDLER
// ============================================================

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

    // Parse and validate request
    const body = await request.json()
    const validationResult = hgcRequestSchema.safeParse(body)

    if (!validationResult.success) {
      console.log('[HGC_TS] Invalid request:', validationResult.error.message)
      return NextResponse.json(
        { error: 'Invalid request format', details: validationResult.error.format() },
        { status: 400 }
      )
    }

    const { messages } = validationResult.data
    console.log('[HGC_TS] Messages received:', messages.length)

    // Messages are already validated, use them directly
    const formattedMessages = messages

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

When user wants to CREATE or MANAGE:
- "create a campaign" → create_campaign(name, voice_id, description)
- "schedule a post" → schedule_post(content, time, campaign_id)
- "start DM monitoring" / "monitor post for leads" → trigger_dm_scraper(post_id, trigger_word)
- "activate campaign" / "pause campaign" → update_campaign_status(campaign_id, status)

When user wants POD ENGAGEMENT:
- "who's in my pod?" → get_pod_members(pod_id)
- "send repost links to pod" / "share with pod" → send_pod_repost_links(post_id, pod_id, linkedin_url)

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
        schedule_post,
        trigger_dm_scraper,
        get_pod_members,
        send_pod_repost_links,
        update_campaign_status
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

        // Parse function arguments with error handling
        let functionArgs
        try {
          functionArgs = JSON.parse(toolCall.function.arguments)
        } catch (e) {
          console.error('[HGC_TS] Invalid function arguments JSON:', e)
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool' as const,
            name: functionName,
            content: JSON.stringify({
              success: false,
              error: 'Invalid tool arguments format'
            })
          })
          continue
        }

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
          case 'trigger_dm_scraper':
            result = await handleTriggerDMScraper(
              functionArgs.post_id,
              functionArgs.trigger_word,
              functionArgs.lead_magnet_url
            )
            break
          case 'get_pod_members':
            result = await handleGetPodMembers(functionArgs.pod_id)
            break
          case 'send_pod_repost_links':
            result = await handleSendPodLinks(
              functionArgs.post_id,
              functionArgs.pod_id,
              functionArgs.linkedin_url
            )
            break
          case 'update_campaign_status':
            result = await handleUpdateCampaignStatus(
              functionArgs.campaign_id,
              functionArgs.status
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
    version: '5.0.0-typescript-agentkit',
    mode: 'native-typescript',
    backend: 'OpenAI Function Calling',
    features: ['OpenAI gpt-4o', 'Direct Supabase', '8 AgentKit Tools', 'Fast Response'],
    tools: [
      'get_all_campaigns',
      'get_campaign_by_id',
      'create_campaign',
      'schedule_post',
      'trigger_dm_scraper',
      'get_pod_members',
      'send_pod_repost_links',
      'update_campaign_status'
    ]
  })
}
