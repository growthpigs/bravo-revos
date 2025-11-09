'use client';

import { TopBar } from '@/components/TopBar';
import AdminSidebar from '@/components/admin/admin-sidebar';

interface AdminLayoutWrapperProps {
  user: any;
  agency: any;
  children: React.ReactNode;
}

export default function AdminLayoutWrapper({ user, agency, children }: AdminLayoutWrapperProps) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Always visible */}
      <div className="w-64 flex-shrink-0">
        <AdminSidebar user={user} agency={agency} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar - no logo for admin area */}
        <TopBar showLogo={false} />

        {/* Content */}
        <main className="flex-1 overflow-y-auto pt-16 px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
