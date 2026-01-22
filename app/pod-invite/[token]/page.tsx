/**
 * Pod Member Invite Acceptance Page
 *
 * Step 2 of onboarding: Member sets password and confirms email
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface PodMember {
  id: string;
  name: string;
  user_id: string;
  onboarding_status: string;
  users: {
    email: string;
  };
  clients: {
    name: string;
  };
}

export default function PodInvitePage({ params }: { params: { token: string } }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [member, setMember] = useState<PodMember | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadInvite();
  }, []);

  async function loadInvite() {
    try {
      setVerifying(true);

      // Verify invite token
      const { data, error } = await supabase
        .from('pod_member')
        .select('*, users(email), clients(name), invite_sent_at')
        .eq('invite_token', params.token)
        .single();

      if (error || !data) {
        toast.error('Invalid or expired invite link');
        router.push('/auth/login');
        return;
      }

      // Check if already accepted
      if (data.onboarding_status !== 'invited') {
        toast.info('This invite has already been accepted');
        router.push('/auth/login');
        return;
      }

      // ✅ SECURITY: Check token expiration (7 days)
      if (data.invite_sent_at) {
        const inviteSentAt = new Date(data.invite_sent_at);
        const expiresAt = new Date(inviteSentAt.getTime() + 7 * 24 * 60 * 60 * 1000);

        if (new Date() > expiresAt) {
          toast.error('Invite link expired. Please request a new invitation.');
          router.push('/auth/login');
          return;
        }
      }

      setMember(data);
    } catch (error: any) {
      console.error('[POD_INVITE] Load error:', error);
      toast.error('Failed to load invite');
      router.push('/auth/login');
    } finally {
      setVerifying(false);
    }
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();

    if (!member) return;

    setLoading(true);

    try {
      // Validate passwords match
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Validate password strength
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      // ✅ SECURITY: Re-verify token is still valid before setting password (prevent TOCTOU)
      const { data: recheck } = await supabase
        .from('pod_member')
        .select('onboarding_status, invite_sent_at')
        .eq('invite_token', params.token)
        .eq('user_id', member.user_id)
        .single();

      if (!recheck || recheck.onboarding_status !== 'invited') {
        toast.error('Invite link expired or already used');
        router.push('/auth/login');
        return;
      }

      // Check expiration again
      if (recheck.invite_sent_at) {
        const inviteSentAt = new Date(recheck.invite_sent_at);
        const expiresAt = new Date(inviteSentAt.getTime() + 7 * 24 * 60 * 60 * 1000);

        if (new Date() > expiresAt) {
          toast.error('Invite link expired. Please request a new invitation.');
          router.push('/auth/login');
          return;
        }
      }

      // ✅ SECURITY: Pass invite token to API for validation
      const response = await fetch('/api/admin/set-user-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: member.user_id,
          password,
          inviteToken: params.token, // Required for server-side validation
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to set password');
      }

      // Update pod_member onboarding status
      await supabase
        .from('pod_member')
        .update({
          onboarding_status: 'password_set',
          invite_accepted_at: new Date().toISOString(),
        })
        .eq('id', member.id);

      // Sign in the user automatically
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: member.users.email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      toast.success('Password set successfully!');

      // Redirect to Unipile connection
      router.push('/onboarding/connect-unipile');
    } catch (error: any) {
      console.error('[POD_INVITE] Set password error:', error);
      toast.error(error.message || 'Failed to set password');
    } finally {
      setLoading(false);
    }
  }

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Verifying invite...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!member) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to {member.clients.name} Pod!</CardTitle>
          <CardDescription className="mt-2">
            Hi {member.name}, set your password to continue
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="confirm">Confirm Password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
                className="mt-1"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting Password...
                </>
              ) : (
                'Continue to LinkedIn Connection'
              )}
            </Button>
          </form>

          <p className="text-xs text-gray-500 mt-4 text-center">
            By continuing, you agree to participate in pod amplification for {member.clients.name}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
