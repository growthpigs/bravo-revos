/**
 * Pod Status Banner Component
 * Shows warning when user is not in a pod
 */

'use client';

import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';

export function PodStatusBanner() {
  const [hasPod, setHasPod] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/user/pod-status')
      .then((r) => r.json())
      .then((data) => {
        setHasPod(data.hasPod);
        setLoading(false);
      })
      .catch((error) => {
        console.error('[POD_BANNER] Error fetching pod status:', error);
        setLoading(false);
      });
  }, []);

  // Don't show if loading, user has a pod, or error occurred
  if (loading || hasPod === null || hasPod === true) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
      <div className="flex gap-3">
        <div className="flex-shrink-0 pt-0.5">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-yellow-800">
            You're not in a pod yet
          </p>
          <p className="text-sm text-yellow-700 mt-1">
            You can use all workflows and run campaigns, but won't have pod amplification
            for automatic engagement. Contact your admin to join a pod and unlock the
            power of network effects.
          </p>
        </div>
      </div>
    </div>
  );
}
