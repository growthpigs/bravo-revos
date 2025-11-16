/**
 * Unipile Connection Page (Pod Member Onboarding Step 3)
 *
 * Allows pod member to connect their LinkedIn account via Unipile OAuth
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Linkedin } from 'lucide-react';

export default function ConnectUnipilePage() {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [podMember, setPodMember] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    verifyAuth();
  }, []);

  async function verifyAuth() {
    try {
      setVerifying(true);

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        toast.error('Please sign in to continue');
        router.push('/auth/login');
        return;
      }

      // Get pod member record
      const { data: member, error: memberError } = await supabase
        .from('pod_members')
        .select('*, clients(name)')
        .eq('user_id', user.id)
        .single();

      if (memberError || !member) {
        toast.error('Pod member record not found');
        router.push('/auth/login');
        return;
      }

      // Check if already connected
      if (member.unipile_account_id) {
        toast.info('LinkedIn already connected');
        router.push('/onboarding/pending-activation');
        return;
      }

      // Check onboarding status (should be password_set)
      if (member.onboarding_status !== 'password_set') {
        toast.error('Invalid onboarding state. Please contact support.');
        router.push('/auth/login');
        return;
      }

      setPodMember(member);
    } catch (error: any) {
      console.error('[CONNECT_UNIPILE] Verify error:', error);
      toast.error('Failed to verify account');
      router.push('/auth/login');
    } finally {
      setVerifying(false);
    }
  }

  async function handleConnectLinkedIn() {
    if (!podMember) return;

    setLoading(true);

    try {
      // Create Unipile hosted auth link
      const response = await fetch('/api/unipile/create-hosted-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'linkedin',
          podMemberId: podMember.id, // Pass pod_member_id for notify callback
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create auth link');
      }

      const { authUrl } = await response.json();

      // Redirect to Unipile hosted auth
      window.location.href = authUrl;

    } catch (error: any) {
      console.error('[CONNECT_UNIPILE] Connect error:', error);
      toast.error(error.message || 'Failed to connect LinkedIn');
      setLoading(false);
    }
  }

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Verifying account...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!podMember) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Linkedin className="h-16 w-16 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Connect Your LinkedIn</CardTitle>
          <CardDescription className="mt-2">
            Connect your LinkedIn account to participate in the {podMember.clients.name} pod
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <strong>What happens next:</strong>
            </p>
            <ul className="mt-2 space-y-1 text-sm text-gray-600 list-disc list-inside">
              <li>You'll be redirected to LinkedIn to authorize access</li>
              <li>We'll use your account to amplify team posts</li>
              <li>Your account stays secure - we never see your password</li>
              <li>Admin will activate you after connection</li>
            </ul>
          </div>

          <Button
            onClick={handleConnectLinkedIn}
            className="w-full"
            size="lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Linkedin className="mr-2 h-5 w-5" />
                Connect LinkedIn Account
              </>
            )}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            By connecting, you authorize {podMember.clients.name} to post on your behalf for pod amplification.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
