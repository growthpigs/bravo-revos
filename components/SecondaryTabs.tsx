'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Tab {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

interface SecondaryTabsProps {
  tabs: Tab[];
  basePath?: string;
}

export function SecondaryTabs({ tabs, basePath = '' }: SecondaryTabsProps) {
  const pathname = usePathname();

  return (
    <nav className="h-12 bg-white border-b border-gray-200 flex items-center px-6 gap-2">
      {tabs.map((tab) => {
        const href = tab.href.startsWith('/') ? tab.href : `${basePath}/${tab.href}`;
        const isActive = pathname === href || pathname.startsWith(href + '/');

        return (
          <Link
            key={href}
            href={href}
            className={`
              flex items-center gap-2 px-4 py-2 text-sm font-medium
              border-b-2 transition-all
              ${
                isActive
                  ? 'border-black text-gray-900'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }
            `}
          >
            {tab.icon && <span className="text-base">{tab.icon}</span>}
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
