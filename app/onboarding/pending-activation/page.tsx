/**
 * Pending Activation Page (Pod Member Onboarding Step 4)
 *
 * Pod member has connected LinkedIn, now waiting for admin to activate them
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, Clock } from 'lucide-react';

export default function PendingActivationPage() {
  const [loading, setLoading] = useState(true);
  const [podMember, setPodMember] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadMemberStatus();

    // Poll for activation every 5 seconds
    const interval = setInterval(() => {
      checkActivationStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  async function loadMemberStatus() {
    try {
      setLoading(true);

      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        toast.error('Please sign in to continue');
        router.push('/auth/login');
        return;
      }

      const { data: member, error: memberError } = await supabase
        .from('pod_member')
        .select('*, clients(name)')
        .eq('user_id', user.id)
        .single();

      if (memberError || !member) {
        toast.error('Pod member record not found');
        router.push('/auth/login');
        return;
      }

      // Check if already active
      if (member.onboarding_status === 'active') {
        toast.success('You have been activated!');
        router.push('/dashboard');
        return;
      }

      // Check if Unipile connected
      if (!member.unipile_account_id) {
        toast.error('LinkedIn not connected. Please complete connection first.');
        router.push('/onboarding/connect-unipile');
        return;
      }

      setPodMember(member);
    } catch (error: any) {
      console.error('[PENDING_ACTIVATION] Load error:', error);
      toast.error('Failed to load status');
    } finally {
      setLoading(false);
    }
  }

  async function checkActivationStatus() {
    if (checking) return; // Prevent duplicate checks

    try {
      setChecking(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: member } = await supabase
        .from('pod_member')
        .select('onboarding_status, is_active')
        .eq('user_id', user.id)
        .single();

      if (member && member.onboarding_status === 'active' && member.is_active) {
        toast.success('You have been activated!');
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error('[PENDING_ACTIVATION] Check error:', error);
    } finally {
      setChecking(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/auth/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading...</span>
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
            <Clock className="h-16 w-16 text-yellow-600" />
          </div>
          <CardTitle className="text-2xl">Pending Admin Activation</CardTitle>
          <CardDescription className="mt-2">
            Your LinkedIn account has been successfully connected!
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Status checklist */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-900">Email confirmed</p>
                <p className="text-xs text-green-700">Account created successfully</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-900">Password set</p>
                <p className="text-xs text-green-700">Account secured</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-900">LinkedIn connected</p>
                <p className="text-xs text-green-700">Unipile account linked</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0 animate-pulse" />
              <div>
                <p className="text-sm font-medium text-yellow-900">Waiting for activation</p>
                <p className="text-xs text-yellow-700">Admin will activate you shortly</p>
              </div>
            </div>
          </div>

          {/* Info message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <strong>What&apos;s next:</strong>
            </p>
            <ul className="mt-2 space-y-1 text-sm text-gray-600 list-disc list-inside">
              <li>An admin from {podMember.clients.name} will review your connection</li>
              <li>You&apos;ll be activated within 24 hours</li>
              <li>Once activated, you&apos;ll automatically repost team content</li>
              <li>This page will auto-refresh when you&apos;re activated</li>
            </ul>
          </div>

          {/* Sign out button */}
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="w-full"
          >
            Sign Out
          </Button>

          <p className="text-xs text-gray-500 text-center">
            Questions? Contact your {podMember.clients.name} admin.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
