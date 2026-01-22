import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient, createServiceRoleClient } from '@/lib/audienceos/supabase'
import { cookies } from 'next/headers'

// Note: createRouteHandlerClient and cookies are used in GET handler below

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { first_name, last_name, password } = body

    if (!token || !first_name || !last_name || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Password validation (SEC-011)
    const trimmedPassword = typeof password === 'string' ? password.trim() : ''
    if (trimmedPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }
    if (trimmedPassword.length > 72) {
      return NextResponse.json(
        { error: 'Password must be 72 characters or less' },
        { status: 400 }
      )
    }
    // Use trimmed password for account creation
    const validatedPassword = trimmedPassword

    // Use service role client to bypass RLS and for admin operations
    const serviceSupabase = createServiceRoleClient()

    // 1. Validate invitation (using service role to bypass RLS)
    if (!serviceSupabase) {
      return NextResponse.json(
        { error: 'Service unavailable - contact administrator' },
        { status: 503 }
      )
    }
    const { data: invitation, error: invError } = await (serviceSupabase
      .from('user_invitations' as any)
      .select('*')
      .eq('token', token)
      .single() as any)

    if (invError || !invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation' },
        { status: 404 }
      )
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 410 }
      )
    }

    // Check if already accepted (410 Gone - same as expired)
    if (invitation.accepted_at) {
      return NextResponse.json(
        { error: 'Invitation has already been accepted' },
        { status: 410 }
      )
    }

    // 2. Create auth user (using admin API to auto-confirm email)
    const { data: authData, error: authError } = await serviceSupabase.auth.admin.createUser({
      email: invitation.email,
      password: validatedPassword,
      email_confirm: true, // Auto-confirm since this is an invitation flow
      user_metadata: {
        first_name: first_name.trim(),
        last_name: last_name.trim(),
      },
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Failed to create account' },
        { status: 400 }
      )
    }

    // 3. Create user record in database (using service role to bypass RLS)
    const { data: newUser, error: userError } = await (serviceSupabase
      .from('user' as any)
      .insert({
        id: authData.user.id,
        email: invitation.email,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        agency_id: invitation.agency_id,
        role: invitation.role,
      })
      .select()
      .single() as any)

    if (userError) {
      // Clean up auth user if database insert fails (need service role for admin operations)
      if (serviceSupabase) {
        await serviceSupabase.auth.admin.deleteUser(authData.user.id)
      }
      return NextResponse.json(
        { error: userError.message || 'Failed to create user profile' },
        { status: 400 }
      )
    }

    // 4. Mark invitation as accepted (using service role to bypass RLS)
    await (serviceSupabase
      .from('user_invitations' as any)
      .update({ accepted_at: new Date().toISOString() })
      .eq('token', token) as any)

    return NextResponse.json(
      {
        user: newUser,
        redirectUrl: '/dashboard',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Accept invitation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token) {
      return NextResponse.json(
        { error: 'Invalid invitation link' },
        { status: 400 }
      )
    }

    // Use service role client to bypass RLS for public invitation lookup
    const supabase = createServiceRoleClient()

    if (!supabase) {
      // Fall back to route handler client if service role not configured
      const fallbackSupabase = await createRouteHandlerClient(cookies)
      const { data: invitation, error } = await (fallbackSupabase
        .from('user_invitations' as any)
        .select(`id, email, role, expires_at, accepted_at, agencies:agency_id(name)`)
        .eq('token', token)
        .single() as any)

      if (error || !invitation) {
        return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 })
      }

      if (invitation.accepted_at) {
        return NextResponse.json({ error: 'Invitation has already been accepted' }, { status: 410 })
      }

      if (new Date(invitation.expires_at) < new Date()) {
        return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 })
      }

      return NextResponse.json({
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          agency_name: invitation.agencies?.name || 'Your Agency',
          expires_at: invitation.expires_at,
          accepted_at: invitation.accepted_at,
        },
      }, { status: 200 })
    }

    const { data: invitation, error } = await (supabase
      .from('user_invitations' as any)
      .select(
        `
        id,
        email,
        role,
        expires_at,
        accepted_at,
        agencies:agency_id(name)
      `
      )
      .eq('token', token)
      .single() as any)

    if (error || !invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation' },
        { status: 404 }
      )
    }

    // Check if already accepted
    if (invitation.accepted_at) {
      return NextResponse.json(
        { error: 'Invitation has already been accepted' },
        { status: 410 }
      )
    }

    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)

    if (expiresAt < now) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 410 }
      )
    }

    return NextResponse.json(
      {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          agency_name: invitation.agencies?.name || 'Your Agency',
          expires_at: invitation.expires_at,
          accepted_at: invitation.accepted_at,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Validate invitation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
