'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

export default function OAuthSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const state = searchParams.get('state');

  useEffect(() => {
    console.log('[OAUTH_SUCCESS] LinkedIn connection successful, state:', state);

    // Account created by webhook, wait brief moment for DB writes to complete
    // Then redirect to dashboard
    const timer = setTimeout(() => {
      console.log('[OAUTH_SUCCESS] Redirecting to dashboard');
      router.push('/dashboard');
    }, 2000);

    return () => clearTimeout(timer);
  }, [state, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="border-b border-gray-100 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle className="text-2xl">LinkedIn Connected!</CardTitle>
        </CardHeader>

        <CardContent className="pt-8 space-y-6 text-center">
          <div className="space-y-2">
            <p className="text-gray-900 font-medium">
              Your LinkedIn account is connected
            </p>
            <p className="text-gray-600 text-sm">
              Setting up your account...
            </p>
          </div>

          <div className="flex justify-center pt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>

          <p className="text-xs text-gray-500">
            You'll be redirected to your dashboard in just a moment
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
