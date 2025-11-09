'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, Settings, LogOut, User, X } from 'lucide-react';
import { useState } from 'react';

interface TopBarProps {
  sidebarOpen?: boolean;
  onMenuClick?: () => void;
  showUserMenu?: boolean;
}

export function TopBar({ sidebarOpen = true, onMenuClick, showUserMenu = true }: TopBarProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-40">
      {/* Left: Menu button */}
      <button
        onClick={onMenuClick}
        className="p-2 hover:bg-gray-100 rounded-md transition-colors"
        aria-label="Toggle menu"
      >
        {sidebarOpen ? (
          <X size={20} className="text-gray-700" />
        ) : (
          <Menu size={20} className="text-gray-700" />
        )}
      </button>

      {/* Center: Logo */}
      <Link href="/" className="absolute left-1/2 transform -translate-x-1/2">
        <Image
          src="/revos-logo.png"
          alt="RevOS"
          width={260}
          height={50}
          className="h-10 w-auto"
          priority
        />
      </Link>

      {/* Right: User menu */}
      {showUserMenu && (
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <User size={16} className="text-gray-600" />
            </div>
            <span className="text-sm text-gray-700 hidden sm:inline">Menu</span>
          </button>

          {/* Dropdown menu */}
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
              <a
                href="#"
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <User size={16} />
                Profile
              </a>
              <a
                href="#"
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Settings size={16} />
                Settings
              </a>
              <hr className="my-1" />
              <a
                href="#"
                className="px-4 py-2 text-sm text-red-600 hover:bg-gray-50 flex items-center gap-2"
              >
                <LogOut size={16} />
                Logout
              </a>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
