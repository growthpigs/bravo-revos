import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password, userId, fullName } = await request.json()

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

    // Get the existing default client (we already created it)
    const { data: clients, error: clientFetchError } = await supabase
      .from('clients')
      .select('id')
      .limit(1)

    if (clientFetchError || !clients || clients.length === 0) {
      console.error('[SIGNUP_API] No default client found:', clientFetchError)
      return NextResponse.json(
        { error: 'No default client configured. Please contact support.' },
        { status: 500 }
      )
    }

    const clientId = clients[0].id

    // Parse full name into first and last (optional)
    let firstName = null
    let lastName = null
    if (fullName && fullName.trim()) {
      const nameParts = fullName.trim().split(' ')
      firstName = nameParts[0] || null
      lastName = nameParts.slice(1).join(' ') || null
    }

    // Create user record in users table using service role
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        first_name: firstName,
        last_name: lastName,
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
