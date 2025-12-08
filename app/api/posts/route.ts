import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  ok,
  badRequest,
  requireAuth,
  requireAuthAndValidate,
  parseJsonBody,
} from '@/lib/api'

// Validation schema for creating a post
const postCreateSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  title: z.string().optional(),
  campaign_id: z.string().uuid().nullable().optional(),
  status: z.enum(['draft', 'scheduled', 'published', 'failed']).default('draft'),
  scheduled_for: z.string().datetime().nullable().optional(),
})

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { user, supabase } = auth

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
    return badRequest(postsError.message)
  }

  return ok({
    posts,
    count: posts?.length || 0,
  })
}

export async function POST(request: NextRequest) {
  const result = await requireAuthAndValidate(request, postCreateSchema)
  if (result instanceof NextResponse) return result
  const { user, supabase, data: validatedData } = result

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
    return badRequest(insertError.message)
  }

  console.log('[POSTS_API] Post created:', post.id)

  return ok({ post })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { user, supabase } = auth

  const body = await parseJsonBody(request)
  if (body instanceof NextResponse) return body

  const { id, ...updates } = body as { id?: string; [key: string]: unknown }

  if (!id) {
    return badRequest('Post ID is required')
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
    return badRequest(updateError.message)
  }

  return ok({ post })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { user, supabase } = auth

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return badRequest('Post ID is required')
  }

  // Delete post (RLS ensures user owns it)
  const { error: deleteError } = await supabase
    .from('posts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (deleteError) {
    console.error('[POSTS_API] Delete error:', deleteError)
    return badRequest(deleteError.message)
  }

  return ok({ deleted: true })
}
