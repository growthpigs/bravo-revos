'use client';

import { isSandboxMode } from '@/lib/sandbox/sandbox-wrapper';

export function SandboxBorder({ children }: { children: React.ReactNode }) {
  const sandboxEnabled = isSandboxMode();

  return (
    <div className={sandboxEnabled ? 'relative' : ''}>
      {sandboxEnabled && (
        <div className="fixed inset-0 border-4 border-yellow-400 pointer-events-none z-[9999]" />
      )}
      {children}
    </div>
  );
}
