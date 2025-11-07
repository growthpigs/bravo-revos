import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password, userId } = await request.json()

    if (!email || !password || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Use service role to bypass RLS
    const supabase = await createClient({
      isServiceRole: true,
    })

    console.log('[SIGNUP_API] Creating user record for:', userId)

    // First, create or get a default agency
    const { data: agencies } = await supabase
      .from('agencies')
      .select('id')
      .limit(1)

    let agencyId = agencies?.[0]?.id

    if (!agencyId) {
      const { data: newAgency, error: agencyError } = await supabase
        .from('agencies')
        .insert({
          name: 'Default Agency',
          slug: 'default-agency',
        })
        .select()
        .single()

      if (agencyError) {
        console.error('[SIGNUP_API] Error creating agency:', agencyError)
        return NextResponse.json(
          { error: `Failed to create agency: ${agencyError.message}` },
          { status: 500 }
        )
      }
      agencyId = newAgency?.id
    }

    // Create a default client for the agency
    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert({
        agency_id: agencyId,
        name: 'Default Client',
      })
      .select()
      .single()

    if (clientError) {
      console.error('[SIGNUP_API] Error creating client:', clientError)
      return NextResponse.json(
        { error: 'Failed to create client' },
        { status: 500 }
      )
    }

    const clientId = newClient.id

    // Create user record in users table using service role
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        client_id: clientId,
      })

    if (insertError && !insertError.message.includes('duplicate')) {
      console.error('[SIGNUP_API] Error creating user record:', insertError)
      return NextResponse.json(
        { error: `Failed to create user record: ${insertError.message}` },
        { status: 500 }
      )
    }

    console.log('[SIGNUP_API] User record created successfully')

    return NextResponse.json({
      success: true,
      message: 'User record created',
    })
  } catch (error) {
    console.error('[SIGNUP_API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
