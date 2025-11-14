'use client';

import { useState, useEffect } from 'react';
import { isSandboxMode } from '@/lib/sandbox/sandbox-wrapper';

export function SandboxBorder({ children }: { children: React.ReactNode }) {
  const [sandboxEnabled, setSandboxEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSandboxEnabled(isSandboxMode());
  }, []);

  // Don't render conditional content until after hydration
  if (!mounted) {
    return <div>{children}</div>;
  }

  return (
    <div className={sandboxEnabled ? 'relative' : ''}>
      {sandboxEnabled && (
        <div className="fixed inset-0 border-4 border-yellow-400 pointer-events-none z-[9999]" />
      )}
      {children}
    </div>
  );
}
