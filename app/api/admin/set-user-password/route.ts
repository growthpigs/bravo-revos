/**
 * Admin Set User Password API
 *
 * Allows admins to set passwords for users via Supabase Admin API
 * Used during pod member onboarding to set initial password
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, password } = body;

    if (!userId || !password) {
      return NextResponse.json(
        { error: 'userId and password are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Create Supabase client (this will use service role key automatically in server context)
    const supabase = await createClient();

    // Update user password via admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password }
    );

    if (updateError) {
      console.error('[SET_PASSWORD] Admin API error:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Failed to update password' },
        { status: 500 }
      );
    }

    console.log('[SET_PASSWORD] Password updated successfully for user:', userId);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[SET_PASSWORD] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
