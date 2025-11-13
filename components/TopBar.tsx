'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useHealthStatus, useHealthBannerVisibility } from '@/hooks/use-health-status';

interface TopBarProps {
  showLogo?: boolean;
}

export function TopBar({ showLogo = true }: TopBarProps) {
  const { data } = useHealthStatus();
  const { isVisible } = useHealthBannerVisibility();

  // Get current date in DD-MM-YYYY format
  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-40">
      {/* Left: Logo + Version */}
      <div className="flex flex-col gap-1">
        {showLogo && (
          <Link href="/">
            <Image
              src="/revos-logo.png"
              alt="RevOS"
              width={260}
              height={50}
              className="h-4 w-auto"
              priority
            />
          </Link>
        )}
        <div className="font-mono text-[6pt] uppercase text-gray-400 tracking-wide">
          V0.1 · {currentDate}
        </div>
      </div>

      {/* Right: Health Status */}
      {data && isVisible && (
        <div className="font-mono text-[8pt] uppercase text-gray-500 flex gap-4">
          <span>
            DATABASE: <span className={getStatusColor(data.checks.database.status)}>●</span> {data.checks.database.status}
          </span>
          <span>
            SUPABASE: <span className={getStatusColor(data.checks.supabase.status)}>●</span> {data.checks.supabase.status}
          </span>
          <span>
            API: <span className={getStatusColor(data.checks.api.status)}>●</span> {data.checks.api.status}
          </span>
          <span>
            SYSTEM: <span className={getStatusColor(data.status)}>●</span> {data.status}
          </span>
        </div>
      )}
    </header>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'healthy':
      return 'text-green-500';
    case 'degraded':
      return 'text-orange-500';
    case 'unhealthy':
      return 'text-red-500';
    default:
      return 'text-gray-400';
  }
}
