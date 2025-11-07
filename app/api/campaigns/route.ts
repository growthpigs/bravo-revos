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
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
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
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('client_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const {
      name,
      description,
      trigger_words,
      status = 'draft',
      linkedin_account_id,
    } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Campaign name is required' },
        { status: 400 }
      )
    }

    console.log('[CAMPAIGNS_API] Creating campaign:', {
      client_id: userData.client_id,
      name,
      description,
      trigger_words,
      status,
    })

    // Create campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        client_id: userData.client_id,
        name,
        description: description || null,
        trigger_words: trigger_words || [],
        status,
        linkedin_account_id: linkedin_account_id || null,
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
