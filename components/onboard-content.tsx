/**
 * Onboard Content Component
 * Client-side logic for invitation onboarding flow
 */

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Invitation {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  podId: string;
  status: string;
}

export default function OnboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) {
      console.log('[ONBOARD_CONTENT] ❌ No token provided in URL params');
      setError('Invalid invitation link - no token provided');
      setLoading(false);
      return;
    }

    console.log('[ONBOARD_CONTENT] Token received from URL:', {
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 8),
      verifyUrl: `/api/invitations/verify?token=${token.substring(0, 8)}...`,
    });

    // Verify invitation
    fetch(`/api/invitations/verify?token=${token}`)
      .then((r) => {
        console.log('[ONBOARD_CONTENT] Verify endpoint response:', {
          status: r.status,
          statusText: r.statusText,
          contentType: r.headers.get('content-type'),
        });
        return r.json();
      })
      .then((data) => {
        console.log('[ONBOARD_CONTENT] Verify endpoint parsed response:', {
          hasError: !!data.error,
          errorMessage: data.error,
          hasInvitation: !!data.invitation,
          invitationEmail: data.invitation?.email,
          invitationStatus: data.invitation?.status,
        });

        if (data.error) {
          setError(data.error);
        } else {
          setInvitation(data.invitation);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('[ONBOARD_CONTENT] ❌ Verification error:', {
          errorMessage: err.message,
          errorType: err.constructor.name,
        });
        setError('Failed to verify invitation');
        setLoading(false);
      });
  }, [token]);

  const handleConnectLinkedIn = async () => {
    if (!token) {
      console.log('[ONBOARD_CONTENT] ❌ No token available for accept');
      return;
    }

    console.log('[ONBOARD_CONTENT] User clicked "Create Account" button');
    setAccepting(true);

    try {
      // Accept invitation and create account
      console.log('[ONBOARD_CONTENT] Calling /api/invitations/accept with token:', {
        tokenLength: token.length,
      });

      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      console.log('[ONBOARD_CONTENT] Accept endpoint response:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
      });

      const responseData = await response.json();

      console.log('[ONBOARD_CONTENT] Accept endpoint parsed response:', {
        success: responseData.success,
        hasError: !!responseData.error,
        errorMessage: responseData.error,
        hasUser: !!responseData.user,
        userId: responseData.user?.id,
        userEmail: responseData.user?.email,
      });

      if (!response.ok) {
        const error = responseData.error || 'Failed to create account';
        console.error('[ONBOARD_CONTENT] ❌ Accept endpoint error:', {
          status: response.status,
          error: error,
        });
        setError(error);
        setAccepting(false);
        return;
      }

      // Account created successfully
      console.log('[ONBOARD_CONTENT] ✅ Account created successfully, redirecting to login');

      // ⚠️ PROBLEM #4 Investigation: After account is created, user is redirected to login
      // But they have NO WAY TO LOG IN because:
      // 1. They don't have the temporary password (it was logged to server console)
      // 2. There's no password reset link sent to them
      // 3. The flow ends here - incomplete!

      // Redirect to login page where they can authenticate
      const redirectUrl = `/auth/login?email=${encodeURIComponent(invitation?.email || '')}`;
      console.log('[ONBOARD_CONTENT] Redirecting to:', {
        url: redirectUrl,
        email: invitation?.email,
        note: 'User will reach login page but has NO PASSWORD (critical issue)',
      });

      router.push(redirectUrl);
    } catch (err) {
      console.error('[ONBOARD_CONTENT] ❌ Accept call error:', {
        errorMessage: err instanceof Error ? err.message : String(err),
        errorType: err?.constructor.name,
      });
      setError('Failed to process invitation');
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Card className="w-full max-w-md border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-red-600 text-sm">{error}</p>
            <Button onClick={() => router.push('/auth/login')} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Something went wrong</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/auth/login')} className="w-full">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-2xl">Welcome to RevOS!</CardTitle>
        </CardHeader>

        <CardContent className="pt-8 space-y-6">
          {/* Welcome message */}
          <div className="space-y-2">
            <p className="text-gray-900 font-medium">
              Hi {invitation.firstName || 'there'}! 👋
            </p>
            <p className="text-gray-600 text-sm">
              You've been invited to join RevOS, the all-in-one LinkedIn growth platform.
            </p>
          </div>

          {/* What RevOS offers */}
          <div className="bg-blue-50 rounded-lg p-4 space-y-2">
            <p className="text-xs font-semibold text-blue-900 uppercase">What's included:</p>
            <ul className="space-y-1 text-sm text-blue-900">
              <li>✨ AI-powered content generation</li>
              <li>🤖 Automated outreach campaigns</li>
              <li>👥 Pod-based amplification networks</li>
              <li>📊 Performance analytics</li>
            </ul>
          </div>

          {/* Setup account button */}
          <div className="space-y-3 pt-4">
            <Button
              onClick={handleConnectLinkedIn}
              disabled={accepting || loading}
              className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {accepting ? 'Setting up account...' : 'Create Account'}
            </Button>
            <p className="text-xs text-gray-500 text-center">
              We'll create your account and guide you through LinkedIn connection.
            </p>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-400 border-t border-gray-100 pt-4">
            <p>By creating an account, you agree to our Terms of Service</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
