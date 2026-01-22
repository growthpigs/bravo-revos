import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  console.log('[API_USER] ===== GET /api/user called =====');
  try {
    console.log('[API_USER] Creating Supabase client...');
    const supabase = await createClient()

    console.log('[API_USER] Calling auth.getUser()...');
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    console.log('[API_USER] Auth result:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      authError: authError?.message
    });

    if (!user) {
      console.error('[API_USER] ❌ No user found - returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[API_USER] ✅ User authenticated, fetching profile...');

    // Get user profile from database
    console.log('[API_USER] Querying users table for id:', user.id);
    const { data: userData, error } = await supabase
      .from('user')
      .select('email, full_name')
      .eq('id', user.id)
      .single()

    console.log('[API_USER] Database query result:', {
      hasData: !!userData,
      email: userData?.email,
      full_name: userData?.full_name,
      error: error?.message
    });

    if (error) {
      console.error('[API_USER] ❌ Error fetching user from database:', error)
      return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
    }

    const response = {
      email: user.email,
      full_name: userData?.full_name || '',
    };

    console.log('[API_USER] ✅ Returning user data:', response);
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { full_name } = body

    // Update user profile
    const { error } = await supabase
      .from('user')
      .update({ full_name })
      .eq('id', user.id)

    if (error) {
      console.error('Error updating user:', error)
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
