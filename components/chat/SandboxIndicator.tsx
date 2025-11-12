'use client';

import { AlertTriangle } from 'lucide-react';
import { getSandboxStatus } from '@/lib/sandbox/sandbox-wrapper';

export function SandboxIndicator() {
  const { enabled, message } = getSandboxStatus();

  if (!enabled) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-300 rounded-lg text-sm">
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
      <span className="text-yellow-900 font-medium">{message}</span>
    </div>
  );
}
