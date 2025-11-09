import DashboardSidebar from '@/components/dashboard/dashboard-sidebar'
import { HGCChat } from '@/components/hgc-chat'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Mock user data for development
  const mockUser = {
    id: '1',
    email: 'user@example.com',
    role: 'client_admin',
    clients: {
      id: '1',
      name: 'Example Client',
    },
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <DashboardSidebar user={mockUser} client={mockUser.clients} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* Holy Grail Chat - AI Co-founder */}
      <HGCChat />
    </div>
  )
}
