import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getCurrentAdminUser } from '@/lib/auth/admin'
import { z } from 'zod'

// Request validation schema
const CreateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
})

export async function POST(request: NextRequest) {
  try {
    // 1. Check admin authentication
    const adminUser = await getCurrentAdminUser()

    if (!adminUser) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    // 2. Parse and validate request body
    const body = await request.json()
    const validation = CreateUserSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { email, firstName, lastName } = validation.data

    // 3. Check if user already exists in Supabase auth
    // Use service role client for auth.admin operations
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: existingUsers, error: checkError } = await supabaseAdmin.auth.admin.listUsers()

    if (checkError) {
      console.error('[CREATE_USER_DIRECT] Error checking existing users:', checkError)
      return NextResponse.json(
        { error: 'Failed to check existing users' },
        { status: 500 }
      )
    }

    const existingUser = existingUsers.users.find(u => u.email === email)

    if (existingUser) {
      return NextResponse.json(
        {
          error: 'User already exists',
          existing_user_id: existingUser.id
        },
        { status: 409 }
      )
    }

    // 4. Create user and generate invite link in one step
    // generateLink with type 'invite' both creates the user and generates the link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    // IMPORTANT: Redirect to auth callback first, which exchanges code for session,
    // then callback redirects to onboard-new with session cookies set
    const redirectTo = `${appUrl}/auth/callback?next=/onboard-new`

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',  // Creates user + generates invite link (longer expiry)
      email,
      options: {
        redirectTo,
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    })

    if (linkError || !linkData) {
      console.error('[CREATE_USER_DIRECT] Error creating user and generating link:', linkError)
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      )
    }

    console.log('[CREATE_USER_DIRECT] User created and invite link generated:', linkData.user.id)

    console.log('[CREATE_USER_DIRECT] Magic link generated for:', email)
    console.log('[CREATE_USER_DIRECT] Link data:', JSON.stringify(linkData, null, 2))

    // 6. TODO: Send email via Resend (Phase 3)
    // For now, we just return the link to the admin UI
    // The admin can copy/paste it to send manually

    // 5. Return success with invite link
    return NextResponse.json({
      success: true,
      user_id: linkData.user.id,
      magic_link: linkData.properties.action_link, // Full URL with token
      message: 'User account created successfully',
    })

  } catch (error) {
    console.error('[CREATE_USER_DIRECT] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
