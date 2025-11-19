/**
 * POST /api/admin/pods
 * Create a new pod
 * Requires authenticated user (page-level auth guard provides admin protection)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const { name, max_members } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Pod name is required' },
        { status: 400 }
      )
    }

    // Create pod
    const { data: pod, error } = await supabase
      .from('pods')
      .insert({
        name,
        max_members: max_members || 50,
        status: 'active'
      })
      .select()
      .single()

    if (error || !pod) {
      console.error('[PODS_API] Error creating pod:', error)
      return NextResponse.json(
        { error: error?.message || 'Failed to create pod' },
        { status: 500 }
      )
    }

    console.log('[PODS_API] Pod created:', {
      podId: pod.id,
      name: pod.name,
      maxMembers: pod.max_members
    })

    return NextResponse.json({
      success: true,
      pod: {
        id: pod.id,
        name: pod.name,
        maxMembers: pod.max_members,
        status: pod.status,
        createdAt: pod.created_at
      }
    })
  } catch (error) {
    console.error('[PODS_API] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
