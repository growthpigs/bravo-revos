import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
    const supabase = await createClient()

    // Note: We need service role access to check existing users and create new ones
    // The regular client doesn't have permission to list auth users
    const { data: existingUsers, error: checkError } = await supabase.auth.admin.listUsers()

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

    // 4. Create new Supabase auth user
    const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true, // Skip email verification - they'll use magic link
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      },
    })

    if (createError || !newAuthUser.user) {
      console.error('[CREATE_USER_DIRECT] Error creating auth user:', createError)
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      )
    }

    console.log('[CREATE_USER_DIRECT] Auth user created:', newAuthUser.user.id)

    // 5. Generate magic link (OTP)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const redirectTo = `${appUrl}/onboard-new`

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo,
      },
    })

    if (linkError || !linkData) {
      console.error('[CREATE_USER_DIRECT] Error generating magic link:', linkError)

      // Rollback: Delete the auth user we just created
      await supabase.auth.admin.deleteUser(newAuthUser.user.id)

      return NextResponse.json(
        { error: 'Failed to generate magic link' },
        { status: 500 }
      )
    }

    console.log('[CREATE_USER_DIRECT] Magic link generated for:', email)

    // 6. TODO: Send email via Resend (Phase 3)
    // For now, we just return the link to the admin UI
    // The admin can copy/paste it to send manually

    // 7. Return success with magic link
    return NextResponse.json({
      success: true,
      user_id: newAuthUser.user.id,
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
