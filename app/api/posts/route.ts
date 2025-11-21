import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for creating a post
const postCreateSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  title: z.string().optional(),
  campaign_id: z.string().uuid().nullable().optional(),
  status: z.enum(['draft', 'scheduled', 'published', 'failed']).default('draft'),
  scheduled_for: z.string().datetime().nullable().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get query params for filtering
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const campaignId = searchParams.get('campaign_id')

    // Build query
    let query = supabase
      .from('posts')
      .select(`
        *,
        campaigns (
          id,
          name
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    if (campaignId === 'standalone') {
      query = query.is('campaign_id', null)
    } else if (campaignId) {
      query = query.eq('campaign_id', campaignId)
    }

    const { data: posts, error: postsError } = await query

    if (postsError) {
      console.error('[POSTS_API] GET error:', postsError)
      return NextResponse.json(
        { error: postsError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: posts,
      count: posts?.length || 0,
    })
  } catch (error) {
    console.error('[POSTS_API] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()

    let validatedData
    try {
      validatedData = postCreateSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 }
        )
      }
      throw error
    }

    console.log('[POSTS_API] Creating post for user:', user.id)

    // Prepare post data
    const postData = {
      user_id: user.id,
      content: validatedData.content,
      campaign_id: validatedData.campaign_id || null,
      status: validatedData.status,
      scheduled_for: validatedData.scheduled_for || null,
      metrics: {},
    }

    // Insert post
    const { data: post, error: insertError } = await supabase
      .from('posts')
      .insert(postData)
      .select()
      .single()

    if (insertError) {
      console.error('[POSTS_API] Insert error:', insertError)
      return NextResponse.json(
        { error: insertError.message },
        { status: 400 }
      )
    }

    console.log('[POSTS_API] Post created:', post.id)

    return NextResponse.json({
      success: true,
      data: post,
    })
  } catch (error) {
    console.error('[POSTS_API] POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      )
    }

    // Update post (RLS ensures user owns it)
    const { data: post, error: updateError } = await supabase
      .from('posts')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('[POSTS_API] Update error:', updateError)
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: post,
    })
  } catch (error) {
    console.error('[POSTS_API] PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      )
    }

    // Delete post (RLS ensures user owns it)
    const { error: deleteError } = await supabase
      .from('posts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('[POSTS_API] Delete error:', deleteError)
      return NextResponse.json(
        { error: deleteError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('[POSTS_API] DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
