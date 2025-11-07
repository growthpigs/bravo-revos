import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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

    // Get user's client_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('client_id')
      .eq('id', user.id)
      .maybeSingle()

    if (userError) {
      return NextResponse.json(
        { error: `Failed to fetch user data: ${userError.message}` },
        { status: 400 }
      )
    }

    if (!userData) {
      return NextResponse.json(
        { error: 'User data not found' },
        { status: 400 }
      )
    }

    // Fetch campaigns for user's client
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('client_id', userData.client_id)
      .order('created_at', { ascending: false })

    if (campaignsError) {
      return NextResponse.json(
        { error: campaignsError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: campaigns,
      count: campaigns?.length || 0,
    })
  } catch (error) {
    console.error('[CAMPAIGNS_API] GET error:', error)
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

    // Get user's client_id
    console.log('[CAMPAIGNS_API] Fetching user data for ID:', user.id)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    console.log('[CAMPAIGNS_API] User query result:', { userData, userError })

    if (userError) {
      console.error('[CAMPAIGNS_API] User query error:', userError)
      return NextResponse.json(
        { error: `Failed to fetch user data: ${userError.message}` },
        { status: 400 }
      )
    }

    if (!userData) {
      console.error('[CAMPAIGNS_API] No user record found for ID:', user.id)
      return NextResponse.json(
        { error: 'User data not found - user record does not exist in database' },
        { status: 400 }
      )
    }

    const clientId = userData.client_id
    console.log('[CAMPAIGNS_API] User client_id:', clientId)

    if (!clientId) {
      return NextResponse.json(
        { error: 'User has no associated client_id' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const {
      name,
      description,
      status = 'draft',
    } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Campaign name is required' },
        { status: 400 }
      )
    }

    console.log('[CAMPAIGNS_API] Creating campaign:', {
      client_id: clientId,
      name,
      description,
      status,
    })

    // Create campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        client_id: clientId,
        name,
        description: description || null,
        status,
        trigger_word: 'default', // Default trigger word
      })
      .select()
      .single()

    if (campaignError) {
      console.error('[CAMPAIGNS_API] INSERT error:', campaignError)
      return NextResponse.json(
        { error: campaignError.message },
        { status: 400 }
      )
    }

    console.log('[CAMPAIGNS_API] Campaign created successfully:', campaign)

    return NextResponse.json({
      success: true,
      data: campaign,
    })
  } catch (error) {
    console.error('[CAMPAIGNS_API] POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
