'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';

function PodMemberAuthContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [invitationValid, setInvitationValid] = useState(false);
  const [invitationData, setInvitationData] = useState<any>(null);
  const [checkpointMode, setCheckpointMode] = useState(false);
  const [checkpointAccountId, setCheckpointAccountId] = useState('');
  const [checkpointType, setCheckpointType] = useState('');

  // Form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [accountName, setAccountName] = useState('');
  const [checkpointCode, setCheckpointCode] = useState('');

  useEffect(() => {
    if (!token) {
      toast.error('Missing invitation token');
      setLoading(false);
      return;
    }

    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/pods/members/auth?token=${token}`);
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Invalid invitation token');
        setInvitationValid(false);
        return;
      }

      setInvitationValid(true);
      setInvitationData(data);
      setAccountName(`${data.member_name} - ${data.pod_name}`);
    } catch (error) {
      toast.error('Failed to verify invitation');
      setInvitationValid(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password || !accountName) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setAuthenticating(true);
      const response = await fetch('/api/pods/members/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'authenticate',
          token,
          username,
          password,
          accountName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Authentication failed');
        return;
      }

      // Check if checkpoint is required
      if (data.status === 'checkpoint_required') {
        setCheckpointMode(true);
        setCheckpointAccountId(data.account_id);
        setCheckpointType(data.checkpoint_type);
        toast.info(`2FA required: ${data.checkpoint_type}`);
        return;
      }

      if (data.status === 'success') {
        toast.success('LinkedIn account connected successfully to pod!');
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      }
    } catch (error) {
      toast.error('Authentication failed');
    } finally {
      setAuthenticating(false);
    }
  };

  const handleCheckpointResolution = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!checkpointCode) {
      toast.error('Please enter the verification code');
      return;
    }

    try {
      setVerifying(true);
      const response = await fetch('/api/pods/members/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve_checkpoint',
          token,
          accountId: checkpointAccountId,
          code: checkpointCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Checkpoint resolution failed');
        return;
      }

      if (data.status === 'success') {
        toast.success('LinkedIn account verified and connected to pod!');
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      }
    } catch (error) {
      toast.error('Checkpoint resolution failed');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
            <p className="text-slate-600">Verifying invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitationValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <CardTitle className="text-red-900">Invalid Invitation</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                This invitation link is invalid or has expired. Please contact your pod administrator
                for a new invitation.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center space-x-2">
            <Users className="w-6 h-6 text-blue-600" />
            <CardTitle className="text-2xl font-bold">Join Engagement Pod</CardTitle>
          </div>
          <CardDescription>
            Connect your LinkedIn account to {invitationData?.pod_name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!checkpointMode ? (
            <form onSubmit={handleAuthenticate} className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{invitationData?.member_name}</strong>, you've been invited to join{' '}
                  <strong>{invitationData?.pod_name}</strong> by {invitationData?.client_name}.
                </AlertDescription>
              </Alert>

              <div>
                <label className="text-sm font-medium mb-1 block">Account Name</label>
                <Input
                  placeholder="Your LinkedIn Account"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  disabled={authenticating}
                />
                <p className="text-xs text-slate-500 mt-1">
                  A friendly name to identify this account
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">LinkedIn Email/Username</label>
                <Input
                  type="email"
                  placeholder="your.email@linkedin.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={authenticating}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">LinkedIn Password</label>
                <Input
                  type="password"
                  placeholder="Your LinkedIn password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={authenticating}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Your password is encrypted and never stored in plain text
                </p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your credentials are securely transmitted to Unipile's servers and not stored in
                  plain text. We only keep encrypted session tokens.
                </AlertDescription>
              </Alert>

              <Button type="submit" disabled={authenticating} className="w-full">
                {authenticating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Connect LinkedIn Account
              </Button>
            </form>
          ) : (
            <form onSubmit={handleCheckpointResolution} className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  LinkedIn is requesting a {checkpointType} code. Please provide the code to
                  continue.
                </AlertDescription>
              </Alert>

              <div>
                <label className="text-sm font-medium mb-1 block">
                  Verification Code ({checkpointType})
                </label>
                <Input
                  placeholder="Enter the code from your device"
                  value={checkpointCode}
                  onChange={(e) => setCheckpointCode(e.target.value)}
                  disabled={verifying}
                  maxLength={6}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={verifying} className="flex-1">
                  {verifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Verify
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCheckpointMode(false);
                    setCheckpointCode('');
                  }}
                  disabled={verifying}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PodMemberAuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      }
    >
      <PodMemberAuthContent />
    </Suspense>
  );
}
