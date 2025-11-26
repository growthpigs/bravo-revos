import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { safeParseQueryParam } from '@/lib/utils/safe-parse'
import { QUERY_PARAM_DEFAULTS } from '@/lib/config'

export async function GET(request: NextRequest) {
  try {
    // Use service role to bypass RLS for public reads
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')?.toLowerCase() || ''
    const category = searchParams.get('category')
    const limit = safeParseQueryParam(searchParams, 'limit', QUERY_PARAM_DEFAULTS.LEAD_MAGNET_LIMIT, { min: 1, max: QUERY_PARAM_DEFAULTS.MAX_LIMIT })

    // Build query - get all active magnets (using service role to bypass RLS)
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
      return NextResponse.json(
        { error: magnetsError.message },
        { status: 400 }
      )
    }

    // Apply search filter on client side (to handle both title and description)
    let filtered = magnets || []
    if (search) {
      filtered = filtered.filter(m =>
        m.title.toLowerCase().includes(search) ||
        m.description?.toLowerCase().includes(search)
      )
    }

    return NextResponse.json({
      success: true,
      data: filtered,
      count: filtered.length,
    })
  } catch (error) {
    console.error('[LEAD_MAGNETS_API] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // For POST operations, use authenticated client
    // (POST is not used in current flow but keeping for future extensions)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's client_id and check if admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('client_id, role')
      .eq('id', user.id)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 400 }
      )
    }

    // Only admins can create library entries
    if (userData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can create library entries' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, description, url, category } = body

    if (!title || !url) {
      return NextResponse.json(
        { error: 'Title and URL are required' },
        { status: 400 }
      )
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
      return NextResponse.json(
        { error: createError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: newMagnet,
    })
  } catch (error) {
    console.error('[LEAD_MAGNETS_API] POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
