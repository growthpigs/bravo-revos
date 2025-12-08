import { NextRequest, NextResponse } from 'next/server'
import {
  ok,
  okMessage,
  badRequest,
  notFound,
  serverError,
  requireAuth,
  parseJsonBody,
} from '@/lib/api'

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { user, supabase } = auth

  // Fetch user's style cartridges
  const { data, error } = await supabase
    .from('style_cartridges')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[STYLE_API] Database error:', error)
    return serverError('Failed to fetch style cartridges')
  }

  return ok({ cartridges: data || [] })
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { user, supabase } = auth

  const body = await parseJsonBody(request)
  if (body instanceof NextResponse) return body

  const { name, description } = body as { name?: string; description?: string }

  if (!name) {
    return badRequest('Name is required')
  }

  // Generate Mem0 namespace
  const mem0Namespace = `style::marketing::${user.id}`

  // Create style cartridge
  const { data, error } = await supabase
    .from('style_cartridges')
    .insert({
      user_id: user.id,
      name,
      description,
      mem0_namespace: mem0Namespace,
      analysis_status: 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('[STYLE_API] Error creating:', error)
    return serverError('Failed to create style cartridge')
  }

  return ok({ cartridge: data })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { user, supabase } = auth

  const body = await parseJsonBody(request)
  if (body instanceof NextResponse) return body

  const { id, ...updates } = body as { id?: string } & Record<string, unknown>

  if (!id) {
    return badRequest('Cartridge ID is required')
  }

  // Update style cartridge
  const { data, error } = await supabase
    .from('style_cartridges')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('[STYLE_API] Error updating:', error)
    return serverError('Failed to update style cartridge')
  }

  if (!data) {
    return notFound('Cartridge not found')
  }

  return ok({ cartridge: data })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { user, supabase } = auth

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return badRequest('Cartridge ID is required')
  }

  // Delete style cartridge
  const { error } = await supabase
    .from('style_cartridges')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('[STYLE_API] Error deleting:', error)
    return serverError('Failed to delete style cartridge')
  }

  return okMessage('Style cartridge deleted successfully')
}