'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useHealthStatus, useHealthBannerVisibility } from '@/hooks/use-health-status';

interface TopBarProps {
  showLogo?: boolean;
}

interface BuildInfo {
  commit: string;
  branch: string;
  sourceBranch: string;
  timestamp: string;
  environment: string;
}

export function TopBar({ showLogo = true }: TopBarProps) {
  const { data } = useHealthStatus();
  const { isVisible } = useHealthBannerVisibility();
  const [buildInfo, setBuildInfo] = useState<BuildInfo | null>(null);
  const [mounted, setMounted] = useState(false);

  // Fetch build info from Vercel deployment
  useEffect(() => {
    fetch('/build-info.json')
      .then((r) => r.json())
      .then((info) => {
        setBuildInfo(info);
        setMounted(true);
      })
      .catch((err) => {
        console.error('[BUILD_INFO] Failed to load:', err);
        setMounted(true);
      });
  }, []);

  // Get HGC version from env
  const hgcVersion = process.env.NEXT_PUBLIC_HGC_VERSION || 'v3';
  const llmModel = 'GPT-5.1';

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-40">
      {/* Left: Logo + Info */}
      <div className="flex items-center gap-4">
        {showLogo && (
          <Link href="/">
            <Image
              src="/revos-logo.png"
              alt="RevOS"
              width={130}
              height={25}
              className="h-4 w-auto"
              priority
            />
          </Link>
        )}
        <div className="font-mono text-[9px] uppercase text-gray-400 tracking-wide leading-tight">
          {mounted && buildInfo ? (
            <div className="flex flex-col">
              <span>{buildInfo.branch} • {buildInfo.commit}</span>
              <span>{new Date(buildInfo.timestamp).toLocaleString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }).replace(',', '')}</span>
              <span>HGC {hgcVersion}</span>
              <span>{llmModel}</span>
            </div>
          ) : '—'}
        </div>
      </div>

      {/* Right: Health Status - 3 columns × 2 rows, dots before names */}
      <div className="font-mono text-[8pt] uppercase text-gray-600 flex items-start gap-3">
        {/* Column 1: Critical */}
        <div className="flex flex-col gap-0.5">
          <span><span className={getStatusColor(data.checks.database.status)}>●</span> DATABASE</span>
          <span><span className={getStatusColor(data.checks.queue.status)}>●</span> QUEUE</span>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-gray-300"></div>

        {/* Column 2: AI */}
        <div className="flex flex-col gap-0.5">
          <span><span className={getStatusColor(data.checks.agentkit.status)}>●</span> AGENTKIT</span>
          <span><span className={getStatusColor(data.checks.mem0.status)}>●</span> MEM0</span>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-gray-300"></div>

        {/* Column 3: Integrations */}
        <div className="flex flex-col gap-0.5">
          <span><span className={getStatusColor(data.checks.unipile.status)}>●</span> UNIPILE</span>
        </div>
      </div>
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
    case 'disabled':
      return 'text-gray-400';
    case 'unknown':
      return 'text-gray-400 animate-pulse';
    default:
      return 'text-gray-400';
  }
}
