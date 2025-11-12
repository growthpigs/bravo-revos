/**
 * LinkedIn Account Status Page (Read-Only)
 *
 * Shows user's pre-connected LinkedIn account status.
 * Accounts are connected by admins during onboarding - users cannot connect/disconnect themselves.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
} from 'lucide-react';
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
  last_sync_at?: string;
}

export default function LinkedInPage() {
  const [accounts, setAccounts] = useState<LinkedInAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAccounts();
    // Refresh every 30 seconds
    const interval = setInterval(fetchAccounts, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/linkedin/accounts');
      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }

      const data = await response.json();
      setAccounts(data.accounts || []);
      setError('');
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError('Failed to load LinkedIn accounts');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
            <CheckCircle className="mr-1 h-3 w-3" />
            Active
          </Badge>
        );
      case 'expired':
        return (
          <Badge className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20">
            <Clock className="mr-1 h-3 w-3" />
            Expired
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20">
            <AlertCircle className="mr-1 h-3 w-3" />
            Error
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">LinkedIn Connection</h1>
        <p className="text-muted-foreground mt-2">
          Your LinkedIn account is managed by our support team and connected during onboarding.
        </p>
      </div>

      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-600">{error}</AlertDescription>
        </Alert>
      )}

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No LinkedIn Account Connected</h3>
            <p className="text-sm text-muted-foreground mt-2 text-center max-w-md">
              Your LinkedIn account will be connected by our support team during your onboarding call.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Questions? Contact support at <a href="mailto:support@bravo-revos.com" className="text-primary hover:underline">support@bravo-revos.com</a>
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{account.account_name}</CardTitle>
                    <CardDescription className="mt-1">
                      Connected {formatDistanceToNow(new Date(account.created_at))} ago
                    </CardDescription>
                  </div>
                  {getStatusBadge(account.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 text-sm">
                  {account.profile_data?.name && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Profile Name</span>
                      <span className="font-medium">{account.profile_data.name}</span>
                    </div>
                  )}
                  {account.profile_data?.email && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">LinkedIn Email</span>
                      <span className="font-medium">{account.profile_data.email}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Session Expires</span>
                    <span className="font-medium">
                      {formatDistanceToNow(new Date(account.session_expires_at))} from now
                    </span>
                  </div>
                  {account.last_sync_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Synced</span>
                      <span className="font-medium">
                        {formatDistanceToNow(new Date(account.last_sync_at))} ago
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account ID</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {account.unipile_account_id}
                    </span>
                  </div>
                </div>

                {account.status === 'expired' && (
                  <Alert className="mt-4 border-yellow-200 bg-yellow-50">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-600">
                      Your LinkedIn session has expired. Please contact support to reconnect.
                    </AlertDescription>
                  </Alert>
                )}

                {account.status === 'error' && (
                  <Alert className="mt-4 border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-600">
                      There's an issue with your LinkedIn connection. Please contact support for assistance.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">Need Help?</CardTitle>
          <CardDescription>
            LinkedIn accounts are managed by our support team to ensure security and reliability.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="list-disc list-inside space-y-1">
            <li>Accounts are connected during your onboarding call</li>
            <li>Sessions are automatically refreshed every 90 days</li>
            <li>Contact support if you see any connection issues</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
