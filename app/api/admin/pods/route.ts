/**
 * POST /api/admin/pods
 * Create a new pod
 * Requires authenticated user (page-level auth guard provides admin protection)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isUserAdmin } from '@/lib/auth/admin-check'

export async function POST(request: NextRequest) {
  try {
    console.log('[PODS_API] POST /api/admin/pods called:', {
      timestamp: new Date().toISOString(),
    })

    const supabase = await createClient()

    // Step 1: Get authenticated user
    console.log('[PODS_API] Step 1: Checking authentication...')
    const { data: { user } } = await supabase.auth.getUser()

    console.log('[PODS_API] Authentication check:', {
      userExists: !!user,
      userId: user?.id,
      userEmail: user?.email,
    })

    if (!user) {
      console.warn('[PODS_API] ❌ No authenticated user found')
      return NextResponse.json(
        { error: 'Unauthorized - No authenticated user' },
        { status: 401 }
      )
    }

    // Step 2: Check admin privileges
    console.log('[PODS_API] Step 2: Checking admin privileges for user:', user.id)
    const isAdmin = await isUserAdmin(user.id, supabase)

    console.log('[PODS_API] Admin check:', {
      userId: user.id,
      isAdmin: isAdmin,
      severity: isAdmin ? 'OK' : 'CRITICAL',
    })

    if (!isAdmin) {
      console.warn('[PODS_API] ❌ User is not an admin')
      return NextResponse.json(
        { error: 'Forbidden - Admin privileges required' },
        { status: 403 }
      )
    }

    // Step 3: Parse request body
    console.log('[PODS_API] Step 3: Parsing request body...')
    const body = await request.json()
    const { name, max_members, client_id } = body

    console.log('[PODS_API] Request body parsed:', {
      name,
      max_members,
      client_id,
    })

    if (!name) {
      console.warn('[PODS_API] ❌ Validation failed: pod name is required')
      return NextResponse.json(
        { error: 'Pod name is required' },
        { status: 400 }
      )
    }

    // Step 4: Check if client_id is needed
    console.log('[PODS_API] Step 4: Checking client_id requirement...')
    console.log('[PODS_API] Client ID analysis:', {
      clientIdProvided: !!client_id,
      clientIdValue: client_id,
      shouldBeRequired: 'UNKNOWN - will find out from insert attempt',
    })

    // Step 5: Get user's client_id if not provided
    let finalClientId = client_id
    if (!finalClientId) {
      console.log('[PODS_API] No client_id provided, fetching from user record...')
      const { data: userData, error: userError } = await supabase
        .from('user')
        .select('client_id')
        .eq('id', user.id)
        .single()

      console.log('[PODS_API] User record fetch:', {
        found: !!userData,
        clientId: userData?.client_id,
        error: userError?.message,
      })

      if (userData?.client_id) {
        finalClientId = userData.client_id
        console.log('[PODS_API] Using client_id from user record:', finalClientId)
      }
    }

    // Step 6: Prepare insert payload
    const insertPayload: any = {
      name,
      max_members: max_members || 50,
      status: 'active'
    }

    if (finalClientId) {
      insertPayload.client_id = finalClientId
    }

    console.log('[PODS_API] Step 5: Insert payload prepared:', {
      ...insertPayload,
    })

    // Step 7: Attempt to create pod
    console.log('[PODS_API] Step 6: Attempting to create pod in database...')
    const { data: pod, error } = await supabase
      .from('pod')
      .insert(insertPayload)
      .select()
      .single()

    console.log('[PODS_API] Database insert result:', {
      success: !error && !!pod,
      podCreated: !!pod,
      podId: pod?.id,
      error: error ? {
        code: error.code,
        message: error.message,
        hint: error.hint,
        details: error.details,
      } : null,
    })

    if (error || !pod) {
      console.error('[PODS_API] ❌ Pod creation failed:', {
        errorCode: error?.code,
        errorMessage: error?.message,
        errorHint: error?.hint,
        errorDetails: error?.details,
        severity: 'CRITICAL',
      })

      // Provide detailed error info for debugging
      let userFriendlyError = error?.message || 'Failed to create pod'
      if (error?.code === '23503') {
        userFriendlyError = 'Invalid client reference - client does not exist'
      } else if (error?.code === '23505') {
        userFriendlyError = 'Pod with this name already exists for your client'
      } else if (error?.code === '23502') {
        userFriendlyError = 'Missing required field - a required field is empty'
      }

      return NextResponse.json(
        { error: userFriendlyError },
        { status: 500 }
      )
    }

    console.log('[PODS_API] ✅ Pod created successfully:', {
      podId: pod.id,
      name: pod.name,
      maxMembers: pod.max_members,
      clientId: pod.client_id,
      status: pod.status,
    })

    return NextResponse.json({
      success: true,
      pod: {
        id: pod.id,
        name: pod.name,
        maxMembers: pod.max_members,
        status: pod.status,
        clientId: pod.client_id,
        createdAt: pod.created_at
      }
    })
  } catch (error) {
    console.error('[PODS_API] ❌ Unexpected error:', {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
