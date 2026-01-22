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
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['user', 'super_admin']).default('user'),
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

    const { email, firstName, lastName, password, role } = validation.data

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

    // 4. Create user with email and password (simplest approach)
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email verification
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      },
    })

    if (createError || !userData.user) {
      console.error('[CREATE_USER_DIRECT] Error creating user:', createError)
      return NextResponse.json(
        { error: createError?.message || 'Failed to create account' },
        { status: 500 }
      )
    }

    console.log('[CREATE_USER_DIRECT] Auth user created:', userData.user.id)

    // 5. Insert into users table
    const { error: insertError } = await supabaseAdmin
      .from('user')
      .insert({
        id: userData.user.id,
        email: email,
        first_name: firstName,
        last_name: lastName,
        role: role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

    if (insertError) {
      console.error('[CREATE_USER_DIRECT] Error inserting into users table:', insertError)
      // User was created in auth but not in table - still return success but warn
      return NextResponse.json({
        success: true,
        user_id: userData.user.id,
        email: userData.user.email,
        warning: 'User created in auth but failed to add to users table',
        message: 'User account created. Share the temporary password with the user.',
      })
    }

    console.log('[CREATE_USER_DIRECT] User added to users table:', userData.user.id)

    // 6. Return success with user details
    return NextResponse.json({
      success: true,
      user_id: userData.user.id,
      email: userData.user.email,
      message: 'User account created. Share the temporary password with the user.',
    })

  } catch (error) {
    console.error('[CREATE_USER_DIRECT] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
