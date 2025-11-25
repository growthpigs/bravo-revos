/**
 * Onboard Content Component
 * Client-side logic for invitation onboarding flow with OAuth
 * Option A: Unified flow - LinkedIn connection happens during signup
 */

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Linkedin } from 'lucide-react';

interface Invitation {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  podId: string | null;
  status: string;
}

export default function OnboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const state = searchParams.get('state');

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);

  // Phase 1: Verify invitation on mount
  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    fetch(`/api/invitations/verify?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setInvitation(data.invitation);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('[ONBOARD_CONTENT] Verification error:', err);
        setError('Failed to verify invitation');
        setLoading(false);
      });
  }, [token]);

  // Phase 2: Handle OAuth success redirect
  useEffect(() => {
    // If we're coming back from Unipile OAuth with state
    if (state && !loading && !error) {
      console.log('[ONBOARD_CONTENT] OAuth success redirect detected');
      // Account should be created by webhook, redirect to dashboard
      // Wait a moment for webhook to process
      const timer = setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state, loading, error, router]);

  const handleConnectLinkedin = async () => {
    if (!token) return;

    setConnecting(true);
    try {
      // Request Unipile OAuth link
      const response = await fetch('/api/onboarding/request-unipile-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start OAuth');
      }

      const { authUrl } = await response.json();

      // Redirect to Unipile OAuth
      window.location.href = authUrl;
    } catch (err) {
      console.error('[ONBOARD_CONTENT] OAuth error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect LinkedIn');
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <p className="text-center text-gray-600">Loading invitation...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto border-red-300">
        <CardHeader>
          <CardTitle className="text-red-600">Invalid Invitation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-red-600">{error}</p>
          <Button onClick={() => router.push('/auth/login')} className="w-full">
            Go to Login
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Welcome to Bravo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-sm text-gray-600">Hi {invitation?.firstName} {invitation?.lastName}</p>
          <p className="text-sm text-gray-600">You&apos;ve been invited to join</p>
          <p className="font-semibold">{invitation?.email}</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Connect your LinkedIn account to get started</p>
          <Button
            onClick={handleConnectLinkedin}
            disabled={connecting}
            className="w-full gap-2"
            size="lg"
          >
            <Linkedin className="h-5 w-5" />
            {connecting ? 'Connecting...' : 'Connect LinkedIn Account'}
          </Button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          We use your LinkedIn account to power your sales engagement features
        </p>
      </CardContent>
    </Card>
  );
}
