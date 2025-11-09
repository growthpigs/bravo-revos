'use client';

import { useState } from 'react';
import { TopBar } from '@/components/TopBar';
import AdminSidebar from '@/components/admin/admin-sidebar';

interface AdminLayoutWrapperProps {
  user: any;
  agency: any;
  children: React.ReactNode;
}

export default function AdminLayoutWrapper({ user, agency, children }: AdminLayoutWrapperProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Toggle with screen size */}
      {sidebarOpen && (
        <div className="w-64 flex-shrink-0 hidden md:block">
          <AdminSidebar user={user} agency={agency} />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <TopBar
          sidebarOpen={sidebarOpen}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          showUserMenu={true}
        />

        {/* Content */}
        <main className="flex-1 overflow-y-auto pt-16 px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
