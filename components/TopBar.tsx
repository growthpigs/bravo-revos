'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useHealthStatus } from '@/hooks/use-health-status';
import { HealthSummary } from '@/components/health/health-summary';

interface TopBarProps {
  showLogo?: boolean;
}

export function TopBar({ showLogo = true }: TopBarProps) {
  const { status } = useHealthStatus();
  const [selectedService, setSelectedService] = useState<string | null>(null);

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

      {/* Right: Health Summary */}
      <HealthSummary
        status={status}
        onStatusClick={(serviceName) => {
          setSelectedService(serviceName);
          // TODO: Open diagnostic modal
          console.log('Clicked service:', serviceName);
        }}
      />
    </header>
  );
}
