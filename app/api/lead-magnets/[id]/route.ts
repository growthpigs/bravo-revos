import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    const { data: magnet, error } = await supabase
      .from('lead_magnet_library')
      .select('*')
      .eq('id', params.id)
      .eq('is_active', true)
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Lead magnet not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: magnet,
    })
  } catch (error) {
    console.error('[LEAD_MAGNET_GET] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, client_id')
      .eq('id', user.id)
      .maybeSingle()

    if (userError || userData?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can update library entries' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, description, url, category, is_active } = body

    // Update entry
    const { data: updated, error: updateError } = await supabase
      .from('lead_magnet_library')
      .update({
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(url !== undefined && { url }),
        ...(category !== undefined && { category }),
        ...(is_active !== undefined && { is_active }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('client_id', userData.client_id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    console.error('[LEAD_MAGNET_PATCH] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, client_id')
      .eq('id', user.id)
      .maybeSingle()

    if (userError || userData?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can delete library entries' },
        { status: 403 }
      )
    }

    // Soft delete (set is_active to false)
    const { error: deleteError } = await supabase
      .from('lead_magnet_library')
      .update({ is_active: false })
      .eq('id', params.id)
      .eq('client_id', userData.client_id)

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Lead magnet deleted',
    })
  } catch (error) {
    console.error('[LEAD_MAGNET_DELETE] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
