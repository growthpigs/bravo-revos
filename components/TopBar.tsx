'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export function TopBar() {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center px-6 z-40">
      {/* Logo */}
      <Link href="/">
        <Image
          src="/revos-logo.png"
          alt="RevOS"
          width={260}
          height={50}
          className="h-6 w-auto"
          priority
        />
      </Link>
    </header>
  );
}
