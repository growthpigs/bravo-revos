'use client';

import { isSandboxMode } from '@/lib/sandbox/sandbox-wrapper';

export function SandboxBorder({ children }: { children: React.ReactNode }) {
  const sandboxEnabled = isSandboxMode();

  return (
    <div className={sandboxEnabled ? 'border-4 border-yellow-400 min-h-screen' : ''}>
      {children}
    </div>
  );
}
