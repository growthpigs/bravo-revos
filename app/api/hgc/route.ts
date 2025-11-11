import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { hgcRequestSchema } from '@/lib/validations/hgc'
import { createLinkedInPost } from '@/lib/unipile-client'

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
      required: ['name']
    }
  }
}

// Tool 4: Schedule post
const schedule_post = {
  type: 'function' as const,
  function: {
    name: 'schedule_post',
    description: 'Queue a post for review. All parameters are optional - if missing, user will be prompted with inline forms.',
    parameters: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Post content (optional - will be prompted if missing)'
        },
        schedule_time: {
          type: 'string',
          description: 'ISO timestamp for when to publish (optional - will be prompted if missing)'
        },
        campaign_id: {
          type: 'string',
          description: 'Campaign ID (optional - will show campaign selector if missing)'
        }
      },
      required: []
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

// Tool 9: POST TO LINKEDIN NOW (Creates actual LinkedIn post visible on profile)
const execute_linkedin_campaign = {
  type: 'function' as const,
  function: {
    name: 'execute_linkedin_campaign',
    description: 'POST CONTENT TO LINKEDIN RIGHT NOW - creates an actual LinkedIn post visible on user\'s profile + starts monitoring for trigger words. Use when user wants to post campaign content to LinkedIn. ALWAYS call this after getting content from user.',
    parameters: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'LinkedIn post content'
        },
        campaign_id: {
          type: 'string',
          description: 'Campaign UUID to associate with'
        },
        trigger_word: {
          type: 'string',
          description: 'Word to monitor in comments (e.g., "interested", "guide"). Default: "interested"'
        }
      },
      required: ['content', 'campaign_id']
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

  const { data, error} = await supabase
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

async function handleExecuteLinkedInCampaign(
  content: string,
  campaign_id: string,
  trigger_word?: string
) {
  const supabase = await createClient()

  try {
    console.log('[EXECUTE_CAMPAIGN] Starting campaign execution:', {
      campaign_id,
      content_length: content.length,
      trigger_word: trigger_word || 'interested'
    })

    // Get user's LinkedIn account
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data: linkedinAccounts } = await supabase
      .from('linkedin_accounts')
      .select('unipile_account_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)

    if (!linkedinAccounts || linkedinAccounts.length === 0) {
      return {
        success: false,
        error: 'No active LinkedIn account found. Please connect your LinkedIn account first.'
      }
    }

    const unipileAccountId = linkedinAccounts[0].unipile_account_id

    // 1. Post to LinkedIn via Unipile
    console.log('[EXECUTE_CAMPAIGN] Posting to LinkedIn...')
    const post = await createLinkedInPost(unipileAccountId, content)

    console.log('[EXECUTE_CAMPAIGN] Post created:', {
      id: post.id,
      url: post.url
    })

    // 2. Store post in database
    const { data: dbPost, error: postError } = await supabase
      .from('posts')
      .insert({
        campaign_id,
        unipile_post_id: post.id,
        content,
        status: 'published',
        published_at: new Date().toISOString(),
        post_url: post.url
      })
      .select()
      .single()

    if (postError) {
      console.error('[EXECUTE_CAMPAIGN] Failed to store post:', postError)
      return {
        success: false,
        error: `Post published but failed to save to database: ${postError.message}`
      }
    }

    console.log('[EXECUTE_CAMPAIGN] Post stored in database:', dbPost.id)

    // 3. Create monitoring job
    const effectiveTriggerWord = trigger_word || 'interested'
    const { data: job, error: jobError } = await supabase
      .from('scrape_jobs')
      .insert({
        post_id: dbPost.id,
        linkedin_post_id: post.id,
        trigger_word: effectiveTriggerWord,
        status: 'scheduled',
        next_check: new Date(Date.now() + 5 * 60 * 1000).toISOString() // Check in 5 minutes
      })
      .select()
      .single()

    if (jobError) {
      console.error('[EXECUTE_CAMPAIGN] Failed to create monitoring job:', jobError)
      // Post is live, so return partial success
      return {
        success: true,
        post_url: post.url,
        post_id: post.id,
        monitoring: 'failed',
        warning: `Post is live but monitoring setup failed: ${jobError.message}`
      }
    }

    console.log('[EXECUTE_CAMPAIGN] Monitoring job created:', job.id)

    // Update campaign to active if it was draft
    await supabase
      .from('campaigns')
      .update({ status: 'active' })
      .eq('id', campaign_id)
      .eq('status', 'draft')

    return {
      success: true,
      post_url: post.url,
      post_id: post.id,
      linkedin_id: post.id,
      monitoring: 'active',
      trigger_word: effectiveTriggerWord,
      message: `✅ Campaign launched! Post is live on LinkedIn and monitoring for "${effectiveTriggerWord}" responses.`
    }
  } catch (error) {
    console.error('[EXECUTE_CAMPAIGN] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to execute campaign'
    }
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

    // Ensure messages alternate between user and assistant roles
    // OpenAI requires strict alternation, so merge consecutive messages with same role
    const formattedMessages = messages.reduce((acc, msg, idx) => {
      if (idx === 0) {
        return [msg]
      }

      const lastMsg = acc[acc.length - 1]

      // If same role as previous message, merge content
      if (lastMsg.role === msg.role) {
        console.log(`[HGC_TS] Merging consecutive ${msg.role} messages`)
        lastMsg.content = lastMsg.content + '\n\n' + msg.content
        return acc
      }

      return [...acc, msg]
    }, [] as typeof messages)

    console.log('[HGC_TS] Formatted to', formattedMessages.length, 'alternating messages')

    // ========================================
    // INLINE WORKFLOW HANDLING
    // Handle decision/campaign/datetime selections from inline forms
    // ========================================

    // Check if this is a workflow step (decision made, campaign selected, or datetime selected)
    const workflowId = body.workflow_id as string | undefined
    const decision = body.decision as string | undefined
    const selectedCampaignId = body.campaign_id as string | undefined
    const selectedScheduleTime = body.schedule_time as string | undefined

    // STEP 1: User made a decision (just write, create new, or select existing)
    if (workflowId && decision) {
      console.log('[HGC_INLINE] Decision received:', decision, 'workflow:', workflowId)

      if (decision === 'continue') {
        // User wants to continue writing - just dismiss the workflow
        return NextResponse.json({
          success: true,
          response: 'Got it! Keep writing.',
        })
      } else if (decision === 'just_write') {
        // User wants to write without campaign - handled on frontend
        return NextResponse.json({
          success: true,
          response: 'Got it! Go ahead and write your post. You can save it and link it to a campaign anytime.',
        })
      } else if (decision === 'select_existing') {
        // Fetch user's campaigns
        const campaignsResult = await handleGetAllCampaigns()

        if (!campaignsResult.success) {
          return NextResponse.json({
            success: false,
            response: 'Failed to fetch campaigns. Please try again.',
          })
        }

        // Return campaign selector
        return NextResponse.json({
          success: true,
          response: 'Here are your campaigns. Which one would you like to use?',
          interactive: {
            type: 'campaign_select',
            workflow_id: workflowId,
            campaigns: campaignsResult.campaigns.map((c: any) => ({
              id: c.id,
              name: c.name || 'Untitled Campaign',
              description: c.status === 'draft' ? 'Draft campaign' : undefined,
            })),
          },
        })
      } else if (decision === 'create_new') {
        // TODO: Implement inline campaign creation
        return NextResponse.json({
          success: true,
          response: 'Campaign creation coming soon! For now, please select an existing campaign.',
        })
      }
    }

    // STEP 2: User selected a campaign
    if (workflowId && selectedCampaignId && !selectedScheduleTime) {
      console.log('[HGC_INLINE] Campaign selected:', selectedCampaignId, 'workflow:', workflowId)

      // Check if this is a LAUNCH workflow (post NOW) or SCHEDULE workflow (post later)
      const isLaunchWorkflow = workflowId.startsWith('launch-')

      if (isLaunchWorkflow) {
        // LAUNCH workflow: Ask for content to post NOW
        console.log('[HGC_INLINE] Launch workflow detected - asking for content')

        // Get campaign details for context
        const campaignResult = await handleGetCampaignById(selectedCampaignId)
        const campaignName = campaignResult.success ? campaignResult.campaign?.name : 'this campaign'

        return NextResponse.json({
          success: true,
          response: `Great! What content should I post to LinkedIn for **${campaignName}**?\n\nYou can either:\n1. Provide the exact content you want to post\n2. Say "generate it" and I'll create content from the campaign description\n\n<!-- campaign_id: ${selectedCampaignId} -->`,
          workflow_id: workflowId, // Keep workflow active
          campaign_id: selectedCampaignId, // Store for next step
        })
      } else {
        // SCHEDULE workflow: Show datetime picker
        // Extract post content from conversation history (for final step)
        const postContentMatch = messages
          .filter(m => m.role === 'user')
          .find(m => m.content.match(/schedule.*post|post.*about/i))

        const postContent = postContentMatch
          ? postContentMatch.content.replace(/schedule.*post|post.*about/i, '').trim() || 'Untitled post'
          : 'Untitled post'

        // Return datetime picker WITH campaign_id and content stored
        return NextResponse.json({
          success: true,
          response: 'When would you like to schedule this post?',
          interactive: {
            type: 'datetime_select',
            workflow_id: workflowId,
            campaign_id: selectedCampaignId, // Store for next step
            content: postContent, // Store for next step
            initial_datetime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // Tomorrow
          },
        })
      }
    }

    // STEP 3: User selected a datetime (final step - execute schedule)
    if (workflowId && selectedScheduleTime) {
      console.log('[HGC_INLINE] DateTime selected:', selectedScheduleTime, 'workflow:', workflowId)

      // Get campaign_id and content from the message with datetime picker
      // The frontend should have sent these back
      let campaignId = selectedCampaignId
      let postContent = body.content as string | undefined

      // Fallback: Extract from message history if not in request
      if (!postContent) {
        const postContentMatch = messages
          .filter(m => m.role === 'user')
          .find(m => m.content.match(/schedule.*post|post.*about/i))

        postContent = postContentMatch
          ? postContentMatch.content.replace(/schedule.*post|post.*about/i, '').trim() || 'Untitled post'
          : 'Untitled post'
      }

      if (!campaignId) {
        // Try to extract from previous messages
        const campaignMatch = messages
          .filter(m => m.role === 'user')
          .find(m => m.content.match(/Selected campaign:/i))

        if (campaignMatch) {
          campaignId = campaignMatch.content.replace(/Selected campaign:\s*/i, '').trim()
        }
      }

      // EXECUTE THE SCHEDULE
      if (campaignId && postContent && selectedScheduleTime) {
        console.log('[HGC_INLINE] Executing schedule_post:', {
          content: postContent,
          campaign_id: campaignId,
          schedule_time: selectedScheduleTime,
        })

        const scheduleResult = await handleSchedulePost({
          content: postContent,
          campaign_id: campaignId,
          schedule_time: selectedScheduleTime,
        })

        if (scheduleResult.success) {
          return NextResponse.json({
            success: true,
            response: `✅ Post scheduled successfully for ${new Date(selectedScheduleTime).toLocaleString()}!\n\nContent: "${postContent}"\nCampaign: ${campaignId}`,
          })
        } else {
          return NextResponse.json({
            success: false,
            response: `Failed to schedule post: ${scheduleResult.error}`,
          })
        }
      } else {
        return NextResponse.json({
          success: false,
          response: `Missing required information: campaign_id=${!!campaignId}, content=${!!postContent}`,
        })
      }
    }

    // ========================================
    // LAUNCH WORKFLOW CONTENT HANDLER
    // Detect if user is providing content after campaign selection in launch workflow
    // ========================================
    const recentMessages = formattedMessages.slice(-3) // Check last 3 messages
    const hasLaunchContentRequest = recentMessages.some(m =>
      m.role === 'assistant' && m.content.includes('What content should I post to LinkedIn')
    )

    if (hasLaunchContentRequest) {
      console.log('[HGC_LAUNCH] Detected content response in launch workflow')

      // Extract campaign_id from recent assistant message
      // It was included in the response at line 796-797
      const assistantMsg = recentMessages.find(m => m.role === 'assistant' && m.content.includes('What content should I post'))

      // Try to find campaign_id in message history
      // Look for the most recent campaign selection
      let campaignId: string | undefined

      // Check if there's a campaign_id in the request body (from button click context)
      if (body.campaign_id) {
        campaignId = body.campaign_id
      }

      // Fallback: Try to extract from message that mentions campaign selection
      if (!campaignId) {
        for (let i = formattedMessages.length - 1; i >= 0; i--) {
          const msg = formattedMessages[i]
          if (msg.content && typeof msg.content === 'string') {
            // Look for campaign UUID pattern
            const uuidMatch = msg.content.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
            if (uuidMatch) {
              campaignId = uuidMatch[0]
              console.log('[HGC_LAUNCH] Found campaign_id in message history:', campaignId)
              break
            }
          }
        }
      }

      // DON'T auto-post! Let GPT-4o handle content generation in chat
      // User says "generate" → AI drafts → User refines → User says "post it" → THEN post
      // So we just fall through to GPT-4o here
    }

    // ========================================
    // INTENT ROUTER - Bypass GPT-4o for known workflows
    // ========================================
    const lastMessage = formattedMessages[formattedMessages.length - 1]
    if (lastMessage && lastMessage.role === 'user') {
      const userMessage = lastMessage.content.toLowerCase()

      // INTENT: Schedule Post
      if (userMessage.match(/schedule.*post|create.*post|post.*about|post.*tomorrow|post.*\d{1,2}(am|pm)/i)) {
        console.log('[HGC_INTENT] Detected schedule_post intent - bypassing GPT-4o')

        // Generate workflow ID
        const workflowId = `workflow-${Date.now()}`

        // Return decision buttons directly
        return NextResponse.json({
          success: true,
          response: 'Would you like to create a new campaign or use an existing one?',
          interactive: {
            type: 'decision',
            workflow_id: workflowId,
            decision_options: [
              {
                label: 'Create New Campaign',
                value: 'create_new',
                icon: 'plus',
                variant: 'primary',
              },
              {
                label: 'Select From Existing Campaigns',
                value: 'select_existing',
                icon: 'list',
                variant: 'secondary',
              },
              {
                label: 'Continue Writing',
                value: 'continue',
                variant: 'secondary',
              },
            ],
          },
        })
      }

      // INTENT: Launch Campaign (Post to LinkedIn NOW)
      if (userMessage.match(/launch.*campaign|post.*campaign|post.*to linkedin/i)) {
        console.log('[HGC_INTENT] Detected launch_campaign intent - showing campaign selector')

        // Fetch campaigns
        const campaignsResult = await handleGetAllCampaigns()

        if (!campaignsResult.success || !campaignsResult.campaigns || campaignsResult.campaigns.length === 0) {
          return NextResponse.json({
            success: false,
            response: 'You don\'t have any campaigns yet. Create one first with "create campaign".',
          })
        }

        // Generate workflow ID
        const workflowId = `launch-${Date.now()}`

        // Return campaign selector directly (skip decision step)
        return NextResponse.json({
          success: true,
          response: 'Which campaign would you like to post to LinkedIn?',
          interactive: {
            type: 'campaign_select',
            workflow_id: workflowId,
            campaigns: campaignsResult.campaigns.map((c: any) => ({
              id: c.id,
              name: c.name || 'Untitled Campaign',
              description: c.status === 'draft' ? 'Draft campaign' : undefined,
            })),
          },
        })
      }

      // INTENT: Create Campaign (future expansion)
      if (userMessage.match(/create.*campaign|new campaign|start.*campaign/i)) {
        console.log('[HGC_INTENT] Detected create_campaign intent - bypassing GPT-4o')
        // TODO: Add inline campaign creation flow
        // For now, fall through to GPT-4o
      }
    }

    console.log('[HGC_TS] Calling OpenAI with function calling...')
    const aiStartTime = Date.now()

    // Call OpenAI with function calling
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are RevOS Intelligence, an AI co-founder helping with LinkedIn growth and campaign management.

MANDATORY EXECUTION RULE (CRITICAL):

When user requests an ACTION (schedule, create, send, trigger, update, delete):
1. Call the appropriate tool IMMEDIATELY - DO NOT discuss or describe what you will do
2. Wait for the tool result
3. ONLY THEN respond to user with the actual result

NEVER say you will do something without calling the tool FIRST.

Example WRONG:
User: "Schedule a post"
You: "Perfect! I'll schedule that for you now!" ← NO! You didn't call schedule_post()

Example CORRECT:
User: "Schedule a post"
You: [IMMEDIATELY call schedule_post(), get result]
You: "✅ Post scheduled successfully for Nov 11 at 10am" ← Only after tool confirms

If the tool returns an error, tell the user the exact error. Never pretend success.

INLINE WORKFLOW (CRITICAL):
When user wants to schedule a post but hasn't specified campaign:
1. Call schedule_post() with content and time (campaign_id can be undefined/null)
2. The system will show inline buttons asking them to choose a campaign
3. DO NOT ask questions - just call the tool immediately

Example:
User: "Schedule a post about AI"
You: [IMMEDIATELY call schedule_post(content="post about AI", schedule_time=null, campaign_id=null)]
System: [Shows inline buttons automatically]

PERSONALITY & COMMUNICATION:
- Be conversational, insightful, and strategic (NOT a data dump bot)
- Synthesize information into actionable insights
- Use markdown for clarity: **bold** for emphasis, bullet lists for multiple items
- Think like a growth strategist, not a database query
- ALWAYS execute actions immediately via tools, NEVER just discuss them

TOOL SELECTION RULES (FOLLOW EXACTLY):

When user asks about CAMPAIGNS/BUSINESS DATA:
→ ALWAYS use business tools, NOT memory
- "show me campaigns" / "list campaigns" / "what campaigns do I have?" → get_all_campaigns()
- "how is campaign X doing?" → get_campaign_by_id(campaign_id="...")
- "tell me about campaign [name]" → get_all_campaigns() then identify campaign

When user wants to CREATE or MANAGE:
- "create a campaign" → create_campaign(name, voice_id, description)
- "schedule a post" / "schedule post" / "post about X" → IMMEDIATELY call schedule_post() with whatever info you have
  * Even if content/time/campaign_id are missing → call schedule_post(content, null, null)
  * The system will show inline forms to collect missing info
  * NEVER ask questions - just call the tool
- "start DM monitoring" / "monitor post for leads" → trigger_dm_scraper(post_id, trigger_word)
- "activate campaign" / "pause campaign" → update_campaign_status(campaign_id, status)

When user wants POD ENGAGEMENT:
- "who's in my pod?" → get_pod_members(pod_id)
- "send repost links to pod" / "share with pod" → send_pod_repost_links(post_id, pod_id, linkedin_url)

🚨 POSTING TO LINKEDIN - WORKING DOCUMENT FLOW 🚨

When user says "launch campaign" or "post to LinkedIn":

STEP 1 - IMMEDIATELY call get_all_campaigns() to trigger campaign selector buttons
- System shows interactive campaign selection buttons
- User clicks their choice

STEP 2 - After campaign selected (handled by backend):
- Backend asks: "What content should I post for [Campaign Name]?"
- User can:
  a) Provide content directly → Go to STEP 3
  b) Say "generate it" → Go to drafting workflow

DRAFTING WORKFLOW (Working Documents):
- User: "generate it" / "write a post"
- You: Draft content based on campaign description/context
- 🚨 CRITICAL: ALWAYS end your response with a clear question offering options:
  * "What would you like to do next? I can refine it, post it to LinkedIn, or start over."
  * "Happy with this? I can post it now, make it shorter, or try a different angle."
  * Give user clear next steps - don't just stop after showing content!
- User: Reviews, refines ("make it shorter", "add emojis", etc.)
- You: Iterate on the content in chat
- User: "post it" / "send it" → Go to STEP 3

STEP 3 - Post to LinkedIn:
- User says "post it" / "send it" / "publish it"
- Extract campaign_id from recent message history (embedded in HTML comment)
- Call execute_linkedin_campaign(content, campaign_id, trigger_word)
- NO confirmation - just POST IT

Example flow:
User: "Launch campaign"
You: [Shows campaign buttons via get_all_campaigns()]
User: [Clicks "Future of AI in Design"]
Backend: "What content should I post for Future of AI in Design?"
User: "Generate it"
You: "Here's a draft: [content]. What would you like to do next? I can post it to LinkedIn, make it shorter, or start over with a different angle."
User: "Make it shorter and add emojis"
You: "Better? [refined content]. Ready to post this? Or want more changes?"
User: "Perfect, post it"
You: [Extracts campaign_id, calls execute_linkedin_campaign()]

CRITICAL:
- NEVER auto-post when user says "generate" - let them review first!
- Campaign_id is embedded in assistant message as HTML comment
- Working documents = iterative drafting in chat before posting

- "post and monitor" / "go live with campaign [ID]" → execute_linkedin_campaign(content, campaign_id, trigger_word)
  * For when user has existing campaign + content ready
  * This posts to LinkedIn + starts monitoring automatically
  * Returns live post URL and monitoring status

CAMPAIGN SELECTION (MANDATORY FORMAT):

When listing campaigns, ALWAYS include full UUID in this exact format:
"1. [Campaign Name] (ID: [full-uuid])"

Then tell user: "Reply with the campaign ID you want to use"

Example response:
"Available campaigns:
1. AI Leadership Campaign (ID: 550e8400-e29b-41d4-a716-446655440000)
2. Content Marketing (ID: 6ba7b810-9dad-11d1-80b4-00c04fd430c8)

Reply with the campaign ID (the UUID) you want to use, or copy-paste the full line."

User can respond with:
- Just the UUID: "550e8400-e29b-41d4-a716-446655440000"
- The full line: "1. AI Leadership Campaign (ID: 550e8400...)"
- Natural language: "Use campaign 550e8400..."

You MUST extract the UUID from their message and pass it to schedule_post().

IMPORTANT:
1. ALWAYS call the appropriate tool - NEVER respond without using tools for campaign queries
2. Campaigns = database tools (get_all_campaigns, get_campaign_by_id)
3. Be helpful and ALWAYS use your tools to fetch real data!
4. If user asks about campaigns, use get_all_campaigns() to see what exists first
5. ALWAYS show campaign IDs (UUIDs) when listing campaigns - this is CRITICAL for scheduling`
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
        update_campaign_status,
        execute_linkedin_campaign
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

        // WORKFLOW DETECTION: Intercept schedule_post without campaign_id
        if (functionName === 'schedule_post' && !functionArgs.campaign_id) {
          console.log('[HGC_WORKFLOW] schedule_post called without campaign_id - returning decision buttons')

          // Generate unique workflow ID
          const workflowId = `workflow-${Date.now()}`

          // Return decision buttons: Just Write, Create New, or Select Existing
          return NextResponse.json({
            success: true,
            response: 'Would you like to create a new campaign or use an existing one?',
            interactive: {
              type: 'decision',
              workflow_id: workflowId,
              decision_options: [
                {
                  label: 'Create New Campaign',
                  value: 'create_new',
                  icon: 'plus',
                  variant: 'primary',
                },
                {
                  label: 'Select From Existing Campaigns',
                  value: 'select_existing',
                  icon: 'list',
                  variant: 'secondary',
                },
                {
                  label: 'Continue Writing',
                  value: 'continue',
                  variant: 'secondary',
                },
              ],
              initial_content: functionArgs.content || '',
              initial_datetime: functionArgs.schedule_time || '',
            },
          })
        }

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
          case 'execute_linkedin_campaign':
            result = await handleExecuteLinkedInCampaign(
              functionArgs.content,
              functionArgs.campaign_id,
              functionArgs.trigger_word
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
