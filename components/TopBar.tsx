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

      {/* Right: Health Status - 6 columns × 2 rows, dots before names */}
      {data && isVisible && (
        <div className="font-mono text-[8pt] uppercase text-gray-600 flex items-start gap-3">
          {/* Column 1 */}
          <div className="flex flex-col gap-0.5">
            <span><span className={getStatusColor(data.checks.database.status)}>●</span> DATABASE</span>
            <span><span className={getStatusColor(data.checks.supabase.status)}>●</span> SUPABASE</span>
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-gray-300"></div>

          {/* Column 2 */}
          <div className="flex flex-col gap-0.5">
            <span><span className={getStatusColor(data.checks.api.status)}>●</span> API</span>
            <span><span className={getStatusColor(data.checks.agentkit.status)}>●</span> AGENTKIT</span>
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-gray-300"></div>

          {/* Column 3 */}
          <div className="flex flex-col gap-0.5">
            <span><span className={getStatusColor(data.checks.mem0.status)}>●</span> MEM0</span>
            <span><span className={getStatusColor(data.checks.unipile.status)}>●</span> UNIPILE</span>
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-gray-300"></div>

          {/* Column 4 */}
          <div className="flex flex-col gap-0.5">
            <span><span className={getStatusColor(data.checks.console.status)}>●</span> CONSOLE</span>
            <span><span className={getStatusColor(data.checks.cache.status)}>●</span> CACHE</span>
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-gray-300"></div>

          {/* Column 5 */}
          <div className="flex flex-col gap-0.5">
            <span><span className={getStatusColor(data.checks.queue.status)}>●</span> QUEUE</span>
            <span><span className={getStatusColor(data.checks.cron.status)}>●</span> CRON</span>
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-gray-300"></div>

          {/* Column 6 */}
          <div className="flex flex-col gap-0.5">
            <span><span className={getStatusColor(data.checks.webhooks.status)}>●</span> WEBHOOKS</span>
            <span><span className={getStatusColor(data.checks.email.status)}>●</span> EMAIL</span>
          </div>
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
