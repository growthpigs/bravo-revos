import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeParseQueryParam } from '@/lib/utils/safe-parse'
import { QUERY_PARAM_DEFAULTS } from '@/lib/config'
import {
  ok,
  badRequest,
  forbidden,
  requireAuth,
  parseJsonBody,
} from '@/lib/api'

export async function GET(request: NextRequest) {
  // Use service role to bypass RLS for public reads
  const supabase = await createClient({ isServiceRole: true })

  // Get query parameters
  const searchParams = request.nextUrl.searchParams
  const search = searchParams.get('search')?.toLowerCase() || ''
  const category = searchParams.get('category')
  const limit = safeParseQueryParam(
    searchParams,
    'limit',
    QUERY_PARAM_DEFAULTS.LEAD_MAGNET_LIMIT,
    { min: 1, max: QUERY_PARAM_DEFAULTS.MAX_LIMIT }
  )

  // Build query - get all active magnets
  let query = supabase
    .from('lead_magnet_library')
    .select('*')
    .eq('is_active', true)
    .order('title', { ascending: true })
    .limit(limit)

  // Filter by category if provided
  if (category && category !== 'All') {
    query = query.eq('category', category)
  }

  const { data: magnets, error: magnetsError } = await query

  if (magnetsError) {
    return badRequest(magnetsError.message)
  }

  // Apply search filter on client side (to handle both title and description)
  let filtered = magnets || []
  if (search) {
    filtered = filtered.filter(
      (m) =>
        m.title.toLowerCase().includes(search) ||
        m.description?.toLowerCase().includes(search)
    )
  }

  return ok({
    magnets: filtered,
    count: filtered.length,
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { user, supabase } = auth

  // Get user's client_id and check if admin
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('client_id, role')
    .eq('id', user.id)
    .maybeSingle()

  if (userError || !userData) {
    return badRequest('Failed to fetch user data')
  }

  // Only admins can create library entries
  if (userData.role !== 'admin') {
    return forbidden('Only admins can create library entries')
  }

  const body = await parseJsonBody(request)
  if (body instanceof NextResponse) return body

  const { title, description, url, category } = body as Record<string, unknown>

  if (!title || !url) {
    return badRequest('Title and URL are required')
  }

  // Create new entry
  const { data: newMagnet, error: createError } = await supabase
    .from('lead_magnet_library')
    .insert({
      title,
      description: description || null,
      url,
      category: category || 'General',
      client_id: userData.client_id,
      is_active: true,
    })
    .select()
    .single()

  if (createError) {
    return badRequest(createError.message)
  }

  return ok({ magnet: newMagnet })
}
