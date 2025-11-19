/**
 * /onboard page
 * Magic link invitation onboarding flow
 */

import { Suspense } from 'react';
import OnboardContent from '@/components/onboard-content';

export const dynamic = 'force-dynamic';

export default function OnboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="w-full max-w-md space-y-4 p-4">
            <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      }
    >
      <OnboardContent />
    </Suspense>
  );
}
