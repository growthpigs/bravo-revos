import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's agency
    let { data: userData, error: userError } = await supabase
      .from('users')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    // If user exists but doesn't have an agency, create one
    if (userData && !userData.agency_id) {
      const { data: agency, error: agencyError } = await supabase
        .from('agencies')
        .insert({
          name: `${user.email?.split('@')[0]}'s Agency`,
          slug: user.email?.split('@')[0] || 'agency',
        })
        .select()
        .single()

      if (agencyError || !agency) {
        console.error('Error creating agency:', agencyError)
        return NextResponse.json({ error: 'Failed to create agency' }, { status: 500 })
      }

      // Update user with the new agency_id
      const { error: updateError } = await supabase
        .from('users')
        .update({ agency_id: agency.id })
        .eq('id', user.id)

      if (updateError) {
        console.error('Error updating user:', updateError)
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
      }

      userData = { agency_id: agency.id }
    }

    if (!userData?.agency_id) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, slug } = body

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
    }

    // Create client
    const { data: client, error } = await supabase
      .from('clients')
      .insert({
        name,
        slug,
        agency_id: userData.agency_id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating client:', error)
      return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
    }

    return NextResponse.json(client)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
