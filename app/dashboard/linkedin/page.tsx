'use client';

import { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Link2,
  Loader2,
  Trash2,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface LinkedInAccount {
  id: string;
  account_name: string;
  unipile_account_id: string;
  profile_data: {
    name?: string;
    email?: string;
  };
  status: 'active' | 'expired' | 'error';
  session_expires_at: string;
  created_at: string;
}

export default function LinkedInPage() {
  const [accounts, setAccounts] = useState<LinkedInAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [checkpointMode, setCheckpointMode] = useState(false);
  const [checkpointAccountId, setCheckpointAccountId] = useState('');
  const [checkpointType, setCheckpointType] = useState('');

  // Form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [accountName, setAccountName] = useState('');
  const [checkpointCode, setCheckpointCode] = useState('');

  useEffect(() => {
    console.log('[DEBUG_LINKEDIN] Component mounted');
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      console.log('[DEBUG_LINKEDIN] Fetching accounts...');
      const response = await fetch('/api/linkedin/accounts');

      console.log('[DEBUG_LINKEDIN] Fetch response status:', response.status, response.ok);
      console.log('[DEBUG_LINKEDIN] Response headers:', {
        'content-type': response.headers.get('content-type'),
        'content-length': response.headers.get('content-length'),
      });

      const rawText = await response.text();
      console.log('[DEBUG_LINKEDIN] Raw response text length:', rawText.length);
      console.log('[DEBUG_LINKEDIN] Raw response first 500 chars:', rawText.substring(0, 500));

      let data;
      try {
        data = JSON.parse(rawText);
        console.log('[DEBUG_LINKEDIN] Successfully parsed JSON');
      } catch (parseError) {
        console.error('[DEBUG_LINKEDIN] JSON parse error:', parseError);
        console.error('[DEBUG_LINKEDIN] Failed to parse:', rawText.substring(0, 200));
        throw parseError;
      }

      console.log('[DEBUG_LINKEDIN] Fetch response:', {
        status: response.status,
        ok: response.ok,
        accountsCount: data.accounts?.length,
        accountsType: typeof data.accounts,
        accountsIsArray: Array.isArray(data.accounts),
      });

      if (response.ok) {
        console.log('[DEBUG_LINKEDIN] Setting accounts state:', data.accounts?.length);
        setAccounts(data.accounts || []);
      } else {
        console.error('[DEBUG_LINKEDIN] Fetch failed:', data.error);
        toast.error(data.error || 'Failed to fetch accounts');
      }
    } catch (error) {
      console.error('[DEBUG_LINKEDIN] Fetch error:', error);
      toast.error('Failed to fetch accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthenticate = async (e: React.FormEvent) => {
    console.log('[DEBUG_LINKEDIN] Form submitted, fields:', { username, password: '***', accountName });
    e.preventDefault();

    if (!username || !password || !accountName) {
      console.log('[DEBUG_LINKEDIN] Missing fields');
      toast.error('Please fill in all fields');
      return;
    }

    try {
      console.log('[DEBUG_LINKEDIN] Starting authentication');
      setAuthenticating(true);
      const response = await fetch('/api/linkedin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'authenticate',
          username,
          password,
          accountName,
        }),
      });

      const data = await response.json();
      console.log('[DEBUG_LINKEDIN] API Response:', { status: response.status, data });

      if (!response.ok) {
        console.log('[DEBUG_LINKEDIN] API error:', data.error);
        toast.error(data.error || 'Authentication failed');
        return;
      }

      // Check if checkpoint is required
      if (data.status === 'checkpoint_required') {
        console.log('[DEBUG_LINKEDIN] Checkpoint required');
        setCheckpointMode(true);
        setCheckpointAccountId(data.account_id);
        setCheckpointType(data.checkpoint_type);
        toast.info(`2FA required: ${data.checkpoint_type}`);
        return;
      }

      if (data.status === 'success') {
        console.log('[DEBUG_LINKEDIN] Authentication success');
        toast.success('LinkedIn account connected successfully!');
        setUsername('');
        setPassword('');
        setAccountName('');
        // Always fetch the full account list from the server to ensure we have all fields
        await fetchAccounts();
      }
    } catch (error) {
      console.error('[DEBUG_LINKEDIN] Error:', error);
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
      setAuthenticating(true);
      const response = await fetch('/api/linkedin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve_checkpoint',
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
        toast.success('LinkedIn account verified!');
        setCheckpointMode(false);
        setCheckpointCode('');
        setUsername('');
        setPassword('');
        setAccountName('');
        await fetchAccounts();
      }
    } catch (error) {
      toast.error('Checkpoint resolution failed');
    } finally {
      setAuthenticating(false);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) {
      return;
    }

    try {
      const response = await fetch(`/api/linkedin/accounts?id=${accountId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Account disconnected');
        await fetchAccounts();
      } else {
        toast.error(data.error || 'Failed to disconnect');
      }
    } catch (error) {
      toast.error('Failed to disconnect account');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case 'expiring_soon':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Expiring Soon
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Expired
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">LinkedIn Integration</h1>
        <p className="text-slate-500 mt-2">
          Connect and manage your LinkedIn accounts for lead generation
        </p>
      </div>

      <Tabs defaultValue="connected" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="connected">Connected</TabsTrigger>
          <TabsTrigger value="connect">Connect</TabsTrigger>
          <TabsTrigger value="guide">Guide</TabsTrigger>
        </TabsList>

        {/* Connected Accounts Tab */}
        <TabsContent value="connected" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : accounts.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <Link2 className="w-12 h-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Accounts Connected</h3>
                <p className="text-slate-500 mb-4">
                  Connect your first LinkedIn account to get started
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {accounts.map((account) => (
                <Card key={account.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {account.profile_data.name || account.account_name}
                        </CardTitle>
                        <CardDescription>{account.profile_data.email}</CardDescription>
                      </div>
                      {getStatusBadge(account.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500">Account Name</p>
                        <p className="font-medium">{account.account_name}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Unipile ID</p>
                        <p className="font-mono text-xs">{account.unipile_account_id.slice(0, 12)}...</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Expires</p>
                        <p className="font-medium">
                          {formatDistanceToNow(new Date(account.session_expires_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Connected</p>
                        <p className="font-medium">
                          {formatDistanceToNow(new Date(account.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>

                    {account.status === 'expired' && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          This account needs reauthentication. Please reconnect.
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnect(account.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Disconnect
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Connect Tab */}
        <TabsContent value="connect" className="space-y-4">
          {!checkpointMode ? (
            <form onSubmit={handleAuthenticate} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Account Name</label>
                <Input
                  placeholder="e.g., My Sales Account"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  disabled={authenticating}
                />
                <p className="text-xs text-slate-500 mt-1">
                  A friendly name to identify this account in the system
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Email/Username</label>
                <Input
                  type="email"
                  placeholder="your.email@linkedin.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={authenticating}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Password</label>
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
                  Your credentials are securely transmitted to Unipile&apos;s servers and not stored in plain
                  text. We only keep encrypted session tokens.
                </AlertDescription>
              </Alert>

              <Button type="submit" disabled={authenticating} className="w-full">
                {authenticating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Connect Account
              </Button>
            </form>
          ) : (
            <form onSubmit={handleCheckpointResolution} className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  LinkedIn is requesting a {checkpointType} code. Please provide the code to continue.
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
                  disabled={authenticating}
                  maxLength={6}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={authenticating} className="flex-1">
                  {authenticating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Verify
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCheckpointMode(false);
                    setCheckpointCode('');
                  }}
                  disabled={authenticating}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </TabsContent>

        {/* Guide Tab */}
        <TabsContent value="guide" className="space-y-4">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div>
                <h4 className="font-semibold mb-2 flex items-center">
                  <Zap className="w-4 h-4 mr-2 text-blue-600" />
                  Automatic Monitoring
                </h4>
                <p className="text-sm text-slate-600">
                  Your sessions are automatically monitored for expiry. If a session expires, we&apos;ll
                  notify you to reconnect.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2 flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-yellow-600" />
                  Session Expiry
                </h4>
                <p className="text-sm text-slate-600">
                  Sessions typically last 90 days. You&apos;ll be notified 7 days before expiry to reconnect.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 text-red-600" />
                  What Happens If Session Expires
                </h4>
                <ul className="text-sm text-slate-600 space-y-2 ml-6 list-disc">
                  <li>We&apos;ll notify you to reconnect</li>
                  <li>Lead generation will pause temporarily</li>
                  <li>You can reconnect anytime using the &quot;Connect&quot; tab</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                  Security
                </h4>
                <ul className="text-sm text-slate-600 space-y-2 ml-6 list-disc">
                  <li>Passwords are never stored - only encrypted session tokens</li>
                  <li>All communication with LinkedIn is through Unipile&apos;s secure API</li>
                  <li>You can disconnect any account at any time</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
