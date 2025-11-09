import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    console.log('[API_CLIENTS] POST request received')

    // Step 1: Use regular client (with cookies) to authenticate user
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    console.log('[API_CLIENTS] Auth user:', { userId: user?.id, email: user?.email })

    if (!user) {
      console.log('[API_CLIENTS] No authenticated user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Step 2: Use service role client (no cookies) to bypass RLS for database operations
    const supabase = await createClient({ isServiceRole: true })

    // Get user's agency
    console.log('[API_CLIENTS] Fetching user data...')
    let { data: userData, error: userError } = await supabase
      .from('users')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (userError) {
      console.log('[API_CLIENTS] User fetch error (might be new user):', userError.message)
    } else {
      console.log('[API_CLIENTS] User data found:', { agency_id: userData?.agency_id })
    }

    // If user exists but doesn't have an agency, create one
    if (userData && !userData.agency_id) {
      console.log('[API_CLIENTS] User has no agency, creating one...')
      const { data: agency, error: agencyError } = await supabase
        .from('agencies')
        .insert({
          name: `${user.email?.split('@')[0]}'s Agency`,
          slug: user.email?.split('@')[0] || 'agency',
        })
        .select()
        .single()

      if (agencyError || !agency) {
        console.error('[API_CLIENTS] Error creating agency:', agencyError)
        return NextResponse.json({ error: 'Failed to create agency' }, { status: 500 })
      }

      console.log('[API_CLIENTS] Agency created:', { agencyId: agency.id })

      // Update user with the new agency_id
      const { error: updateError } = await supabase
        .from('users')
        .update({ agency_id: agency.id })
        .eq('id', user.id)

      if (updateError) {
        console.error('[API_CLIENTS] Error updating user:', updateError)
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
      }

      console.log('[API_CLIENTS] User updated with agency')
      userData = { agency_id: agency.id }
    }

    if (!userData?.agency_id) {
      console.log('[API_CLIENTS] No agency_id available')
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, slug } = body
    console.log('[API_CLIENTS] Request body:', { name, slug })

    if (!name || !slug) {
      console.log('[API_CLIENTS] Validation failed: missing name or slug')
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
    }

    console.log('[API_CLIENTS] Creating client under agency:', userData.agency_id)
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
      console.error('[API_CLIENTS] Database error:', error)

      // Handle duplicate key violations specifically
      if (error.code === '23505') {
        if (error.message.includes('clients_agency_id_name_key')) {
          return NextResponse.json({ error: 'A client with this name already exists in your agency' }, { status: 409 })
        }
        if (error.message.includes('idx_clients_agency_slug')) {
          return NextResponse.json({ error: 'A client with this URL slug already exists' }, { status: 409 })
        }
      }

      return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
    }

    console.log('[API_CLIENTS] Client created successfully:', { clientId: client.id, name: client.name })

    // Revalidate the admin clients page cache so the UI updates immediately
    revalidatePath('/admin/clients')

    return NextResponse.json(client)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
